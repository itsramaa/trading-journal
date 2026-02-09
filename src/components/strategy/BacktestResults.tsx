import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileSpreadsheet
} from "lucide-react";
import { useBacktestExport } from "@/hooks/use-backtest-export";
import { format as formatDate } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import type { BacktestResult } from "@/types/backtest";
import { cn } from "@/lib/utils";
import { formatPercent, formatWinRate, formatNumber } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { BacktestDisclaimer } from "./BacktestDisclaimer";

interface BacktestResultsProps {
  result: BacktestResult;
}

export function BacktestResults({ result }: BacktestResultsProps) {
  const { metrics, trades, equityCurve } = result;
  const isProfit = metrics.totalReturn > 0;
  const { exportToCSV, exportToPDF } = useBacktestExport();
  const { format, formatCompact } = useCurrencyConversion();

  // Format equity curve for chart
  const chartData = equityCurve.map((point, i) => ({
    ...point,
    index: i,
    formattedDate: formatDate(new Date(point.timestamp), 'MMM dd'),
  }));

  return (
    <div className="space-y-6">
      {/* Backtest Disclaimer */}
      <BacktestDisclaimer 
        assumptions={result.assumptions}
        accuracyNotes={result.accuracyNotes}
        simulationVersion={result.simulationVersion}
        variant="compact"
      />

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

      {/* Metrics Grid - Using design system tokens */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Return</p>
                <p className={cn(
                  "text-2xl font-bold font-mono",
                  isProfit ? "text-profit" : "text-loss"
                )}>
                  {format(metrics.totalReturnAmount)}
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
                <p className="text-sm text-muted-foreground">Win Rate</p>
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
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
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
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className="text-2xl font-bold font-mono">
                  {formatNumber(metrics.sharpeRatio, 2)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <Percent className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Risk-adjusted return
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
                <span className="text-muted-foreground text-sm">Avg Win</span>
                <span className="font-medium font-mono text-profit">{format(metrics.avgWin)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Avg Loss</span>
                <span className="font-medium font-mono text-loss">-{format(metrics.avgLoss)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Profit Factor</span>
                <span className="font-medium font-mono">{metrics.profitFactor === Infinity ? '∞' : formatNumber(metrics.profitFactor, 2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Avg Win %</span>
                <span className="font-medium font-mono text-profit">{formatPercent(metrics.avgWinPercent)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Avg Loss %</span>
                <span className="font-medium font-mono text-loss">-{formatNumber(metrics.avgLossPercent, 2)}%</span>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Chart and Trades */}
      <Tabs defaultValue="equity">
        <TabsList>
          <TabsTrigger value="equity">Equity Curve</TabsTrigger>
          <TabsTrigger value="trades">Trade List ({trades.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="equity">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Equity Curve</CardTitle>
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
                          {formatPercent(trade.pnl)}
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
