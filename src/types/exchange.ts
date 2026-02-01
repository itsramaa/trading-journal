/**
 * Exchange-Agnostic Domain Types
 * 
 * These types represent the generic domain model for exchange data,
 * decoupled from any specific exchange's API response format.
 * 
 * Use mappers in `src/lib/exchange-mappers.ts` to convert
 * exchange-specific types (e.g., BinancePosition) to these generic types.
 */

// =============================================================================
// Exchange Type Definition
// =============================================================================

/**
 * Supported exchange types
 * - 'binance': Active and fully implemented
 * - 'bybit': Coming soon
 * - 'okx': Coming soon
 */
export type ExchangeType = 'binance' | 'bybit' | 'okx';

/**
 * Exchange metadata for UI display
 */
export interface ExchangeMeta {
  type: ExchangeType;
  name: string;
  icon: string;
  status: 'active' | 'coming_soon' | 'beta';
  color: string;
}

/**
 * Registry of supported exchanges
 */
export const EXCHANGE_REGISTRY: Record<ExchangeType, ExchangeMeta> = {
  binance: {
    type: 'binance',
    name: 'Binance Futures',
    icon: '🟡',
    status: 'active',
    color: '#F0B90B',
  },
  bybit: {
    type: 'bybit',
    name: 'Bybit Futures',
    icon: '🟠',
    status: 'coming_soon',
    color: '#F7A600',
  },
  okx: {
    type: 'okx',
    name: 'OKX Futures',
    icon: '⚪',
    status: 'coming_soon',
    color: '#000000',
  },
};

// =============================================================================
// Position Types
// =============================================================================

/**
 * Generic position representation across exchanges
 */
export interface ExchangePosition {
  /** Trading pair symbol (e.g., BTCUSDT) */
  symbol: string;
  
  /** Position direction */
  side: 'LONG' | 'SHORT';
  
  /** Position size (always positive) */
  size: number;
  
  /** Entry price */
  entryPrice: number;
  
  /** Current mark price */
  markPrice: number;
  
  /** Unrealized profit/loss in quote currency */
  unrealizedPnl: number;
  
  /** Leverage multiplier */
  leverage: number;
  
  /** Margin mode */
  marginType: 'isolated' | 'cross';
  
  /** Liquidation price */
  liquidationPrice: number;
  
  /** Notional value of position */
  notional: number;
  
  /** Last update timestamp (ms) */
  updateTime: number;
  
  /** Source exchange */
  source: ExchangeType;
}

// =============================================================================
// Balance Types
// =============================================================================

/**
 * Generic balance representation across exchanges
 */
export interface ExchangeBalance {
  /** Asset symbol (e.g., USDT, BTC) */
  asset: string;
  
  /** Total balance including unrealized PnL */
  total: number;
  
  /** Available balance for trading */
  available: number;
  
  /** Unrealized profit/loss */
  unrealizedPnl: number;
  
  /** Margin balance (total - unrealized) */
  marginBalance: number;
  
  /** Source exchange */
  source: ExchangeType;
}

/**
 * Aggregated account summary
 */
export interface ExchangeAccountSummary {
  /** Total wallet balance across all assets */
  totalBalance: number;
  
  /** Total available balance */
  availableBalance: number;
  
  /** Total unrealized PnL */
  totalUnrealizedPnl: number;
  
  /** Total margin balance */
  totalMarginBalance: number;
  
  /** Individual asset balances */
  assets: ExchangeBalance[];
  
  /** Source exchange */
  source: ExchangeType;
}

// =============================================================================
// Trade Types
// =============================================================================

/**
 * Generic trade representation across exchanges
 */
export interface ExchangeTrade {
  /** Trade ID (exchange-specific) */
  id: string;
  
  /** Trading pair symbol */
  symbol: string;
  
  /** Trade side */
  side: 'BUY' | 'SELL';
  
  /** Execution price */
  price: number;
  
  /** Trade quantity */
  quantity: number;
  
  /** Quote quantity (price * quantity) */
  quoteQuantity: number;
  
  /** Realized PnL (for closing trades) */
  realizedPnl: number;
  
  /** Commission paid */
  commission: number;
  
  /** Commission asset */
  commissionAsset: string;
  
  /** Trade timestamp (ms) */
  timestamp: number;
  
  /** Whether this was a maker order */
  isMaker: boolean;
  
  /** Position side (for hedge mode) */
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  
  /** Source exchange */
  source: ExchangeType;
}

// =============================================================================
// Order Types
// =============================================================================

/** Order types supported */
export type ExchangeOrderType = 
  | 'LIMIT' 
  | 'MARKET' 
  | 'STOP' 
  | 'STOP_MARKET' 
  | 'TAKE_PROFIT' 
  | 'TAKE_PROFIT_MARKET';

/** Order status */
export type ExchangeOrderStatus = 
  | 'NEW' 
  | 'PARTIALLY_FILLED' 
  | 'FILLED' 
  | 'CANCELED' 
  | 'REJECTED' 
  | 'EXPIRED';

/**
 * Generic order representation
 */
export interface ExchangeOrder {
  /** Order ID */
  orderId: string;
  
  /** Trading pair symbol */
  symbol: string;
  
  /** Order side */
  side: 'BUY' | 'SELL';
  
  /** Order type */
  type: ExchangeOrderType;
  
  /** Order status */
  status: ExchangeOrderStatus;
  
  /** Original quantity */
  originalQuantity: number;
  
  /** Executed quantity */
  executedQuantity: number;
  
  /** Order price (for limit orders) */
  price: number;
  
  /** Average fill price */
  avgPrice: number;
  
  /** Stop/trigger price */
  stopPrice: number;
  
  /** Position side */
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  
  /** Order creation time (ms) */
  createTime: number;
  
  /** Last update time (ms) */
  updateTime: number;
  
  /** Source exchange */
  source: ExchangeType;
}

// =============================================================================
// Income Types
// =============================================================================

/** Income/transaction categories */
export type ExchangeIncomeCategory = 
  | 'pnl'       // Realized P&L
  | 'fees'      // Trading fees
  | 'funding'   // Funding fees
  | 'transfers' // Deposits/withdrawals
  | 'rewards'   // Rebates, bonuses
  | 'other';    // Miscellaneous

/**
 * Generic income/transaction record
 */
export interface ExchangeIncome {
  /** Transaction ID */
  id: string;
  
  /** Symbol (if applicable) */
  symbol: string | null;
  
  /** Income type from exchange */
  incomeType: string;
  
  /** Normalized category */
  category: ExchangeIncomeCategory;
  
  /** Income amount (positive or negative) */
  amount: number;
  
  /** Asset */
  asset: string;
  
  /** Timestamp (ms) */
  timestamp: number;
  
  /** Additional info */
  info: string;
  
  /** Source exchange */
  source: ExchangeType;
}

// =============================================================================
// Credential Types
// =============================================================================

/**
 * Exchange credential status (for UI display)
 */
export interface ExchangeCredentialStatus {
  /** Credential ID */
  id: string;
  
  /** Exchange type */
  exchange: ExchangeType;
  
  /** User-defined label */
  label: string;
  
  /** Masked API key for display */
  apiKeyMasked: string;
  
  /** Whether credentials are valid */
  isValid: boolean | null;
  
  /** Detected permissions */
  permissions: string[];
  
  /** Last validation timestamp */
  lastValidatedAt: string | null;
  
  /** Creation timestamp */
  createdAt: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standardized API response wrapper
 */
export interface ExchangeApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
  source: ExchangeType;
}

// =============================================================================
// Rate Limit Types
// =============================================================================

/**
 * Rate limit status for an endpoint category
 */
export interface ExchangeRateLimitStatus {
  /** Endpoint category */
  category: string;
  
  /** Current weight used */
  weightUsed: number;
  
  /** Maximum allowed weight */
  maxWeight: number;
  
  /** Reset timestamp */
  resetAt: string;
  
  /** Usage percentage */
  usagePercent: number;
  
  /** Source exchange */
  source: ExchangeType;
}
