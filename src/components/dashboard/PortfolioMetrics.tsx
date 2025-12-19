import { TrendingUp, TrendingDown, Wallet, Activity, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/lib/formatters";
import type { PortfolioMetrics as PortfolioMetricsType } from "@/types/portfolio";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function MetricCard({ title, value, change, changeLabel, icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-sm",
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight font-mono-numbers truncate">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
                trend === 'up' ? "bg-profit-muted text-profit" : 
                trend === 'down' ? "bg-loss-muted text-loss" : 
                "bg-muted text-muted-foreground"
              )}>
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend === 'down' ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                <span>{change > 0 ? '+' : ''}{change.toFixed(2)}%</span>
              </div>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          trend === 'up' ? "bg-profit/10 text-profit" :
          trend === 'down' ? "bg-loss/10 text-loss" :
          "bg-primary/10 text-primary"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface PortfolioMetricsProps {
  metrics: PortfolioMetricsType;
}

export function PortfolioMetrics({ metrics }: PortfolioMetricsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Portfolio Value"
        value={formatCompactCurrency(metrics.totalValue)}
        change={metrics.dayChangePercent}
        changeLabel="today"
        icon={<Wallet className="h-5 w-5" />}
        trend={metrics.dayChangePercent >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Total P/L"
        value={formatCompactCurrency(metrics.totalProfitLoss)}
        change={metrics.totalProfitLossPercent}
        changeLabel="all time"
        icon={<TrendingUp className="h-5 w-5" />}
        trend={metrics.totalProfitLoss >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Today's Change"
        value={`${metrics.dayChange >= 0 ? '+' : ''}${formatCompactCurrency(metrics.dayChange)}`}
        change={metrics.dayChangePercent}
        icon={<Activity className="h-5 w-5" />}
        trend={metrics.dayChange >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Cost Basis"
        value={formatCompactCurrency(metrics.totalCostBasis)}
        icon={<Target className="h-5 w-5" />}
        trend="neutral"
      />
    </div>
  );
}
