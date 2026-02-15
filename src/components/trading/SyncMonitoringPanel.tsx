/**
 * Sync Monitoring Panel - Comprehensive monitoring dashboard for sync health
 * Part of Phase 5: Monitoring for Binance Aggregation Architecture
 * 
 * Features:
 * - Data Quality Summary widget
 * - Failure history and retry status
 * - Quick actions for troubleshooting
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Trash2,
  Database,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { DataQualitySummary } from "./DataQualitySummary";
import { useSyncMonitoring } from "@/hooks/use-sync-monitoring";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface SyncMonitoringPanelProps {
  onTriggerFullSync?: () => void;
  onTriggerReSync?: () => void;
  className?: string;
}

export function SyncMonitoringPanel({ 
  onTriggerFullSync, 
  onTriggerReSync,
  className = '' 
}: SyncMonitoringPanelProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const {
    lastSyncResult,
    lastSyncTimestamp,
    failureCount,
    consecutiveFailures,
    lastFailureReason,
    isRetryScheduled,
    dataQuality,
    resetFailures,
  } = useSyncMonitoring();

  const hasIssues = consecutiveFailures > 0 || dataQuality.hasReconciliationIssue;
  const syncStatus = !lastSyncResult && consecutiveFailures === 0 
    ? 'no-data' 
    : hasIssues 
      ? 'issues' 
      : 'good';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Sync Monitoring</h3>
        </div>
        <Badge 
          variant={syncStatus === 'good' ? "outline" : "secondary"}
          className={syncStatus === 'good' ? "text-profit" : syncStatus === 'issues' ? "text-warning" : "text-muted-foreground"}
        >
          {syncStatus === 'no-data' ? (
            <>
              <Clock className="h-3 w-3 mr-1" />
              No Sync Yet
            </>
          ) : syncStatus === 'issues' ? (
            <>
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Attention
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              All Good
            </>
          )}
        </Badge>
      </div>

      {/* Data Quality Summary */}
      <DataQualitySummary
        lastSyncResult={lastSyncResult}
        lastSyncTimestamp={lastSyncTimestamp}
        syncFailureCount={consecutiveFailures}
      />

      {/* Failure Alert */}
      {consecutiveFailures > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-destructive">
                  Sync Failed ({consecutiveFailures}x)
                </p>
                {lastFailureReason && (
                  <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                    {lastFailureReason}
                  </p>
                )}
                {isRetryScheduled && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Retry scheduled...
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  {onTriggerFullSync && (
                    <Button size="sm" variant="outline" onClick={onTriggerFullSync}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Now
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowResetConfirm(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear Errors
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Warning */}
      {dataQuality.hasReconciliationIssue && lastSyncResult && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-warning">
                  P&L Reconciliation Mismatch
                </p>
                <div className="text-xs space-y-1">
                  <p>
                    Binance: {formatCurrency(lastSyncResult.reconciliation.binanceTotalPnl)}
                  </p>
                  <p>
                    Local DB: {formatCurrency(lastSyncResult.reconciliation.aggregatedTotalPnl)}
                  </p>
                  <p className="font-medium">
                    Difference: {lastSyncResult.reconciliation.differencePercent.toFixed(2)}%
                  </p>
                </div>
                {onTriggerReSync && (
                  <Button size="sm" variant="outline" onClick={onTriggerReSync} className="mt-2">
                    <Database className="h-3 w-3 mr-1" />
                    Re-Sync Affected Period
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {lastSyncResult && (
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{lastSyncResult.stats.validTrades}</p>
            <p className="text-xs text-muted-foreground">Synced Trades</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">
              {formatPercent(dataQuality.validTradesPercent)}
            </p>
            <p className="text-xs text-muted-foreground">Validation Rate</p>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Error History?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the failure counter and clear the last error message.
              The sync history and data quality metrics will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              resetFailures();
              setShowResetConfirm(false);
            }}>
              Clear Errors
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
