import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ArrowDown
} from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import type { BacktestResult } from "@/types/backtest";
import { cn } from "@/lib/utils";

interface BacktestResultsProps {
  result: BacktestResult;
}

export function BacktestResults({ result }: BacktestResultsProps) {
  const { metrics, trades, equityCurve } = result;
  const isProfit = metrics.totalReturn > 0;

  // Format equity curve for chart
  const chartData = equityCurve.map((point, i) => ({
    ...point,
    index: i,
    formattedDate: format(new Date(point.timestamp), 'MMM dd'),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Backtest Results: {result.strategyName || 'Strategy'}
              </CardTitle>
              <CardDescription>
                {result.pair}/USDT • {format(new Date(result.periodStart), 'MMM d, yyyy')} - {format(new Date(result.periodEnd), 'MMM d, yyyy')}
              </CardDescription>
            </div>
            <Badge 
              variant={isProfit ? "default" : "destructive"}
              className={cn(
                "text-lg px-3 py-1",
                isProfit ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}
            >
              {isProfit ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Return</p>
                <p className={cn(
                  "text-2xl font-bold",
                  isProfit ? "text-green-500" : "text-red-500"
                )}>
                  ${metrics.totalReturnAmount.toFixed(2)}
                </p>
              </div>
              <div className={cn(
                "p-2 rounded-full",
                isProfit ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                {isProfit ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">
                  {(metrics.winRate * 100).toFixed(1)}%
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

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-500">
                  {metrics.maxDrawdown.toFixed(2)}%
                </p>
              </div>
              <div className="p-2 rounded-full bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${metrics.maxDrawdownAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                <p className="text-2xl font-bold">
                  {metrics.sharpeRatio.toFixed(2)}
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Trades</span>
                <span className="font-medium">{metrics.totalTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Win</span>
                <span className="font-medium text-green-500">${metrics.avgWin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Loss</span>
                <span className="font-medium text-red-500">-${metrics.avgLoss.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profit Factor</span>
                <span className="font-medium">{metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Win %</span>
                <span className="font-medium text-green-500">+{metrics.avgWinPercent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Loss %</span>
                <span className="font-medium text-red-500">-{metrics.avgLossPercent.toFixed(2)}%</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consec. Wins</span>
                <span className="font-medium">{metrics.consecutiveWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consec. Losses</span>
                <span className="font-medium">{metrics.consecutiveLosses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Holding</span>
                <span className="font-medium">{metrics.holdingPeriodAvg.toFixed(1)}h</span>
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
                      tickFormatter={(v) => `$${v.toLocaleString()}`}
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
                        name === 'balance' ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`,
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
                          {format(new Date(trade.entryTime), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(trade.exitTime), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={trade.direction === 'long' 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-red-500/10 text-red-500'
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
                          ${trade.entryPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ${trade.exitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-sm font-medium",
                          trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
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
