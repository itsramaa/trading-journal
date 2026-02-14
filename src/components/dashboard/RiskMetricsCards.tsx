/**
 * Risk Metrics Cards - Dashboard widget showing advanced risk metrics
 * Sharpe, Sortino, Max Drawdown, VaR, Expectancy, Kelly
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  TrendingDown, 
  BarChart3, 
  Target, 
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { calculateAdvancedRiskMetrics } from '@/lib/advanced-risk-metrics';
import { useModeFilteredTrades } from '@/hooks/use-mode-filtered-trades';
import { useUnifiedPortfolioData } from '@/hooks/use-unified-portfolio-data';
import { useCurrencyConversion } from '@/hooks/use-currency-conversion';
import { cn } from '@/lib/utils';

interface RiskMetricsCardsProps {
  className?: string;
}

export function RiskMetricsCards({ className }: RiskMetricsCardsProps) {
  const { data: trades = [] } = useModeFilteredTrades();
  const portfolio = useUnifiedPortfolioData();
  const { format } = useCurrencyConversion();

  const closedTrades = useMemo(
    () => trades.filter(t => t.status === 'closed'),
    [trades]
  );

  const metrics = useMemo(
    () => calculateAdvancedRiskMetrics(
      closedTrades.map(t => ({
        pnl: t.pnl ?? 0,
        realized_pnl: t.realized_pnl ?? undefined,
        trade_date: t.trade_date,
        result: t.result ?? undefined,
      })),
      portfolio.totalCapital || 10000
    ),
    [closedTrades, portfolio.totalCapital]
  );

  if (closedTrades.length < 3) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Advanced Risk Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Close 3+ trades to unlock advanced risk metrics (Sharpe, Sortino, VaR, and more)
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (value: number, thresholds: { good: number; bad: number }) => {
    if (value >= thresholds.good) return 'text-profit';
    if (value <= thresholds.bad) return 'text-loss';
    return 'text-foreground';
  };

  const metricsData = [
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio.toFixed(2),
      icon: BarChart3,
      color: getRatingColor(metrics.sharpeRatio, { good: 1, bad: 0 }),
      tooltip: 'Risk-adjusted return. >1 = good, >2 = excellent',
      badge: metrics.sharpeRatio >= 2 ? 'Excellent' : metrics.sharpeRatio >= 1 ? 'Good' : metrics.sharpeRatio > 0 ? 'Fair' : 'Poor',
      badgeVariant: metrics.sharpeRatio >= 1 ? 'profit' : 'loss',
    },
    {
      label: 'Sortino Ratio',
      value: metrics.sortinoRatio.toFixed(2),
      icon: Shield,
      color: getRatingColor(metrics.sortinoRatio, { good: 1.5, bad: 0 }),
      tooltip: 'Downside risk-adjusted return. Higher = better downside protection',
      badge: metrics.sortinoRatio >= 2 ? 'Strong' : metrics.sortinoRatio >= 1 ? 'Good' : 'Weak',
      badgeVariant: metrics.sortinoRatio >= 1 ? 'profit' : 'loss',
    },
    {
      label: 'Max Drawdown',
      value: `-${metrics.maxDrawdownPercent.toFixed(1)}%`,
      icon: TrendingDown,
      color: metrics.maxDrawdownPercent > 20 ? 'text-loss' : metrics.maxDrawdownPercent > 10 ? 'text-[hsl(var(--chart-4))]' : 'text-profit',
      tooltip: 'Largest peak-to-trough decline',
      badge: metrics.currentDrawdownPercent > 0 ? `Now: -${metrics.currentDrawdownPercent.toFixed(1)}%` : 'Recovered',
      badgeVariant: metrics.currentDrawdownPercent > 5 ? 'loss' : 'profit',
    },
    {
      label: 'VaR (95%)',
      value: format(metrics.valueAtRisk95),
      icon: AlertTriangle,
      color: 'text-foreground',
      tooltip: '95% confidence: daily loss won\'t exceed this',
    },
    {
      label: 'Expectancy',
      value: format(metrics.expectancy),
      icon: Target,
      color: getRatingColor(metrics.expectancy, { good: 0.01, bad: -0.01 }),
      tooltip: 'Expected profit per trade',
      badge: metrics.expectancy > 0 ? 'Positive Edge' : 'No Edge',
      badgeVariant: metrics.expectancy > 0 ? 'profit' : 'loss',
    },
    {
      label: 'Kelly %',
      value: `${metrics.kellyPercent.toFixed(1)}%`,
      icon: Zap,
      color: 'text-foreground',
      tooltip: 'Optimal position size based on edge',
      badge: `Max ${Math.min(metrics.kellyPercent / 2, 25).toFixed(0)}% (half-Kelly)`,
    },
  ];

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-primary" />
          Advanced Risk Metrics
          <Badge variant="outline" className="text-xs">
            {closedTrades.length} trades
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" role="group" aria-label="Advanced risk metrics">
          {metricsData.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="space-y-1" title={metric.tooltip} role="group" aria-label={`${metric.label}: ${metric.value}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className={cn('text-lg font-bold font-mono-numbers', metric.color)}>
                  {metric.value}
                </p>
                {metric.badge && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      metric.badgeVariant === 'profit' 
                        ? "border-profit/30 text-profit bg-profit/10" 
                        : metric.badgeVariant === 'loss'
                        ? "border-loss/30 text-loss bg-loss/10"
                        : ""
                    )}
                  >
                    {metric.badge}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Streak info */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
          <span>
            Best streak: <strong className="text-profit">{metrics.winStreakMax}W</strong>
          </span>
          <span>
            Worst streak: <strong className="text-loss">{metrics.lossStreakMax}L</strong>
          </span>
          <span>
            Recovery Factor: <strong className={metrics.recoveryFactor > 1 ? 'text-profit' : 'text-loss'}>
              {metrics.recoveryFactor.toFixed(2)}
            </strong>
          </span>
          {metrics.maxDrawdownDuration > 0 && (
            <span>
              Max DD Duration: <strong>{metrics.maxDrawdownDuration} trades</strong>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
