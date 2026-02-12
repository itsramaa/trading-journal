import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RECENT_TRADES = 50;
const MAX_STRATEGIES = 20;

function sanitizeString(str: unknown, maxLength: number): string {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>]/g, '');
}

function safeNumber(val: unknown, fallback = 0): number {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTH CHECK ===
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // === END AUTH CHECK ===

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // === INPUT VALIDATION ===
    const portfolioStatus = {
      totalBalance: safeNumber(body.portfolioStatus?.totalBalance),
      deployedCapital: safeNumber(body.portfolioStatus?.deployedCapital),
      openPositions: Math.min(Math.max(0, Math.round(safeNumber(body.portfolioStatus?.openPositions))), 100),
    };

    const riskStatus = {
      currentDailyLoss: safeNumber(body.riskStatus?.currentDailyLoss),
      maxDailyLoss: safeNumber(body.riskStatus?.maxDailyLoss),
      tradingAllowed: typeof body.riskStatus?.tradingAllowed === 'boolean' ? body.riskStatus.tradingAllowed : true,
    };

    const recentTrades = (Array.isArray(body.recentTrades) ? body.recentTrades : [])
      .slice(0, MAX_RECENT_TRADES)
      .map((t: any) => ({
        pair: sanitizeString(t.pair, 20),
        direction: sanitizeString(t.direction, 10),
        result: sanitizeString(t.result, 10),
        pnl: safeNumber(t.pnl),
        date: sanitizeString(t.date, 30),
      }));

    const strategies = (Array.isArray(body.strategies) ? body.strategies : [])
      .slice(0, MAX_STRATEGIES)
      .map((s: any) => ({
        name: sanitizeString(s.name, 100),
        trades: Math.round(safeNumber(s.trades)),
        winRate: safeNumber(s.winRate),
      }));

    // === END VALIDATION ===

    // Always output in English per project language standard
    const systemPrompt = `You are an AI trading assistant helping traders analyze their portfolio. Provide concise, actionable, and constructive insights in English.

Focus on:
1. Current portfolio status and deployment
2. Risk warnings if any
3. Recommendations based on trading patterns
4. Best setups based on historical performance

Use the provided function to return structured analysis.`;

    // Calculate some metrics
    const totalPnl = recentTrades.reduce((sum: number, t: any) => sum + t.pnl, 0);
    const wins = recentTrades.filter((t: any) => t.result === 'win').length;
    const winRate = recentTrades.length > 0 ? (wins / recentTrades.length * 100).toFixed(1) : 0;
    const deploymentPercent = portfolioStatus.totalBalance > 0 
      ? (portfolioStatus.deployedCapital / portfolioStatus.totalBalance * 100).toFixed(1)
      : 0;

    const bestStrategy = strategies.length > 0 
      ? strategies.reduce((best: any, s: any) => s.winRate > best.winRate ? s : best, strategies[0])
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
${recentTrades.slice(0, 5).map((t: any) => `- ${t.pair} ${t.direction}: ${t.result} ($${t.pnl.toFixed(2)})`).join('\n')}

STRATEGIES:
${strategies.length > 0 
  ? strategies.map((s: any) => `- ${s.name}: ${s.trades} trades, ${s.winRate.toFixed(1)}% win rate`).join('\n')
  : 'No strategies defined yet'}

Best performing strategy: ${bestStrategy ? `${bestStrategy.name} (${bestStrategy.winRate.toFixed(1)}%)` : 'N/A'}

Provide dashboard insights in English.`;

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
                  summary: { type: "string", description: "Brief portfolio status summary (2-3 sentences)" },
                  recommendations: { type: "array", description: "List of 2-4 actionable recommendations", items: { type: "string" } },
                  riskAlerts: { type: "array", description: "List of risk warnings if any", items: { type: "string" } },
                  bestSetups: {
                    type: "array",
                    description: "Top 2-3 best setups",
                    items: {
                      type: "object",
                      properties: {
                        pair: { type: "string" },
                        strategy: { type: "string" },
                        confidence: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["pair", "strategy", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                  overallSentiment: { type: "string", enum: ["bullish", "bearish", "neutral", "cautious"] },
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
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call response from AI");
      return new Response(JSON.stringify({ error: "Failed to generate insights", success: false }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insightsResult = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: insightsResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Dashboard insights error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
