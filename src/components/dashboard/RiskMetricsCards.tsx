/**
 * Risk Metrics Cards - Advanced risk metrics in a clear, readable grid
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
  Flame,
  RefreshCw,
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
      <Card className={cn(className)}>
        <CardContent className="py-5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Advanced Risk Metrics</p>
            <p className="text-xs text-muted-foreground">
              Close 3+ trades to unlock Sharpe, Sortino, VaR, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (value: number, thresholds: { good: number; bad: number }) => {
    if (value >= thresholds.good) return 'text-profit';
    if (value <= thresholds.bad) return 'text-loss';
    return 'text-foreground';
  };

  const mainMetrics = [
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio.toFixed(2),
      icon: BarChart3,
      color: getRatingColor(metrics.sharpeRatio, { good: 1, bad: 0 }),
      tooltip: 'Risk-adjusted return. >1 = Good, >2 = Excellent',
      badge: metrics.sharpeRatio >= 2 ? 'Excellent' : metrics.sharpeRatio >= 1 ? 'Good' : metrics.sharpeRatio > 0 ? 'Fair' : 'Poor',
      badgePositive: metrics.sharpeRatio >= 1,
    },
    {
      label: 'Sortino Ratio',
      value: metrics.sortinoRatio.toFixed(2),
      icon: Shield,
      color: getRatingColor(metrics.sortinoRatio, { good: 1.5, bad: 0 }),
      tooltip: 'Downside risk-adjusted return. Higher = better protection',
      badge: metrics.sortinoRatio >= 2 ? 'Strong' : metrics.sortinoRatio >= 1 ? 'Good' : 'Weak',
      badgePositive: metrics.sortinoRatio >= 1,
    },
    {
      label: 'Max Drawdown',
      value: `-${metrics.maxDrawdownPercent.toFixed(1)}%`,
      icon: TrendingDown,
      color: metrics.maxDrawdownPercent > 20 ? 'text-loss' : metrics.maxDrawdownPercent > 10 ? 'text-[hsl(var(--chart-4))]' : 'text-profit',
      tooltip: 'Largest peak-to-trough decline in equity',
      badge: metrics.currentDrawdownPercent > 0 ? `Now -${metrics.currentDrawdownPercent.toFixed(1)}%` : 'Recovered',
      badgePositive: metrics.currentDrawdownPercent <= 5,
    },
    {
      label: 'VaR (95%)',
      value: format(metrics.valueAtRisk95),
      icon: AlertTriangle,
      color: 'text-foreground',
      tooltip: '95% confidence: your daily loss won\'t exceed this amount',
    },
    {
      label: 'Expectancy',
      value: format(metrics.expectancy),
      icon: Target,
      color: getRatingColor(metrics.expectancy, { good: 0.01, bad: -0.01 }),
      tooltip: 'Expected profit per trade based on historical data',
      badge: metrics.expectancy > 0 ? 'Positive Edge' : 'No Edge',
      badgePositive: metrics.expectancy > 0,
    },
    {
      label: 'Kelly %',
      value: `${metrics.kellyPercent.toFixed(1)}%`,
      icon: Zap,
      color: 'text-foreground',
      tooltip: 'Optimal position sizing based on your edge',
      badge: `Half-Kelly: ${Math.min(metrics.kellyPercent / 2, 25).toFixed(0)}%`,
    },
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="h-4 w-4 text-primary" />
            Advanced Risk Metrics
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs">All-Time</Badge>
            <Badge variant="secondary" className="text-xs">{closedTrades.length} trades</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {mainMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="space-y-1.5 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                title={metric.tooltip}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-medium text-muted-foreground leading-tight">{metric.label}</span>
                </div>
                <p className={cn('text-xl font-bold font-mono-numbers leading-none', metric.color)}>
                  {metric.value}
                </p>
                {metric.badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4",
                      metric.badgePositive === true
                        ? "border-profit/30 text-profit bg-profit/10"
                        : metric.badgePositive === false
                        ? "border-loss/30 text-loss bg-loss/10"
                        : "border-border/50 text-muted-foreground"
                    )}
                  >
                    {metric.badge}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Streak & Recovery footer */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs">
            <Flame className="h-3.5 w-3.5 text-profit" />
            <span className="text-muted-foreground">Best streak:</span>
            <span className="font-semibold text-profit">{metrics.winStreakMax}W</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingDown className="h-3.5 w-3.5 text-loss" />
            <span className="text-muted-foreground">Worst streak:</span>
            <span className="font-semibold text-loss">{metrics.lossStreakMax}L</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Recovery factor:</span>
            <span className={cn("font-semibold", metrics.recoveryFactor > 1 ? 'text-profit' : 'text-loss')}>
              {metrics.recoveryFactor.toFixed(2)}
            </span>
          </div>
          {metrics.maxDrawdownDuration > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">DD duration:</span>
              <span className="font-semibold">{metrics.maxDrawdownDuration} trades</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
