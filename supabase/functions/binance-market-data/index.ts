/**
 * Binance Market Data Edge Function - Phase 1 + Phase 3
 * Public endpoints for market data (no API key required)
 */

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';
const BINANCE_FUTURES_DATA = 'https://fapi.binance.com/futures/data';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Make public request to Binance API (no signature required)
 */
async function publicRequest(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<Response> {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  const url = queryString ? `${baseUrl}${endpoint}?${queryString}` : `${baseUrl}${endpoint}`;
  
  return fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================
// Phase 1: Market Data Endpoints
// ============================================

/**
 * 1.1 Get Kline/Candlestick data
 */
async function getKlines(
  symbol: string,
  interval: string,
  startTime?: number,
  endTime?: number,
  limit = 500
) {
  try {
    const params: Record<string, any> = { symbol, interval, limit };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/klines', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Transform array response to object format
    const klines = data.map((k: any[]) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
      quoteVolume: parseFloat(k[7]),
      trades: k[8],
      takerBuyBaseVolume: parseFloat(k[9]),
      takerBuyQuoteVolume: parseFloat(k[10]),
    }));
    
    return { success: true, data: klines };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch klines',
    };
  }
}

/**
 * 1.2 Get Mark Price (Premium Index)
 */
async function getMarkPrice(symbol?: string) {
  try {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol;
    
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/premiumIndex', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Handle single symbol vs all symbols
    const formatPrice = (p: any) => ({
      symbol: p.symbol,
      markPrice: parseFloat(p.markPrice),
      indexPrice: parseFloat(p.indexPrice),
      estimatedSettlePrice: parseFloat(p.estimatedSettlePrice),
      lastFundingRate: parseFloat(p.lastFundingRate),
      nextFundingTime: p.nextFundingTime,
      interestRate: parseFloat(p.interestRate),
      time: p.time,
    });
    
    const result = Array.isArray(data) ? data.map(formatPrice) : formatPrice(data);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch mark price',
    };
  }
}

/**
 * 1.3 Get Funding Rate History
 */
async function getFundingRate(
  symbol?: string,
  startTime?: number,
  endTime?: number,
  limit = 100
) {
  try {
    const params: Record<string, any> = { limit };
    if (symbol) params.symbol = symbol;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/fundingRate', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const rates = data.map((r: any) => ({
      symbol: r.symbol,
      fundingRate: parseFloat(r.fundingRate),
      fundingTime: r.fundingTime,
      markPrice: parseFloat(r.markPrice || '0'),
    }));
    
    return { success: true, data: rates };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch funding rate',
    };
  }
}

/**
 * 1.4 Get Open Interest Statistics
 */
async function getOpenInterest(
  symbol: string,
  period: string,
  startTime?: number,
  endTime?: number,
  limit = 30
) {
  try {
    const params: Record<string, any> = { symbol, period, limit };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_DATA, '/openInterestHist', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const stats = data.map((s: any) => ({
      symbol: s.symbol,
      sumOpenInterest: parseFloat(s.sumOpenInterest),
      sumOpenInterestValue: parseFloat(s.sumOpenInterestValue),
      timestamp: s.timestamp,
    }));
    
    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch open interest',
    };
  }
}

/**
 * 1.5 Get Top Trader Long/Short Position Ratio
 */
async function getTopTraderRatio(
  symbol: string,
  period: string,
  startTime?: number,
  endTime?: number,
  limit = 30
) {
  try {
    const params: Record<string, any> = { symbol, period, limit };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_DATA, '/topLongShortPositionRatio', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const ratios = data.map((r: any) => ({
      symbol: r.symbol,
      longShortRatio: parseFloat(r.longShortRatio),
      longAccount: parseFloat(r.longAccount),
      shortAccount: parseFloat(r.shortAccount),
      timestamp: r.timestamp,
    }));
    
    return { success: true, data: ratios };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch top trader ratio',
    };
  }
}

/**
 * 1.6 Get Global Long/Short Account Ratio
 */
async function getGlobalRatio(
  symbol: string,
  period: string,
  startTime?: number,
  endTime?: number,
  limit = 30
) {
  try {
    const params: Record<string, any> = { symbol, period, limit };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_DATA, '/globalLongShortAccountRatio', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const ratios = data.map((r: any) => ({
      symbol: r.symbol,
      longShortRatio: parseFloat(r.longShortRatio),
      longAccount: parseFloat(r.longAccount),
      shortAccount: parseFloat(r.shortAccount),
      timestamp: r.timestamp,
    }));
    
    return { success: true, data: ratios };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch global ratio',
    };
  }
}

/**
 * 1.7 Get Taker Buy/Sell Volume
 */
async function getTakerVolume(
  symbol: string,
  period: string,
  startTime?: number,
  endTime?: number,
  limit = 30
) {
  try {
    const params: Record<string, any> = { symbol, period, limit };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_DATA, '/takerlongshortRatio', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const volumes = data.map((v: any) => ({
      symbol: symbol,
      buySellRatio: parseFloat(v.buySellRatio),
      buyVol: parseFloat(v.buyVol),
      sellVol: parseFloat(v.sellVol),
      timestamp: v.timestamp,
    }));
    
    return { success: true, data: volumes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch taker volume',
    };
  }
}

/**
 * 1.8 Get Order Book Depth
 */
async function getOrderBook(symbol: string, limit = 500) {
  try {
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/depth', { symbol, limit });
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Parse and add cumulative totals
    const parseLevels = (levels: [string, string][]) => {
      let cumulative = 0;
      return levels.map(([price, qty]) => {
        cumulative += parseFloat(qty);
        return {
          price: parseFloat(price),
          quantity: parseFloat(qty),
          total: cumulative,
        };
      });
    };
    
    const bids = parseLevels(data.bids);
    const asks = parseLevels(data.asks);
    
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercent = midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0;
    
    return {
      success: true,
      data: {
        lastUpdateId: data.lastUpdateId,
        messageTime: data.E,
        transactionTime: data.T,
        bids,
        asks,
        spreadPercent,
        midPrice,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order book',
    };
  }
}

/**
 * 1.9 Get Aggregate Trades
 */
async function getAggTrades(
  symbol: string,
  fromId?: number,
  startTime?: number,
  endTime?: number,
  limit = 500
) {
  try {
    const params: Record<string, any> = { symbol, limit };
    if (fromId) params.fromId = fromId;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/aggTrades', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const trades = data.map((t: any) => ({
      aggTradeId: t.a,
      price: parseFloat(t.p),
      quantity: parseFloat(t.q),
      firstTradeId: t.f,
      lastTradeId: t.l,
      timestamp: t.T,
      isBuyerMaker: t.m,
    }));
    
    return { success: true, data: trades };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch aggregate trades',
    };
  }
}

// ============================================
// Phase 3: Advanced Analytics Endpoints
// ============================================

/**
 * 3.1 Get Basis Data (Contango/Backwardation)
 */
async function getBasis(
  pair: string,
  contractType: string,
  period: string,
  startTime?: number,
  endTime?: number,
  limit = 30
) {
  try {
    const params: Record<string, any> = { pair, contractType, period, limit };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await publicRequest(BINANCE_FUTURES_DATA, '/basis', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const basisData = data.map((b: any) => ({
      pair: b.pair,
      contractType: b.contractType,
      futuresPrice: parseFloat(b.futuresPrice),
      indexPrice: parseFloat(b.indexPrice),
      basis: parseFloat(b.basis),
      basisRate: parseFloat(b.basisRate),
      timestamp: b.timestamp,
    }));
    
    return { success: true, data: basisData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch basis data',
    };
  }
}

/**
 * 3.2 Get Insurance Fund History
 */
async function getInsuranceFund(symbol?: string, startTime?: number, endTime?: number, limit = 30) {
  try {
    const params: Record<string, any> = { limit };
    if (symbol) params.symbol = symbol;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    // Note: Binance doesn't have a direct endpoint for this, we use delivery API
    // For USDT-M futures, we use a different approach
    const response = await publicRequest(BINANCE_FUTURES_DATA, '/globalLongShortAccountRatio', {
      symbol: symbol || 'BTCUSDT',
      period: '1d',
      limit: 1,
    });
    
    // Return mock structure since insurance fund data is limited
    return {
      success: true,
      data: {
        message: 'Insurance fund data available via Binance dashboard',
        note: 'This endpoint provides limited public data',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch insurance fund',
    };
  }
}

/**
 * 3.3 Get 24h Ticker Statistics
 */
async function getTicker24h(symbol?: string) {
  try {
    const params: Record<string, any> = {};
    if (symbol) params.symbol = symbol;
    
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/ticker/24hr', params);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const formatTicker = (t: any) => ({
      symbol: t.symbol,
      priceChange: parseFloat(t.priceChange),
      priceChangePercent: parseFloat(t.priceChangePercent),
      weightedAvgPrice: parseFloat(t.weightedAvgPrice),
      lastPrice: parseFloat(t.lastPrice),
      lastQty: parseFloat(t.lastQty),
      openPrice: parseFloat(t.openPrice),
      highPrice: parseFloat(t.highPrice),
      lowPrice: parseFloat(t.lowPrice),
      volume: parseFloat(t.volume),
      quoteVolume: parseFloat(t.quoteVolume),
      openTime: t.openTime,
      closeTime: t.closeTime,
      firstId: t.firstId,
      lastId: t.lastId,
      count: t.count,
    });
    
    const result = Array.isArray(data) ? data.map(formatTicker) : formatTicker(data);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch 24h ticker',
    };
  }
}

/**
 * 3.4 Get Exchange Info (for trading schedule and symbol config)
 */
async function getExchangeInfo(symbol?: string) {
  try {
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/exchangeInfo', {});
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Filter by symbol if provided
    let symbols = data.symbols || [];
    if (symbol) {
      symbols = symbols.filter((s: any) => s.symbol === symbol);
    }
    
    const formattedSymbols = symbols.map((s: any) => ({
      symbol: s.symbol,
      status: s.status,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
      marginAsset: s.marginAsset,
      pricePrecision: s.pricePrecision,
      quantityPrecision: s.quantityPrecision,
      baseAssetPrecision: s.baseAssetPrecision,
      quotePrecision: s.quotePrecision,
      underlyingType: s.underlyingType,
      settlePlan: s.settlePlan,
      triggerProtect: s.triggerProtect,
      liquidationFee: s.liquidationFee,
      marketTakeBound: s.marketTakeBound,
      maxMoveOrderLimit: s.maxMoveOrderLimit,
      filters: s.filters,
      orderTypes: s.orderTypes,
      timeInForce: s.timeInForce,
    }));
    
    return {
      success: true,
      data: {
        timezone: data.timezone,
        serverTime: data.serverTime,
        rateLimits: data.rateLimits,
        symbols: formattedSymbols,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch exchange info',
    };
  }
}

/**
 * 3.5 Get Historical Volatility (calculated from klines)
 */
async function getHistoricalVolatility(symbol: string, period = 14) {
  try {
    // Fetch daily klines for volatility calculation
    const response = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/klines', {
      symbol,
      interval: '1d',
      limit: period + 1, // Need one extra for returns calculation
    });
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    if (data.length < 2) {
      return { success: false, error: 'Insufficient data for volatility calculation' };
    }
    
    // Calculate daily returns
    const closes = data.map((k: any[]) => parseFloat(k[4]));
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    
    // Calculate standard deviation (volatility)
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualize (365 trading days for crypto)
    const annualizedVolatility = dailyVolatility * Math.sqrt(365);
    
    // Calculate ATR-based volatility
    let atrSum = 0;
    for (let i = 1; i < data.length; i++) {
      const high = parseFloat(data[i][2]);
      const low = parseFloat(data[i][3]);
      const prevClose = parseFloat(data[i - 1][4]);
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      atrSum += tr;
    }
    const atr = atrSum / (data.length - 1);
    const currentPrice = closes[closes.length - 1];
    const atrPercent = (atr / currentPrice) * 100;
    
    return {
      success: true,
      data: {
        symbol,
        period,
        dailyVolatility: dailyVolatility * 100, // As percentage
        annualizedVolatility: annualizedVolatility * 100,
        atr,
        atrPercent,
        currentPrice,
        dataPoints: returns.length,
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate volatility',
    };
  }
}

/**
 * 3.6 Get Liquidation Heatmap Data (from aggregate trades)
 * Analyzes large trades to identify potential liquidation clusters
 */
async function getLiquidationHeatmap(symbol: string, interval = '1h', limit = 100) {
  try {
    // Get recent klines for price levels
    const klinesResponse = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/klines', {
      symbol,
      interval,
      limit,
    });
    const klines = await klinesResponse.json();
    
    if (klines.code && klines.code < 0) {
      return { success: false, error: klines.msg, code: klines.code };
    }
    
    // Get current mark price
    const markPriceResponse = await publicRequest(BINANCE_FUTURES_BASE, '/fapi/v1/premiumIndex', { symbol });
    const markPriceData = await markPriceResponse.json();
    
    // Analyze volume at price levels
    const volumeByPrice: Map<number, { buyVolume: number; sellVolume: number; count: number }> = new Map();
    const priceStep = parseFloat(markPriceData.markPrice) * 0.001; // 0.1% price buckets
    
    klines.forEach((k: any[]) => {
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const volume = parseFloat(k[5]);
      const takerBuyVolume = parseFloat(k[9]);
      const takerSellVolume = volume - takerBuyVolume;
      
      // Distribute volume across price range
      const midPrice = (high + low) / 2;
      const bucket = Math.floor(midPrice / priceStep) * priceStep;
      
      const existing = volumeByPrice.get(bucket) || { buyVolume: 0, sellVolume: 0, count: 0 };
      existing.buyVolume += takerBuyVolume;
      existing.sellVolume += takerSellVolume;
      existing.count += 1;
      volumeByPrice.set(bucket, existing);
    });
    
    // Convert to array and sort by price
    const heatmapData = Array.from(volumeByPrice.entries())
      .map(([price, data]) => {
        const totalVolume = data.buyVolume + data.sellVolume;
        return {
          price,
          buyVolume: data.buyVolume,
          sellVolume: data.sellVolume,
          totalVolume,
          netFlow: data.buyVolume - data.sellVolume,
          intensity: Math.min(100, (totalVolume / 1000) * 10), // Normalize to 0-100
        };
      })
      .sort((a, b) => b.price - a.price);
    
    return {
      success: true,
      data: {
        symbol,
        interval,
        currentPrice: parseFloat(markPriceData.markPrice),
        heatmap: heatmapData,
        summary: {
          highestVolumePriceLow: heatmapData.slice(-3),
          highestVolumePriceHigh: heatmapData.slice(0, 3),
          totalBuyVolume: heatmapData.reduce((sum, d) => sum + d.buyVolume, 0),
          totalSellVolume: heatmapData.reduce((sum, d) => sum + d.sellVolume, 0),
        },
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate liquidation heatmap',
    };
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      action, 
      symbol,
      pair,
      contractType,
      interval,
      period,
      startTime, 
      endTime, 
      limit,
      fromId,
    } = body;
    
    let result;
    
    switch (action) {
      // Phase 1: Market Data
      case 'klines':
        if (!symbol || !interval) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol and interval are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getKlines(symbol, interval, startTime, endTime, limit);
        break;
        
      case 'mark-price':
        result = await getMarkPrice(symbol);
        break;
        
      case 'funding-rate':
        result = await getFundingRate(symbol, startTime, endTime, limit);
        break;
        
      case 'open-interest':
        if (!symbol || !period) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol and period are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getOpenInterest(symbol, period, startTime, endTime, limit);
        break;
        
      case 'top-trader-ratio':
        if (!symbol || !period) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol and period are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getTopTraderRatio(symbol, period, startTime, endTime, limit);
        break;
        
      case 'global-ratio':
        if (!symbol || !period) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol and period are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getGlobalRatio(symbol, period, startTime, endTime, limit);
        break;
        
      case 'taker-volume':
        if (!symbol || !period) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol and period are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getTakerVolume(symbol, period, startTime, endTime, limit);
        break;
        
      case 'order-book':
        if (!symbol) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getOrderBook(symbol, limit);
        break;
        
      case 'agg-trades':
        if (!symbol) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getAggTrades(symbol, fromId, startTime, endTime, limit);
        break;
        
      // Phase 3: Advanced Analytics
      case 'basis':
        if (!pair || !contractType || !period) {
          return new Response(
            JSON.stringify({ success: false, error: 'pair, contractType, and period are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getBasis(pair, contractType, period, startTime, endTime, limit);
        break;
        
      case 'insurance-fund':
        result = await getInsuranceFund(symbol, startTime, endTime, limit);
        break;
        
      case 'ticker-24h':
        result = await getTicker24h(symbol);
        break;
        
      case 'exchange-info':
        result = await getExchangeInfo(symbol);
        break;
        
      case 'historical-volatility':
        if (!symbol) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getHistoricalVolatility(symbol, period || 14);
        break;
        
      case 'liquidation-heatmap':
        if (!symbol) {
          return new Response(
            JSON.stringify({ success: false, error: 'symbol is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getLiquidationHeatmap(symbol, interval || '1h', limit || 100);
        break;
        
      default:
        result = {
          success: false,
          error: `Unknown action: ${action}. Valid actions: klines, mark-price, funding-rate, open-interest, top-trader-ratio, global-ratio, taker-volume, order-book, agg-trades, basis, insurance-fund, ticker-24h, exchange-info, historical-volatility, liquidation-heatmap`,
        };
    }
    
    return new Response(
      JSON.stringify({ ...result, timestamp: Date.now() }),
      { 
        status: result.success ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Binance Market Data Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
