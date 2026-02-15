import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { TradeStats } from "@/hooks/trading/use-trade-stats";

interface AccountDetailFinancialProps {
  stats: TradeStats | undefined;
  statsLoading: boolean;
  initialBalance: number;
  totalTrades?: number;
}

export function AccountDetailFinancial({
  stats,
  statsLoading,
  initialBalance,
  totalTrades = 0,
}: AccountDetailFinancialProps) {
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Financial Summary</CardTitle>
        <CardDescription>Trading costs and capital efficiency</CardDescription>
      </CardHeader>
      <CardContent>
        {statsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : totalTrades === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No trading activity yet</p>
            <p className="text-sm mt-1">Financial summary will appear after your first closed trade.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* P&L Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">Gross P&L</p>
                <p className={`text-2xl font-bold font-mono-numbers ${(stats?.totalPnlGross || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPnl(stats?.totalPnlGross || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Before fees and costs</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">Net P&L</p>
                <p className={`text-2xl font-bold font-mono-numbers ${(stats?.totalPnlNet || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPnl(stats?.totalPnlNet || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">After all fees deducted</p>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div>
              <h3 className="text-sm font-medium mb-3">Fee Breakdown</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Commission</p>
                  <p className="text-lg font-semibold text-loss font-mono-numbers">
                    {formatCurrency(stats?.totalCommission || 0)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Funding Fees</p>
                  <p className="text-lg font-semibold text-loss font-mono-numbers">
                    {formatCurrency(stats?.totalFundingFees || 0)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-lg font-semibold text-loss font-mono-numbers">
                    {formatCurrency(stats?.totalFees || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Capital Efficiency */}
            <div>
              <h3 className="text-sm font-medium mb-3">Capital Efficiency</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {(() => {
                  const roc = initialBalance > 0 ? ((stats?.totalPnlNet || 0) / initialBalance) * 100 : 0;
                  const feeImpact = (stats?.totalPnlGross || 0) !== 0
                    ? ((stats?.totalFees || 0) / Math.abs(stats?.totalPnlGross || 1)) * 100
                    : 0;
                  return (
                    <>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Return on Capital</p>
                        <p className={`text-2xl font-bold ${roc >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {roc >= 0 ? '+' : ''}{roc.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Net P&L ÷ Initial Capital
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Fee Impact</p>
                        <p className="text-2xl font-bold text-loss">
                          {feeImpact.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Fees as % of gross P&L
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Link to Performance */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                For detailed performance analytics, visit the{' '}
                <Link to="/performance" className="text-primary hover:underline">
                  Performance page
                </Link>.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
