/**
 * Transform database data to UI types
 */
import type { HoldingWithAsset, TransactionWithAsset } from '@/hooks/use-portfolio';
import type { 
  Holding, 
  Asset, 
  Transaction, 
  PortfolioMetrics, 
  AllocationItem,
  AssetMarket,
  AssetType,
  TransactionType 
} from '@/types/portfolio';

const ALLOCATION_COLORS = {
  CRYPTO: 'hsl(var(--chart-1))',
  US: 'hsl(var(--chart-2))',
  ID: 'hsl(var(--chart-3))',
  STOCK: 'hsl(var(--chart-2))',
  ETF: 'hsl(var(--chart-4))',
  BOND: 'hsl(var(--chart-5))',
};

function getMarketFromAssetType(assetType: string): AssetMarket {
  const type = assetType.toUpperCase();
  if (type === 'CRYPTO' || type === 'CRYPTOCURRENCY') return 'CRYPTO';
  if (type === 'IDX' || type === 'ID_STOCK') return 'ID';
  return 'US';
}

function mapAssetType(assetType: string): AssetType {
  const type = assetType.toUpperCase();
  if (type === 'CRYPTO' || type === 'CRYPTOCURRENCY') return 'CRYPTO';
  if (type === 'ETF') return 'ETF';
  if (type === 'BOND') return 'BOND';
  if (type === 'MUTUAL_FUND') return 'MUTUAL_FUND';
  return 'STOCK';
}

export function transformHolding(
  dbHolding: HoldingWithAsset,
  totalPortfolioValue: number
): Holding {
  // Price source priority: price_cache (realtime) > assets.current_price (fallback) > average_cost (last resort)
  const currentPrice = 
    dbHolding.price_cache?.price || 
    dbHolding.assets?.current_price || 
    Number(dbHolding.average_cost) || 
    0;
  
  const value = Number(dbHolding.quantity) * currentPrice;
  const costBasis = Number(dbHolding.total_cost);
  const profitLoss = value - costBasis;
  const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
  const market = getMarketFromAssetType(dbHolding.assets?.asset_type || 'STOCK');

  const asset: Asset = {
    id: dbHolding.assets?.id || dbHolding.asset_id,
    symbol: dbHolding.assets?.symbol || 'UNKNOWN',
    name: dbHolding.assets?.name || 'Unknown Asset',
    type: mapAssetType(dbHolding.assets?.asset_type || 'STOCK'),
    market,
    currency: market === 'ID' ? 'IDR' : 'USD',
    imageUrl: dbHolding.assets?.logo_url || undefined,
    currentPrice,
    priceChange1h: 0,
    priceChange24h: dbHolding.price_cache?.price_change_percentage_24h || 0,
    priceChange7d: 0,
    lastUpdated: new Date(dbHolding.price_cache?.last_updated || new Date()),
  };

  return {
    id: dbHolding.id,
    portfolioId: dbHolding.portfolio_id,
    assetId: dbHolding.asset_id,
    asset,
    quantity: Number(dbHolding.quantity),
    avgPrice: Number(dbHolding.average_cost),
    value,
    costBasis,
    profitLoss,
    profitLossPercent,
    allocation: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
  };
}

export function transformHoldings(dbHoldings: HoldingWithAsset[]): Holding[] {
  // First calculate total value for allocation percentages
  // Price source priority: price_cache > assets.current_price > average_cost
  const totalValue = dbHoldings.reduce((sum, h) => {
    const price = 
      h.price_cache?.price || 
      h.assets?.current_price || 
      Number(h.average_cost) || 
      0;
    return sum + (Number(h.quantity) * price);
  }, 0);

  return dbHoldings.map(h => transformHolding(h, totalValue));
}

export function transformTransaction(dbTx: TransactionWithAsset): Transaction {
  const typeMap: Record<string, TransactionType> = {
    'buy': 'BUY',
    'sell': 'SELL',
    'dividend': 'DIVIDEND',
    'split': 'SPLIT',
    'transfer_in': 'TRANSFER_IN',
    'transfer_out': 'TRANSFER_OUT',
  };

  return {
    id: dbTx.id,
    portfolioId: dbTx.portfolio_id,
    assetId: dbTx.asset_id,
    assetSymbol: dbTx.assets.symbol,
    assetName: dbTx.assets.name,
    type: typeMap[dbTx.transaction_type.toLowerCase()] || 'BUY',
    quantity: Number(dbTx.quantity),
    price: Number(dbTx.price_per_unit),
    totalAmount: Number(dbTx.total_amount),
    fees: Number(dbTx.fee || 0),
    date: new Date(dbTx.transaction_date),
    notes: dbTx.notes || undefined,
  };
}

export function transformTransactions(dbTransactions: TransactionWithAsset[]): Transaction[] {
  return dbTransactions.map(transformTransaction);
}

export function calculateMetrics(holdings: Holding[]): PortfolioMetrics {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalProfitLoss = totalValue - totalCostBasis;
  const totalProfitLossPercent = totalCostBasis > 0 
    ? (totalProfitLoss / totalCostBasis) * 100 
    : 0;

  // Calculate day change from 24h price changes
  const dayChange = holdings.reduce((sum, h) => {
    const change24hPercent = h.asset.priceChange24h || 0;
    const previousValue = h.value / (1 + change24hPercent / 100);
    return sum + (h.value - previousValue);
  }, 0);
  
  const dayChangePercent = totalValue > 0 
    ? (dayChange / (totalValue - dayChange)) * 100 
    : 0;

  // Find best and worst performers
  const sortedByPerformance = [...holdings].sort(
    (a, b) => b.profitLossPercent - a.profitLossPercent
  );
  
  const bestPerformer = sortedByPerformance[0];
  const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1];

  return {
    totalValue,
    totalCostBasis,
    totalProfitLoss,
    totalProfitLossPercent,
    dayChange,
    dayChangePercent,
    bestPerformer: bestPerformer ? {
      symbol: bestPerformer.asset.symbol,
      profitLossPercent: bestPerformer.profitLossPercent,
    } : undefined,
    worstPerformer: worstPerformer ? {
      symbol: worstPerformer.asset.symbol,
      profitLossPercent: worstPerformer.profitLossPercent,
    } : undefined,
  };
}

export interface MarketAllocationAsset {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
  marketPercentage: number;
}

export interface MarketAllocation {
  market: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  assets: MarketAllocationAsset[];
}

export function calculateAllocation(holdings: Holding[]): MarketAllocation[] {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  
  // Group holdings by market
  const byMarket = holdings.reduce<Record<string, Holding[]>>((acc, h) => {
    const market = h.asset.market;
    if (!acc[market]) acc[market] = [];
    acc[market].push(h);
    return acc;
  }, {});

  return Object.entries(byMarket).map(([market, marketHoldings]) => {
    const marketValue = marketHoldings.reduce((sum, h) => sum + h.value, 0);
    const marketPercentage = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;
    
    const assets: MarketAllocationAsset[] = marketHoldings.map(h => ({
      symbol: h.asset.symbol,
      name: h.asset.name,
      value: h.value,
      percentage: totalValue > 0 ? (h.value / totalValue) * 100 : 0,
      marketPercentage: marketValue > 0 ? (h.value / marketValue) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    return {
      market,
      name: market === 'CRYPTO' ? 'Cryptocurrency' : market === 'US' ? 'US Stocks' : 'ID Stocks',
      value: marketValue,
      percentage: marketPercentage,
      color: ALLOCATION_COLORS[market as keyof typeof ALLOCATION_COLORS] || ALLOCATION_COLORS.US,
      assets,
    };
  }).sort((a, b) => b.value - a.value);
}
