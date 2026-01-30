/**
 * Binance Futures API Types
 * Types for Binance Futures integration
 */

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface BinanceBalance {
  asset: string;
  walletBalance: number;
  unrealizedProfit: number;
  marginBalance: number;
  availableBalance: number;
  crossWalletBalance: number;
}

export interface BinanceAccountSummary {
  totalWalletBalance: number;
  availableBalance: number;
  totalUnrealizedProfit: number;
  totalMarginBalance: number;
  assets: BinanceBalance[];
}

export interface BinancePosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfit: number;
  liquidationPrice: number;
  leverage: number;
  marginType: 'isolated' | 'cross';
  isolatedMargin: number;
  isAutoAddMargin: boolean;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  notional: number;
  updateTime: number;
}

export interface BinanceTrade {
  id: number;
  symbol: string;
  orderId: number;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  realizedPnl: number;
  marginAsset: string;
  quoteQty: number;
  commission: number;
  commissionAsset: string;
  time: number;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  maker: boolean;
  buyer: boolean;
}

export interface BinanceOrder {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: number;
  avgPrice: number;
  origQty: number;
  executedQty: number;
  cumQuote: number;
  timeInForce: string;
  type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET';
  reduceOnly: boolean;
  closePosition: boolean;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  stopPrice: number;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  time: number;
  updateTime: number;
}

export interface BinanceApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

export type BinanceAction = 
  | 'validate'
  | 'balance'
  | 'positions'
  | 'trades'
  | 'open-orders'
  | 'place-order'
  | 'cancel-order';

export interface BinanceConnectionStatus {
  isConnected: boolean;
  lastChecked: string | null;
  permissions: string[];
  error?: string;
}

// Order placement types
export interface PlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  positionSide?: 'LONG' | 'SHORT' | 'BOTH';
  reduceOnly?: boolean;
}

export interface CancelOrderParams {
  symbol: string;
  orderId?: number;
  origClientOrderId?: string;
}
