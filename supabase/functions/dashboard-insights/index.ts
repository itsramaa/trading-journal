import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DashboardInsightsRequest {
  portfolioStatus: {
    totalBalance: number;
    deployedCapital: number;
    openPositions: number;
  };
  riskStatus: {
    currentDailyLoss: number;
    maxDailyLoss: number;
    tradingAllowed: boolean;
  };
  recentTrades: Array<{
    pair: string;
    direction: string;
    result: string;
    pnl: number;
    date: string;
  }>;
  strategies: Array<{
    name: string;
    trades: number;
    winRate: number;
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

    const body: DashboardInsightsRequest = await req.json();
    const { portfolioStatus, riskStatus, recentTrades, strategies, language } = body;

    const isIndonesian = language === 'id';

    const systemPrompt = isIndonesian 
      ? `Kamu adalah asisten trading AI yang membantu trader menganalisis portofolio mereka. Berikan insight yang ringkas, actionable, dan konstruktif dalam Bahasa Indonesia.

Fokus pada:
1. Status portofolio saat ini
2. Peringatan risiko jika ada
3. Rekomendasi berdasarkan pola trading
4. Setup terbaik berdasarkan kinerja historis

Gunakan fungsi yang disediakan untuk mengembalikan analisis terstruktur.`
      : `You are an AI trading assistant helping traders analyze their portfolio. Provide concise, actionable, and constructive insights.

Focus on:
1. Current portfolio status and deployment
2. Risk warnings if any
3. Recommendations based on trading patterns
4. Best setups based on historical performance

Use the provided function to return structured analysis.`;

    // Calculate some metrics
    const totalPnl = recentTrades.reduce((sum, t) => sum + t.pnl, 0);
    const wins = recentTrades.filter(t => t.result === 'win').length;
    const winRate = recentTrades.length > 0 ? (wins / recentTrades.length * 100).toFixed(1) : 0;
    const deploymentPercent = portfolioStatus.totalBalance > 0 
      ? (portfolioStatus.deployedCapital / portfolioStatus.totalBalance * 100).toFixed(1)
      : 0;

    const bestStrategy = strategies.length > 0 
      ? strategies.reduce((best, s) => s.winRate > best.winRate ? s : best, strategies[0])
      : null;

    const userPrompt = `Analyze this trading dashboard data:

PORTFOLIO STATUS:
- Total Balance: $${portfolioStatus.totalBalance.toLocaleString()}
- Deployed Capital: $${portfolioStatus.deployedCapital.toLocaleString()} (${deploymentPercent}%)
- Open Positions: ${portfolioStatus.openPositions}

RISK STATUS:
- Daily Loss: $${riskStatus.currentDailyLoss.toFixed(2)} / $${riskStatus.maxDailyLoss.toFixed(2)} limit
- Trading Allowed: ${riskStatus.tradingAllowed ? 'Yes' : 'NO - LIMIT REACHED'}

RECENT PERFORMANCE (last ${recentTrades.length} trades):
- Win Rate: ${winRate}%
- Total P&L: $${totalPnl.toFixed(2)}
${recentTrades.slice(0, 5).map(t => `- ${t.pair} ${t.direction}: ${t.result} ($${t.pnl.toFixed(2)})`).join('\n')}

STRATEGIES:
${strategies.length > 0 
  ? strategies.map(s => `- ${s.name}: ${s.trades} trades, ${s.winRate.toFixed(1)}% win rate`).join('\n')
  : 'No strategies defined yet'}

Best performing strategy: ${bestStrategy ? `${bestStrategy.name} (${bestStrategy.winRate.toFixed(1)}%)` : 'N/A'}

Provide dashboard insights in ${isIndonesian ? 'Indonesian' : 'English'}.`;

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
              name: "report_dashboard_insights",
              description: "Report dashboard insights and recommendations",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Brief portfolio status summary (2-3 sentences)",
                  },
                  recommendations: {
                    type: "array",
                    description: "List of 2-4 actionable recommendations",
                    items: { type: "string" },
                  },
                  riskAlerts: {
                    type: "array",
                    description: "List of risk warnings if any (can be empty)",
                    items: { type: "string" },
                  },
                  bestSetups: {
                    type: "array",
                    description: "Top 2-3 best setups based on historical performance",
                    items: {
                      type: "object",
                      properties: {
                        pair: { type: "string", description: "Trading pair" },
                        strategy: { type: "string", description: "Recommended strategy" },
                        confidence: { type: "number", description: "Confidence 0-100" },
                        reason: { type: "string", description: "Brief reason" },
                      },
                      required: ["pair", "strategy", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                  overallSentiment: {
                    type: "string",
                    enum: ["bullish", "bearish", "neutral", "cautious"],
                    description: "Overall market sentiment recommendation",
                  },
                },
                required: ["summary", "recommendations", "riskAlerts", "bestSetups", "overallSentiment"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_dashboard_insights" } },
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

    const insightsResult = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        data: insightsResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Dashboard insights error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
