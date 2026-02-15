/**
 * Performance Key Metrics - Win Rate, Profit Factor, Expectancy, Max DD,
 * Extreme Outcomes (Largest Gain/Loss), Additional Metrics
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  TrendingUp, TrendingDown, Target, BarChart3, AlertTriangle 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatWinRate, formatRatio, formatPercentUnsigned } from "@/lib/formatters";

interface BinanceStatsSlice {
  isConnected: boolean;
  grossPnl: number;
  netPnl: number;
  totalCommission: number;
}

interface PerformanceKeyMetricsProps {
  stats: {
    winRate: number;
    profitFactor: number;
    expectancy: number;
    maxDrawdownPercent: number;
    largestWin: number;
    largestLoss: number;
    sharpeRatio: number | null;
    avgRR: number | null;
    totalTrades: number;
    totalPnl: number;
  };
  formatCurrency: (v: number) => string;
  binanceStats: BinanceStatsSlice;
  showExchangeData?: boolean;
}

export function PerformanceKeyMetrics({ stats, formatCurrency, binanceStats, showExchangeData = true }: PerformanceKeyMetricsProps) {
  const profitFactorColor = stats.profitFactor >= 1.5 ? 'text-profit' : stats.profitFactor >= 1.0 ? 'text-foreground' : 'text-loss';

  return (
    <>
      {/* Key Metrics */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Key Metrics</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Win Rate
                <InfoTooltip content="Percentage of winning trades. 50%+ indicates more wins than losses. Aim for 55-65% with proper R:R." />
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatWinRate(stats.winRate)}</div>
              <Progress value={stats.winRate} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Profit Factor
                <InfoTooltip content="Gross Profit ÷ Gross Loss. Above 1.5 is good, above 2.0 is excellent. Below 1.0 means you're losing money." />
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-profit" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitFactorColor}`}>
                {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Gross profit / Gross loss</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Expectancy
                <InfoTooltip content="Average expected profit per trade. Positive expectancy means you're profitable over time." />
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.expectancy)}</div>
              <p className="text-xs text-muted-foreground">Per trade average</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Max Drawdown
                <InfoTooltip content="Largest peak-to-trough decline in your equity. Lower is better. Above 20% is concerning." />
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatPercentUnsigned(stats.maxDrawdownPercent)}</div>
              <p className="text-xs text-muted-foreground">Peak to trough</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Extreme Outcomes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Extreme Outcomes</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-profit/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-profit" />
                Largest Gain
                <InfoTooltip content="Your single most profitable trade. Helps identify what works best and whether gains are concentrated." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-profit">+{formatCurrency(stats.largestWin)}</div>
              <p className="text-xs text-muted-foreground mt-1">Best single trade outcome</p>
            </CardContent>
          </Card>
          <Card className="border-loss/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-loss" />
                Largest Loss
                <InfoTooltip content="Your single worst trade. Critical for risk management — ensure this stays within your max risk per trade." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loss">{formatCurrency(stats.largestLoss)}</div>
              <p className="text-xs text-muted-foreground mt-1">Worst single trade outcome</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Sharpe Ratio
              <InfoTooltip content="Risk-adjusted return. Above 1.0 is acceptable, above 2.0 is excellent. Measures return per unit of risk." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {stats.sharpeRatio === null
                ? <span className="text-muted-foreground">N/A</span>
                : stats.sharpeRatio.toFixed(2)
              }
            </div>
            {stats.sharpeRatio !== null && stats.totalTrades < 30 && stats.totalTrades > 0 && (
              <p className="text-xs text-muted-foreground">(low sample)</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Avg R:R
              <InfoTooltip content="Average Reward-to-Risk ratio. 2:1 means you make $2 for every $1 risked. Higher is better." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {stats.avgRR === null
                ? <span className="text-muted-foreground">N/A</span>
                : formatRatio(stats.avgRR)
              }
            </div>
            {stats.avgRR === null && stats.totalTrades > 0 && (
              <p className="text-xs text-muted-foreground">Set stop loss to calculate</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Total Trades
              <InfoTooltip content="Number of closed trades in the filtered dataset. More trades improve statistical reliability." />
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-xl font-bold">{stats.totalTrades}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Total P&L
              <InfoTooltip content="Total P&L from trade_entries. For Binance users, see Daily P&L page for Net P&L breakdown (Gross - Fees + Funding)." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
            </div>
            {showExchangeData && binanceStats.isConnected && binanceStats.grossPnl !== 0 && (
              <div className="mt-2 pt-2 border-t space-y-1">
                <div className="flex justify-between text-xs">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help">Gross (Today)</span>
                  </TooltipTrigger><TooltipContent>Today's gross realized PnL from Binance Futures before fees.</TooltipContent></Tooltip></TooltipProvider>
                  <span className={binanceStats.grossPnl >= 0 ? 'text-profit' : 'text-loss'}>
                    {formatCurrency(binanceStats.grossPnl)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help">Fees</span>
                  </TooltipTrigger><TooltipContent>Total trading fees (commission + maker/taker fees) deducted from gross PnL.</TooltipContent></Tooltip></TooltipProvider>
                  <span className="text-muted-foreground">-{formatCurrency(binanceStats.totalCommission)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium">
                  <span>Net P&L</span>
                  <span className={binanceStats.netPnl >= 0 ? 'text-profit' : 'text-loss'}>
                    {binanceStats.netPnl >= 0 ? '+' : ''}{formatCurrency(binanceStats.netPnl)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
