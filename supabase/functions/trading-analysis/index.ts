import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trades, strategies, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Calculate trading statistics
    const totalTrades = trades?.length || 0;
    const winningTrades = trades?.filter((t: any) => t.result === 'win')?.length || 0;
    const losingTrades = trades?.filter((t: any) => t.result === 'loss')?.length || 0;
    const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;
    const totalPnL = trades?.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) || 0;
    const avgWin = winningTrades > 0 
      ? trades?.filter((t: any) => t.result === 'win').reduce((sum: number, t: any) => sum + t.pnl, 0) / winningTrades 
      : 0;
    const avgLoss = losingTrades > 0 
      ? Math.abs(trades?.filter((t: any) => t.result === 'loss').reduce((sum: number, t: any) => sum + t.pnl, 0) / losingTrades)
      : 0;
    const avgRR = trades?.length > 0 
      ? (trades.reduce((sum: number, t: any) => sum + (t.rr || 0), 0) / trades.length).toFixed(2)
      : 0;

    // Group by strategy
    const strategyStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
    trades?.forEach((trade: any) => {
      trade.strategyIds?.forEach((stratId: string) => {
        if (!strategyStats[stratId]) {
          strategyStats[stratId] = { wins: 0, losses: 0, pnl: 0 };
        }
        if (trade.result === 'win') strategyStats[stratId].wins++;
        else if (trade.result === 'loss') strategyStats[stratId].losses++;
        strategyStats[stratId].pnl += trade.pnl || 0;
      });
    });

    // Group by market condition
    const conditionStats: Record<string, { wins: number; losses: number; pnl: number }> = {};
    trades?.forEach((trade: any) => {
      const cond = trade.marketCondition || 'Unknown';
      if (!conditionStats[cond]) {
        conditionStats[cond] = { wins: 0, losses: 0, pnl: 0 };
      }
      if (trade.result === 'win') conditionStats[cond].wins++;
      else if (trade.result === 'loss') conditionStats[cond].losses++;
      conditionStats[cond].pnl += trade.pnl || 0;
    });

    // Group by direction
    const directionStats = {
      LONG: { wins: 0, losses: 0, pnl: 0 },
      SHORT: { wins: 0, losses: 0, pnl: 0 }
    };
    trades?.forEach((trade: any) => {
      const dir = trade.direction as 'LONG' | 'SHORT';
      if (directionStats[dir]) {
        if (trade.result === 'win') directionStats[dir].wins++;
        else if (trade.result === 'loss') directionStats[dir].losses++;
        directionStats[dir].pnl += trade.pnl || 0;
      }
    });

    const systemPrompt = `You are an expert trading analyst and coach. Your role is to analyze trading journal data and provide actionable insights to help traders improve their performance.

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
${Object.entries(strategyStats).map(([id, stats]) => {
  const strategy = strategies?.find((s: any) => s.id === id);
  const total = stats.wins + stats.losses;
  const wr = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : 0;
  return `- ${strategy?.name || id}: ${stats.wins}W/${stats.losses}L (${wr}% WR), P&L: $${stats.pnl.toFixed(2)}`;
}).join('\n')}

MARKET CONDITION PERFORMANCE:
${Object.entries(conditionStats).map(([cond, stats]) => {
  const total = stats.wins + stats.losses;
  const wr = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : 0;
  return `- ${cond}: ${stats.wins}W/${stats.losses}L (${wr}% WR), P&L: $${stats.pnl.toFixed(2)}`;
}).join('\n')}

DIRECTION PERFORMANCE:
- LONG: ${directionStats.LONG.wins}W/${directionStats.LONG.losses}L, P&L: $${directionStats.LONG.pnl.toFixed(2)}
- SHORT: ${directionStats.SHORT.wins}W/${directionStats.SHORT.losses}L, P&L: $${directionStats.SHORT.pnl.toFixed(2)}

RECENT TRADES:
${trades?.slice(0, 10).map((t: any) => 
  `- ${t.pair} ${t.direction}: ${t.result?.toUpperCase()}, P&L: $${t.pnl}, R:R: ${t.rr?.toFixed(2)}, Market: ${t.marketCondition}`
).join('\n') || 'No trades available'}

GUIDELINES:
- Identify patterns in winning vs losing trades
- Point out which strategies are working best
- Suggest improvements based on the data
- Highlight any concerning patterns or habits
- Be constructive and encouraging
- Use Bahasa Indonesia if the user writes in Indonesian
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
    console.error("Trading analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
