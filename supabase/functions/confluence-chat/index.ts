import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Parse trade setup from natural language
function parseTradeSetup(text: string): {
  pair?: string;
  direction?: 'LONG' | 'SHORT';
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
} {
  const result: any = {};
  
  // Extract pair (e.g., BTCUSDT, BTC/USDT, BTC)
  const pairMatch = text.match(/([A-Z]{2,10})(\/)?USDT?/i);
  if (pairMatch) {
    result.pair = pairMatch[0].toUpperCase().replace('/', '');
    if (!result.pair.includes('USDT')) result.pair += 'USDT';
  }
  
  // Extract direction
  if (/\blong\b/i.test(text)) result.direction = 'LONG';
  else if (/\bshort\b/i.test(text)) result.direction = 'SHORT';
  else if (/\bbuy\b/i.test(text) || /\bbeli\b/i.test(text)) result.direction = 'LONG';
  else if (/\bsell\b/i.test(text) || /\bjual\b/i.test(text)) result.direction = 'SHORT';
  
  // Extract prices (entry, SL, TP)
  const entryMatch = text.match(/(?:entry|masuk|di|at)\s*:?\s*\$?(\d+(?:[.,]\d+)?)/i);
  if (entryMatch) result.entry = parseFloat(entryMatch[1].replace(',', '.'));
  
  const slMatch = text.match(/(?:sl|stop ?loss|stop)\s*:?\s*\$?(\d+(?:[.,]\d+)?)/i);
  if (slMatch) result.stopLoss = parseFloat(slMatch[1].replace(',', '.'));
  
  const tpMatch = text.match(/(?:tp|take ?profit|target)\s*:?\s*\$?(\d+(?:[.,]\d+)?)/i);
  if (tpMatch) result.takeProfit = parseFloat(tpMatch[1].replace(',', '.'));
  
  return result;
}

// Calculate R:R ratio
function calculateRR(entry: number, stopLoss: number, takeProfit: number, direction: string): number {
  if (direction === 'LONG') {
    const risk = entry - stopLoss;
    const reward = takeProfit - entry;
    return risk > 0 ? reward / risk : 0;
  } else {
    const risk = stopLoss - entry;
    const reward = entry - takeProfit;
    return risk > 0 ? reward / risk : 0;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, setup } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Parse setup from question if not provided directly
    const parsedSetup = setup || parseTradeSetup(question || '');
    
    // Fetch market data and economic calendar in parallel
    let marketContext = '';
    let calendarContext = '';
    
    if (parsedSetup.pair) {
      try {
        const symbol = parsedSetup.pair.replace('/', '');
        
        const [marketRes, calendarRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/functions/v1/market-insight`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: [symbol] }),
          }),
          fetch(`${SUPABASE_URL}/functions/v1/economic-calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }),
        ]);
        
        const marketData = await marketRes.json();
        const calendarData = await calendarRes.json();
        
        // Process market data
        const assetSignal = marketData.sentiment?.signals?.find((s: any) => 
          s.asset === symbol.replace('USDT', '')
        );
        const assetWhale = marketData.whaleActivity?.find((w: any) => 
          w.asset === symbol.replace('USDT', '')
        );
        const assetVol = marketData.volatility?.find((v: any) => 
          v.asset === symbol.replace('USDT', '')
        );
        
        if (assetSignal) {
          marketContext = `
CURRENT MARKET CONTEXT FOR ${parsedSetup.pair}:
- Price: $${assetSignal.price?.toLocaleString() || 'N/A'}
- 24h Change: ${assetSignal.change24h > 0 ? '+' : ''}${assetSignal.change24h?.toFixed(2) || 0}%
- Trend: ${assetSignal.trend || 'Unknown'}
- Direction Signal: ${assetSignal.direction?.toUpperCase() || 'NEUTRAL'}
- Fear & Greed: ${marketData.sentiment?.fearGreed?.value || 50} (${marketData.sentiment?.fearGreed?.label || 'Neutral'})
- Whale Signal: ${assetWhale?.signal || 'NONE'} (${assetWhale?.confidence || 0}% confidence)
- Volatility: ${assetVol?.level?.toUpperCase() || 'UNKNOWN'} (${assetVol?.value || 0}%)
- Overall Market: ${marketData.sentiment?.overall || 'neutral'}`;
        }
        
        // Process calendar data for event warnings
        if (calendarData.impactSummary?.hasHighImpact) {
          const todayEvent = calendarData.todayHighlight?.event;
          const riskLevel = calendarData.impactSummary.riskLevel;
          const positionAdj = calendarData.impactSummary.positionAdjustment;
          
          calendarContext = `
⚠️ ECONOMIC CALENDAR WARNING:
- Risk Level: ${riskLevel}
- Recommendation: ${positionAdj === 'reduce_50%' ? 'REDUCE POSITION SIZE BY 50%' : positionAdj === 'reduce_30%' ? 'REDUCE POSITION SIZE BY 30%' : 'NORMAL SIZE OK'}`;
          
          if (todayEvent) {
            calendarContext += `
- Today's Event: ${todayEvent.event} (${todayEvent.country})
- Time Until: ${calendarData.todayHighlight.timeUntil || 'Soon'}
- AI Impact: ${todayEvent.cryptoImpact?.toUpperCase() || 'UNKNOWN'} - ${todayEvent.aiPrediction || 'No prediction available'}`;
          }
          
          // List upcoming high-impact events
          const upcomingHigh = calendarData.events?.filter((e: any) => e.importance === 'high').slice(0, 3);
          if (upcomingHigh && upcomingHigh.length > 0) {
            calendarContext += `\n- Upcoming High-Impact Events:`;
            upcomingHigh.forEach((e: any) => {
              calendarContext += `\n  • ${e.event} (${new Date(e.date).toLocaleDateString()})`;
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch context:', e);
      }
    }

    // Calculate R:R if we have enough data
    let rrRatio = '';
    if (parsedSetup.entry && parsedSetup.stopLoss && parsedSetup.takeProfit && parsedSetup.direction) {
      const rr = calculateRR(parsedSetup.entry, parsedSetup.stopLoss, parsedSetup.takeProfit, parsedSetup.direction);
      rrRatio = `\nCALCULATED R:R RATIO: 1:${rr.toFixed(2)}`;
    }

    const systemPrompt = `You are an expert trade setup validator and quality analyst. Your job is to evaluate trading setups and provide confluence analysis with quality scores.

PARSED TRADE SETUP:
- Pair: ${parsedSetup.pair || 'Not specified'}
- Direction: ${parsedSetup.direction || 'Not specified'}
- Entry: ${parsedSetup.entry || 'Not specified'}
- Stop Loss: ${parsedSetup.stopLoss || 'Not specified'}  
- Take Profit: ${parsedSetup.takeProfit || 'Not specified'}${rrRatio}
${marketContext}
${calendarContext}

QUALITY SCORING CRITERIA (Score each 0-2):
1. R:R Ratio (≥1:2 = 2pts, ≥1:1.5 = 1pt, <1:1 = 0pt)
2. Trend Alignment (with market direction)
3. Whale/Volume Confirmation
4. Volatility Appropriateness
5. Fear & Greed Zone (not extreme)
6. Economic Calendar Safety (no high-impact events = +1pt, event within 2h = -1pt)

RESPONSE FORMAT:
1. Setup Summary - Confirm what you understood
2. Quality Score - X/12 with breakdown (now includes calendar factor)
3. Confluence Analysis - What aligns, what doesn't
4. ⚠️ Calendar Alert - If any high-impact events are near, warn strongly
5. Risk Assessment - Key concerns
6. Recommendation - Proceed, Wait, or Avoid with reasoning

If setup details are missing, ask for them specifically.
Use Bahasa Indonesia if the user writes in Indonesian.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question || "Tolong analisis setup trading saya." },
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
    console.error("Confluence chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
