import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  DEFAULT_WATCHLIST_SYMBOLS,
  API_LIMITS,
  TECHNICAL_ANALYSIS,
  WHALE_DETECTION,
  VOLATILITY_THRESHOLDS,
  SCORE_WEIGHTS,
  CONFIDENCE_CONFIG,
  classifySentiment,
  getVolatilityLevel,
  getVolatilityStatus,
  normalizeVolatilityDisplay,
} from "../_shared/constants/market-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper functions
function calculateRSI(closes: number[], period = TECHNICAL_ANALYSIS.RSI_PERIOD): number {
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
  for (let i = 1; i < closes.length && i < TECHNICAL_ANALYSIS.VOLATILITY_LOOKBACK; i++) {
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

async function fetchBinanceKlines(symbol: string, interval = '1h', limit = API_LIMITS.KLINES_LIMIT): Promise<(string | number)[][]> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error(`Binance klines returned non-array for ${symbol}:`, data);
      return [];
    }
    
    return data;
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
  const ma50 = calculateMA(closes, TECHNICAL_ANALYSIS.MA_SHORT_PERIOD);
  const ma200 = calculateMA(closes, TECHNICAL_ANALYSIS.MA_LONG_PERIOD);
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
  if (klines.length < TECHNICAL_ANALYSIS.MIN_KLINES_FOR_WHALE) {
    return { signal: 'NONE', volumeChange: 0, confidence: 30 };
  }
  
  // Compare last 24h volume to previous 24h
  const recentVolume = klines.slice(0, 24).reduce((sum, k) => sum + parseFloat(String(k[5] || '0')), 0);
  const prevVolume = klines.slice(24, 48).reduce((sum, k) => sum + parseFloat(String(k[5] || '0')), 0);
  
  const volumeChange = prevVolume > 0 ? ((recentVolume - prevVolume) / prevVolume) * 100 : 0;
  
  let signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NONE' = 'NONE';
  let confidence = WHALE_DETECTION.BASE_CONFIDENCE;
  
  // High volume + price up = accumulation
  if (volumeChange > WHALE_DETECTION.VOLUME_SPIKE_THRESHOLD && change24h > WHALE_DETECTION.PRICE_UP_THRESHOLD) {
    signal = 'ACCUMULATION';
    confidence = WHALE_DETECTION.SPIKE_CONFIDENCE + Math.min(20, volumeChange / 5);
  }
  // High volume + price down = distribution
  else if (volumeChange > WHALE_DETECTION.VOLUME_SPIKE_THRESHOLD && change24h < WHALE_DETECTION.PRICE_DOWN_THRESHOLD) {
    signal = 'DISTRIBUTION';
    confidence = WHALE_DETECTION.SPIKE_CONFIDENCE + Math.min(20, volumeChange / 5);
  }
  // Very high volume spike
  else if (volumeChange > WHALE_DETECTION.EXTREME_VOLUME_SPIKE) {
    signal = change24h > 0 ? 'ACCUMULATION' : 'DISTRIBUTION';
    confidence = 60;
  }
  
  return { signal, volumeChange, confidence: Math.min(WHALE_DETECTION.MAX_CONFIDENCE, confidence) };
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

// Helper to process single symbol data
async function processSymbol(symbol: string) {
  const [klines, ticker] = await Promise.all([
    fetchBinanceKlines(symbol, '1h', API_LIMITS.KLINES_LIMIT),
    fetchBinanceTicker(symbol),
  ]);
  
  // Guard against empty klines (invalid symbol or API error)
  if (!klines || klines.length === 0) {
    console.warn(`No klines data for ${symbol}, using defaults`);
    const asset = symbol.replace('USDT', '');
    return {
      symbol,
      asset,
      klines: [],
      closes: [],
      ticker,
      signal: { trend: 'No data available', direction: 'neutral' as const, score: 0.5 },
      volatility: 0,
      whale: { signal: 'NONE' as const, volumeChange: 0, confidence: 30 },
      valid: false,
    };
  }
  
  const closes = klines.map((k) => parseFloat(String(k[4]))).reverse();
  const asset = symbol.replace('USDT', '');
  
  const signal = generateTechnicalSignal(asset, closes, ticker.price, ticker.change);
  const volatility = calculateVolatility(closes);
  const whale = calculateWhaleSignal(klines, ticker.change);
  
  return {
    symbol,
    asset,
    klines,
    closes,
    ticker,
    signal,
    volatility,
    whale,
    valid: true,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for dynamic symbols
    let requestedSymbols = [...DEFAULT_WATCHLIST_SYMBOLS];
    
    try {
      const body = await req.json();
      if (body.symbols && Array.isArray(body.symbols) && body.symbols.length > 0) {
        // Validate and normalize symbols
        requestedSymbols = body.symbols
          .map((s: string) => s.toUpperCase())
          .filter((s: string) => s.endsWith('USDT'));
        
        // Limit symbols to prevent abuse
        requestedSymbols = requestedSymbols.slice(0, API_LIMITS.MAX_SYMBOLS_PER_REQUEST);
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log('Fetching market insight data for symbols:', requestedSymbols);
    
    // Fetch global data + all symbol data in parallel
    const [fearGreed, globalData, ...symbolsData] = await Promise.all([
      fetchFearGreedIndex(),
      fetchCoinGeckoGlobal(),
      ...requestedSymbols.map(processSymbol),
    ]);

    // Build response arrays from symbol data
    const signals: Array<{ asset: string; trend: string; direction: 'up' | 'down' | 'neutral'; price: number; change24h: number }> = [];
    const volatilityData: Array<{ asset: string; level: string; value: number; status: string }> = [];
    const opportunities: Array<{ pair: string; confidence: number; direction: string; reason: string }> = [];
    const whaleActivity: Array<{ asset: string; signal: string; volumeChange24h: number; exchangeFlowEstimate: string; confidence: number; description: string }> = [];

    symbolsData.forEach((data) => {
      // Technical signals
      signals.push({
        asset: data.asset,
        trend: data.signal.trend,
        direction: data.signal.direction,
        price: data.ticker.price,
        change24h: data.ticker.change,
      });
      
      // Volatility - using centralized functions
      volatilityData.push({
        asset: data.asset,
        level: getVolatilityLevel(data.volatility),
        value: normalizeVolatilityDisplay(data.volatility),
        status: getVolatilityStatus(data.volatility),
      });
      
      // Opportunities
      opportunities.push({
        pair: `${data.asset}/USDT`,
        confidence: Math.round(data.signal.score * 100),
        direction: data.signal.direction === 'up' ? 'LONG' : data.signal.direction === 'down' ? 'SHORT' : 'WAIT',
        reason: data.signal.trend,
      });
      
      // Whale activity
      whaleActivity.push({
        asset: data.asset,
        signal: data.whale.signal,
        volumeChange24h: data.whale.volumeChange,
        exchangeFlowEstimate: data.whale.volumeChange > 20 ? (data.ticker.change > 0 ? 'outflow' : 'inflow') : 'balanced',
        confidence: data.whale.confidence,
        description: data.whale.signal === 'ACCUMULATION'
          ? `High volume with price increase. Whales accumulating ${data.asset}.`
          : data.whale.signal === 'DISTRIBUTION'
          ? `High volume with price decrease. Distribution detected for ${data.asset}.`
          : `Normal trading activity for ${data.asset}. No clear whale signal.`,
      });
    });

    // Sort opportunities by confidence
    opportunities.sort((a, b) => b.confidence - a.confidence);

    // Calculate overall sentiment scores using centralized weights
    const technicalScore = symbolsData.reduce((sum, d) => sum + d.signal.score, 0) / symbolsData.length;
    
    const onChainScore = symbolsData.reduce((sum, d) => {
      return sum + (d.whale.signal === 'ACCUMULATION' ? 0.7 : d.whale.signal === 'DISTRIBUTION' ? 0.3 : 0.5);
    }, 0) / symbolsData.length;
    
    const fearGreedNormalized = fearGreed.value / 100;
    const macroScore = (fearGreedNormalized * 0.6) + (globalData.marketCapChange > 0 ? 0.6 : 0.4) * 0.4;
    const socialScore = (technicalScore + macroScore) / 2;
    
    const overallScore = 
      technicalScore * SCORE_WEIGHTS.TECHNICAL + 
      onChainScore * SCORE_WEIGHTS.ON_CHAIN + 
      socialScore * SCORE_WEIGHTS.SOCIAL + 
      macroScore * SCORE_WEIGHTS.MACRO;

    // Use centralized sentiment classification
    const overallSentiment = classifySentiment(overallScore);

    const agreement = Math.abs(technicalScore - onChainScore) < CONFIDENCE_CONFIG.AGREEMENT_THRESHOLD && 
                      Math.abs(technicalScore - macroScore) < CONFIDENCE_CONFIG.AGREEMENT_THRESHOLD;
    const distanceFromNeutral = Math.abs(overallScore - 0.5) * 2;
    const dataQuality = symbolsData.every(d => d.klines.length > CONFIDENCE_CONFIG.MIN_KLINES_FOR_HIGH_QUALITY) 
      ? CONFIDENCE_CONFIG.HIGH_DATA_QUALITY 
      : CONFIDENCE_CONFIG.LOW_DATA_QUALITY;
    
    const confidence = Math.round(
      (agreement ? CONFIDENCE_CONFIG.AGREEMENT_BONUS : CONFIDENCE_CONFIG.DISAGREEMENT_BONUS) +
      distanceFromNeutral * CONFIDENCE_CONFIG.DISTANCE_WEIGHT +
      dataQuality * CONFIDENCE_CONFIG.DATA_QUALITY_WEIGHT +
      CONFIDENCE_CONFIG.BASE_CONFIDENCE
    );

    const response = {
      sentiment: {
        overall: overallSentiment,
        confidence: Math.min(CONFIDENCE_CONFIG.MAX_CONFIDENCE, Math.max(CONFIDENCE_CONFIG.MIN_CONFIDENCE, confidence)),
        signals,
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
      requestedSymbols,
      lastUpdated: new Date().toISOString(),
      dataQuality: Math.round(dataQuality * 100),
    };

    console.log('Market insight generated successfully for', requestedSymbols.length, 'symbols');

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
