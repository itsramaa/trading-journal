/**
 * Binance Market Data Types - Phase 1
 * Public endpoints (no API key required)
 */

// ============================================
// 1.1 Kline/Candlestick Data
// ============================================
export type KlineInterval = 
  | '1m' | '3m' | '5m' | '15m' | '30m' 
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' 
  | '1d' | '3d' | '1w' | '1M';

export interface KlineParams {
  symbol: string;
  interval: KlineInterval;
  startTime?: number;
  endTime?: number;
  limit?: number; // Default 500, max 1500
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
  takerBuyBaseVolume: number;
  takerBuyQuoteVolume: number;
}

// ============================================
// 1.2 Mark Price & Premium Index
// ============================================
export interface MarkPriceData {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  estimatedSettlePrice: number;
  lastFundingRate: number;
  nextFundingTime: number;
  interestRate: number;
  time: number;
}

// ============================================
// 1.3 Funding Rate History
// ============================================
export interface FundingRateParams {
  symbol?: string;
  startTime?: number;
  endTime?: number;
  limit?: number; // Default 100, max 1000
}

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
}

// ============================================
// 1.4 Open Interest Statistics
// ============================================
export type OpenInterestPeriod = '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d';

export interface OpenInterestParams {
  symbol: string;
  period: OpenInterestPeriod;
  startTime?: number;
  endTime?: number;
  limit?: number; // Default 30, max 500
}

export interface OpenInterestStat {
  symbol: string;
  sumOpenInterest: number;
  sumOpenInterestValue: number;
  timestamp: number;
}

// ============================================
// 1.5 Top Trader Long/Short Ratio (Positions)
// ============================================
export interface TopTraderRatioParams {
  symbol: string;
  period: OpenInterestPeriod;
  startTime?: number;
  endTime?: number;
  limit?: number; // Default 30, max 500
}

export interface TopTraderPositionRatio {
  symbol: string;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  timestamp: number;
}

// ============================================
// 1.6 Global Long/Short Account Ratio
// ============================================
export interface GlobalLongShortRatio {
  symbol: string;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  timestamp: number;
}

// ============================================
// 1.7 Taker Buy/Sell Volume
// ============================================
export interface TakerVolumeParams {
  symbol: string;
  period: OpenInterestPeriod;
  startTime?: number;
  endTime?: number;
  limit?: number; // Default 30, max 500
}

export interface TakerVolumeData {
  symbol: string;
  buySellRatio: number;
  buyVol: number;
  sellVol: number;
  timestamp: number;
}

// ============================================
// 1.8 Order Book Depth
// ============================================
export type OrderBookLimit = 5 | 10 | 20 | 50 | 100 | 500 | 1000;

export interface OrderBookParams {
  symbol: string;
  limit?: OrderBookLimit;
}

export interface OrderBookData {
  lastUpdateId: number;
  E: number; // Message output time
  T: number; // Transaction time
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][]; // [price, quantity]
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number; // Cumulative quantity
}

export interface ParsedOrderBook {
  lastUpdateId: number;
  messageTime: number;
  transactionTime: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spreadPercent: number;
  midPrice: number;
}

// ============================================
// 1.9 Aggregate Trades
// ============================================
export interface AggTradesParams {
  symbol: string;
  fromId?: number;
  startTime?: number;
  endTime?: number;
  limit?: number; // Default 500, max 1000
}

export interface AggregateTrade {
  aggTradeId: number;
  price: number;
  quantity: number;
  firstTradeId: number;
  lastTradeId: number;
  timestamp: number;
  isBuyerMaker: boolean;
}

// ============================================
// Aggregated Market Sentiment
// ============================================
export interface MarketSentimentData {
  symbol: string;
  timestamp: number;
  topTraderRatio: TopTraderPositionRatio | null;
  globalRatio: GlobalLongShortRatio | null;
  takerVolume: TakerVolumeData | null;
  openInterest: OpenInterestStat | null;
  fundingRate: FundingRateData | null;
  markPrice: MarkPriceData | null;
}

export interface SentimentScore {
  symbol: string;
  bullishScore: number; // 0-100
  bearishScore: number; // 0-100
  sentiment: 'bullish' | 'bearish' | 'neutral';
  factors: {
    topTraders: 'bullish' | 'bearish' | 'neutral';
    retail: 'bullish' | 'bearish' | 'neutral';
    takerVolume: 'bullish' | 'bearish' | 'neutral';
    openInterest: 'increasing' | 'decreasing' | 'stable';
    fundingRate: 'positive' | 'negative' | 'neutral';
  };
}

// ============================================
// API Response Types
// ============================================
export interface MarketDataApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp?: number;
}

// Action types for edge function
export type MarketDataAction = 
  | 'klines'
  | 'mark-price'
  | 'funding-rate'
  | 'open-interest'
  | 'top-trader-ratio'
  | 'global-ratio'
  | 'taker-volume'
  | 'order-book'
  | 'agg-trades';
