import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { sanitizeString } from '../_shared/sanitize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation constants
const MAX_TRADES = 500;
const MAX_STRATEGIES = 50;
const MAX_QUESTION_LENGTH = 2000;

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

    const body = await req.json();

    // === INPUT VALIDATION ===
    const trades = Array.isArray(body.trades) ? body.trades.slice(0, MAX_TRADES) : [];
    const strategies = Array.isArray(body.strategies) ? body.strategies.slice(0, MAX_STRATEGIES) : [];
    const question = sanitizeString(body.question || '', MAX_QUESTION_LENGTH);
    const marketContext = body.marketContext && typeof body.marketContext === 'object' ? body.marketContext : null;
    // === END VALIDATION ===

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate trading statistics
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t: any) => t.result === 'win').length;
    const losingTrades = trades.filter((t: any) => t.result === 'loss').length;
    const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;
    const totalPnL = trades.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0);
    const avgWin = winningTrades > 0 
      ? trades.filter((t: any) => t.result === 'win').reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0) / winningTrades 
      : 0;
    const avgLoss = losingTrades > 0 
      ? Math.abs(trades.filter((t: any) => t.result === 'loss').reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0) / losingTrades)
      : 0;
    const avgRR = trades.length > 0 
      ? (trades.reduce((sum: number, t: any) => sum + (Number(t.rr) || 0), 0) / trades.length).toFixed(2)
      : 0;

    // Group by strategy
    const strategyStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
    trades.forEach((trade: any) => {
      trade.strategyIds?.forEach((stratId: string) => {
        if (typeof stratId !== 'string') return;
        const key = stratId.slice(0, 36); // UUID max length
        if (!strategyStats[key]) strategyStats[key] = { wins: 0, losses: 0, pnl: 0 };
        if (trade.result === 'win') strategyStats[key].wins++;
        else if (trade.result === 'loss') strategyStats[key].losses++;
        strategyStats[key].pnl += Number(trade.pnl) || 0;
      });
    });

    // Group by market condition
    const conditionStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
    trades.forEach((trade: any) => {
      const cond = sanitizeString(trade.marketCondition || 'Unknown', 50);
      if (!conditionStats[cond]) conditionStats[cond] = { wins: 0, losses: 0, pnl: 0 };
      if (trade.result === 'win') conditionStats[cond].wins++;
      else if (trade.result === 'loss') conditionStats[cond].losses++;
      conditionStats[cond].pnl += Number(trade.pnl) || 0;
    });

    // Group by direction
    const directionStats = { LONG: { wins: 0, losses: 0, pnl: 0 }, SHORT: { wins: 0, losses: 0, pnl: 0 } };
    trades.forEach((trade: any) => {
      const dir = trade.direction as 'LONG' | 'SHORT';
      if (directionStats[dir]) {
        if (trade.result === 'win') directionStats[dir].wins++;
        else if (trade.result === 'loss') directionStats[dir].losses++;
        directionStats[dir].pnl += Number(trade.pnl) || 0;
      }
    });

    // Build market context section
    let marketContextSection = '';
    if (marketContext) {
      marketContextSection = `
CURRENT MARKET CONDITIONS:
- Fear & Greed Index: ${Number(marketContext.fearGreed?.value) || 'N/A'} (${sanitizeString(marketContext.fearGreed?.label || 'Unknown', 30)})
- Market Sentiment: ${sanitizeString(marketContext.overall || 'neutral', 20)}
- Recommendation: ${sanitizeString(marketContext.recommendation || 'N/A', 200)}
- BTC Trend: ${sanitizeString(marketContext.btcTrend?.direction || 'neutral', 20)} (${Number(marketContext.btcTrend?.change24h) > 0 ? '+' : ''}${(Number(marketContext.btcTrend?.change24h) || 0).toFixed(2)}%)
- Macro Sentiment: ${sanitizeString(marketContext.macroSentiment || 'cautious', 20)}
- BTC Dominance: ${(Number(marketContext.btcDominance) || 0).toFixed(1)}%

Consider these market conditions when giving advice.`;
    }

    const systemPrompt = `You are an expert trading analyst and coach. Your role is to analyze trading journal data and provide actionable insights.
${marketContextSection}
TRADING DATA SUMMARY:
- Total Trades: ${totalTrades}
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}
- Win Rate: ${winRate}%
- Total P&L: $${totalPnL.toFixed(2)}
- Average Win: $${avgWin.toFixed(2)}
- Average Loss: $${avgLoss.toFixed(2)}
- Profit Factor: ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}
- Average R:R Ratio: ${avgRR}

STRATEGY PERFORMANCE:
${Object.entries(strategyStats).slice(0, 20).map(([id, stats]) => {
  const strategy = strategies.find((s: any) => s.id === id);
  const total = stats.wins + stats.losses;
  const wr = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : 0;
  return `- ${sanitizeString(strategy?.name || id, 50)}: ${stats.wins}W/${stats.losses}L (${wr}% WR), P&L: $${stats.pnl.toFixed(2)}`;
}).join('\n')}

MARKET CONDITION PERFORMANCE:
${Object.entries(conditionStats).slice(0, 10).map(([cond, stats]) => {
  const total = stats.wins + stats.losses;
  const wr = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : 0;
  return `- ${cond}: ${stats.wins}W/${stats.losses}L (${wr}% WR), P&L: $${stats.pnl.toFixed(2)}`;
}).join('\n')}

DIRECTION PERFORMANCE:
- LONG: ${directionStats.LONG.wins}W/${directionStats.LONG.losses}L, P&L: $${directionStats.LONG.pnl.toFixed(2)}
- SHORT: ${directionStats.SHORT.wins}W/${directionStats.SHORT.losses}L, P&L: $${directionStats.SHORT.pnl.toFixed(2)}

RECENT TRADES:
${trades.slice(0, 10).map((t: any) => 
  `- ${sanitizeString(t.pair || '', 20)} ${sanitizeString(t.direction || '', 10)}: ${sanitizeString(t.result?.toUpperCase() || '', 10)}, P&L: $${Number(t.pnl) || 0}, R:R: ${(Number(t.rr) || 0).toFixed(2)}, Market: ${sanitizeString(t.marketCondition || '', 30)}`
).join('\n') || 'No trades available'}

GUIDELINES:
- Identify patterns in winning vs losing trades
- Point out which strategies are working best
- Suggest improvements based on the data
- Highlight any concerning patterns or habits
- Be constructive and encouraging
- Always respond in English
- Format responses clearly with sections when appropriate
- Be specific with numbers and percentages`;

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
          { role: "user", content: question || "Berikan analisis lengkap performa trading saya dan identifikasi pola-pola penting." },
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Trading analysis error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
