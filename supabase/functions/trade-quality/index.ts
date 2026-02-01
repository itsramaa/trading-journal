import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createErrorResponse, ErrorCode } from "../_shared/error-response.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AI Model Version Tracking
const AI_MODEL_VERSION = "gemini-2.5-flash-2026-02";
const PROMPT_VERSION = 2;

interface TradeQualityRequest {
  tradeSetup: {
    pair: string;
    direction: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    timeframe: string;
    rr: number;
  };
  confluenceData: {
    confluences_detected: number;
    confluences_required: number;
    overall_confidence: number;
    verdict: string;
  };
  positionSizing: {
    position_size: number;
    risk_amount: number;
    risk_percent: number;
    capital_deployment_percent: number;
  };
  emotionalState: string;
  confidenceLevel: number;
  userStats?: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
  };
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

    const body: TradeQualityRequest = await req.json();
    const { tradeSetup, confluenceData, positionSizing, emotionalState, confidenceLevel, userStats } = body;

    const systemPrompt = `You are an expert trading coach and risk analyst. Your job is to evaluate trade quality and provide a final recommendation.

Consider all factors:
1. Setup Quality - R:R ratio, price levels, timeframe
2. Confluence Score - How many confluences are met
3. Position Sizing - Risk per trade, capital deployment
4. Risk Management - Stop loss placement, risk parameters
5. Emotional State - Trader's mental state
6. Historical Performance - Past win rate and patterns

Provide an honest, constructive assessment. Be direct about concerns but supportive. Use the function to return structured analysis.`;

    const userPrompt = `Evaluate this trade for final execution decision:

TRADE SETUP:
- Pair: ${tradeSetup.pair}
- Direction: ${tradeSetup.direction}
- Entry: ${tradeSetup.entryPrice}, SL: ${tradeSetup.stopLoss}, TP: ${tradeSetup.takeProfit}
- Timeframe: ${tradeSetup.timeframe}
- R:R Ratio: 1:${tradeSetup.rr.toFixed(2)}

CONFLUENCE VALIDATION:
- Confluences Met: ${confluenceData.confluences_detected}/${confluenceData.confluences_required} required
- AI Confluence Confidence: ${confluenceData.overall_confidence}%
- Confluence Verdict: ${confluenceData.verdict}

POSITION SIZING:
- Position Size: ${positionSizing.position_size}
- Risk Amount: $${positionSizing.risk_amount.toFixed(2)}
- Risk %: ${positionSizing.risk_percent.toFixed(2)}%
- Capital Deployed: ${positionSizing.capital_deployment_percent.toFixed(1)}%

TRADER STATE:
- Emotional State: ${emotionalState}
- Self-Assessed Confidence: ${confidenceLevel}/10

${userStats ? `HISTORICAL STATS:
- Win Rate: ${userStats.winRate}%
- Avg Win: $${userStats.avgWin.toFixed(2)}
- Avg Loss: $${userStats.avgLoss.toFixed(2)}
- Total Trades: ${userStats.totalTrades}` : 'No historical stats available (new trader)'}

Provide your quality assessment and recommendation.`;

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
              name: "report_trade_quality",
              description: "Report the trade quality assessment",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Overall quality score 1-10",
                  },
                  confidence: {
                    type: "number",
                    description: "AI confidence in this assessment 0-100",
                  },
                  factors: {
                    type: "array",
                    description: "Key factors contributing to the score",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Factor name" },
                        score: { type: "number", description: "Factor score 1-10" },
                        weight: { type: "number", description: "Factor weight 0-1" },
                        impact: { 
                          type: "string", 
                          enum: ["positive", "negative", "neutral"],
                          description: "Impact on overall score",
                        },
                        description: { type: "string", description: "Brief explanation" },
                      },
                      required: ["name", "score", "weight", "impact", "description"],
                      additionalProperties: false,
                    },
                  },
                  recommendation: {
                    type: "string",
                    enum: ["execute", "wait", "skip"],
                    description: "Final recommendation",
                  },
                  reasoning: {
                    type: "string",
                    description: "Detailed reasoning for the recommendation (2-3 sentences)",
                  },
                },
                required: ["score", "confidence", "factors", "recommendation", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_trade_quality" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return createErrorResponse(
          "Rate limits exceeded, please try again later.",
          429,
          ErrorCode.RATE_LIMITED
        );
      }
      if (response.status === 402) {
        return createErrorResponse(
          "Payment required, please add funds to your workspace.",
          402,
          ErrorCode.PAYMENT_REQUIRED
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return createErrorResponse("AI gateway error", 500, ErrorCode.AI_ERROR);
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call response from AI");
    }

    const qualityResult = JSON.parse(toolCall.function.arguments);

    // Add AI version metadata
    const resultWithMetadata = {
      ...qualityResult,
      _metadata: {
        model: AI_MODEL_VERSION,
        generatedAt: new Date().toISOString(),
        promptVersion: PROMPT_VERSION,
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: resultWithMetadata,
        ai_model_version: AI_MODEL_VERSION,
        ai_analysis_generated_at: resultWithMetadata._metadata.generatedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Trade quality error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500,
      ErrorCode.INTERNAL_ERROR
    );
  }
});
