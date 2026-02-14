import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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

    const { question, userContext, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch market data from existing edge functions
    const [sentimentRes, macroRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/functions/v1/market-insight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({}),
      }),
      fetch(`${SUPABASE_URL}/functions/v1/macro-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({}),
      }),
    ]);

    const sentimentData = await sentimentRes.json();
    const macroData = await macroRes.json();

    // Build user context section if provided
    let userContextSection = '';
    if (userContext) {
      const openPositionsText = userContext.openPositions?.length > 0
        ? userContext.openPositions.map((p: any) => `${p.pair} ${p.direction} (entry: $${p.entryPrice})`).join(', ')
        : 'None';
      const strategiesText = userContext.favoriteStrategies?.length > 0
        ? userContext.favoriteStrategies.map((s: any) => s.name).join(', ')
        : 'None';
      
      userContextSection = `
USER TRADING CONTEXT:
- Total Closed Trades: ${userContext.totalTrades || 0}
- Open Positions: ${openPositionsText}
- Active Strategies: ${strategiesText}

When providing analysis, relate it to the user's open positions and strategies when relevant.
`;
    }

    // Build rich context for LLM
    const systemPrompt = `You are an expert crypto market analyst providing real-time market insights. Always respond in English.

CURRENT MARKET DATA:
- Fear & Greed Index: ${sentimentData.sentiment?.fearGreed?.value || 'N/A'} (${sentimentData.sentiment?.fearGreed?.label || 'Unknown'})
- Overall Sentiment: ${sentimentData.sentiment?.overall || 'neutral'}
- Confidence: ${sentimentData.sentiment?.confidence || 0}%
- Technical Score: ${sentimentData.sentiment?.technicalScore || 50}%
- On-Chain Score: ${sentimentData.sentiment?.onChainScore || 50}%
- Macro Score: ${sentimentData.sentiment?.macroScore || 50}%
- Recommendation: ${sentimentData.sentiment?.recommendation || 'No recommendation available'}

MARKET SIGNALS:
${(sentimentData.sentiment?.signals || []).map((s: any) => 
  `- ${s.asset}: ${s.direction.toUpperCase()} (${s.change24h > 0 ? '+' : ''}${s.change24h?.toFixed(2)}%), $${s.price?.toLocaleString()}\n  ${s.trend}`
).join('\n') || 'No signals available'}

WHALE ACTIVITY:
${(sentimentData.whaleActivity || []).map((w: any) => 
  `- ${w.asset}: ${w.signal} (${w.confidence}% confidence)\n  Volume change: ${w.volumeChange24h > 0 ? '+' : ''}${w.volumeChange24h?.toFixed(1)}%\n  ${w.description}`
).join('\n') || 'No whale activity data'}

VOLATILITY:
${(sentimentData.volatility || []).map((v: any) => 
  `- ${v.asset}: ${v.level.toUpperCase()} (${v.value}%) - ${v.status}`
).join('\n') || 'No volatility data'}

TRADING OPPORTUNITIES:
${(sentimentData.opportunities || []).slice(0, 5).map((o: any) => 
  `- ${o.pair}: ${o.direction} (${o.confidence}% confidence)\n  Reason: ${o.reason}`
).join('\n') || 'No opportunities identified'}

MACRO ANALYSIS:
- BTC Dominance: ${macroData.macro?.btcDominance?.toFixed(1) || 'N/A'}%
- Market Cap Trend: ${macroData.macro?.marketCapTrend || 'stable'}
- Overall Macro Sentiment: ${macroData.macro?.overallSentiment || 'cautious'}
- AI Summary: ${macroData.macro?.aiSummary || 'No summary available'}

CORRELATIONS:
${(macroData.macro?.correlations || []).map((c: any) => 
  `- ${c.name}: ${typeof c.value === 'number' ? c.value.toFixed(2) : c.value}${c.change ? ` (${c.change > 0 ? '+' : ''}${c.change.toFixed(2)}%)` : ''}\n  Impact: ${c.impact}`
).join('\n') || 'No correlation data'}
${userContextSection}
GUIDELINES:
- Provide actionable insights based on the current market data
- Highlight key risk factors and opportunities
- Use specific numbers and percentages from the data
- For trading recommendations, always mention risk management
- If user has open positions, relate the analysis to those positions
- Be concise but thorough
- Always respond in English`;

    // Build messages array with conversation history
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided (limit to last 20 messages to avoid token overflow)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-20);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: String(msg.content || '').slice(0, 4000) });
        }
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: question || "What are the current crypto market conditions? Provide a complete analysis.",
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Market analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
