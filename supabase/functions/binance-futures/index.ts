/**
 * Binance Futures Edge Function
 * Secure proxy for Binance Futures API with HMAC SHA256 signature generation
 * NOW WITH: Per-user credential lookup and rate limit tracking
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Decode JWT to get user ID (without full verification - Supabase handles JWT verification)
 */
function decodeJwt(token: string): { sub: string; email?: string; exp: number } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode payload (base64url)
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    throw new Error('Failed to decode JWT');
  }
}

/**
 * Get authenticated user from JWT
 */
async function getAuthenticatedUser(authHeader: string) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  // Decode JWT to get user ID
  const claims = decodeJwt(token);
  
  if (!claims.sub) {
    throw new Error('Unauthorized: No user ID in token');
  }
  
  // Check if token is expired
  if (claims.exp && claims.exp * 1000 < Date.now()) {
    throw new Error('Unauthorized: Token expired');
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  
  return {
    userId: claims.sub,
    supabase,
  };
}

interface DecryptedCredential {
  id: string;
  api_key: string;
  api_secret: string;
  label: string;
  permissions: Record<string, unknown> | null;
  is_valid: boolean | null;
  last_validated_at: string | null;
}

/**
 * Custom error for missing credentials
 */
class CredentialsNotConfiguredError extends Error {
  constructor() {
    super('Binance API credentials not configured');
    this.name = 'CredentialsNotConfiguredError';
  }
}

/**
 * Get decrypted credentials for user
 * Returns null if no credentials configured (not an error state)
 */
async function getUserCredentials(userId: string): Promise<{ apiKey: string; apiSecret: string; credentialId: string } | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { data, error } = await supabase
    .rpc('get_decrypted_credential', {
      p_user_id: userId,
      p_exchange: 'binance',
    })
    .single();
  
  // No credentials configured - this is NOT an error, just a state
  if (error || !data) {
    return null;
  }
  
  const credential = data as DecryptedCredential;
  
  return {
    apiKey: credential.api_key,
    apiSecret: credential.api_secret,
    credentialId: credential.id,
  };
}

/**
 * Update credential validation status
 */
async function updateCredentialValidation(
  credentialId: string,
  isValid: boolean,
  permissions: Record<string, unknown> | null,
  error: string | null
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  await supabase.rpc('update_credential_validation', {
    p_credential_id: credentialId,
    p_is_valid: isValid,
    p_permissions: permissions,
    p_error: error,
  });
}

interface RateLimitResult {
  allowed: boolean;
  current_weight: number;
  max_weight: number;
  reset_at: string;
}

/**
 * Check and update rate limit
 */
async function checkRateLimit(userId: string, category: string, weight: number = 1) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { data, error } = await supabase
    .rpc('check_rate_limit', {
      p_user_id: userId,
      p_exchange: 'binance',
      p_category: category,
      p_weight: weight,
    })
    .single();
  
  if (error) {
    console.error('Rate limit check error:', error);
    // Don't block on rate limit check errors
    return { allowed: true };
  }
  
  const rateLimitData = data as RateLimitResult;
  
  if (!rateLimitData?.allowed) {
    const resetAt = new Date(rateLimitData.reset_at).getTime();
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded (${rateLimitData.current_weight}/${rateLimitData.max_weight}). Retry after ${retryAfter}s`,
      retryAfter
    );
  }
  
  return rateLimitData;
}

class RateLimitError extends Error {
  retryAfter: number;
  
  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Get endpoint weight for rate limiting
 */
function getEndpointWeight(action: string): { category: string; weight: number } {
  switch (action) {
    case 'place-order':
    case 'cancel-order':
      return { category: 'order', weight: 1 };
    case 'balance':
    case 'positions':
      return { category: 'account', weight: 5 };
    case 'trades':
    case 'all-orders':
      return { category: 'account', weight: 5 };
    case 'income':
      return { category: 'account', weight: 30 };
    case 'request-download':
    case 'get-download':
      return { category: 'account', weight: 10 };
    default:
      return { category: 'account', weight: 1 };
  }
}

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
 * Get trade history (individual fills)
 * Supports pagination via fromId for fetching large histories
 * VALIDATION: Enforces 7-day maximum interval per Binance API limit
 */
async function getTrades(
  apiKey: string, 
  apiSecret: string, 
  symbol: string, 
  limit = 50,
  startTime?: number,
  endTime?: number,
  fromId?: number
) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required for trade history' };
    }
    
    // VALIDATION: Enforce 7-day limit server-side
    // Binance API has a strict 7-day maximum interval for userTrades
    if (startTime && endTime) {
      const interval = endTime - startTime;
      const MAX_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000 - 60000; // 7 days minus 1 minute safety
      
      if (interval > MAX_INTERVAL_MS) {
        return { 
          success: false, 
          error: `Time interval ${Math.round(interval / (24 * 60 * 60 * 1000))} days exceeds maximum 7 days. Use chunked fetching.`,
          code: 'INTERVAL_TOO_LARGE'
        };
      }
    }
    
    const params: Record<string, any> = { symbol, limit };
    // When using cursor-based pagination (fromId), time filters are ignored by Binance API
    // Only send time filters for initial request (no fromId) to prevent debugging confusion
    if (fromId) {
      params.fromId = fromId;
      // Note: startTime/endTime intentionally NOT sent with fromId
    } else {
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
    }
    
    const response = await binanceRequest('/fapi/v1/userTrades', 'GET', params, apiKey, apiSecret);
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
 * Supports cursor-based pagination via fromId parameter to fetch >1000 records
 */
async function getIncomeHistory(
  apiKey: string, 
  apiSecret: string, 
  incomeType?: string,
  startTime?: number,
  endTime?: number,
  limit = 1000,
  fromId?: number  // NEW: cursor-based pagination for fetching >1000 records
) {
  try {
    const params: Record<string, any> = { limit };
    if (incomeType) params.incomeType = incomeType;
    // When using cursor-based pagination (fromId), time filters are ignored by Binance API
    // Only send time filters for initial request (no fromId) to prevent debugging confusion
    if (fromId) {
      params.fromId = fromId;
      // Note: startTime/endTime intentionally NOT sent with fromId
    } else {
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;
    }
    
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
 * Get user commission rate
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
 * Get leverage brackets
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
 * Get force orders (liquidation history)
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
    
    const forceOrders = data.map((o: any) => ({
      orderId: o.orderId,
      symbol: o.symbol,
      status: o.status,
      side: o.side,
      price: parseFloat(o.price),
      avgPrice: parseFloat(o.avgPrice),
      origQty: parseFloat(o.origQty),
      executedQty: parseFloat(o.executedQty),
      cumQuote: parseFloat(o.cumQuote),
      timeInForce: o.timeInForce,
      type: o.type,
      positionSide: o.positionSide,
      time: o.time,
      updateTime: o.updateTime,
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
 * Get position mode (hedge mode or one-way)
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
        mode: data.dualSidePosition ? 'hedge' : 'one-way',
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
 * Get all orders for a symbol
 */
async function getAllOrders(
  apiKey: string, 
  apiSecret: string, 
  symbol: string,
  params: { startTime?: number; endTime?: number; limit?: number } = {}
) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required for order history' };
    }
    
    const queryParams: Record<string, any> = { symbol };
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

/**
 * Get symbol configuration
 */
async function getSymbolConfig(apiKey: string, apiSecret: string, symbol: string) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required' };
    }
    
    const response = await binanceRequest('/fapi/v1/exchangeInfo', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    const symbolInfo = data.symbols?.find((s: any) => s.symbol === symbol);
    
    if (!symbolInfo) {
      return { success: false, error: `Symbol ${symbol} not found` };
    }
    
    return {
      success: true,
      data: {
        symbol: symbolInfo.symbol,
        status: symbolInfo.status,
        maintMarginPercent: parseFloat(symbolInfo.maintMarginPercent),
        requiredMarginPercent: parseFloat(symbolInfo.requiredMarginPercent),
        baseAsset: symbolInfo.baseAsset,
        quoteAsset: symbolInfo.quoteAsset,
        pricePrecision: symbolInfo.pricePrecision,
        quantityPrecision: symbolInfo.quantityPrecision,
        orderTypes: symbolInfo.orderTypes,
        timeInForce: symbolInfo.timeInForce,
        filters: symbolInfo.filters,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch symbol config',
    };
  }
}

/**
 * Get multi-assets mode status
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
 */
async function getPositionMarginHistory(
  apiKey: string, 
  apiSecret: string, 
  symbol: string,
  params: { type?: number; startTime?: number; endTime?: number; limit?: number } = {}
) {
  try {
    if (!symbol) {
      return { success: false, error: 'Symbol is required' };
    }
    
    const queryParams: Record<string, any> = { symbol };
    if (params.type !== undefined) queryParams.type = params.type;
    if (params.startTime) queryParams.startTime = params.startTime;
    if (params.endTime) queryParams.endTime = params.endTime;
    queryParams.limit = params.limit || 50;
    
    const response = await binanceRequest('/fapi/v1/positionMargin/history', 'GET', queryParams, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch position margin history',
    };
  }
}

/**
 * Get account configuration
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
        updateTime: data.updateTime,
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
 * Get BNB burn status
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
 * Get ADL quantile
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
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ADL quantile',
    };
  }
}

/**
 * Get order rate limit status
 */
async function getOrderRateLimit(apiKey: string, apiSecret: string) {
  try {
    const response = await binanceRequest('/fapi/v1/rateLimit/order', 'GET', {}, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order rate limit',
    };
  }
}

/**
 * Request download ID for bulk export
 */
async function requestDownloadId(
  apiKey: string,
  apiSecret: string,
  downloadType: 'trade' | 'order' | 'income',
  startTime: number,
  endTime: number
) {
  try {
    const endpointMap: Record<string, string> = {
      'trade': '/fapi/v1/trade/asyn',
      'order': '/fapi/v1/order/asyn',
      'income': '/fapi/v1/income/asyn',
    };
    
    const endpoint = endpointMap[downloadType];
    if (!endpoint) {
      return { success: false, error: 'Invalid download type' };
    }
    
    const params = { startTime, endTime };
    const response = await binanceRequest(endpoint, 'GET', params, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        downloadId: data.downloadId,
        avgCostTimestampOfLast30d: data.avgCostTimestampOfLast30d,
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
 * Get download link
 */
async function getDownloadLink(
  apiKey: string,
  apiSecret: string,
  downloadType: 'trade' | 'order' | 'income',
  downloadId: string
) {
  try {
    const endpointMap: Record<string, string> = {
      'trade': '/fapi/v1/trade/asyn/id',
      'order': '/fapi/v1/order/asyn/id',
      'income': '/fapi/v1/income/asyn/id',
    };
    
    const endpoint = endpointMap[downloadType];
    if (!endpoint) {
      return { success: false, error: 'Invalid download type' };
    }
    
    const response = await binanceRequest(endpoint, 'GET', { downloadId }, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return {
      success: true,
      data: {
        downloadId: data.downloadId,
        status: data.status,
        url: data.url,
        notified: data.notified,
        expirationTimestamp: data.expirationTimestamp,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get download link',
    };
  }
}

/**
 * Get transaction history (deposits, withdrawals, transfers)
 */
async function getTransactionHistory(
  apiKey: string,
  apiSecret: string,
  params: { asset?: string; startTime?: number; endTime?: number; limit?: number } = {}
) {
  try {
    const queryParams: Record<string, any> = {};
    if (params.asset) queryParams.asset = params.asset;
    if (params.startTime) queryParams.startTime = params.startTime;
    if (params.endTime) queryParams.endTime = params.endTime;
    queryParams.limit = params.limit || 100;
    
    const response = await binanceRequest('/fapi/v1/income', 'GET', {
      ...queryParams,
      incomeType: 'TRANSFER',
    }, apiKey, apiSecret);
    const data = await response.json();
    
    if (data.code && data.code < 0) {
      return { success: false, error: data.msg, code: data.code };
    }
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transaction history',
    };
  }
}

// ============= MAIN HANDLER =============
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get authenticated user
    const { userId } = await getAuthenticatedUser(authHeader);
    
    // Get user's API credentials (encrypted)
    const credentials = await getUserCredentials(userId);
    
    // Return structured response if credentials not configured
    if (!credentials) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'CREDENTIALS_NOT_CONFIGURED',
          error: 'Binance API credentials not configured',
          message: 'Please configure your Binance API key and secret in Settings → Exchange to use this feature.',
        }),
        { 
          status: 200, // 200 because this is a valid domain state, not a server error
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { apiKey, apiSecret, credentialId } = credentials;
    
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { action, symbol, limit, orderParams, incomeType, startTime, endTime, fromId } = body;
    
    // Check rate limit before making API call
    const { category, weight } = getEndpointWeight(action);
    await checkRateLimit(userId, category, weight);
    
    let result;
    
    switch (action) {
      case 'validate':
        result = await validateCredentials(apiKey, apiSecret);
        // Update credential validation status
        if (result.success && result.data) {
          await updateCredentialValidation(
            credentialId, 
            true, 
            {
              canTrade: result.data.canTrade,
              canDeposit: result.data.canDeposit,
              canWithdraw: result.data.canWithdraw,
            },
            null
          );
        } else {
          await updateCredentialValidation(credentialId, false, null, result.error || 'Validation failed');
        }
        break;
        
      case 'balance':
        result = await getBalance(apiKey, apiSecret);
        break;
        
      case 'positions':
        result = await getPositions(apiKey, apiSecret, symbol);
        break;
        
      case 'trades':
        result = await getTrades(apiKey, apiSecret, symbol, limit || 50, startTime, endTime, fromId);
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
        result = await getIncomeHistory(apiKey, apiSecret, incomeType, startTime, endTime, limit || 1000, fromId);
        break;
        
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
        
      case 'transaction-history':
        result = await getTransactionHistory(apiKey, apiSecret, body.params || {});
        break;
        
      default:
        result = {
          success: false,
          error: `Unknown action: ${action}. Valid actions: validate, balance, positions, trades, open-orders, place-order, cancel-order, income, commission-rate, leverage-brackets, force-orders, position-mode, all-orders, symbol-config, multi-assets-mode, position-margin-history, account-config, bnb-burn, adl-quantile, order-rate-limit, request-download, get-download, transaction-history`,
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
    
    // Handle rate limit errors specially
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          retryAfter: error.retryAfter,
          code: 'RATE_LIMITED',
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': error.retryAfter.toString(),
          } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
