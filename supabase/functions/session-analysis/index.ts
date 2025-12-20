import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionTrade {
  pair: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number;
  result: string | null;
  rr: number | null;
  notes: string | null;
  strategyNames: string[];
}

interface SessionData {
  sessionDate: string;
  startTime: string;
  endTime: string | null;
  mood: string;
  rating: number;
  marketCondition: string | null;
  notes: string | null;
  tags: string[];
  trades: SessionTrade[];
}

function analyzeMoodPerformance(session: SessionData): string {
  const { mood, trades, rating } = session;
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const wins = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : 0;

  const moodImpact = mood === 'positive' 
    ? 'You started this session with a positive mindset.' 
    : mood === 'negative' 
      ? 'You entered this session with a negative emotional state, which may have affected your decisions.'
      : 'You maintained a neutral emotional state during this session.';

  const ratingAnalysis = rating >= 4 
    ? `Your self-rating of ${rating}/5 indicates high confidence in your execution.`
    : rating <= 2
      ? `Your self-rating of ${rating}/5 suggests you felt uncertain or made mistakes during this session.`
      : `Your self-rating of ${rating}/5 shows moderate satisfaction with your performance.`;

  return `
MOOD & PERFORMANCE CORRELATION:
- Session Mood: ${mood.toUpperCase()}
- Self-Rating: ${rating}/5
- Session Result: ${totalPnl >= 0 ? 'Profitable' : 'Loss'} (${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)})
- Win Rate: ${winRate}% (${wins}W/${losses}L)

${moodImpact}
${ratingAnalysis}

${mood === 'negative' && totalPnl < 0 
  ? 'WARNING: Negative mood correlated with losses in this session. Consider taking breaks or reducing position sizes when feeling negative.'
  : mood === 'positive' && totalPnl > 0
    ? 'INSIGHT: Positive mood correlated with profitable trading. Maintain routines that put you in a good mental state.'
    : ''}
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const sessionData = session as SessionData;
    const trades = sessionData.trades || [];
    
    // Calculate session statistics
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'win').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgRR = trades.length > 0 
      ? (trades.reduce((sum, t) => sum + (t.rr || 0), 0) / trades.length)
      : 0;
    
    // Group by direction
    const longTrades = trades.filter(t => t.direction === 'LONG');
    const shortTrades = trades.filter(t => t.direction === 'SHORT');
    const longPnl = longTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const shortPnl = shortTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // Pairs traded
    const pairsTraded = [...new Set(trades.map(t => t.pair))];

    // Strategies used
    const strategiesUsed = [...new Set(trades.flatMap(t => t.strategyNames || []))];

    const moodAnalysis = analyzeMoodPerformance(sessionData);

    const systemPrompt = `You are an expert trading psychologist and performance coach. Your role is to analyze individual trading sessions and provide insights on the correlation between emotional state, market conditions, and trading performance.

SESSION DETAILS:
- Date: ${sessionData.sessionDate}
- Time: ${sessionData.startTime} - ${sessionData.endTime || 'ongoing'}
- Mood at Start: ${sessionData.mood}
- Self-Rating: ${sessionData.rating}/5
- Market Condition: ${sessionData.marketCondition || 'Not specified'}
- Session Notes: ${sessionData.notes || 'None'}
- Tags: ${sessionData.tags?.join(', ') || 'None'}

SESSION STATISTICS:
- Total Trades: ${totalTrades}
- Wins: ${wins} | Losses: ${losses}
- Win Rate: ${totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0}%
- Total P&L: $${totalPnl.toFixed(2)}
- Average R:R: ${avgRR.toFixed(2)}
- LONG P&L: $${longPnl.toFixed(2)} (${longTrades.length} trades)
- SHORT P&L: $${shortPnl.toFixed(2)} (${shortTrades.length} trades)

PAIRS TRADED: ${pairsTraded.join(', ') || 'None'}
STRATEGIES USED: ${strategiesUsed.join(', ') || 'None'}

${moodAnalysis}

INDIVIDUAL TRADES:
${trades.map((t, i) => 
  `${i + 1}. ${t.pair} ${t.direction}: ${t.result?.toUpperCase() || 'N/A'}, P&L: $${t.pnl?.toFixed(2) || 0}, R:R: ${t.rr?.toFixed(2) || 'N/A'}${t.notes ? ` - "${t.notes}"` : ''}`
).join('\n') || 'No trades in this session'}

GUIDELINES:
- Analyze the correlation between the trader's mood and their performance
- Identify patterns in winning vs losing trades within this session
- Point out if certain pairs or directions performed better
- Highlight any concerning emotional patterns
- Provide specific actionable advice for future sessions
- Be constructive, empathetic, and encouraging
- Use Bahasa Indonesia if the user writes in Indonesian
- Format responses clearly with sections`;

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
          { role: "user", content: question || "Berikan analisis lengkap sesi trading ini, termasuk korelasi mood dengan performa dan saran untuk sesi berikutnya." },
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
    console.error("Session analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
