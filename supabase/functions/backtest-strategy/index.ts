import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BacktestConfig {
  strategyId: string;
  pair: string;
  periodStart: string;
  periodEnd: string;
  initialCapital: number;
  commissionRate: number;
  slippage?: number;
}

interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  id: string;
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  direction: 'long' | 'short';
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  exitType: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = await req.json() as BacktestConfig;
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch strategy
    const { data: strategy, error: strategyError } = await supabase
      .from("trading_strategies")
      .select("*")
      .eq("id", config.strategyId)
      .eq("user_id", user.id)
      .single();

    if (strategyError || !strategy) {
      return new Response(
        JSON.stringify({ error: "Strategy not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch historical data from Binance
    const symbol = `${config.pair}USDT`;
    const interval = mapTimeframe(strategy.timeframe || '1h');
    const startTime = new Date(config.periodStart).getTime();
    const endTime = new Date(config.periodEnd).getTime();
    
    const candles = await fetchBinanceKlines(symbol, interval, startTime, endTime);
    
    if (candles.length < 10) {
      return new Response(
        JSON.stringify({ error: "Insufficient historical data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run backtest simulation
    const result = runBacktest(candles, strategy, config);

    // Save result to database
    const { error: saveError } = await supabase
      .from("backtest_results")
      .insert([{
        user_id: user.id,
        strategy_id: config.strategyId,
        pair: config.pair,
        period_start: config.periodStart,
        period_end: config.periodEnd,
        initial_capital: config.initialCapital,
        final_capital: config.initialCapital + result.metrics.totalReturnAmount,
        metrics: result.metrics,
        trades: result.trades,
        equity_curve: result.equityCurve,
      }]);

    if (saveError) {
      console.error("Failed to save backtest result:", saveError);
    }

    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        strategyId: config.strategyId,
        strategyName: strategy.name,
        pair: config.pair,
        periodStart: config.periodStart,
        periodEnd: config.periodEnd,
        initialCapital: config.initialCapital,
        finalCapital: config.initialCapital + result.metrics.totalReturnAmount,
        ...result,
        createdAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Backtest error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapTimeframe(tf: string): string {
  const map: Record<string, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m',
    '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
  };
  return map[tf] || '1h';
}

/**
 * Fetch historical klines from Binance Futures API
 * Handles pagination for large date ranges (max 1000 candles per request)
 */
async function fetchBinanceKlines(
  symbol: string, 
  interval: string, 
  startTime: number, 
  endTime: number
): Promise<Candle[]> {
  const allCandles: Candle[] = [];
  let currentStart = startTime;
  
  console.log(`Fetching klines for ${symbol} (${interval}) from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
  
  // Binance limits to 1500 candles per request for futures
  const BATCH_SIZE = 1500;
  
  while (currentStart < endTime) {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${currentStart}&endTime=${endTime}&limit=${BATCH_SIZE}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Binance API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      
      // Check for Binance error response
      if (data.code && data.code < 0) {
        console.error(`Binance API error: ${data.msg}`);
        break;
      }
      
      if (!Array.isArray(data) || data.length === 0) break;
      
      for (const k of data) {
        allCandles.push({
          openTime: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        });
      }
      
      console.log(`Fetched ${data.length} candles, total: ${allCandles.length}`);
      
      // Move to next batch (last candle openTime + 1ms)
      currentStart = data[data.length - 1][0] + 1;
      
      // Rate limiting - Binance allows 2400 requests/min
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      console.error("Error fetching candles:", e);
      break;
    }
  }
  
  console.log(`Total candles fetched: ${allCandles.length}`);
  return allCandles;
}

function runBacktest(
  candles: Candle[], 
  strategy: any, 
  config: BacktestConfig
) {
  const trades: Trade[] = [];
  const equityCurve: any[] = [];
  
  let balance = config.initialCapital;
  let peak = balance;
  let position: any = null;
  
  // Get exit rules
  const exitRules = strategy.exit_rules || [];
  const tpRule = exitRules.find((r: any) => r.type === 'take_profit');
  const slRule = exitRules.find((r: any) => r.type === 'stop_loss');
  
  const tpPercent = tpRule?.value || 2;
  const slPercent = slRule?.value || 1;

  // Simple signal generation based on price action
  // In reality, you'd implement the actual strategy indicators here
  for (let i = 20; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandles = candles.slice(i - 20, i);
    
    // Calculate simple indicators
    const sma20 = prevCandles.reduce((sum, c) => sum + c.close, 0) / 20;
    const priceAboveSma = candle.close > sma20;
    const momentum = (candle.close - prevCandles[0].close) / prevCandles[0].close;
    
    // Record equity curve point
    equityCurve.push({
      timestamp: new Date(candle.openTime).toISOString(),
      balance,
      drawdown: ((peak - balance) / peak) * 100,
    });
    
    // Update peak
    peak = Math.max(peak, balance);
    
    // If no position, check for entry
    if (!position) {
      // Simple entry logic: price above SMA20 + positive momentum
      const entryLong = priceAboveSma && momentum > 0.01;
      const entryShort = !priceAboveSma && momentum < -0.01;
      
      // Only take trades randomly to simulate confluence
      if ((entryLong || entryShort) && Math.random() > 0.7) {
        const direction = entryLong ? 'long' : 'short';
        const entryPrice = candle.close * (1 + (config.slippage || 0.001) * (direction === 'long' ? 1 : -1));
        const riskAmount = balance * 0.02; // 2% risk per trade
        const stopDistance = entryPrice * (slPercent / 100);
        const quantity = riskAmount / stopDistance;
        
        position = {
          direction,
          entryPrice,
          entryTime: new Date(candle.openTime).toISOString(),
          quantity,
          tp: direction === 'long' 
            ? entryPrice * (1 + tpPercent / 100)
            : entryPrice * (1 - tpPercent / 100),
          sl: direction === 'long'
            ? entryPrice * (1 - slPercent / 100)
            : entryPrice * (1 + slPercent / 100),
        };
      }
    } else {
      // Check exit conditions
      let exitPrice: number | null = null;
      let exitType = '';
      
      if (position.direction === 'long') {
        if (candle.high >= position.tp) {
          exitPrice = position.tp;
          exitType = 'take_profit';
        } else if (candle.low <= position.sl) {
          exitPrice = position.sl;
          exitType = 'stop_loss';
        }
      } else {
        if (candle.low <= position.tp) {
          exitPrice = position.tp;
          exitType = 'take_profit';
        } else if (candle.high >= position.sl) {
          exitPrice = position.sl;
          exitType = 'stop_loss';
        }
      }
      
      if (exitPrice) {
        // Apply slippage to exit
        exitPrice = exitPrice * (1 + (config.slippage || 0.001) * (exitType === 'take_profit' ? -1 : 1));
        
        const commission = position.quantity * exitPrice * config.commissionRate * 2; // Entry + exit
        const rawPnl = position.direction === 'long'
          ? (exitPrice - position.entryPrice) * position.quantity
          : (position.entryPrice - exitPrice) * position.quantity;
        const pnl = rawPnl - commission;
        const pnlPercent = (pnl / (position.entryPrice * position.quantity)) * 100;
        
        trades.push({
          id: crypto.randomUUID(),
          entryTime: position.entryTime,
          exitTime: new Date(candle.openTime).toISOString(),
          entryPrice: position.entryPrice,
          exitPrice,
          direction: position.direction,
          quantity: position.quantity,
          pnl,
          pnlPercent,
          commission,
          exitType,
        });
        
        balance += pnl;
        position = null;
      }
    }
  }
  
  // Calculate metrics
  const metrics = calculateMetrics(trades, config.initialCapital);
  
  return { trades, equityCurve, metrics };
}

function calculateMetrics(trades: Trade[], initialCapital: number) {
  if (trades.length === 0) {
    return {
      totalReturn: 0,
      totalReturnAmount: 0,
      winRate: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownAmount: 0,
      sharpeRatio: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      avgRiskReward: 0,
      holdingPeriodAvg: 0,
    };
  }

  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  
  // Calculate max drawdown
  let peak = initialCapital;
  let maxDD = 0;
  let balance = initialCapital;
  
  for (const trade of trades) {
    balance += trade.pnl;
    peak = Math.max(peak, balance);
    const dd = (peak - balance) / peak;
    maxDD = Math.max(maxDD, dd);
  }

  // Calculate consecutive wins/losses
  let maxConsecWins = 0, maxConsecLosses = 0;
  let currentConsec = 0;
  let lastWin: boolean | null = null;
  
  for (const trade of trades) {
    const isWin = trade.pnl > 0;
    if (lastWin === null || lastWin === isWin) {
      currentConsec++;
    } else {
      currentConsec = 1;
    }
    if (isWin) maxConsecWins = Math.max(maxConsecWins, currentConsec);
    else maxConsecLosses = Math.max(maxConsecLosses, currentConsec);
    lastWin = isWin;
  }

  // Calculate holding period
  const holdingPeriods = trades.map(t => {
    const entry = new Date(t.entryTime).getTime();
    const exit = new Date(t.exitTime).getTime();
    return (exit - entry) / (1000 * 60 * 60);
  });
  const avgHolding = holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length;

  // Sharpe ratio
  const returns = trades.map(t => t.pnlPercent / 100);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
  const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  return {
    totalReturn: (totalPnl / initialCapital) * 100,
    totalReturnAmount: totalPnl,
    winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
    avgLoss: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
    avgWinPercent: winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length 
      : 0,
    avgLossPercent: losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / losingTrades.length)
      : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown: maxDD * 100,
    maxDrawdownAmount: maxDD * peak,
    sharpeRatio: sharpe,
    consecutiveWins: maxConsecWins,
    consecutiveLosses: maxConsecLosses,
    avgRiskReward: losingTrades.length > 0 && winningTrades.length > 0
      ? (grossProfit / winningTrades.length) / (grossLoss / losingTrades.length)
      : 0,
    holdingPeriodAvg: avgHolding,
  };
}
