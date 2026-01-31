/**
 * Binance Futures Edge Function
 * Secure proxy for Binance Futures API with HMAC SHA256 signature generation
 */

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Generate HMAC SHA256 signature for Binance API
 */
async function createSignature(queryString: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(queryString)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Make authenticated request to Binance Futures API
 */
async function binanceRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  params: Record<string, string | number | boolean> = {},
  apiKey: string,
  apiSecret: string
): Promise<Response> {
  const timestamp = Date.now();
  const queryParams = new URLSearchParams();
  
  // Add all params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  
  // Add timestamp
  queryParams.append('timestamp', timestamp.toString());
  
  // Create signature
  const queryString = queryParams.toString();
  const signature = await createSignature(queryString, apiSecret);
  queryParams.append('signature', signature);
  
  const url = `${BINANCE_FUTURES_BASE}${endpoint}?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  return response;
}

/**
 * Validate API credentials by checking account info
 */
async function validateCredentials(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v2/account', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return {
        success: false,
        error: data.msg || 'Invalid API credentials',
        code: data.code,
      };
    }
    
    return {
      success: true,
      data: {
        canTrade: data.canTrade,
        canDeposit: data.canDeposit,
        canWithdraw: data.canWithdraw,
        permissions: data.permissions || [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Get account balance
 */
async function getBalance(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v2/balance', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Filter and format balances
    const balances = data
      .filter((b: any) => parseFloat(b.balance) > 0 || parseFloat(b.crossUnPnl) !== 0)
      .map((b: any) => ({
        asset: b.asset,
        walletBalance: parseFloat(b.balance),
        unrealizedProfit: parseFloat(b.crossUnPnl),
        marginBalance: parseFloat(b.balance) + parseFloat(b.crossUnPnl),
        availableBalance: parseFloat(b.availableBalance),
        crossWalletBalance: parseFloat(b.crossWalletBalance),
      }));
    
    // Calculate totals
    const totalWalletBalance = balances.reduce((sum: number, b: any) => sum + b.walletBalance, 0);
    const totalUnrealizedProfit = balances.reduce((sum: number, b: any) => sum + b.unrealizedProfit, 0);
    const totalAvailableBalance = balances.reduce((sum: number, b: any) => sum + b.availableBalance, 0);
    
    return {
      success: true,
      data: {
        totalWalletBalance,
        availableBalance: totalAvailableBalance,
        totalUnrealizedProfit,
        totalMarginBalance: totalWalletBalance + totalUnrealizedProfit,
        assets: balances,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch balance',
    };
  }
}

/**
 * Get current positions
 */
async function getPositions(apiKey: string, apiSecret: string, symbol?: string) {
  try {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    
    const response = await binanceRequest('/fapi/v2/positionRisk', 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Filter positions with non-zero amounts
    const positions = data
      .filter((p: any) => parseFloat(p.positionAmt) !== 0)
      .map((p: any) => ({
        symbol: p.symbol,
        positionAmt: parseFloat(p.positionAmt),
        entryPrice: parseFloat(p.entryPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedProfit: parseFloat(p.unRealizedProfit),
        liquidationPrice: parseFloat(p.liquidationPrice),
        leverage: parseInt(p.leverage),
        marginType: p.marginType.toLowerCase(),
        isolatedMargin: parseFloat(p.isolatedMargin),
        isAutoAddMargin: p.isAutoAddMargin === 'true',
        positionSide: p.positionSide,
        notional: parseFloat(p.notional),
        updateTime: p.updateTime,
      }));
    
    return { success: true, data: positions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch positions',
    };
  }
}

/**
 * Get trade history
 */
async function getTrades(apiKey: string, apiSecret: string, symbol: string, limit = 50) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required for trade history' };
    }
    
    const response = await binanceRequest('/fapi/v1/userTrades', 'GET', { symbol, limit }, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const trades = data.map((t: any) => ({
      id: t.id,
      symbol: t.symbol,
      orderId: t.orderId,
      side: t.side,
      price: parseFloat(t.price),
      qty: parseFloat(t.qty),
      realizedPnl: parseFloat(t.realizedPnl),
      marginAsset: t.marginAsset,
      quoteQty: parseFloat(t.quoteQty),
      commission: parseFloat(t.commission),
      commissionAsset: t.commissionAsset,
      time: t.time,
      positionSide: t.positionSide,
      maker: t.maker,
      buyer: t.buyer,
    }));
    
    return { success: true, data: trades };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trades',
    };
  }
}

/**
 * Get open orders
 */
async function getOpenOrders(apiKey: string, apiSecret: string, symbol?: string) {
  try {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    
    const response = await binanceRequest('/fapi/v1/openOrders', 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const orders = data.map((o: any) => ({
      orderId: o.orderId,
      symbol: o.symbol,
      status: o.status,
      clientOrderId: o.clientOrderId,
      price: parseFloat(o.price),
      avgPrice: parseFloat(o.avgPrice),
      origQty: parseFloat(o.origQty),
      executedQty: parseFloat(o.executedQty),
      cumQuote: parseFloat(o.cumQuote),
      timeInForce: o.timeInForce,
      type: o.type,
      reduceOnly: o.reduceOnly,
      closePosition: o.closePosition,
      side: o.side,
      positionSide: o.positionSide,
      stopPrice: parseFloat(o.stopPrice),
      workingType: o.workingType,
      priceProtect: o.priceProtect,
      origType: o.origType,
      time: o.time,
      updateTime: o.updateTime,
    }));
    
    return { success: true, data: orders };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch open orders',
    };
  }
}

/**
 * Place order (optional - for future use)
 */
async function placeOrder(apiKey: string, apiSecret: string, params: any) {
  try {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
    };
    
    if (params.price) orderParams.price = params.price;
    if (params.stopPrice) orderParams.stopPrice = params.stopPrice;
    if (params.timeInForce) orderParams.timeInForce = params.timeInForce;
    if (params.positionSide) orderParams.positionSide = params.positionSide;
    if (params.reduceOnly !== undefined) orderParams.reduceOnly = params.reduceOnly;
    
    const response = await binanceRequest('/fapi/v1/order', 'POST', orderParams, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to place order',
    };
  }
}

/**
 * Cancel order
 */
async function cancelOrder(apiKey: string, apiSecret: string, params: any) {
  try {
    const orderParams: Record<string, any> = {
      symbol: params.symbol,
    };
    
    if (params.orderId) orderParams.orderId = params.orderId;
    if (params.origClientOrderId) orderParams.origClientOrderId = params.origClientOrderId;
    
    const response = await binanceRequest('/fapi/v1/order', 'DELETE', orderParams, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order',
    };
  }
}

/**
 * Get income history - fetches all realized PnL, commissions, funding fees across all symbols
 * This endpoint does NOT require a symbol parameter, making it ideal for aggregated stats
 */
async function getIncomeHistory(
  apiKey: string, 
  apiSecret: string, 
  incomeType?: string,
  startTime?: number,
  endTime?: number,
  limit = 1000
) {
  try {
    const params: Record<string, any> = { limit };
    if (incomeType) params.incomeType = incomeType;
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    const response = await binanceRequest('/fapi/v1/income', 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const incomeRecords = data.map((item: any) => ({
      symbol: item.symbol,
      incomeType: item.incomeType,
      income: parseFloat(item.income),
      asset: item.asset,
      time: item.time,
      tranId: item.tranId,
      tradeId: item.tradeId || null,
      info: item.info || '',
    }));
    
    return { success: true, data: incomeRecords };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch income history',
    };
  }
}

/**
 * Get user commission rate for accurate fee calculation
 * Phase 2: Account Data Enhancement
 */
async function getCommissionRate(apiKey: string, apiSecret: string, symbol: string) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required for commission rate' };
    }
    
    const response = await binanceRequest('/fapi/v1/commissionRate', 'GET', { symbol }, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        symbol: data.symbol,
        makerCommissionRate: parseFloat(data.makerCommissionRate),
        takerCommissionRate: parseFloat(data.takerCommissionRate),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch commission rate',
    };
  }
}

/**
 * Get leverage brackets for position sizing limits
 * Phase 2: Account Data Enhancement
 */
async function getLeverageBrackets(apiKey: string, apiSecret: string, symbol?: string) {
  try {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    
    const response = await binanceRequest('/fapi/v1/leverageBracket', 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Handle single symbol vs all symbols response
    const brackets = Array.isArray(data) ? data : [data];
    
    const formattedBrackets = brackets.map((item: any) => ({
      symbol: item.symbol,
      notionalCoef: item.notionalCoef || 0,
      brackets: (item.brackets || []).map((b: any) => ({
        bracket: b.bracket,
        initialLeverage: b.initialLeverage,
        notionalCap: parseFloat(b.notionalCap),
        notionalFloor: parseFloat(b.notionalFloor),
        maintMarginRatio: parseFloat(b.maintMarginRatio),
        cum: parseFloat(b.cum),
      })),
    }));
    
    return { success: true, data: symbol ? formattedBrackets[0] : formattedBrackets };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch leverage brackets',
    };
  }
}

/**
 * Get force orders (liquidation history) - CRITICAL for risk management
 * Phase 2: Account Data Enhancement
 */
async function getForceOrders(
  apiKey: string, 
  apiSecret: string, 
  params: {
    symbol?: string;
    autoCloseType?: 'LIQUIDATION' | 'ADL';
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}
) {
  try {
    const queryParams: Record<string, any> = {};
    if (params.symbol) queryParams.symbol = params.symbol;
    if (params.autoCloseType) queryParams.autoCloseType = params.autoCloseType;
    if (params.startTime) queryParams.startTime = params.startTime;
    if (params.endTime) queryParams.endTime = params.endTime;
    queryParams.limit = params.limit || 50;
    
    const response = await binanceRequest('/fapi/v1/forceOrders', 'GET', queryParams, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const forceOrders = data.map((order: any) => ({
      orderId: order.orderId,
      symbol: order.symbol,
      status: order.status,
      clientOrderId: order.clientOrderId,
      price: parseFloat(order.price),
      avgPrice: parseFloat(order.avgPrice),
      origQty: parseFloat(order.origQty),
      executedQty: parseFloat(order.executedQty),
      cumQuote: parseFloat(order.cumQuote),
      timeInForce: order.timeInForce,
      type: order.type,
      reduceOnly: order.reduceOnly,
      closePosition: order.closePosition,
      side: order.side,
      positionSide: order.positionSide,
      stopPrice: parseFloat(order.stopPrice),
      workingType: order.workingType,
      origType: order.origType,
      time: order.time,
      updateTime: order.updateTime,
    }));
    
    return { success: true, data: forceOrders };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch force orders',
    };
  }
}

/**
 * Get position mode (hedge vs one-way)
 * Phase 2: Account Data Enhancement
 */
async function getPositionMode(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v1/positionSide/dual', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        dualSidePosition: data.dualSidePosition,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch position mode',
    };
  }
}

/**
 * Get all orders history (not just trades)
 * Phase 2: Account Data Enhancement
 */
async function getAllOrders(
  apiKey: string, 
  apiSecret: string, 
  symbol: string,
  params: {
    orderId?: number;
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}
) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required for all orders history' };
    }
    
    const queryParams: Record<string, any> = { symbol };
    if (params.orderId) queryParams.orderId = params.orderId;
    if (params.startTime) queryParams.startTime = params.startTime;
    if (params.endTime) queryParams.endTime = params.endTime;
    queryParams.limit = params.limit || 500;
    
    const response = await binanceRequest('/fapi/v1/allOrders', 'GET', queryParams, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const orders = data.map((o: any) => ({
      orderId: o.orderId,
      symbol: o.symbol,
      status: o.status,
      clientOrderId: o.clientOrderId,
      price: parseFloat(o.price),
      avgPrice: parseFloat(o.avgPrice),
      origQty: parseFloat(o.origQty),
      executedQty: parseFloat(o.executedQty),
      cumQuote: parseFloat(o.cumQuote),
      timeInForce: o.timeInForce,
      type: o.type,
      reduceOnly: o.reduceOnly,
      closePosition: o.closePosition,
      side: o.side,
      positionSide: o.positionSide,
      stopPrice: parseFloat(o.stopPrice),
      workingType: o.workingType,
      priceProtect: o.priceProtect,
      origType: o.origType,
      time: o.time,
      updateTime: o.updateTime,
    }));
    
    return { success: true, data: orders };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch all orders',
    };
  }
}

// =============================================================================
// Phase 4: Extended Account Data
// =============================================================================

/**
 * Get user symbol configuration with trading rules
 * Phase 4: Extended Account Data
 */
async function getSymbolConfig(apiKey: string, apiSecret: string, symbol?: string) {
  try {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    
    const response = await binanceRequest('/fapi/v1/symbolConfig', 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Handle array response
    const configs = Array.isArray(data) ? data : [data];
    
    const formattedConfigs = configs.map((c: any) => ({
      symbol: c.symbol,
      marginType: c.marginType,
      isAutoAddMargin: c.isAutoAddMargin,
      leverage: parseInt(c.leverage),
      maxNotionalValue: parseFloat(c.maxNotionalValue),
    }));
    
    return { success: true, data: symbol ? formattedConfigs[0] : formattedConfigs };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch symbol config',
    };
  }
}

/**
 * Get multi-assets margin mode status
 * Phase 4: Extended Account Data
 */
async function getMultiAssetsMode(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v1/multiAssetsMargin', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        multiAssetsMargin: data.multiAssetsMargin,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch multi-assets mode',
    };
  }
}

/**
 * Get position margin change history
 * Phase 4: Extended Account Data
 */
async function getPositionMarginHistory(
  apiKey: string, 
  apiSecret: string, 
  symbol: string,
  params: {
    type?: number;  // 1: Add margin, 2: Reduce margin
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}
) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required for margin history' };
    }
    
    const queryParams: Record<string, any> = { symbol };
    if (params.type) queryParams.type = params.type;
    if (params.startTime) queryParams.startTime = params.startTime;
    if (params.endTime) queryParams.endTime = params.endTime;
    queryParams.limit = params.limit || 100;
    
    const response = await binanceRequest('/fapi/v1/positionMargin/history', 'GET', queryParams, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const history = data.map((h: any) => ({
      symbol: h.symbol,
      type: h.type === 1 ? 'ADD' : 'REDUCE',
      amount: parseFloat(h.amount),
      asset: h.asset,
      time: h.time,
      positionSide: h.positionSide,
    }));
    
    return { success: true, data: history };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch position margin history',
    };
  }
}

/**
 * Get account configuration (margin mode, position mode)
 * Phase 4: Extended Account Data
 */
async function getAccountConfig(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v1/accountConfig', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        feeTier: data.feeTier,
        canTrade: data.canTrade,
        canDeposit: data.canDeposit,
        canWithdraw: data.canWithdraw,
        dualSidePosition: data.dualSidePosition,
        multiAssetsMargin: data.multiAssetsMargin,
        tradeGroupId: data.tradeGroupId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account config',
    };
  }
}

/**
 * Get BNB burn status for fee discount
 * Phase 4: Extended Account Data
 */
async function getBnbBurnStatus(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v1/feeBurn', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        feeBurn: data.feeBurn,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch BNB burn status',
    };
  }
}

/**
 * Get ADL quantile for position risk assessment
 * Phase 4: Extended Account Data
 */
async function getAdlQuantile(apiKey: string, apiSecret: string, symbol?: string) {
  try {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    
    const response = await binanceRequest('/fapi/v1/adlQuantile', 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const quantiles = Array.isArray(data) ? data : [data];
    
    const formattedQuantiles = quantiles.map((q: any) => ({
      symbol: q.symbol,
      adlQuantile: {
        LONG: q.adlQuantile?.LONG || 0,
        SHORT: q.adlQuantile?.SHORT || 0,
        BOTH: q.adlQuantile?.BOTH || 0,
        HEDGE: q.adlQuantile?.HEDGE || 0,
      },
    }));
    
    return { success: true, data: symbol ? formattedQuantiles[0] : formattedQuantiles };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ADL quantile',
    };
  }
}

/**
 * Get order rate limit status
 * Phase 4: Extended Account Data
 */
async function getOrderRateLimit(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v1/rateLimit/order', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const rateLimits = data.map((r: any) => ({
      rateLimitType: r.rateLimitType,
      interval: r.interval,
      intervalNum: r.intervalNum,
      limit: r.limit,
      count: r.count,
    }));
    
    return { success: true, data: rateLimits };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order rate limit',
    };
  }
}

// ============================================================================
// Phase 5: Bulk Export Functions
// ============================================================================

type DownloadType = 'transaction' | 'order' | 'trade';

/**
 * Request download ID for bulk export
 * Phase 5: Bulk Export
 */
async function requestDownloadId(
  apiKey: string, 
  apiSecret: string, 
  type: DownloadType,
  startTime: number,
  endTime: number
) {
  try {
    const endpoints: Record<DownloadType, string> = {
      transaction: '/fapi/v1/income/asyn',
      order: '/fapi/v1/order/asyn',
      trade: '/fapi/v1/trade/asyn',
    };
    
    const params: Record<string, any> = {
      startTime,
      endTime,
    };
    
    const response = await binanceRequest(endpoints[type], 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        downloadId: data.downloadId,
        type,
        startTime,
        endTime,
        status: 'pending',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request download ID',
    };
  }
}

/**
 * Get download link for bulk export
 * Phase 5: Bulk Export
 */
async function getDownloadLink(
  apiKey: string, 
  apiSecret: string, 
  type: DownloadType,
  downloadId: string
) {
  try {
    const endpoints: Record<DownloadType, string> = {
      transaction: '/fapi/v1/income/asyn/id',
      order: '/fapi/v1/order/asyn/id',
      trade: '/fapi/v1/trade/asyn/id',
    };
    
    const params = { downloadId };
    
    const response = await binanceRequest(endpoints[type], 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    // Status can be: 'pending', 'processing', 'completed'
    const isReady = data.status === 'completed' || !!data.url;
    
    return {
      success: true,
      data: {
        downloadId: data.downloadId || downloadId,
        status: isReady ? 'completed' : (data.status || 'pending'),
        url: data.url || null,
        expirationTimestamp: data.expirationTimestamp || null,
        notified: data.notified || false,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get download link',
    };
  }
}



Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get API credentials from environment
    const apiKey = Deno.env.get('BINANCE_API_KEY');
    const apiSecret = Deno.env.get('BINANCE_API_SECRET');
    
    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Binance API credentials not configured. Please add BINANCE_API_KEY and BINANCE_API_SECRET.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { action, symbol, limit, orderParams, incomeType, startTime, endTime } = body;
    
    let result;
    
    switch (action) {
      case 'validate':
        result = await validateCredentials(apiKey, apiSecret);
        break;
        
      case 'balance':
        result = await getBalance(apiKey, apiSecret);
        break;
        
      case 'positions':
        result = await getPositions(apiKey, apiSecret, symbol);
        break;
        
      case 'trades':
        result = await getTrades(apiKey, apiSecret, symbol, limit || 50);
        break;
        
      case 'open-orders':
        result = await getOpenOrders(apiKey, apiSecret, symbol);
        break;
        
      case 'place-order':
        result = await placeOrder(apiKey, apiSecret, orderParams);
        break;
        
      case 'cancel-order':
        result = await cancelOrder(apiKey, apiSecret, orderParams);
        break;
        
      case 'income':
        result = await getIncomeHistory(apiKey, apiSecret, incomeType, startTime, endTime, limit || 1000);
        break;
        
      // Phase 2: Account Data Enhancement
      case 'commission-rate':
        result = await getCommissionRate(apiKey, apiSecret, symbol);
        break;
        
      case 'leverage-brackets':
        result = await getLeverageBrackets(apiKey, apiSecret, symbol);
        break;
        
      case 'force-orders':
        result = await getForceOrders(apiKey, apiSecret, body.params || {});
        break;
        
      case 'position-mode':
        result = await getPositionMode(apiKey, apiSecret);
        break;
        
      case 'all-orders':
        result = await getAllOrders(apiKey, apiSecret, symbol, body.params || {});
        break;
        
      // Phase 4: Extended Account Data
      case 'symbol-config':
        result = await getSymbolConfig(apiKey, apiSecret, symbol);
        break;
        
      case 'multi-assets-mode':
        result = await getMultiAssetsMode(apiKey, apiSecret);
        break;
        
      case 'position-margin-history':
        result = await getPositionMarginHistory(apiKey, apiSecret, symbol, body.params || {});
        break;
        
      case 'account-config':
        result = await getAccountConfig(apiKey, apiSecret);
        break;
        
      case 'bnb-burn':
        result = await getBnbBurnStatus(apiKey, apiSecret);
        break;
        
      case 'adl-quantile':
        result = await getAdlQuantile(apiKey, apiSecret, symbol);
        break;
        
      case 'order-rate-limit':
        result = await getOrderRateLimit(apiKey, apiSecret);
        break;
        
      // Phase 5: Bulk Export
      case 'request-download':
        if (!body.downloadType || !body.startTime || !body.endTime) {
          result = { success: false, error: 'downloadType, startTime, and endTime are required' };
        } else {
          result = await requestDownloadId(apiKey, apiSecret, body.downloadType, body.startTime, body.endTime);
        }
        break;
        
      case 'get-download':
        if (!body.downloadType || !body.downloadId) {
          result = { success: false, error: 'downloadType and downloadId are required' };
        } else {
          result = await getDownloadLink(apiKey, apiSecret, body.downloadType, body.downloadId);
        }
        break;
        
      default:
        result = {
          success: false,
          error: `Unknown action: ${action}. Valid actions: validate, balance, positions, trades, open-orders, place-order, cancel-order, income, commission-rate, leverage-brackets, force-orders, position-mode, all-orders, symbol-config, multi-assets-mode, position-margin-history, account-config, bnb-burn, adl-quantile, order-rate-limit, request-download, get-download`,
        };
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Binance Futures Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
