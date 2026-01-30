/**
 * Binance Market Data Edge Function - Phase 1
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
      interval,
      period,
      startTime, 
      endTime, 
      limit,
      fromId,
    } = body;
    
    let result;
    
    switch (action) {
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
        
      default:
        result = {
          success: false,
          error: `Unknown action: ${action}. Valid actions: klines, mark-price, funding-rate, open-interest, top-trader-ratio, global-ratio, taker-volume, order-book, agg-trades`,
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
