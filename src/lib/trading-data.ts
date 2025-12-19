/**
 * Trading Journey Data Types and Demo Data
 * Includes Strategy system for many-to-many trade-strategy relationships
 */

export interface Strategy {
  id: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: Date;
}

export interface Trade {
  id: string;
  date: Date;
  pair: string;
  direction: 'LONG' | 'SHORT';
  entry: number;
  exit: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  rr: number;
  result: 'win' | 'loss' | 'breakeven';
  marketCondition: string;
  confluence: number;
  entrySignal: string;
  notes: string;
  mood: string;
  strategyIds: string[]; // Many-to-many relationship
  tags: string[];
}

export interface StrategyPerformance {
  strategy: Strategy;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgRR: number;
  contribution: number; // Percentage of total P&L
}

export interface TradingStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgRR: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

// Demo Strategies
export const demoStrategies: Strategy[] = [
  {
    id: 's1',
    name: 'Breakout',
    description: 'Trade breakouts from consolidation patterns with volume confirmation',
    tags: ['momentum', 'trend-following'],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 's2',
    name: 'Mean Reversion',
    description: 'Fade extreme moves back to mean using RSI and Bollinger Bands',
    tags: ['contrarian', 'range'],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 's3',
    name: 'Order Block',
    description: 'Trade reactions at institutional order blocks and fair value gaps',
    tags: ['smc', 'institutional'],
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 's4',
    name: 'Trend Continuation',
    description: 'Enter on pullbacks within established trends',
    tags: ['trend-following', 'pullback'],
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 's5',
    name: 'Reversal',
    description: 'Trade major trend reversals at key levels',
    tags: ['reversal', 'key-levels'],
    createdAt: new Date('2024-02-15'),
  },
];

// Demo Trades with strategy relationships
export const demoTrades: Trade[] = [
  {
    id: 't1',
    date: new Date('2024-12-18'),
    pair: 'BTC/USDT',
    direction: 'LONG',
    entry: 42500,
    exit: 43800,
    stopLoss: 41800,
    takeProfit: 44500,
    quantity: 0.5,
    pnl: 650,
    pnlPercent: 3.06,
    rr: 1.86,
    result: 'win',
    marketCondition: 'Bullish',
    confluence: 8,
    entrySignal: 'Break of structure + FVG',
    notes: 'Perfect entry on the 4H FVG. Held through minor pullback.',
    mood: 'confident',
    strategyIds: ['s1', 's3'],
    tags: ['btc', 'crypto'],
  },
  {
    id: 't2',
    date: new Date('2024-12-17'),
    pair: 'ETH/USDT',
    direction: 'SHORT',
    entry: 2280,
    exit: 2220,
    stopLoss: 2320,
    takeProfit: 2150,
    quantity: 5,
    pnl: 300,
    pnlPercent: 2.63,
    rr: 1.5,
    result: 'win',
    marketCondition: 'Ranging',
    confluence: 6,
    entrySignal: 'Order block rejection',
    notes: 'Took profit early due to uncertainty.',
    mood: 'cautious',
    strategyIds: ['s2', 's3'],
    tags: ['eth', 'crypto'],
  },
  {
    id: 't3',
    date: new Date('2024-12-16'),
    pair: 'SOL/USDT',
    direction: 'LONG',
    entry: 98,
    exit: 94,
    stopLoss: 95,
    takeProfit: 108,
    quantity: 50,
    pnl: -200,
    pnlPercent: -4.08,
    rr: -1.33,
    result: 'loss',
    marketCondition: 'Choppy',
    confluence: 5,
    entrySignal: 'Support bounce',
    notes: 'Stopped out. Should have waited for confirmation.',
    mood: 'frustrated',
    strategyIds: ['s4'],
    tags: ['sol', 'crypto'],
  },
  {
    id: 't4',
    date: new Date('2024-12-15'),
    pair: 'BTC/USDT',
    direction: 'LONG',
    entry: 41200,
    exit: 42800,
    stopLoss: 40500,
    takeProfit: 43500,
    quantity: 0.3,
    pnl: 480,
    pnlPercent: 3.88,
    rr: 2.29,
    result: 'win',
    marketCondition: 'Bullish',
    confluence: 9,
    entrySignal: 'Trend continuation pullback',
    notes: 'Textbook pullback entry. Held full position.',
    mood: 'confident',
    strategyIds: ['s1', 's4'],
    tags: ['btc', 'crypto'],
  },
  {
    id: 't5',
    date: new Date('2024-12-14'),
    pair: 'ETH/USDT',
    direction: 'LONG',
    entry: 2180,
    exit: 2150,
    stopLoss: 2150,
    takeProfit: 2280,
    quantity: 8,
    pnl: -240,
    pnlPercent: -1.38,
    rr: -1,
    result: 'loss',
    marketCondition: 'Uncertain',
    confluence: 4,
    entrySignal: 'Support test',
    notes: 'Low confluence entry. Lesson learned.',
    mood: 'neutral',
    strategyIds: ['s5'],
    tags: ['eth', 'crypto'],
  },
  {
    id: 't6',
    date: new Date('2024-12-13'),
    pair: 'AAPL',
    direction: 'LONG',
    entry: 195,
    exit: 199.5,
    stopLoss: 192,
    takeProfit: 205,
    quantity: 100,
    pnl: 450,
    pnlPercent: 2.31,
    rr: 1.5,
    result: 'win',
    marketCondition: 'Bullish',
    confluence: 7,
    entrySignal: 'Breakout from consolidation',
    notes: 'Nice breakout trade. Took partial at 1:1.',
    mood: 'satisfied',
    strategyIds: ['s1'],
    tags: ['aapl', 'stocks', 'tech'],
  },
];

/**
 * Filter trades by date range
 */
export function filterTradesByDateRange(
  trades: Trade[],
  startDate: Date | null,
  endDate: Date | null
): Trade[] {
  return trades.filter(trade => {
    if (startDate && trade.date < startDate) return false;
    if (endDate && trade.date > endDate) return false;
    return true;
  });
}

/**
 * Calculate statistics for a set of trades
 */
export function calculateTradingStats(trades: Trade[]): TradingStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      avgRR: 0,
      profitFactor: 0,
      expectancy: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
    };
  }

  const wins = trades.filter(t => t.result === 'win');
  const losses = trades.filter(t => t.result === 'loss');
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  
  const winRate = (wins.length / trades.length) * 100;
  const avgPnl = totalPnl / trades.length;
  const avgRR = trades.reduce((sum, t) => sum + Math.abs(t.rr), 0) / trades.length;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Calculate expectancy
  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);
  
  // Simple max drawdown calculation (cumulative P&L based)
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  
  for (const trade of trades) {
    cumulative += trade.pnl;
    if (cumulative > peak) peak = cumulative;
    const drawdown = ((peak - cumulative) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    totalPnl,
    avgPnl,
    avgRR,
    profitFactor,
    expectancy,
    maxDrawdown,
    sharpeRatio: 1.8, // Simplified for demo
  };
}

/**
 * Calculate performance metrics per strategy
 */
export function calculateStrategyPerformance(
  trades: Trade[],
  strategies: Strategy[]
): StrategyPerformance[] {
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  
  return strategies.map(strategy => {
    const strategyTrades = trades.filter(t => t.strategyIds.includes(strategy.id));
    
    if (strategyTrades.length === 0) {
      return {
        strategy,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
        avgRR: 0,
        contribution: 0,
      };
    }
    
    const wins = strategyTrades.filter(t => t.result === 'win');
    const losses = strategyTrades.filter(t => t.result === 'loss');
    const strategyPnl = strategyTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    return {
      strategy,
      totalTrades: strategyTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / strategyTrades.length) * 100,
      totalPnl: strategyPnl,
      avgPnl: strategyPnl / strategyTrades.length,
      avgRR: strategyTrades.reduce((sum, t) => sum + Math.abs(t.rr), 0) / strategyTrades.length,
      contribution: totalPnl !== 0 ? (strategyPnl / totalPnl) * 100 : 0,
    };
  }).sort((a, b) => b.totalPnl - a.totalPnl);
}

/**
 * Get strategy by ID
 */
export function getStrategyById(id: string): Strategy | undefined {
  return demoStrategies.find(s => s.id === id);
}

/**
 * Get strategies for a trade
 */
export function getTradeStrategies(trade: Trade): Strategy[] {
  return trade.strategyIds
    .map(id => getStrategyById(id))
    .filter((s): s is Strategy => s !== undefined);
}
