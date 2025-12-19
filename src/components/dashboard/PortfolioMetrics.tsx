import { TrendingUp, TrendingDown, DollarSign, Percent, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PortfolioMetrics as PortfolioMetricsType } from "@/lib/demo-data";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, change, changeLabel, icon, trend }: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-profit" />
                ) : trend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-loss" />
                ) : null}
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend === 'up' ? "text-profit" : trend === 'down' ? "text-loss" : "text-muted-foreground"
                  )}
                >
                  {change > 0 ? '+' : ''}{change.toFixed(2)}%
                </span>
                {changeLabel && (
                  <span className="text-sm text-muted-foreground">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PortfolioMetricsProps {
  metrics: PortfolioMetricsType;
}

export function PortfolioMetrics({ metrics }: PortfolioMetricsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Portfolio Value"
        value={formatCurrency(metrics.totalValue)}
        change={metrics.dayChangePercent}
        changeLabel="today"
        icon={<DollarSign className="h-6 w-6 text-primary" />}
        trend={metrics.dayChangePercent >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Total Profit/Loss"
        value={formatCurrency(metrics.totalProfitLoss)}
        change={metrics.totalProfitLossPercent}
        changeLabel="all time"
        icon={<TrendingUp className="h-6 w-6 text-profit" />}
        trend={metrics.totalProfitLoss >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Today's Change"
        value={`${metrics.dayChange >= 0 ? '+' : ''}${formatCurrency(metrics.dayChange)}`}
        change={metrics.dayChangePercent}
        icon={<Activity className="h-6 w-6 text-primary" />}
        trend={metrics.dayChange >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Cost Basis"
        value={formatCurrency(metrics.totalCostBasis)}
        icon={<Percent className="h-6 w-6 text-muted-foreground" />}
        trend="neutral"
      />
    </div>
  );
}
