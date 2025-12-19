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
  const currentPrice = dbHolding.price_cache?.price || 0;
  const value = Number(dbHolding.quantity) * currentPrice;
  const costBasis = Number(dbHolding.total_cost);
  const profitLoss = value - costBasis;
  const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
  const market = getMarketFromAssetType(dbHolding.assets.asset_type);

  const asset: Asset = {
    id: dbHolding.assets.id,
    symbol: dbHolding.assets.symbol,
    name: dbHolding.assets.name,
    type: mapAssetType(dbHolding.assets.asset_type),
    market,
    currency: market === 'ID' ? 'IDR' : 'USD',
    imageUrl: dbHolding.assets.logo_url || undefined,
    currentPrice,
    priceChange1h: 0,
    priceChange24h: dbHolding.price_cache?.price_change_24h || 0,
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
  const totalValue = dbHoldings.reduce((sum, h) => {
    const price = h.price_cache?.price || 0;
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

export function calculateAllocation(holdings: Holding[]): AllocationItem[] {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  
  // Group by market
  const byMarket = holdings.reduce<Record<string, number>>((acc, h) => {
    const market = h.asset.market;
    acc[market] = (acc[market] || 0) + h.value;
    return acc;
  }, {});

  return Object.entries(byMarket).map(([market, value]) => ({
    name: market === 'CRYPTO' ? 'Cryptocurrency' : market === 'US' ? 'US Stocks' : 'ID Stocks',
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    color: ALLOCATION_COLORS[market as keyof typeof ALLOCATION_COLORS] || ALLOCATION_COLORS.US,
  }));
}
