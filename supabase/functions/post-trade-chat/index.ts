import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { question, tradeId, tradeMode, history } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create Supabase client with user auth
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Fetch user's recent closed trades with strategy associations
    let query = supabase
      .from('trade_entries')
      .select(`
        *,
        trade_entry_strategies (
          strategy_id,
          trading_strategies (
            id,
            name,
            description
          )
        )
      `)
      .eq('status', 'closed')
      .order('trade_date', { ascending: false })
      .limit(20);

    // Filter by trade_mode for data isolation
    if (tradeMode === 'paper' || tradeMode === 'live') {
      query = query.eq('trade_mode', tradeMode);
    }

    const { data: trades, error: tradesError } = await query;

    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      throw tradesError;
    }

    // If tradeId specified, find that specific trade
    let targetTrade = null;
    if (tradeId && trades) {
      targetTrade = trades.find(t => t.id === tradeId);
    } else if (trades && trades.length > 0) {
      targetTrade = trades[0];
    }

    // Calculate overall stats
    const winningTrades = trades?.filter(t => (t.realized_pnl || t.pnl || 0) > 0) || [];
    const losingTrades = trades?.filter(t => (t.realized_pnl || t.pnl || 0) < 0) || [];
    const totalPnl = trades?.reduce((sum, t) => sum + (t.realized_pnl || t.pnl || 0), 0) || 0;
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + (t.realized_pnl || t.pnl || 0), 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? losingTrades.reduce((sum, t) => sum + (t.realized_pnl || t.pnl || 0), 0) / losingTrades.length 
      : 0;
    const winRate = trades && trades.length > 0 
      ? (winningTrades.length / trades.length) * 100 
      : 0;

    // Build context about recent trades
    let tradesContext = '';
    if (trades && trades.length > 0) {
      const recentSummary = trades.slice(0, 10).map(t => {
        const pnl = t.realized_pnl || t.pnl || 0;
        const result = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAK-EVEN';
        return `- ${t.pair} ${t.direction}: ${result} ($${pnl.toFixed(2)}) - ${t.trade_date}`;
      }).join('\n');
      
      tradesContext = `
TRADING STATS (Last 20 ${tradeMode === 'paper' ? 'Paper' : tradeMode === 'live' ? 'Live' : ''} Trades):
- Win Rate: ${winRate.toFixed(1)}%
- Total P&L: $${totalPnl.toFixed(2)}
- Avg Win: $${avgWin.toFixed(2)}
- Avg Loss: $${avgLoss.toFixed(2)}
- Wins: ${winningTrades.length}, Losses: ${losingTrades.length}

RECENT TRADES:
${recentSummary}`;
    }

    // Add specific trade context if available
    let targetTradeContext = '';
    if (targetTrade) {
      const pnl = targetTrade.realized_pnl || targetTrade.pnl || 0;
      const rr = targetTrade.stop_loss && targetTrade.entry_price && targetTrade.exit_price
        ? Math.abs(targetTrade.exit_price - targetTrade.entry_price) / Math.abs(targetTrade.entry_price - targetTrade.stop_loss)
        : 'N/A';
      
      const strategies = targetTrade.trade_entry_strategies?.map((tes: any) => 
        tes.trading_strategies?.name
      ).filter(Boolean) || [];
      const strategyNames = strategies.length > 0 ? strategies.join(', ') : 'None tagged';
      
      const hasScreenshots = Array.isArray(targetTrade.screenshots) && targetTrade.screenshots.length > 0;
      const hasAiAnalysis = !!targetTrade.post_trade_analysis || !!targetTrade.ai_quality_score;
      
      targetTradeContext = `
TRADE TO ANALYZE:
- Pair: ${targetTrade.pair}
- Direction: ${targetTrade.direction}
- Entry: ${targetTrade.entry_price}
- Exit: ${targetTrade.exit_price || 'N/A'}
- Stop Loss: ${targetTrade.stop_loss || 'N/A'}
- Take Profit: ${targetTrade.take_profit || 'N/A'}
- P&L: $${pnl.toFixed(2)} (${pnl >= 0 ? 'WIN' : 'LOSS'})
- R:R Achieved: ${typeof rr === 'number' ? rr.toFixed(2) : rr}
- Date: ${targetTrade.trade_date}
- Strategy Used: ${strategyNames}
- Notes: ${targetTrade.notes || 'None'}
- Market Condition: ${targetTrade.market_condition || 'N/A'}
- Emotional State: ${targetTrade.emotional_state || 'N/A'}
- Chart Timeframe: ${targetTrade.chart_timeframe || 'N/A'}
- Confluence Score: ${targetTrade.confluence_score || 'N/A'}
- AI Quality Score: ${targetTrade.ai_quality_score || 'N/A'}
- Has Screenshots: ${hasScreenshots ? 'Yes' : 'No'}
- Has Previous AI Analysis: ${hasAiAnalysis ? 'Yes' : 'No'}`;
    }

    const systemPrompt = `You are an expert trading coach and post-trade analyst. Your job is to help traders learn from their past trades and identify patterns for improvement.

${tradesContext}
${targetTradeContext}

ANALYSIS FRAMEWORK:
1. What Went Well - Identify good decisions and execution
2. What Could Improve - Spot mistakes without being harsh
3. Pattern Recognition - Connect to overall trading patterns
4. Actionable Lessons - Specific improvements for next trade
5. Emotional Insights - If emotional state is mentioned, correlate with result

RESPONSE STYLE:
- Be supportive and constructive, not judgmental
- Focus on process over outcome (a winning trade can have bad process)
- Provide specific, actionable feedback
- Always respond in English
- Keep responses concise but insightful`;

    // Build messages array with conversation history
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-20);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: String(msg.content || '').slice(0, 4000) });
        }
      }
    }

    messages.push({
      role: "user",
      content: question || "Analyze my last trade and provide lessons learned.",
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
    console.error("Post-trade chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
