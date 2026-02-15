import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Percent,
  BarChart3,
  Clock,
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useBacktestExport } from "@/hooks/use-backtest-export";
import { format as formatDate } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import type { BacktestResult } from "@/types/backtest";
import { cn } from "@/lib/utils";
import { formatPercent, formatWinRate, formatNumber } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { BacktestDisclaimer } from "./BacktestDisclaimer";
import { BacktestSessionBreakdown } from "./BacktestSessionBreakdown";

interface BacktestResultsProps {
  result: BacktestResult;
}

export function BacktestResults({ result }: BacktestResultsProps) {
  const { metrics, trades, equityCurve } = result;
  const isProfit = metrics.totalReturn > 0;
  const { exportToCSV, exportToPDF } = useBacktestExport();
  const { format, formatCompact } = useCurrencyConversion();

  // Compute CAGR
  const cagr = useMemo(() => {
    const periodDays = (new Date(result.periodEnd).getTime() - new Date(result.periodStart).getTime()) / (1000 * 60 * 60 * 24);
    const periodYears = periodDays / 365;
    if (periodYears <= 0 || result.initialCapital <= 0) return metrics.totalReturn;
    return (Math.pow(result.finalCapital / result.initialCapital, 1 / periodYears) - 1) * 100;
  }, [result]);

  // Trade density
  const tradesPerWeek = useMemo(() => {
    const periodDays = (new Date(result.periodEnd).getTime() - new Date(result.periodStart).getTime()) / (1000 * 60 * 60 * 24);
    return periodDays > 0 ? (metrics.totalTrades / periodDays) * 7 : 0;
  }, [result, metrics.totalTrades]);

  // Break-even analysis
  const breakevenWR = metrics.avgRiskReward > 0 ? 1 / (1 + metrics.avgRiskReward) : null;
  const isBelowBreakeven = breakevenWR !== null && metrics.winRate < breakevenWR;
  const isAboveBreakeven = breakevenWR !== null && metrics.winRate > breakevenWR;
  const breakevenMargin = breakevenWR !== null ? (metrics.winRate - breakevenWR) * 100 : null;

  // Format equity curve for chart
  const chartData = equityCurve.map((point, i) => ({
    ...point,
    index: i,
    formattedDate: formatDate(new Date(point.timestamp), 'MMM dd'),
  }));

  return (
    <div className="space-y-6" role="region" aria-label="Backtest Results">
      {/* Backtest Disclaimer */}
      <BacktestDisclaimer 
        assumptions={result.assumptions}
        accuracyNotes={result.accuracyNotes}
        simulationVersion={result.simulationVersion}
        variant="compact"
      />

      {/* Break-Even Insight Banner */}
      {metrics.avgRiskReward > 0 && isBelowBreakeven && breakevenWR !== null && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Below break-even threshold.</strong> Win rate ({(metrics.winRate * 100).toFixed(1)}%) 
            is below the break-even requirement ({(breakevenWR * 100).toFixed(1)}%) for the observed{' '}
            {metrics.avgRiskReward.toFixed(2)} R:R. Expectancy: {format(metrics.expectancy)}/trade.
          </AlertDescription>
        </Alert>
      )}

      {metrics.avgRiskReward > 0 && isAboveBreakeven && breakevenMargin !== null && breakevenMargin > 5 && (
        <Alert className="border-profit/30 bg-profit-muted/30">
          <CheckCircle2 className="h-4 w-4 text-profit" />
          <AlertDescription className="text-profit">
            <strong>Above break-even.</strong> Win rate ({(metrics.winRate * 100).toFixed(1)}%) exceeds 
            break-even ({(breakevenWR! * 100).toFixed(1)}%) by {breakevenMargin.toFixed(1)}pp. 
            Expectancy: {format(metrics.expectancy)}/trade.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Backtest Results: {result.strategyName || 'Strategy'}
                {result.strategyMethodology && (
                  <Badge variant="outline" className="ml-2">{result.strategyMethodology.toUpperCase()}</Badge>
                )}
              </CardTitle>
              <CardDescription className="flex flex-col gap-1">
                <span>{result.pair}/USDT • {formatDate(new Date(result.periodStart), 'MMM d, yyyy')} - {formatDate(new Date(result.periodEnd), 'MMM d, yyyy')}</span>
                {result.assumptions?.multiTimeframe && (
                  <span className="text-xs">
                    MTFA: {result.assumptions.multiTimeframe.higherTF || '-'} → {result.assumptions.multiTimeframe.primaryTF || '-'} → {result.assumptions.multiTimeframe.lowerTF || '-'}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(result)}
                  className="gap-1"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToPDF(result)}
                  className="gap-1"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
              <Badge 
                variant={isProfit ? "default" : "destructive"}
                className={cn(
                  "text-lg px-3 py-1",
                  isProfit ? "bg-profit-muted text-profit" : "bg-loss-muted text-loss"
                )}
              >
                {isProfit ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {formatPercent(metrics.totalReturn)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Total Return</p>
                  <InfoTooltip content="Net profit/loss as a percentage of initial capital, after all fees." />
                </div>
                <p className={cn(
                  "text-2xl font-bold font-mono",
                  isProfit ? "text-profit" : "text-loss"
                )}>
                  {format(metrics.totalReturnAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CAGR: {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
                </p>
              </div>
              <div className={cn(
                "p-2 rounded-full",
                isProfit ? "bg-profit-muted" : "bg-loss-muted"
              )}>
                {isProfit ? <TrendingUp className="h-5 w-5 text-profit" /> : <TrendingDown className="h-5 w-5 text-loss" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <InfoTooltip content="Percentage of trades that closed in profit. Combined with R:R ratio to determine edge." />
                </div>
                <p className="text-2xl font-bold font-mono">
                  {formatWinRate(metrics.winRate * 100)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.winningTrades}W / {metrics.losingTrades}L
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <InfoTooltip content="Largest peak-to-trough decline in portfolio value during the backtest period." />
                </div>
                <p className="text-2xl font-bold font-mono text-loss">
                  {formatNumber(metrics.maxDrawdown, 2)}%
                </p>
              </div>
              <div className="p-2 rounded-full bg-loss-muted">
                <TrendingDown className="h-5 w-5 text-loss" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(metrics.maxDrawdownAmount)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">Expectancy</p>
                  <InfoTooltip content="Average expected profit per trade. Formula: (Win Rate × Avg Win) - (Loss Rate × Avg Loss)." />
                </div>
                <p className={cn(
                  "text-2xl font-bold font-mono",
                  metrics.expectancy >= 0 ? "text-profit" : "text-loss"
                )}>
                  {format(metrics.expectancy)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per trade
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total Trades</span>
                <span className="font-medium font-mono">{metrics.totalTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">Trade Density</span>
                  <InfoTooltip content="Average number of trades per week during the backtest period." />
                </div>
                <span className="font-medium font-mono">{tradesPerWeek.toFixed(1)}/week</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Avg Win</span>
                <span className="font-medium font-mono text-profit">{format(metrics.avgWin)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Avg Loss</span>
                <span className="font-medium font-mono text-loss">-{format(metrics.avgLoss)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Avg R:R</span>
                <span className="font-medium font-mono">{formatNumber(metrics.avgRiskReward, 2)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">Profit Factor</span>
                  <InfoTooltip content="Gross Profit / Gross Loss. Values above 1.5 indicate a robust edge." />
                </div>
                <span className="font-medium font-mono">{metrics.profitFactor === Infinity ? '∞' : formatNumber(metrics.profitFactor, 2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">Sharpe Ratio</span>
                  <InfoTooltip content="Risk-adjusted return. Annualized using √252. Values above 1.0 are good, above 2.0 are excellent." />
                </div>
                <span className="font-medium font-mono">{formatNumber(metrics.sharpeRatio, 2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">Calmar Ratio</span>
                  <InfoTooltip content="Annualized return divided by maximum drawdown. Higher = better risk-adjusted performance." />
                </div>
                <span className="font-medium font-mono">{formatNumber(metrics.calmarRatio, 2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">Expectancy/R</span>
                  <InfoTooltip content="Expected return per unit of risk (R). Positive values indicate an edge." />
                </div>
                <span className={cn("font-medium font-mono", metrics.expectancyPerR >= 0 ? "text-profit" : "text-loss")}>
                  {metrics.expectancyPerR >= 0 ? '+' : ''}{metrics.expectancyPerR.toFixed(2)}R
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Consec. Wins</span>
                <span className="font-medium font-mono text-profit">{metrics.consecutiveWins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Consec. Losses</span>
                <span className="font-medium font-mono text-loss">{metrics.consecutiveLosses}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Avg Holding</span>
                <span className="font-medium font-mono">{formatNumber(metrics.holdingPeriodAvg, 1)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">Market Exposure</span>
                  <InfoTooltip content="Percentage of total backtest period spent in an open position." />
                </div>
                <span className="font-medium font-mono">{formatNumber(metrics.exposurePercent ?? 0, 1)}%</span>
              </div>
              {breakevenWR !== null && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">Break-even WR</span>
                    <InfoTooltip content="Minimum win rate needed to break even at the observed R:R ratio. Formula: 1 / (1 + R:R)." />
                  </div>
                  <span className="font-medium font-mono">{(breakevenWR * 100).toFixed(1)}%</span>
                </div>
              )}
              {/* Fee Impact Breakdown */}
              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">Gross P&L</span>
                    {/* Tooltip on first fee item to explain the section */}
                    <InfoTooltip content="Fee impact analysis showing how trading costs affect your edge." />
                  </div>
                  <span className={cn("font-medium font-mono", (metrics.grossPnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                    {format(metrics.grossPnl ?? metrics.totalReturnAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Fees Paid</span>
                  <span className="font-medium font-mono text-loss">-{format(metrics.totalCommissions ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Net P&L</span>
                  <span className={cn("font-medium font-mono", (metrics.netPnl ?? metrics.totalReturnAmount) >= 0 ? "text-profit" : "text-loss")}>
                    {format(metrics.netPnl ?? metrics.totalReturnAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Chart, Sessions, and Trades */}
      <Tabs defaultValue="equity">
        <TabsList>
          <TabsTrigger value="equity">Equity Curve</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="trades">Trade List ({trades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="equity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Equity Curve
                <InfoTooltip content="Portfolio balance over time (left axis) with drawdown percentage (right axis, shaded red)." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="formattedDate" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'balance' ? format(value) : `${value.toFixed(2)}%`,
                        name === 'balance' ? 'Balance' : 'Drawdown'
                      ]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="drawdown"
                      fill="hsl(var(--destructive) / 0.2)"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={1}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <BacktestSessionBreakdown trades={trades} />
        </TabsContent>

        <TabsContent value="trades">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry</TableHead>
                      <TableHead>Exit</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Entry Price</TableHead>
                      <TableHead className="text-right">Exit Price</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead>Exit Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-xs">
                          {formatDate(new Date(trade.entryTime), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(new Date(trade.exitTime), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={trade.direction === 'long' 
                              ? 'bg-profit-muted text-profit border-profit/30' 
                              : 'bg-loss-muted text-loss border-loss/30'
                            }
                          >
                            {trade.direction === 'long' ? (
                              <ArrowUp className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDown className="h-3 w-3 mr-1" />
                            )}
                            {trade.direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {format(trade.entryPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {format(trade.exitPrice)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-sm font-medium",
                          trade.pnl >= 0 ? "text-profit" : "text-loss"
                        )}>
                          {format(trade.pnl)}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({formatPercent(trade.pnlPercent)})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.exitType === 'take_profit' ? 'default' : 'destructive'}>
                            {trade.exitType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
