/**
 * Binance Full Sync Panel - UI for triggering and monitoring aggregated sync
 * Features: Full Sync button, Progress indicator, Reconciliation status
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CloudDownload, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Database,
  RefreshCw,
} from "lucide-react";
import { useBinanceAggregatedSync } from "@/hooks/use-binance-aggregated-sync";
import type { AggregationProgress, AggregationResult } from "@/services/binance/types";

interface BinanceFullSyncPanelProps {
  isBinanceConnected: boolean;
  compact?: boolean;
}

export function BinanceFullSyncPanel({ 
  isBinanceConnected, 
  compact = false 
}: BinanceFullSyncPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { sync, isLoading, progress, result, error } = useBinanceAggregatedSync();

  if (!isBinanceConnected) return null;

  const handleSync = () => {
    setShowConfirm(false);
    sync({ daysToSync: 730 }); // 2 years
  };

  // Show progress
  if (isLoading && progress) {
    return <SyncProgressIndicator progress={progress} />;
  }

  // Show result briefly
  if (result && !isLoading) {
    return <SyncResultBadge result={result} onReset={() => sync({ daysToSync: 730 })} />;
  }

  // Show error
  if (error) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Sync failed
      </Badge>
    );
  }

  // Default: Show sync button
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={compact ? "sm" : "default"}
              onClick={() => setShowConfirm(true)}
              className="gap-2"
            >
              <Database className="h-4 w-4" />
              {compact ? "Full Sync" : "Full Sync (Aggregated)"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Aggregate-First Full Sync</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fetches up to 2 years of Binance history, groups into position lifecycles,
              aggregates fills with fees & funding, then inserts to local DB.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Full Sync with Aggregation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  This will fetch your complete Binance Futures trading history (up to 2 years)
                  and process it through the aggregation layer:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Fetch all income records (PnL, fees, funding)</li>
                  <li>Fetch trade fills for each symbol</li>
                  <li>Group fills into position lifecycles</li>
                  <li>Calculate weighted average entry/exit prices</li>
                  <li>Attach fees, commissions, and funding</li>
                  <li>Validate and insert to local database</li>
                </ul>
                <p className="text-muted-foreground">
                  This may take several minutes depending on your trading history.
                  Existing trades will not be duplicated.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync}>
              <CloudDownload className="h-4 w-4 mr-2" />
              Start Full Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SyncProgressIndicator({ progress }: { progress: AggregationProgress }) {
  const percent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  const phaseLabel = {
    'fetching-income': 'Fetching Income',
    'fetching-trades': 'Fetching Trades',
    'grouping': 'Grouping Lifecycles',
    'aggregating': 'Aggregating',
    'validating': 'Validating',
    'inserting': 'Saving to DB',
    'reconciling': 'Reconciling',
  }[progress.phase] || progress.phase;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <div className="flex flex-col gap-1 min-w-[200px]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{phaseLabel}</span>
          <span className="text-xs text-muted-foreground">{percent}%</span>
        </div>
        <Progress value={percent} className="h-2" />
        <span className="text-xs text-muted-foreground truncate max-w-[250px]">
          {progress.message}
        </span>
      </div>
    </div>
  );
}

function SyncResultBadge({ result, onReset }: { result: AggregationResult; onReset: () => void }) {
  const isReconciled = result.reconciliation.isReconciled;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isReconciled ? "outline" : "secondary"} 
            className={`gap-1 cursor-pointer ${isReconciled ? 'text-profit' : 'text-warning'}`}
          >
            {isReconciled ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {result.stats.validTrades} trades synced
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p className="font-medium">Sync Complete</p>
            <ul className="space-y-1">
              <li>Lifecycles: {result.stats.totalLifecycles}</li>
              <li>Valid trades: {result.stats.validTrades}</li>
              <li>Invalid: {result.stats.invalidTrades}</li>
              <li>With warnings: {result.stats.warningTrades}</li>
            </ul>
            <div className="pt-1 border-t">
              <p className={isReconciled ? 'text-profit' : 'text-warning'}>
                PnL difference: {result.reconciliation.differencePercent.toFixed(3)}%
                {isReconciled ? ' ✓' : ' ⚠'}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={onReset} className="w-full mt-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Again
            </Button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
