import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper functions
function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[0] || 0;
  const slice = closes.slice(0, period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateVolatility(closes: number[]): number {
  if (closes.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < closes.length && i < 20; i++) {
    returns.push((closes[i - 1] - closes[i]) / closes[i]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

async function fetchFearGreedIndex(): Promise<{ value: number; label: string; timestamp: string }> {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    const data = await response.json();
    const fng = data.data?.[0];
    return {
      value: parseInt(fng?.value || '50'),
      label: fng?.value_classification || 'Neutral',
      timestamp: new Date(parseInt(fng?.timestamp || '0') * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Fear & Greed fetch error:', error);
    return { value: 50, label: 'Neutral', timestamp: new Date().toISOString() };
  }
}

async function fetchBinanceKlines(symbol: string, interval = '1h', limit = 100): Promise<(string | number)[][]> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    return await response.json();
  } catch (error) {
    console.error(`Binance klines error for ${symbol}:`, error);
    return [];
  }
}

async function fetchBinanceTicker(symbol: string): Promise<{ price: number; change: number }> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const data = await response.json();
    return {
      price: parseFloat(data.lastPrice || '0'),
      change: parseFloat(data.priceChangePercent || '0'),
    };
  } catch (error) {
    console.error(`Binance ticker error for ${symbol}:`, error);
    return { price: 0, change: 0 };
  }
}

async function fetchCoinGeckoGlobal(): Promise<{ btcDominance: number; marketCapChange: number }> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/global');
    const data = await response.json();
    return {
      btcDominance: data.data?.market_cap_percentage?.btc || 50,
      marketCapChange: data.data?.market_cap_change_percentage_24h_usd || 0,
    };
  } catch (error) {
    console.error('CoinGecko global error:', error);
    return { btcDominance: 50, marketCapChange: 0 };
  }
}

function generateTechnicalSignal(
  asset: string, 
  closes: number[], 
  price: number, 
  change24h: number
): { trend: string; direction: 'up' | 'down' | 'neutral'; score: number } {
  const ma50 = calculateMA(closes, 50);
  const ma200 = calculateMA(closes, 200);
  const rsi = calculateRSI(closes);
  
  let score = 0.5;
  let trend = '';
  let direction: 'up' | 'down' | 'neutral' = 'neutral';
  
  // MA Analysis
  if (price > ma50 && ma50 > ma200) {
    score += 0.2;
    trend = 'Strong uptrend above MAs';
    direction = 'up';
  } else if (price < ma50 && ma50 < ma200) {
    score -= 0.2;
    trend = 'Downtrend below MAs';
    direction = 'down';
  } else if (price > ma50) {
    score += 0.1;
    trend = 'Above MA50, testing higher levels';
    direction = 'up';
  } else {
    trend = 'Mixed signals near moving averages';
  }
  
  // RSI Analysis
  if (rsi > 70) {
    score -= 0.1;
    trend += ', RSI overbought';
  } else if (rsi < 30) {
    score += 0.1;
    trend += ', RSI oversold - potential bounce';
  } else if (rsi > 50) {
    score += 0.05;
  }
  
  // Momentum from 24h change
  if (change24h > 5) {
    score += 0.1;
    trend = `Strong momentum +${change24h.toFixed(1)}%, ` + trend;
  } else if (change24h < -5) {
    score -= 0.1;
    trend = `Weakness ${change24h.toFixed(1)}%, ` + trend;
  }
  
  return { trend, direction, score: Math.max(0, Math.min(1, score)) };
}

function calculateWhaleSignal(
  klines: (string | number)[][],
  change24h: number
): { signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NONE'; volumeChange: number; confidence: number } {
  if (klines.length < 48) {
    return { signal: 'NONE', volumeChange: 0, confidence: 30 };
  }
  
  // Compare last 24h volume to previous 24h
  const recentVolume = klines.slice(0, 24).reduce((sum, k) => sum + parseFloat(String(k[5] || '0')), 0);
  const prevVolume = klines.slice(24, 48).reduce((sum, k) => sum + parseFloat(String(k[5] || '0')), 0);
  
  const volumeChange = prevVolume > 0 ? ((recentVolume - prevVolume) / prevVolume) * 100 : 0;
  
  let signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NONE' = 'NONE';
  let confidence = 40;
  
  // High volume + price up = accumulation
  if (volumeChange > 30 && change24h > 2) {
    signal = 'ACCUMULATION';
    confidence = 70 + Math.min(20, volumeChange / 5);
  }
  // High volume + price down = distribution
  else if (volumeChange > 30 && change24h < -2) {
    signal = 'DISTRIBUTION';
    confidence = 70 + Math.min(20, volumeChange / 5);
  }
  // Very high volume spike
  else if (volumeChange > 50) {
    signal = change24h > 0 ? 'ACCUMULATION' : 'DISTRIBUTION';
    confidence = 60;
  }
  
  return { signal, volumeChange, confidence: Math.min(95, confidence) };
}

function generateRecommendation(
  sentimentScore: number,
  confidence: number,
  fearGreed: number
): string {
  if (confidence < 50) {
    return 'Wait for clearer market conditions. Confidence too low for high-conviction trades.';
  }
  
  if (fearGreed > 75 && sentimentScore > 0.65) {
    return 'Extreme greed detected. Consider taking profits and reducing leverage.';
  }
  
  if (fearGreed < 25 && sentimentScore < 0.45) {
    return 'Extreme fear presents buying opportunities. Watch for reversal signals.';
  }
  
  if (sentimentScore > 0.65) {
    return 'Market conditions favor LONG positions with tight stops.';
  }
  
  if (sentimentScore < 0.45) {
    return 'Risk-off conditions. Consider SHORT positions or reduce exposure.';
  }
  
  return 'Market consolidating. Wait for breakout confirmation before entering.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching market insight data...');
    
    // Fetch all data in parallel
    const [
      fearGreed,
      btcKlines,
      ethKlines,
      solKlines,
      btcTicker,
      ethTicker,
      solTicker,
      globalData,
    ] = await Promise.all([
      fetchFearGreedIndex(),
      fetchBinanceKlines('BTCUSDT', '1h', 200),
      fetchBinanceKlines('ETHUSDT', '1h', 200),
      fetchBinanceKlines('SOLUSDT', '1h', 200),
      fetchBinanceTicker('BTCUSDT'),
      fetchBinanceTicker('ETHUSDT'),
      fetchBinanceTicker('SOLUSDT'),
      fetchCoinGeckoGlobal(),
    ]);

    // Extract closing prices (index 4 in klines)
    const btcCloses = btcKlines.map((k) => parseFloat(String(k[4]))).reverse();
    const ethCloses = ethKlines.map((k) => parseFloat(String(k[4]))).reverse();
    const solCloses = solKlines.map((k) => parseFloat(String(k[4]))).reverse();

    // Generate technical signals
    const btcSignal = generateTechnicalSignal('BTC', btcCloses, btcTicker.price, btcTicker.change);
    const ethSignal = generateTechnicalSignal('ETH', ethCloses, ethTicker.price, ethTicker.change);
    const solSignal = generateTechnicalSignal('SOL', solCloses, solTicker.price, solTicker.change);

    // Calculate volatility
    const btcVol = calculateVolatility(btcCloses);
    const ethVol = calculateVolatility(ethCloses);
    const solVol = calculateVolatility(solCloses);

    // Whale signals
    const btcWhale = calculateWhaleSignal(btcKlines, btcTicker.change);
    const ethWhale = calculateWhaleSignal(ethKlines, ethTicker.change);
    const solWhale = calculateWhaleSignal(solKlines, solTicker.change);

    // Calculate weighted sentiment score
    // (Tech×0.30) + (OnChain×0.25) + (Social×0.25) + (Macro×0.20)
    const technicalScore = (btcSignal.score + ethSignal.score + solSignal.score) / 3;
    
    // OnChain proxy: use whale signals as indicator
    const onChainScore = 
      (btcWhale.signal === 'ACCUMULATION' ? 0.7 : btcWhale.signal === 'DISTRIBUTION' ? 0.3 : 0.5) * 0.5 +
      (ethWhale.signal === 'ACCUMULATION' ? 0.7 : ethWhale.signal === 'DISTRIBUTION' ? 0.3 : 0.5) * 0.3 +
      (solWhale.signal === 'ACCUMULATION' ? 0.7 : solWhale.signal === 'DISTRIBUTION' ? 0.3 : 0.5) * 0.2;
    
    // Macro score from F&G and market cap trend
    const fearGreedNormalized = fearGreed.value / 100;
    const macroScore = (fearGreedNormalized * 0.6) + (globalData.marketCapChange > 0 ? 0.6 : 0.4) * 0.4;
    
    // Social score proxy (using momentum as substitute)
    const socialScore = (technicalScore + macroScore) / 2;
    
    const overallScore = 
      technicalScore * 0.30 + 
      onChainScore * 0.25 + 
      socialScore * 0.25 + 
      macroScore * 0.20;

    // Determine sentiment label
    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (overallScore > 0.60) overallSentiment = 'bullish';
    else if (overallScore < 0.45) overallSentiment = 'bearish';

    // Calculate confidence
    const agreement = Math.abs(technicalScore - onChainScore) < 0.15 && Math.abs(technicalScore - macroScore) < 0.15;
    const distanceFromNeutral = Math.abs(overallScore - 0.5) * 2;
    const dataQuality = btcKlines.length > 100 ? 0.95 : 0.7;
    
    const confidence = Math.round(
      (agreement ? 0.4 : 0.2) * 100 +
      distanceFromNeutral * 30 +
      dataQuality * 20 +
      10 // Base confidence
    );

    // Generate volatility assessment
    const volatilityData = [
      {
        asset: 'BTC',
        level: btcVol > 3 ? 'high' : btcVol > 1.5 ? 'medium' : 'low',
        value: Math.min(100, Math.round(btcVol * 15)),
        status: btcVol > 3 ? 'Elevated - caution' : btcVol > 1.5 ? 'Normal range' : 'Low volatility',
      },
      {
        asset: 'ETH',
        level: ethVol > 4 ? 'high' : ethVol > 2 ? 'medium' : 'low',
        value: Math.min(100, Math.round(ethVol * 12)),
        status: ethVol > 4 ? 'Elevated - caution' : ethVol > 2 ? 'Normal range' : 'Low volatility',
      },
      {
        asset: 'SOL',
        level: solVol > 5 ? 'high' : solVol > 2.5 ? 'medium' : 'low',
        value: Math.min(100, Math.round(solVol * 10)),
        status: solVol > 5 ? 'Elevated - caution' : solVol > 2.5 ? 'Normal range' : 'Low volatility',
      },
    ];

    // Generate trading opportunities
    const opportunities = [
      {
        pair: 'BTC/USDT',
        confidence: Math.round(btcSignal.score * 100),
        direction: btcSignal.direction === 'up' ? 'LONG' : btcSignal.direction === 'down' ? 'SHORT' : 'WAIT',
        reason: btcSignal.trend,
      },
      {
        pair: 'ETH/USDT',
        confidence: Math.round(ethSignal.score * 100),
        direction: ethSignal.direction === 'up' ? 'LONG' : ethSignal.direction === 'down' ? 'SHORT' : 'WAIT',
        reason: ethSignal.trend,
      },
      {
        pair: 'SOL/USDT',
        confidence: Math.round(solSignal.score * 100),
        direction: solSignal.direction === 'up' ? 'LONG' : solSignal.direction === 'down' ? 'SHORT' : 'WAIT',
        reason: solSignal.trend,
      },
    ].sort((a, b) => b.confidence - a.confidence);

    // Generate whale activity
    const whaleActivity = [
      {
        asset: 'BTC',
        signal: btcWhale.signal,
        volumeChange24h: btcWhale.volumeChange,
        exchangeFlowEstimate: btcWhale.volumeChange > 20 ? (btcTicker.change > 0 ? 'outflow' : 'inflow') : 'balanced',
        confidence: btcWhale.confidence,
        description: btcWhale.signal === 'ACCUMULATION' 
          ? `High volume with price increase. Whales accumulating.`
          : btcWhale.signal === 'DISTRIBUTION'
          ? `High volume with price decrease. Distribution detected.`
          : `Normal trading activity. No clear whale signal.`,
      },
      {
        asset: 'ETH',
        signal: ethWhale.signal,
        volumeChange24h: ethWhale.volumeChange,
        exchangeFlowEstimate: ethWhale.volumeChange > 20 ? (ethTicker.change > 0 ? 'outflow' : 'inflow') : 'balanced',
        confidence: ethWhale.confidence,
        description: ethWhale.signal === 'ACCUMULATION'
          ? `Significant volume spike with bullish price action.`
          : ethWhale.signal === 'DISTRIBUTION'
          ? `Heavy selling pressure with elevated volume.`
          : `Stable trading patterns. Monitor for breakout.`,
      },
      {
        asset: 'SOL',
        signal: solWhale.signal,
        volumeChange24h: solWhale.volumeChange,
        exchangeFlowEstimate: solWhale.volumeChange > 20 ? (solTicker.change > 0 ? 'outflow' : 'inflow') : 'balanced',
        confidence: solWhale.confidence,
        description: solWhale.signal === 'ACCUMULATION'
          ? `Smart money accumulating. Watch for momentum.`
          : solWhale.signal === 'DISTRIBUTION'
          ? `Large holders reducing positions.`
          : `Consolidation phase. Wait for direction.`,
      },
    ];

    const response = {
      sentiment: {
        overall: overallSentiment,
        confidence: Math.min(95, Math.max(30, confidence)),
        signals: [
          { asset: 'BTC', trend: btcSignal.trend, direction: btcSignal.direction, price: btcTicker.price, change24h: btcTicker.change },
          { asset: 'ETH', trend: ethSignal.trend, direction: ethSignal.direction, price: ethTicker.price, change24h: ethTicker.change },
          { asset: 'SOL', trend: solSignal.trend, direction: solSignal.direction, price: solTicker.price, change24h: solTicker.change },
        ],
        fearGreed,
        recommendation: generateRecommendation(overallScore, confidence, fearGreed.value),
        technicalScore: Math.round(technicalScore * 100),
        onChainScore: Math.round(onChainScore * 100),
        macroScore: Math.round(macroScore * 100),
        lastUpdated: new Date().toISOString(),
      },
      volatility: volatilityData,
      opportunities,
      whaleActivity,
      lastUpdated: new Date().toISOString(),
      dataQuality: Math.round(dataQuality * 100),
    };

    console.log('Market insight generated successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Market insight error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
