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

/**
 * Income record from /fapi/v1/income endpoint
 * Used for fetching realized PnL, commissions, and funding fees across ALL symbols
 */
export interface BinanceIncome {
  symbol: string;
  incomeType: BinanceIncomeType | string;
  income: number;
  asset: string;
  time: number;
  tranId: number;
  tradeId: string | null;
  info: string;
}

/**
 * All supported Binance Income Types from API with "Enable Reading" permission
 */
export type BinanceIncomeType = 
  | 'REALIZED_PNL'      // P&L from closed positions
  | 'COMMISSION'        // Trading fees (maker/taker)
  | 'FUNDING_FEE'       // Funding rate payments
  | 'TRANSFER'          // Deposit/Withdrawal to Futures
  | 'WELCOME_BONUS'     // Promo bonus
  | 'INSURANCE_CLEAR'   // Insurance fund clearance
  | 'REFERRAL_KICKBACK' // Referral rewards
  | 'COMMISSION_REBATE' // Fee rebates
  | 'API_REBATE'        // API trading rebates
  | 'CONTEST_REWARD'    // Trading contest prizes
  | 'COIN_SWAP_DEPOSIT' // Asset conversion in
  | 'COIN_SWAP_WITHDRAW'// Asset conversion out
  | 'INTERNAL_TRANSFER' // Internal wallet transfer
  | 'DELIVERED_SETTELMENT' // Delivery settlement
  | 'AUTO_EXCHANGE';    // Auto exchange

/**
 * Income type categories for UI filtering
 */
export type IncomeTypeCategory = 'pnl' | 'fees' | 'funding' | 'transfers' | 'rewards' | 'other';

/**
 * Map income type to category
 */
export function getIncomeTypeCategory(type: string): IncomeTypeCategory {
  switch (type) {
    case 'REALIZED_PNL':
      return 'pnl';
    case 'COMMISSION':
      return 'fees';
    case 'FUNDING_FEE':
      return 'funding';
    case 'TRANSFER':
    case 'INTERNAL_TRANSFER':
    case 'COIN_SWAP_DEPOSIT':
    case 'COIN_SWAP_WITHDRAW':
      return 'transfers';
    case 'WELCOME_BONUS':
    case 'REFERRAL_KICKBACK':
    case 'COMMISSION_REBATE':
    case 'API_REBATE':
    case 'CONTEST_REWARD':
      return 'rewards';
    default:
      return 'other';
  }
}

/**
 * Aggregated income statistics
 */
export interface BinanceIncomeAggregated {
  byType: Record<string, { total: number; count: number }>;
  bySymbol: Record<string, { pnl: number; fees: number; funding: number; rebates: number }>;
  summary: {
    grossPnl: number;      // Raw REALIZED_PNL total
    totalFees: number;     // COMMISSION (negative)
    totalFunding: number;  // FUNDING_FEE (can be +/-)
    totalRebates: number;  // COMMISSION_REBATE + API_REBATE (positive)
    totalTransfers: number;// TRANSFER totals
    netPnl: number;        // grossPnl - fees - funding + rebates
  };
}
