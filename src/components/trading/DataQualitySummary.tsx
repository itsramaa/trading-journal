/**
 * Data Quality Summary - Widget showing sync health and data quality metrics
 * Part of Phase 5: Monitoring for Binance Aggregation Architecture
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Database,
  RefreshCw,
  Clock,
  TrendingUp,
  Info
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { AggregationResult } from "@/services/binance/types";

interface DataQualitySummaryProps {
  lastSyncResult: AggregationResult | null;
  lastSyncTimestamp: number | null;
  syncFailureCount: number;
  className?: string;
}

type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface HealthMetric {
  label: string;
  value: string | number;
  status: HealthStatus;
  tooltip: string;
}

export function DataQualitySummary({
  lastSyncResult,
  lastSyncTimestamp,
  syncFailureCount,
  className = '',
}: DataQualitySummaryProps) {
  const metrics = useMemo((): HealthMetric[] => {
    if (!lastSyncResult) {
      return [
        {
          label: 'Sync Status',
          value: 'No data',
          status: 'unknown',
          tooltip: 'Run a Full Sync to populate data quality metrics',
        },
      ];
    }

    const { stats, reconciliation, failures } = lastSyncResult;
    const totalTrades = stats.validTrades + stats.invalidTrades;
    const validPercent = totalTrades > 0 ? (stats.validTrades / totalTrades) * 100 : 0;

    return [
      {
        label: 'Valid Trades',
        value: `${stats.validTrades}/${totalTrades}`,
        status: validPercent >= 99 ? 'healthy' : validPercent >= 95 ? 'warning' : 'critical',
        tooltip: `${validPercent.toFixed(1)}% of trades passed validation`,
      },
      {
        label: 'P&L Accuracy',
        value: reconciliation.isReconciled ? '✓ Matched' : `${reconciliation.differencePercent.toFixed(2)}% diff`,
        status: reconciliation.isReconciled ? 'healthy' : reconciliation.differencePercent < 1 ? 'warning' : 'critical',
        tooltip: `Binance: ${formatCurrency(reconciliation.binanceTotalPnl)} | Local: ${formatCurrency(reconciliation.aggregatedTotalPnl)}`,
      },
      {
        label: 'Lifecycle Completion',
        value: `${stats.completeLifecycles}/${stats.totalLifecycles}`,
        status: stats.incompleteLifecycles === 0 ? 'healthy' : 'warning',
        tooltip: `${stats.incompleteLifecycles} positions still open or incomplete`,
      },
      {
        label: 'Sync Failures',
        value: syncFailureCount.toString(),
        status: syncFailureCount === 0 ? 'healthy' : syncFailureCount < 3 ? 'warning' : 'critical',
        tooltip: syncFailureCount === 0 ? 'No recent sync failures' : `${syncFailureCount} consecutive failures`,
      },
    ];
  }, [lastSyncResult, syncFailureCount]);

  const overallHealth = useMemo((): HealthStatus => {
    if (!lastSyncResult) return 'unknown';
    
    const hasCritical = metrics.some(m => m.status === 'critical');
    const hasWarning = metrics.some(m => m.status === 'warning');
    
    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'healthy';
  }, [lastSyncResult, metrics]);

  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-profit', bg: 'bg-profit/10', label: 'Healthy' },
    warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Warning' },
    critical: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Critical' },
    unknown: { icon: Database, color: 'text-muted-foreground', bg: 'bg-muted', label: 'No Data' },
  };

  const config = statusConfig[overallHealth];
  const StatusIcon = config.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Data Quality</CardTitle>
          </div>
          <Badge variant="outline" className={`gap-1 ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        {lastSyncTimestamp && (
          <CardDescription className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last sync: {formatDistanceToNow(new Date(lastSyncTimestamp), { addSuffix: true })}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((metric) => (
          <MetricRow key={metric.label} metric={metric} />
        ))}
        
        {lastSyncResult && lastSyncResult.failures.length > 0 && (
          <div className="pt-2 border-t">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-xs text-warning cursor-help">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{lastSyncResult.failures.length} lifecycle(s) failed aggregation</span>
                    <Info className="h-3 w-3 opacity-50" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-1 text-xs">
                    {lastSyncResult.failures.slice(0, 5).map((f, i) => (
                      <p key={i} className="font-mono">{f.lifecycleId}: {f.reason}</p>
                    ))}
                    {lastSyncResult.failures.length > 5 && (
                      <p className="text-muted-foreground">
                        +{lastSyncResult.failures.length - 5} more...
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ metric }: { metric: HealthMetric }) {
  const statusColors = {
    healthy: 'text-profit',
    warning: 'text-warning',
    critical: 'text-destructive',
    unknown: 'text-muted-foreground',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-between text-sm cursor-help">
            <span className="text-muted-foreground">{metric.label}</span>
            <span className={`font-medium ${statusColors[metric.status]}`}>
              {metric.value}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{metric.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
