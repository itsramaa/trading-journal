/**
 * Centralized Demo Data for Portfolio Assets Management
 * All data is normalized and related - single source of truth
 */

import type {
  Asset,
  Holding,
  Transaction,
  PortfolioMetrics,
  AllocationItem,
  PerformanceDataPoint,
  TransactionType,
} from '@/types/portfolio';

// ============= Base Exchange Rates =============
export const EXCHANGE_RATES = {
  USD_TO_IDR: 15800,
  IDR_TO_USD: 1 / 15800,
};

// ============= Demo Portfolio =============
export const demoPortfolio = {
  id: 'p1',
  userId: 'u1',
  name: 'Main Portfolio',
  description: 'Primary investment portfolio',
  currency: 'USD' as const,
  isDefault: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
};

// ============= Demo Assets =============
export const demoAssets: Asset[] = [
  {
    id: 'a1',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'CRYPTO',
    market: 'CRYPTO',
    currency: 'USD',
    currentPrice: 67500,
    priceChange1h: 0.15,
    priceChange24h: 2.34,
    priceChange7d: 8.5,
    lastUpdated: new Date(),
  },
  {
    id: 'a2',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'CRYPTO',
    market: 'CRYPTO',
    currency: 'USD',
    currentPrice: 3650,
    priceChange1h: -0.22,
    priceChange24h: 1.85,
    priceChange7d: 5.2,
    lastUpdated: new Date(),
  },
  {
    id: 'a3',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'STOCK',
    market: 'US',
    sector: 'Technology',
    currency: 'USD',
    currentPrice: 198.5,
    priceChange1h: 0.12,
    priceChange24h: 0.75,
    priceChange7d: 2.1,
    lastUpdated: new Date(),
  },
  {
    id: 'a4',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    type: 'STOCK',
    market: 'US',
    sector: 'Technology',
    currency: 'USD',
    currentPrice: 875,
    priceChange1h: -0.35,
    priceChange24h: -1.2,
    priceChange7d: 4.8,
    lastUpdated: new Date(),
  },
  {
    id: 'a5',
    symbol: 'BBCA',
    name: 'Bank Central Asia',
    type: 'STOCK',
    market: 'ID',
    sector: 'Financial',
    currency: 'IDR',
    currentPrice: 9650,
    priceChange1h: 0.08,
    priceChange24h: 0.52,
    priceChange7d: 1.8,
    lastUpdated: new Date(),
  },
  {
    id: 'a6',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    type: 'ETF',
    market: 'US',
    currency: 'USD',
    currentPrice: 445,
    priceChange1h: 0.05,
    priceChange24h: 0.45,
    priceChange7d: 1.5,
    lastUpdated: new Date(),
  },
  {
    id: 'a7',
    symbol: 'SOL',
    name: 'Solana',
    type: 'CRYPTO',
    market: 'CRYPTO',
    currency: 'USD',
    currentPrice: 126.13,
    priceChange1h: 0.2,
    priceChange24h: 0.3,
    priceChange7d: 5.8,
    lastUpdated: new Date(),
  },
  {
    id: 'a8',
    symbol: 'TLKM',
    name: 'Telkom Indonesia',
    type: 'STOCK',
    market: 'ID',
    sector: 'Telecom',
    currency: 'IDR',
    currentPrice: 3850,
    priceChange1h: -0.12,
    priceChange24h: -0.65,
    priceChange7d: -2.1,
    lastUpdated: new Date(),
  },
  {
    id: 'a9',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    type: 'STOCK',
    market: 'US',
    sector: 'Technology',
    currency: 'USD',
    currentPrice: 175.5,
    priceChange1h: 0.18,
    priceChange24h: 1.25,
    priceChange7d: 3.2,
    lastUpdated: new Date(),
  },
  {
    id: 'a10',
    symbol: 'BMRI',
    name: 'Bank Mandiri',
    type: 'STOCK',
    market: 'ID',
    sector: 'Financial',
    currency: 'IDR',
    currentPrice: 6275,
    priceChange1h: 0.15,
    priceChange24h: 0.88,
    priceChange7d: 2.5,
    lastUpdated: new Date(),
  },
];

// Helper to get asset by ID
export const getAssetById = (id: string) => demoAssets.find(a => a.id === id);
export const getAssetBySymbol = (symbol: string) => demoAssets.find(a => a.symbol === symbol);

// ============= Demo Holdings =============
// All values in USD for consistency, IDR assets converted at display time
export const demoHoldings: Holding[] = [
  {
    id: 'h1',
    portfolioId: 'p1',
    assetId: 'a1',
    asset: demoAssets[0],
    quantity: 1.5,
    avgPrice: 45000,
    value: 101250, // 1.5 * 67500
    costBasis: 67500, // 1.5 * 45000
    profitLoss: 33750,
    profitLossPercent: 50,
    allocation: 25.85,
  },
  {
    id: 'h2',
    portfolioId: 'p1',
    assetId: 'a2',
    asset: demoAssets[1],
    quantity: 10,
    avgPrice: 2500,
    value: 36500, // 10 * 3650
    costBasis: 25000, // 10 * 2500
    profitLoss: 11500,
    profitLossPercent: 46,
    allocation: 9.32,
  },
  {
    id: 'h3',
    portfolioId: 'p1',
    assetId: 'a3',
    asset: demoAssets[2],
    quantity: 50,
    avgPrice: 165,
    value: 9925, // 50 * 198.5
    costBasis: 8250, // 50 * 165
    profitLoss: 1675,
    profitLossPercent: 20.3,
    allocation: 2.53,
  },
  {
    id: 'h4',
    portfolioId: 'p1',
    assetId: 'a4',
    asset: demoAssets[3],
    quantity: 25,
    avgPrice: 450,
    value: 21875, // 25 * 875
    costBasis: 11250, // 25 * 450
    profitLoss: 10625,
    profitLossPercent: 94.4,
    allocation: 5.59,
  },
  {
    id: 'h5',
    portfolioId: 'p1',
    assetId: 'a5',
    asset: demoAssets[4],
    quantity: 30000,
    avgPrice: 8500,
    value: 18322.78, // 289500000 IDR / 15800
    costBasis: 16139.24, // 255000000 IDR / 15800
    profitLoss: 2183.54,
    profitLossPercent: 13.5,
    allocation: 4.68,
  },
  {
    id: 'h6',
    portfolioId: 'p1',
    assetId: 'a6',
    asset: demoAssets[5],
    quantity: 30,
    avgPrice: 380,
    value: 13350, // 30 * 445
    costBasis: 11400, // 30 * 380
    profitLoss: 1950,
    profitLossPercent: 17.1,
    allocation: 3.41,
  },
  {
    id: 'h7',
    portfolioId: 'p1',
    assetId: 'a7',
    asset: demoAssets[6],
    quantity: 200,
    avgPrice: 85,
    value: 25226, // 200 * 126.13
    costBasis: 17000, // 200 * 85
    profitLoss: 8226,
    profitLossPercent: 48.4,
    allocation: 6.44,
  },
  {
    id: 'h8',
    portfolioId: 'p1',
    assetId: 'a8',
    asset: demoAssets[7],
    quantity: 10000,
    avgPrice: 4200,
    value: 2436.71, // 38500000 IDR / 15800
    costBasis: 2658.23, // 42000000 IDR / 15800
    profitLoss: -221.52,
    profitLossPercent: -8.3,
    allocation: 0.62,
  },
  {
    id: 'h9',
    portfolioId: 'p1',
    assetId: 'a9',
    asset: demoAssets[8],
    quantity: 100,
    avgPrice: 140,
    value: 17550, // 100 * 175.5
    costBasis: 14000, // 100 * 140
    profitLoss: 3550,
    profitLossPercent: 25.4,
    allocation: 4.48,
  },
  {
    id: 'h10',
    portfolioId: 'p1',
    assetId: 'a10',
    asset: demoAssets[9],
    quantity: 50000,
    avgPrice: 5800,
    value: 19858.86, // 313750000 IDR / 15800
    costBasis: 18354.43, // 290000000 IDR / 15800
    profitLoss: 1504.43,
    profitLossPercent: 8.2,
    allocation: 5.07,
  },
];

// ============= Demo Transactions =============
export const demoTransactions: Transaction[] = [
  {
    id: 't1',
    portfolioId: 'p1',
    assetId: 'a1',
    assetSymbol: 'BTC',
    assetName: 'Bitcoin',
    type: 'BUY',
    quantity: 0.5,
    price: 65000,
    totalAmount: 32500,
    fees: 50,
    date: new Date('2024-12-18'),
    notes: 'DCA purchase',
  },
  {
    id: 't2',
    portfolioId: 'p1',
    assetId: 'a4',
    assetSymbol: 'NVDA',
    assetName: 'NVIDIA Corp.',
    type: 'SELL',
    quantity: 5,
    price: 890,
    totalAmount: 4450,
    fees: 5,
    date: new Date('2024-12-17'),
    notes: 'Taking profits',
  },
  {
    id: 't3',
    portfolioId: 'p1',
    assetId: 'a2',
    assetSymbol: 'ETH',
    assetName: 'Ethereum',
    type: 'BUY',
    quantity: 3,
    price: 3600,
    totalAmount: 10800,
    fees: 20,
    date: new Date('2024-12-16'),
  },
  {
    id: 't4',
    portfolioId: 'p1',
    assetId: 'a3',
    assetSymbol: 'AAPL',
    assetName: 'Apple Inc.',
    type: 'DIVIDEND',
    quantity: 0,
    price: 0,
    totalAmount: 24.50,
    fees: 0,
    date: new Date('2024-12-15'),
    notes: 'Q4 2024 Dividend',
  },
  {
    id: 't5',
    portfolioId: 'p1',
    assetId: 'a6',
    assetSymbol: 'VOO',
    assetName: 'Vanguard S&P 500 ETF',
    type: 'BUY',
    quantity: 10,
    price: 440,
    totalAmount: 4400,
    fees: 0,
    date: new Date('2024-12-14'),
  },
  {
    id: 't6',
    portfolioId: 'p1',
    assetId: 'a7',
    assetSymbol: 'SOL',
    assetName: 'Solana',
    type: 'TRANSFER_IN',
    quantity: 100,
    price: 120,
    totalAmount: 12000,
    fees: 0,
    date: new Date('2024-12-13'),
    notes: 'Transfer from Binance',
  },
  {
    id: 't7',
    portfolioId: 'p1',
    assetId: 'a1',
    assetSymbol: 'BTC',
    assetName: 'Bitcoin',
    type: 'TRANSFER_OUT',
    quantity: 0.1,
    price: 67000,
    totalAmount: 6700,
    fees: 10,
    date: new Date('2024-12-12'),
    notes: 'Transfer to cold wallet',
  },
  {
    id: 't8',
    portfolioId: 'p1',
    assetId: 'a5',
    assetSymbol: 'BBCA',
    assetName: 'Bank Central Asia',
    type: 'DIVIDEND',
    quantity: 0,
    price: 0,
    totalAmount: 85.44, // 1350000 IDR / 15800
    fees: 0,
    date: new Date('2024-12-10'),
    notes: 'Semi-annual dividend',
  },
  {
    id: 't9',
    portfolioId: 'p1',
    assetId: 'a9',
    assetSymbol: 'GOOGL',
    assetName: 'Alphabet Inc.',
    type: 'BUY',
    quantity: 50,
    price: 168,
    totalAmount: 8400,
    fees: 5,
    date: new Date('2024-12-08'),
  },
  {
    id: 't10',
    portfolioId: 'p1',
    assetId: 'a10',
    assetSymbol: 'BMRI',
    assetName: 'Bank Mandiri',
    type: 'BUY',
    quantity: 20000,
    price: 5950, // In IDR, displayed as USD equivalent
    totalAmount: 7531.65, // 119000000 IDR / 15800
    fees: 15,
    date: new Date('2024-12-05'),
  },
  {
    id: 't11',
    portfolioId: 'p1',
    assetId: 'a2',
    assetSymbol: 'ETH',
    assetName: 'Ethereum',
    type: 'SELL',
    quantity: 2,
    price: 3800,
    totalAmount: 7600,
    fees: 15,
    date: new Date('2024-12-03'),
    notes: 'Partial profit taking',
  },
  {
    id: 't12',
    portfolioId: 'p1',
    assetId: 'a6',
    assetSymbol: 'VOO',
    assetName: 'Vanguard S&P 500 ETF',
    type: 'DIVIDEND',
    quantity: 0,
    price: 0,
    totalAmount: 45.60,
    fees: 0,
    date: new Date('2024-12-01'),
    notes: 'Q4 Distribution',
  },
];

// ============= Calculate Metrics from Holdings =============
const calculateTotalValue = () => demoHoldings.reduce((sum, h) => sum + h.value, 0);
const calculateTotalCostBasis = () => demoHoldings.reduce((sum, h) => sum + h.costBasis, 0);
const calculateTotalProfitLoss = () => demoHoldings.reduce((sum, h) => sum + h.profitLoss, 0);

const totalValue = calculateTotalValue();
const totalCostBasis = calculateTotalCostBasis();
const totalProfitLoss = calculateTotalProfitLoss();

// Find best and worst performers
const sortedByPL = [...demoHoldings].sort((a, b) => b.profitLossPercent - a.profitLossPercent);
const bestPerformer = sortedByPL[0];
const worstPerformer = sortedByPL[sortedByPL.length - 1];

// Calculate CAGR (assuming 2 year investment period)
const years = 2;
const cagr = (Math.pow(totalValue / totalCostBasis, 1 / years) - 1) * 100;

export const demoPortfolioMetrics: PortfolioMetrics & { cagr: number } = {
  totalValue,
  totalCostBasis,
  totalProfitLoss,
  totalProfitLossPercent: (totalProfitLoss / totalCostBasis) * 100,
  dayChange: 3250.75,
  dayChangePercent: 1.24,
  cagr,
  bestPerformer: {
    symbol: bestPerformer.asset.symbol,
    profitLossPercent: bestPerformer.profitLossPercent,
  },
  worstPerformer: {
    symbol: worstPerformer.asset.symbol,
    profitLossPercent: worstPerformer.profitLossPercent,
  },
};

// ============= Allocation Data (calculated from holdings) =============
const calculateAllocationByMarket = (): AllocationItem[] => {
  const marketTotals: Record<string, number> = {};
  
  demoHoldings.forEach(h => {
    const market = h.asset.market;
    marketTotals[market] = (marketTotals[market] || 0) + h.value;
  });

  const marketColors: Record<string, string> = {
    CRYPTO: 'hsl(var(--chart-1))',
    US: 'hsl(var(--chart-2))',
    ID: 'hsl(var(--chart-3))',
    ETF: 'hsl(var(--chart-4))',
  };

  const marketNames: Record<string, string> = {
    CRYPTO: 'Crypto',
    US: 'US Stocks',
    ID: 'ID Stocks',
  };

  return Object.entries(marketTotals).map(([market, value]) => ({
    name: marketNames[market] || market,
    value,
    percentage: (value / totalValue) * 100,
    color: marketColors[market] || 'hsl(var(--chart-5))',
  })).sort((a, b) => b.percentage - a.percentage);
};

// Detailed allocation with nested assets per market
export interface MarketAllocation {
  market: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  assets: {
    symbol: string;
    name: string;
    value: number;
    percentage: number; // Percentage of total portfolio
    marketPercentage: number; // Percentage within market
  }[];
}

export const calculateDetailedAllocation = (): MarketAllocation[] => {
  const marketGroups: Record<string, Holding[]> = {};
  
  demoHoldings.forEach(h => {
    const market = h.asset.market;
    if (!marketGroups[market]) marketGroups[market] = [];
    marketGroups[market].push(h);
  });

  const marketColors: Record<string, string> = {
    CRYPTO: 'hsl(var(--chart-1))',
    US: 'hsl(var(--chart-2))',
    ID: 'hsl(var(--chart-3))',
  };

  const marketNames: Record<string, string> = {
    CRYPTO: 'Crypto',
    US: 'US Stocks',
    ID: 'ID Stocks',
  };

  return Object.entries(marketGroups).map(([market, holdings]) => {
    const marketValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value);
    
    return {
      market,
      name: marketNames[market] || market,
      value: marketValue,
      percentage: (marketValue / totalValue) * 100,
      color: marketColors[market] || 'hsl(var(--chart-5))',
      assets: sortedHoldings.map(h => ({
        symbol: h.asset.symbol,
        name: h.asset.name,
        value: h.value,
        percentage: (h.value / totalValue) * 100,
        marketPercentage: (h.value / marketValue) * 100,
      })),
    };
  }).sort((a, b) => b.percentage - a.percentage);
};

export const demoAllocationByType = calculateAllocationByMarket();
export const demoDetailedAllocation = calculateDetailedAllocation();

export const demoAllocationByAsset: AllocationItem[] = [...demoHoldings]
  .sort((a, b) => b.value - a.value)
  .map((h, index) => ({
    name: h.asset.symbol,
    value: h.value,
    percentage: (h.value / totalValue) * 100,
    color: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

// ============= Transaction Stats =============
export const calculateTransactionStats = () => {
  const stats = {
    total: demoTransactions.length,
    buys: 0,
    sells: 0,
    transferIn: 0,
    transferOut: 0,
    dividends: 0,
    buyVolume: 0,
    sellVolume: 0,
    transferInVolume: 0,
    transferOutVolume: 0,
    dividendVolume: 0,
    totalVolume: 0,
  };

  demoTransactions.forEach(tx => {
    stats.totalVolume += tx.totalAmount;
    
    switch (tx.type) {
      case 'BUY':
        stats.buys++;
        stats.buyVolume += tx.totalAmount;
        break;
      case 'SELL':
        stats.sells++;
        stats.sellVolume += tx.totalAmount;
        break;
      case 'TRANSFER_IN':
        stats.transferIn++;
        stats.transferInVolume += tx.totalAmount;
        break;
      case 'TRANSFER_OUT':
        stats.transferOut++;
        stats.transferOutVolume += tx.totalAmount;
        break;
      case 'DIVIDEND':
        stats.dividends++;
        stats.dividendVolume += tx.totalAmount;
        break;
    }
  });

  return stats;
};

export const demoTransactionStats = calculateTransactionStats();

// ============= Performance Data =============
export const performanceData: PerformanceDataPoint[] = [
  { date: '2024-01', value: 180000, profitLoss: -5000 },
  { date: '2024-02', value: 195000, profitLoss: 15000 },
  { date: '2024-03', value: 188000, profitLoss: -7000 },
  { date: '2024-04', value: 215000, profitLoss: 27000 },
  { date: '2024-05', value: 235000, profitLoss: 20000 },
  { date: '2024-06', value: 225000, profitLoss: -10000 },
  { date: '2024-07', value: 248000, profitLoss: 23000 },
  { date: '2024-08', value: 262000, profitLoss: 14000 },
  { date: '2024-09', value: 255000, profitLoss: -7000 },
  { date: '2024-10', value: 278000, profitLoss: 23000 },
  { date: '2024-11', value: 295000, profitLoss: 17000 },
  { date: '2024-12', value: totalValue, profitLoss: totalValue - 295000 },
];

export const performance7d: PerformanceDataPoint[] = [
  { date: 'Dec 12', value: totalValue - 8500 },
  { date: 'Dec 13', value: totalValue - 6200 },
  { date: 'Dec 14', value: totalValue - 4800 },
  { date: 'Dec 15', value: totalValue - 2100 },
  { date: 'Dec 16', value: totalValue - 3500 },
  { date: 'Dec 17', value: totalValue - 1200 },
  { date: 'Dec 18', value: totalValue },
];

export const performance24h: PerformanceDataPoint[] = [
  { date: '00:00', value: totalValue - 3500 },
  { date: '04:00', value: totalValue - 2800 },
  { date: '08:00', value: totalValue - 4100 },
  { date: '12:00', value: totalValue - 1500 },
  { date: '16:00', value: totalValue - 800 },
  { date: '20:00', value: totalValue - 1200 },
  { date: '24:00', value: totalValue },
];

export const performance1m: PerformanceDataPoint[] = [
  { date: 'Nov 18', value: totalValue * 0.92 },
  { date: 'Nov 22', value: totalValue * 0.94 },
  { date: 'Nov 26', value: totalValue * 0.91 },
  { date: 'Nov 30', value: totalValue * 0.95 },
  { date: 'Dec 04', value: totalValue * 0.97 },
  { date: 'Dec 08', value: totalValue * 0.93 },
  { date: 'Dec 12', value: totalValue * 0.96 },
  { date: 'Dec 16', value: totalValue * 0.98 },
  { date: 'Dec 18', value: totalValue },
];

export const getPerformanceData = (period: string): PerformanceDataPoint[] => {
  switch (period) {
    case '24H':
      return performance24h;
    case '7D':
      return performance7d;
    case '1M':
      return performance1m;
    case '1Y':
    case 'YTD':
    case 'ALL':
      return performanceData;
    default:
      return performanceData;
  }
};

// ============= Target Allocations =============
export const targetAllocations = [
  { name: 'Crypto', target: 40, current: demoAllocationByType.find(a => a.name === 'Crypto')?.percentage || 0, color: 'bg-chart-1' },
  { name: 'US Stocks', target: 35, current: demoAllocationByType.find(a => a.name === 'US Stocks')?.percentage || 0, color: 'bg-chart-2' },
  { name: 'ID Stocks', target: 25, current: demoAllocationByType.find(a => a.name === 'ID Stocks')?.percentage || 0, color: 'bg-chart-3' },
];

// ============= Analytics Data =============
export const analyticsData = {
  sharpeRatio: 1.85,
  sortinoRatio: 2.12,
  maxDrawdown: -15.3,
  volatility: 22.5,
  beta: 1.15,
  alpha: 8.5,
  winRate: 68.5,
  profitFactor: 2.34,
  avgWin: 12.5,
  avgLoss: -5.3,
  calmarRatio: 1.95,
  
  monthlyReturns: [
    { month: 'Jan', return: -2.8 },
    { month: 'Feb', return: 8.3 },
    { month: 'Mar', return: -3.6 },
    { month: 'Apr', return: 14.4 },
    { month: 'May', return: 9.3 },
    { month: 'Jun', return: -4.3 },
    { month: 'Jul', return: 10.2 },
    { month: 'Aug', return: 5.6 },
    { month: 'Sep', return: -2.7 },
    { month: 'Oct', return: 9.0 },
    { month: 'Nov', return: 6.1 },
    { month: 'Dec', return: 4.8 },
  ],
  
  riskMetrics: [
    { metric: 'Volatility', value: 75 },
    { metric: 'Sharpe', value: 85 },
    { metric: 'Sortino', value: 80 },
    { metric: 'Beta', value: 60 },
    { metric: 'Alpha', value: 90 },
    { metric: 'Diversification', value: 70 },
  ],
  
  correlationMatrix: [
    { asset: 'BTC', btc: 1, eth: 0.85, stocks: 0.35 },
    { asset: 'ETH', btc: 0.85, eth: 1, stocks: 0.30 },
    { asset: 'Stocks', btc: 0.35, eth: 0.30, stocks: 1 },
  ],
};
