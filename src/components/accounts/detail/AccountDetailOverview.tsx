import { useMemo } from "react";
import { format } from "date-fns";
import {
  TrendingUp,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { TradeStats } from "@/hooks/trading/use-trade-stats";

interface AccountDetailOverviewProps {
  equityData: Array<{ date: string; pnl: number; cumulative: number; drawdown: number }>;
  stats: TradeStats | undefined;
  flowStats: { totalDeposits: number; totalWithdrawals: number; netFlow: number } | null;
  isBinanceVirtual: boolean;
  activePositions?: Array<{
    symbol: string;
    positionAmt: number;
    entryPrice: number;
    markPrice: number;
    unrealizedProfit: number;
    leverage: number;
  }>;
}

export function AccountDetailOverview({
  equityData,
  stats,
  flowStats,
  isBinanceVirtual,
  activePositions = [],
}: AccountDetailOverviewProps) {
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();

  return (
    <div className="space-y-6">
      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equity Curve</CardTitle>
          <CardDescription>Cumulative P&L over time for this account</CardDescription>
        </CardHeader>
        <CardContent>
          {equityData.length === 0 && !(isBinanceVirtual && activePositions.length > 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No closed trades yet</p>
              <p className="text-sm mt-1">Complete your first trade to see equity curve and performance analytics</p>
            </div>
          ) : equityData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No closed trade data to chart</p>
              <p className="text-sm">Equity curve appears after your first closed trade</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v)}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary)/0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawdown Chart */}
      {equityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Drawdown</CardTitle>
            <CardDescription>
              Peak-to-trough decline from highest equity point
              <InfoTooltip content="Drawdown is calculated from peak cumulative P&L, not from initial balance." variant="help" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    domain={['auto', 0]}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${Math.abs(value).toFixed(2)}%`, 'Drawdown']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive)/0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Positions - Live mode collapsible */}
      {isBinanceVirtual && activePositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Active Positions
              <Badge variant="outline">{activePositions.length}</Badge>
            </CardTitle>
            <CardDescription>Currently open positions on exchange</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Entry Price</TableHead>
                    <TableHead className="text-right">Mark Price</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                    <TableHead className="text-right">Leverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePositions.map((pos) => {
                    const pnl = Number(pos.unrealizedProfit) || 0;
                    const isLong = pos.positionAmt > 0;
                    return (
                      <TableRow key={`${pos.symbol}-${isLong ? 'long' : 'short'}`}>
                        <TableCell className="font-medium">{pos.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={isLong ? "default" : "destructive"} className="text-xs">
                            {isLong ? 'LONG' : 'SHORT'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Math.abs(pos.positionAmt).toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(pos.entryPrice).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(pos.markPrice).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatPnl(pnl)}
                        </TableCell>
                        <TableCell className="text-right">
                          {pos.leverage}x
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Breakdown */}
      {(stats?.totalFees || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Commission</p>
                <p className="text-lg font-semibold text-loss">{formatCurrency(stats?.totalCommission || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Funding Fees</p>
                <p className="text-lg font-semibold text-loss">{formatCurrency(stats?.totalFundingFees || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fees</p>
                <p className="text-lg font-semibold text-loss">{formatCurrency(stats?.totalFees || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capital Flow Summary */}
      {flowStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Capital Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Deposits</p>
                <p className="text-lg font-semibold text-profit">+{formatCurrency(flowStats.totalDeposits)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Withdrawals</p>
                <p className="text-lg font-semibold text-loss">-{formatCurrency(flowStats.totalWithdrawals)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Net Flow
                  <InfoTooltip content="Deposits minus Withdrawals" />
                </p>
                <p className={`text-lg font-semibold ${flowStats.netFlow >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPnl(flowStats.netFlow)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
