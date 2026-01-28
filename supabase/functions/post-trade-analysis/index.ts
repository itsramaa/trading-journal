import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PostTradeRequest {
  trade: {
    id: string;
    pair: string;
    direction: string;
    entryPrice: number;
    exitPrice: number;
    stopLoss: number;
    takeProfit: number;
    pnl: number;
    result: string;
    notes: string;
    emotionalState: string;
    confluenceScore: number;
  };
  strategy?: {
    name: string;
    minConfluences: number;
    minRR: number;
  };
  similarTrades?: Array<{
    pair: string;
    direction: string;
    result: string;
    pnl: number;
    confluenceScore: number;
  }>;
  language?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: PostTradeRequest = await req.json();
    const { trade, strategy, similarTrades, language } = body;

    const isIndonesian = language === 'id';

    // Calculate similar trades stats
    const similarWins = similarTrades?.filter(t => t.result === 'win').length || 0;
    const similarTotal = similarTrades?.length || 0;
    const similarWinRate = similarTotal > 0 ? (similarWins / similarTotal * 100) : 0;

    const systemPrompt = isIndonesian
      ? `Kamu adalah coach trading AI yang menganalisis trade yang sudah selesai untuk membantu trader belajar dan berkembang.

Analisis trade ini dan berikan:
1. Faktor-faktor yang berkontribusi pada hasil (win/loss)
2. Pelajaran yang bisa dipetik
3. Rekomendasi untuk trade serupa di masa depan
4. Update pattern recognition berdasarkan similar trades

Bersikaplah konstruktif dan supportif. Fokus pada improvement, bukan kritik.`
      : `You are an AI trading coach analyzing completed trades to help traders learn and improve.

Analyze this trade and provide:
1. Factors that contributed to the outcome (win/loss)
2. Lessons learned
3. Recommendations for future similar trades
4. Pattern recognition updates based on similar trades

Be constructive and supportive. Focus on improvement, not criticism.`;

    const userPrompt = `Analyze this completed trade:

TRADE DETAILS:
- Pair: ${trade.pair}
- Direction: ${trade.direction}
- Entry: $${trade.entryPrice}, Exit: $${trade.exitPrice}
- Stop Loss: $${trade.stopLoss}, Take Profit: $${trade.takeProfit}
- Result: ${trade.result.toUpperCase()}
- P&L: $${trade.pnl.toFixed(2)}
- Confluence Score: ${trade.confluenceScore}
- Emotional State: ${trade.emotionalState}
- Notes: ${trade.notes || 'None'}

STRATEGY:
${strategy ? `- Name: ${strategy.name}\n- Min Confluences: ${strategy.minConfluences}\n- Min R:R: ${strategy.minRR}` : 'No strategy linked'}

SIMILAR TRADES (${similarTotal} total):
- Win Rate on ${trade.pair}: ${similarWinRate.toFixed(1)}%
${similarTrades?.slice(0, 3).map(t => `- ${t.direction} ${t.pair}: ${t.result} ($${t.pnl.toFixed(2)})`).join('\n') || 'No similar trades'}

Provide analysis in ${isIndonesian ? 'Indonesian' : 'English'}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_post_trade_analysis",
              description: "Report post-trade analysis and lessons",
              parameters: {
                type: "object",
                properties: {
                  winFactors: {
                    type: "array",
                    description: "Factors that contributed to success (if win)",
                    items: { type: "string" },
                  },
                  lossFactors: {
                    type: "array",
                    description: "Factors that contributed to loss (if loss)",
                    items: { type: "string" },
                  },
                  lessons: {
                    type: "array",
                    description: "Key lessons learned from this trade",
                    items: { type: "string" },
                  },
                  improvements: {
                    type: "array",
                    description: "Specific improvements for future trades",
                    items: { type: "string" },
                  },
                  patternUpdate: {
                    type: "object",
                    description: "Pattern recognition update",
                    properties: {
                      newWinRate: { type: "number", description: "Updated win rate estimate" },
                      recommendation: { type: "string", description: "Strategy recommendation" },
                      confidenceChange: { 
                        type: "string", 
                        enum: ["increase", "decrease", "maintain"],
                        description: "How confidence should change",
                      },
                    },
                    required: ["newWinRate", "recommendation", "confidenceChange"],
                    additionalProperties: false,
                  },
                  overallAssessment: {
                    type: "string",
                    description: "Brief overall assessment of the trade execution (2-3 sentences)",
                  },
                },
                required: ["winFactors", "lossFactors", "lessons", "improvements", "patternUpdate", "overallAssessment"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_post_trade_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call response from AI");
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Post-trade analysis error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
