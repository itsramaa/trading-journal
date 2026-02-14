import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchCoinGeckoGlobal(): Promise<{
  btcDominance: number;
  marketCapChange: number;
  totalMarketCap: number;
  totalVolume: number;
}> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/global');
    const data = await response.json();
    return {
      btcDominance: data.data?.market_cap_percentage?.btc || 50,
      marketCapChange: data.data?.market_cap_change_percentage_24h_usd || 0,
      totalMarketCap: data.data?.total_market_cap?.usd || 0,
      totalVolume: data.data?.total_volume?.usd || 0,
    };
  } catch (error) {
    console.error('CoinGecko global error:', error);
    return { btcDominance: 50, marketCapChange: 0, totalMarketCap: 0, totalVolume: 0 };
  }
}

async function fetchBinanceFundingRates(): Promise<{ btc: number; eth: number }> {
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT'),
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=ETHUSDT'),
    ]);
    
    const btcData = await btcRes.json();
    const ethData = await ethRes.json();
    
    return {
      btc: parseFloat(btcData.lastFundingRate || '0') * 100,
      eth: parseFloat(ethData.lastFundingRate || '0') * 100,
    };
  } catch (error) {
    console.error('Binance funding rates error:', error);
    return { btc: 0, eth: 0 };
  }
}

async function fetchFearGreedIndex(): Promise<number> {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    const data = await response.json();
    return parseInt(data.data?.[0]?.value || '50');
  } catch (error) {
    console.error('Fear & Greed fetch error:', error);
    return 50;
  }
}

async function generateAISummary(
  macroData: {
    btcDominance: number;
    marketCapChange: number;
    fearGreed: number;
    fundingRates: { btc: number; eth: number };
  }
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    // Fallback to rule-based summary
    return generateRuleBasedSummary(macroData);
  }

  try {
    const prompt = `You are a crypto market analyst. Based on the following data, provide a concise 2-3 sentence market analysis in English:

BTC Dominance: ${macroData.btcDominance.toFixed(1)}%
Market Cap Change 24h: ${macroData.marketCapChange > 0 ? '+' : ''}${macroData.marketCapChange.toFixed(2)}%
Fear & Greed Index: ${macroData.fearGreed}
BTC Funding Rate: ${macroData.fundingRates.btc.toFixed(4)}%
ETH Funding Rate: ${macroData.fundingRates.eth.toFixed(4)}%

Focus on actionable insights for traders. Be specific about market conditions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional crypto market analyst providing concise, actionable market summaries." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI summary request failed:', response.status);
      return generateRuleBasedSummary(macroData);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateRuleBasedSummary(macroData);
  } catch (error) {
    console.error('AI summary error:', error);
    return generateRuleBasedSummary(macroData);
  }
}

function generateRuleBasedSummary(macroData: {
  btcDominance: number;
  marketCapChange: number;
  fearGreed: number;
  fundingRates: { btc: number; eth: number };
}): string {
  const parts: string[] = [];

  // Market cap trend
  if (macroData.marketCapChange > 3) {
    parts.push('Market cap rising significantly, indicating capital inflow into crypto.');
  } else if (macroData.marketCapChange < -3) {
    parts.push('Market cap declining, investors pulling capital from crypto.');
  } else {
    parts.push('Market in consolidation phase with sideways movement.');
  }

  // BTC Dominance
  if (macroData.btcDominance > 55) {
    parts.push('BTC dominance high, altcoins may underperform.');
  } else if (macroData.btcDominance < 45) {
    parts.push('BTC dominance low, potential altseason ahead.');
  }

  // Fear & Greed
  if (macroData.fearGreed > 75) {
    parts.push('Extreme greed — consider taking profits.');
  } else if (macroData.fearGreed < 25) {
    parts.push('Extreme fear — potential accumulation opportunity for long-term.');
  }

  // Funding rates
  if (macroData.fundingRates.btc > 0.03) {
    parts.push('Funding rate high, long positions crowded — watch for pullback.');
  } else if (macroData.fundingRates.btc < -0.01) {
    parts.push('Funding rate negative, shorts dominant — potential short squeeze.');
  }

  return parts.join(' ');
}

function calculateMacroSentiment(
  marketCapChange: number,
  fearGreed: number,
  fundingBtc: number
): 'bullish' | 'bearish' | 'cautious' {
  let score = 0;

  // Market cap trend (weight: 35%)
  if (marketCapChange > 2) score += 0.35;
  else if (marketCapChange < -2) score -= 0.35;
  else score += (marketCapChange / 10) * 0.35;

  // Fear & Greed (weight: 35%)
  const fgNormalized = (fearGreed - 50) / 50; // -1 to 1
  score += fgNormalized * 0.35;

  // Funding rate sentiment (weight: 30%)
  // Moderate positive funding = healthy, extreme = cautious
  if (fundingBtc > 0 && fundingBtc < 0.02) score += 0.20;
  else if (fundingBtc > 0.05) score -= 0.15; // Crowded longs
  else if (fundingBtc < -0.02) score += 0.15; // Potential squeeze

  if (score > 0.2) return 'bullish';
  if (score < -0.2) return 'bearish';
  return 'cautious';
}

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

    console.log('Fetching macro analysis data...');

    // Fetch all data in parallel
    const [globalData, fundingRates, fearGreed] = await Promise.all([
      fetchCoinGeckoGlobal(),
      fetchBinanceFundingRates(),
      fetchFearGreedIndex(),
    ]);

    // Calculate overall sentiment
    const overallSentiment = calculateMacroSentiment(
      globalData.marketCapChange,
      fearGreed,
      fundingRates.btc
    );

    // Generate correlations data
    // Note: DXY, S&P 500, Treasury, VIX require paid APIs or proxies
    // Using crypto-native indicators as proxies
    const correlations = [
      {
        name: 'BTC Dominance',
        value: globalData.btcDominance,
        change: 0, // Would need historical data
        impact: globalData.btcDominance > 55 
          ? 'High dominance, capital flowing to BTC over alts'
          : globalData.btcDominance < 45
          ? 'Low dominance, altcoin season possible'
          : 'Balanced market, watch for rotation',
      },
      {
        name: 'Total Market Cap',
        value: globalData.totalMarketCap / 1e12, // In trillions
        change: globalData.marketCapChange,
        impact: globalData.marketCapChange > 0
          ? 'Capital inflow, risk-on sentiment'
          : 'Capital outflow, risk-off sentiment',
      },
      {
        name: 'BTC Funding Rate',
        value: fundingRates.btc,
        change: 0,
        impact: fundingRates.btc > 0.03
          ? 'High funding, longs crowded - caution'
          : fundingRates.btc < -0.01
          ? 'Negative funding, short squeeze risk'
          : 'Healthy funding rates',
      },
      {
        name: 'Fear & Greed',
        value: fearGreed,
        change: 0,
        impact: fearGreed > 70
          ? 'Greed zone - consider profit taking'
          : fearGreed < 30
          ? 'Fear zone - accumulation opportunity'
          : 'Neutral sentiment',
      },
    ];

    // Generate AI summary
    const aiSummary = await generateAISummary({
      btcDominance: globalData.btcDominance,
      marketCapChange: globalData.marketCapChange,
      fearGreed,
      fundingRates,
    });

    const response = {
      macro: {
        overallSentiment,
        correlations,
        aiSummary,
        lastUpdated: new Date().toISOString(),
        marketCapTrend: globalData.marketCapChange > 1 ? 'up' : globalData.marketCapChange < -1 ? 'down' : 'stable',
        btcDominance: globalData.btcDominance,
      },
      lastUpdated: new Date().toISOString(),
    };

    console.log('Macro analysis generated successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Macro analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
