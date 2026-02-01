import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createErrorResponse, ErrorCode } from "../_shared/error-response.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AI Model Version Tracking
const AI_MODEL_VERSION = "gemini-2.5-flash-2026-02";
const PROMPT_VERSION = 2;

interface EntryRule {
  id: string;
  type: string;
  condition: string;
  indicator?: string;
  is_mandatory: boolean;
}

interface DetectionRequest {
  pair: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  strategyRules: EntryRule[];
  strategyName: string;
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

    const body: DetectionRequest = await req.json();
    const { pair, direction, entryPrice, stopLoss, takeProfit, timeframe, strategyRules, strategyName } = body;

    // Build analysis prompt
    const rulesDescription = strategyRules.map(rule => 
      `- ${rule.condition} (Type: ${rule.type}${rule.indicator ? `, Indicator: ${rule.indicator}` : ''}, Mandatory: ${rule.is_mandatory})`
    ).join('\n');

    const systemPrompt = `You are a professional trading analyst assistant. Your job is to analyze trade setups and validate confluences.

Given a trade setup and strategy entry rules, you need to:
1. Evaluate each entry rule and determine if it would likely be met based on the trade parameters
2. Assign a confidence score (0-100) to each confluence detection
3. Provide an overall verdict on whether to proceed with the trade

Be realistic but constructive. Consider:
- Price action relative to entry, SL, TP levels
- The direction (LONG/SHORT) and market dynamics
- Common technical patterns for the given pair and timeframe

Always return structured data using the provided function.`;

    const userPrompt = `Analyze this trade setup for ${strategyName} strategy:

Trade Setup:
- Pair: ${pair}
- Direction: ${direction}
- Entry Price: ${entryPrice}
- Stop Loss: ${stopLoss}
- Take Profit: ${takeProfit}
- Timeframe: ${timeframe}
- Risk/Reward: 1:${Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss)}

Entry Rules to Validate:
${rulesDescription}

Analyze each rule and determine if the confluence would be detected for this setup. Consider typical market conditions and technical patterns.`;

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
              name: "report_confluence_analysis",
              description: "Report the confluence analysis results",
              parameters: {
                type: "object",
                properties: {
                  details: {
                    type: "array",
                    description: "Analysis for each entry rule",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Rule ID" },
                        type: { type: "string", description: "Rule type" },
                        name: { type: "string", description: "Rule condition/name" },
                        detected: { type: "boolean", description: "Whether confluence is detected" },
                        description: { type: "string", description: "Explanation of detection" },
                        confidence: { type: "number", description: "Confidence 0-100" },
                        is_mandatory: { type: "boolean", description: "Whether rule is mandatory" },
                      },
                      required: ["id", "type", "name", "detected", "description", "confidence", "is_mandatory"],
                      additionalProperties: false,
                    },
                  },
                  overall_confidence: {
                    type: "number",
                    description: "Overall confidence percentage 0-100",
                  },
                  verdict: {
                    type: "string",
                    enum: ["pass", "fail", "warning"],
                    description: "Overall verdict",
                  },
                  recommendation: {
                    type: "string",
                    description: "Brief recommendation for the trader",
                  },
                },
                required: ["details", "overall_confidence", "verdict", "recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_confluence_analysis" } },
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
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call response from AI");
    }

    const analysisResult = JSON.parse(toolCall.function.arguments);
    
    // Calculate confluences detected vs required
    const confluencesDetected = analysisResult.details.filter((d: any) => d.detected).length;
    const confluencesRequired = strategyRules.filter(r => r.is_mandatory).length;

    // Add AI version metadata
    const resultWithMetadata = {
      ...analysisResult,
      confluences_detected: confluencesDetected,
      confluences_required: confluencesRequired,
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
    console.error("Confluence detection error:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500,
      ErrorCode.INTERNAL_ERROR
    );
  }
});
