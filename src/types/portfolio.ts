/**
 * Portfolio Assets Management - Type Definitions
 * Aligned with PRD specifications for financial data structures
 */

// ============= Enums =============

export type AssetType = 'STOCK' | 'CRYPTO' | 'BOND' | 'ETF' | 'MUTUAL_FUND';

export type AssetMarket = 'US' | 'ID' | 'CRYPTO';

export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE';

export type Currency = 'USD' | 'IDR';

// ============= Core Entities =============

/**
 * Asset entity representing a tradable instrument
 * PRD Reference: Section 2 - Portfolio Management
 */
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  market: AssetMarket;
  sector?: string;
  currency: Currency;
  imageUrl?: string;
  
  // Price data
  currentPrice: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  lastUpdated: Date;
}

/**
 * Portfolio holding representing user's position in an asset
 */
export interface Holding {
  id: string;
  portfolioId: string;
  assetId: string;
  asset: Asset;
  
  // Position data
  quantity: number;
  avgPrice: number;
  
  // Calculated values
  value: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
  allocation: number; // percentage of portfolio
}

/**
 * Transaction entity for buy/sell records
 * PRD Reference: Section 2 - Portfolio Management
 */
export interface Transaction {
  id: string;
  portfolioId: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  type: TransactionType;
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  date: Date;
  notes?: string;
  tags?: string[];
}

/**
 * Portfolio entity containing multiple holdings
 * PRD Reference: Section 2 - Portfolio Management
 */
export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  currency: Currency;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Aggregated metrics
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

// ============= Analytics & Metrics =============

/**
 * Portfolio metrics for dashboard display
 */
export interface PortfolioMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  bestPerformer?: {
    symbol: string;
    profitLossPercent: number;
  };
  worstPerformer?: {
    symbol: string;
    profitLossPercent: number;
  };
}

/**
 * Allocation breakdown by category
 */
export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * Performance data point for charts
 */
export interface PerformanceDataPoint {
  date: string;
  value: number;
  profitLoss?: number;
}

/**
 * Risk metrics for analytics
 * PRD Reference: Section 4 - Analytics & Reporting
 */
export interface RiskMetrics {
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
}

// ============= FIRE Planning =============

/**
 * FIRE calculation inputs
 * PRD Reference: Section 5 - Financial Planning Tools
 */
export interface FireInputs {
  currentAge: number;
  targetRetirementAge: number;
  currentSavings: number;
  monthlyExpenses: number;
  withdrawalRate: number;
  expectedReturn: number;
  inflationRate: number;
  salaryGrowth: number;
}

/**
 * FIRE calculation results
 */
export interface FireResults {
  fireNumber: number;
  yearsToFire: number;
  fireAge: number;
  progressPercent: number;
  monthlyContributionNeeded: number;
  projectedWealth: PerformanceDataPoint[];
}

// ============= UI State Types =============

/**
 * Time period filter options
 */
export type TimePeriod = '24H' | '7D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Holdings table sort options
 */
export interface HoldingsSortConfig {
  key: keyof Holding | 'asset.symbol' | 'asset.priceChange24h';
  direction: SortDirection;
}
