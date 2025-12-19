// Demo data for Portfolio Assets Management

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'STOCK' | 'CRYPTO' | 'ETF';
  market: 'US' | 'ID' | 'CRYPTO';
  imageUrl?: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  priceChange24h: number;
  value: number;
  costBasis: number;
  profitLoss: number;
  profitLossPercent: number;
}

export interface Transaction {
  id: string;
  assetSymbol: string;
  assetName: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total: number;
  date: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  allocationByType: { name: string; value: number; color: string }[];
}

export const demoHoldings: Asset[] = [
  {
    id: '1',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'CRYPTO',
    market: 'CRYPTO',
    quantity: 0.5,
    avgPrice: 45000,
    currentPrice: 67500,
    priceChange24h: 2.34,
    value: 33750,
    costBasis: 22500,
    profitLoss: 11250,
    profitLossPercent: 50,
  },
  {
    id: '2',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'CRYPTO',
    market: 'CRYPTO',
    quantity: 5,
    avgPrice: 2500,
    currentPrice: 3650,
    priceChange24h: 1.85,
    value: 18250,
    costBasis: 12500,
    profitLoss: 5750,
    profitLossPercent: 46,
  },
  {
    id: '3',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'STOCK',
    market: 'US',
    quantity: 50,
    avgPrice: 165,
    currentPrice: 198.5,
    priceChange24h: 0.75,
    value: 9925,
    costBasis: 8250,
    profitLoss: 1675,
    profitLossPercent: 20.3,
  },
  {
    id: '4',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    type: 'STOCK',
    market: 'US',
    quantity: 20,
    avgPrice: 450,
    currentPrice: 875,
    priceChange24h: -1.2,
    value: 17500,
    costBasis: 9000,
    profitLoss: 8500,
    profitLossPercent: 94.4,
  },
  {
    id: '5',
    symbol: 'BBCA.JK',
    name: 'Bank Central Asia',
    type: 'STOCK',
    market: 'ID',
    quantity: 500,
    avgPrice: 8500,
    currentPrice: 9650,
    priceChange24h: 0.52,
    value: 4825000,
    costBasis: 4250000,
    profitLoss: 575000,
    profitLossPercent: 13.5,
  },
  {
    id: '6',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    type: 'ETF',
    market: 'US',
    quantity: 15,
    avgPrice: 380,
    currentPrice: 445,
    priceChange24h: 0.45,
    value: 6675,
    costBasis: 5700,
    profitLoss: 975,
    profitLossPercent: 17.1,
  },
];

export const demoTransactions: Transaction[] = [
  {
    id: '1',
    assetSymbol: 'BTC',
    assetName: 'Bitcoin',
    type: 'BUY',
    quantity: 0.25,
    price: 65000,
    total: 16250,
    date: '2024-12-18',
  },
  {
    id: '2',
    assetSymbol: 'NVDA',
    assetName: 'NVIDIA Corp.',
    type: 'SELL',
    quantity: 5,
    price: 890,
    total: 4450,
    date: '2024-12-17',
  },
  {
    id: '3',
    assetSymbol: 'ETH',
    assetName: 'Ethereum',
    type: 'BUY',
    quantity: 2,
    price: 3600,
    total: 7200,
    date: '2024-12-16',
  },
  {
    id: '4',
    assetSymbol: 'AAPL',
    assetName: 'Apple Inc.',
    type: 'BUY',
    quantity: 10,
    price: 195,
    total: 1950,
    date: '2024-12-15',
  },
  {
    id: '5',
    assetSymbol: 'VOO',
    assetName: 'Vanguard S&P 500 ETF',
    type: 'BUY',
    quantity: 5,
    price: 440,
    total: 2200,
    date: '2024-12-14',
  },
];

export const demoPortfolioMetrics: PortfolioMetrics = {
  totalValue: 391100,
  totalCostBasis: 308950,
  totalProfitLoss: 82150,
  totalProfitLossPercent: 26.6,
  dayChange: 4250,
  dayChangePercent: 1.1,
  allocationByType: [
    { name: 'Crypto', value: 52000, color: 'hsl(var(--chart-1))' },
    { name: 'US Stocks', value: 34100, color: 'hsl(var(--chart-2))' },
    { name: 'ID Stocks', value: 298325, color: 'hsl(var(--chart-3))' },
    { name: 'ETF', value: 6675, color: 'hsl(var(--chart-4))' },
  ],
};

export const performanceData = [
  { date: 'Jan', value: 280000 },
  { date: 'Feb', value: 295000 },
  { date: 'Mar', value: 285000 },
  { date: 'Apr', value: 310000 },
  { date: 'May', value: 325000 },
  { date: 'Jun', value: 318000 },
  { date: 'Jul', value: 340000 },
  { date: 'Aug', value: 355000 },
  { date: 'Sep', value: 348000 },
  { date: 'Oct', value: 365000 },
  { date: 'Nov', value: 378000 },
  { date: 'Dec', value: 391100 },
];
