/**
 * AI Pre-flight Edge Function
 * Analyzes if it's a good time to trade based on historical patterns
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PreflightRequest {
  pair: string;
  direction: 'LONG' | 'SHORT';
  userHistory: {
    pair: string;
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
  }[];
  currentMarketConditions?: {
    trend?: string;
    volatility?: string;
  };
}

interface PreflightResponse {
  verdict: 'proceed' | 'caution' | 'skip';
  confidence: number;
  winPrediction: number;
  similarSetups: {
    count: number;
    avgWin: number;
    avgLoss: number;
  };
  marketRegime: string;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { pair, direction, userHistory, currentMarketConditions } = await req.json() as PreflightRequest;

    // Find historical performance for this pair
    const pairHistory = userHistory.find(h => h.pair.toUpperCase() === pair.toUpperCase());
    
    // Calculate base prediction from historical data
    let winPrediction = 50; // Default 50% if no history
    let confidence = 30;
    let reasoning = '';
    let marketRegime = 'Unknown';

    if (pairHistory && pairHistory.totalTrades >= 5) {
      winPrediction = pairHistory.winRate;
      confidence = Math.min(30 + pairHistory.totalTrades * 2, 85);
      reasoning = `Based on ${pairHistory.totalTrades} historical trades with ${pairHistory.pair}, your win rate is ${pairHistory.winRate.toFixed(1)}%.`;
    } else if (pairHistory) {
      reasoning = `Limited data: only ${pairHistory.totalTrades} trades with ${pair}. Prediction less reliable.`;
      confidence = 20;
    } else {
      reasoning = `No historical trades found for ${pair}. Using general market analysis.`;
    }

    // Adjust based on market conditions if provided
    if (currentMarketConditions) {
      if (currentMarketConditions.trend) {
        marketRegime = currentMarketConditions.trend;
        
        // Boost prediction if direction aligns with trend
        if (
          (direction === 'LONG' && currentMarketConditions.trend === 'bullish') ||
          (direction === 'SHORT' && currentMarketConditions.trend === 'bearish')
        ) {
          winPrediction = Math.min(winPrediction + 10, 90);
          reasoning += ` Trade direction aligns with ${currentMarketConditions.trend} market trend.`;
        } else if (
          (direction === 'LONG' && currentMarketConditions.trend === 'bearish') ||
          (direction === 'SHORT' && currentMarketConditions.trend === 'bullish')
        ) {
          winPrediction = Math.max(winPrediction - 15, 20);
          reasoning += ` ⚠️ Trade direction is against the ${currentMarketConditions.trend} market trend.`;
        }
      }

      if (currentMarketConditions.volatility === 'high') {
        confidence = Math.max(confidence - 10, 20);
        reasoning += ' High volatility detected - prediction confidence reduced.';
      }
    }

    // Determine verdict
    let verdict: PreflightResponse['verdict'];
    if (winPrediction >= 60 && confidence >= 50) {
      verdict = 'proceed';
    } else if (winPrediction < 40 || confidence < 30) {
      verdict = 'skip';
    } else {
      verdict = 'caution';
    }

    const response: PreflightResponse = {
      verdict,
      confidence,
      winPrediction,
      similarSetups: {
        count: pairHistory?.totalTrades || 0,
        avgWin: pairHistory?.avgWin || 0,
        avgLoss: pairHistory?.avgLoss || 0,
      },
      marketRegime,
      reasoning,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Preflight error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
