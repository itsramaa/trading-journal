/**
 * Binance Full Sync Panel - UI for triggering and monitoring aggregated sync
 * Features: Full Sync button, Progress indicator, Reconciliation status, Re-Sync, Resume
 * 
 * Now uses global sync store for persistent state across navigation.
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
  Database,
  AlertTriangle,
  PlayCircle,
  X,
  Clock,
} from "lucide-react";
import { useBinanceAggregatedSync } from "@/hooks/use-binance-aggregated-sync";
import { useSyncStore, selectFullSyncStatus, selectFullSyncProgress, selectFullSyncResult, selectSyncRange, selectCheckpoint } from "@/store/sync-store";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { ReSyncTimeWindow } from "./ReSyncTimeWindow";
import { SyncRangeSelector } from "./SyncRangeSelector";
import { SyncETADisplay } from "./SyncETADisplay";
import type { AggregationProgress } from "@/services/binance/types";
import { toast } from "sonner";

interface BinanceFullSyncPanelProps {
  isBinanceConnected: boolean;
  compact?: boolean;
}

export function BinanceFullSyncPanel({ 
  isBinanceConnected, 
  compact = false 
}: BinanceFullSyncPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Hook for triggering sync
  const { sync, resumeSync, canResume, clearCheckpoint } = useBinanceAggregatedSync();
  
  // Global store for persistent state
  const status = useSyncStore(selectFullSyncStatus);
  const progress = useSyncStore(selectFullSyncProgress);
  const result = useSyncStore(selectFullSyncResult);
  const selectedRange = useSyncStore(selectSyncRange);
  const fullSyncError = useSyncStore(state => state.fullSyncError);
  const checkpoint = useSyncStore(selectCheckpoint);

  if (!isBinanceConnected) return null;

  const handleSync = () => {
    setShowConfirm(false);
    
    // Guard against duplicate syncs
    if (status === 'running') {
      toast.info('Sync already in progress');
      return;
    }
    
    sync({ daysToSync: selectedRange });
  };

  const handleResume = () => {
    if (status === 'running') {
      toast.info('Sync already in progress');
      return;
    }
    resumeSync();
  };

  const handleDiscardCheckpoint = () => {
    clearCheckpoint();
    toast.info('Checkpoint discarded');
  };

  // Show resume option if checkpoint exists and not running
  if (canResume && status === 'idle') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1.5 bg-warning/10 border-warning/30 text-warning-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            Incomplete sync ({checkpoint?.processedSymbols.length || 0}/{checkpoint?.allSymbols.length || 0} symbols)
          </span>
        </Badge>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleResume}
                className="gap-1.5"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Resume
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Continue from last checkpoint</p>
              <p className="text-xs text-muted-foreground mt-1">
                Phase: {checkpoint?.currentPhase}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDiscardCheckpoint}
          className="gap-1.5 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="gap-1.5"
        >
          <Database className="h-3.5 w-3.5" />
          Fresh Sync
        </Button>
        
        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Start Fresh Sync
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-sm">
                  <p>
                    This will discard the existing checkpoint and start a new full sync.
                  </p>
                  
                  {/* Sync Range Selector */}
                  <div className="pt-2 border-t">
                    <SyncRangeSelector />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSync}>
                <CloudDownload className="h-4 w-4 mr-2" />
                Start Fresh ({selectedRange === 'max' ? 'All Time' : `${selectedRange} days`})
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show progress (running state from global store)
  if (status === 'running' && progress) {
    return <SyncProgressIndicator progress={progress} />;
  }

  // Determine if there's a reconciliation issue
  const hasReconciliationIssue = result && !result.reconciliation.isReconciled;
  const hasPartialFailures = result?.partialSuccess && (
    result.partialSuccess.failedSymbols.length > 0 || 
    result.partialSuccess.failedBatches.length > 0
  );

  // Show result with clickable badge (success state)
  if (status === 'success' && result) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <SyncStatusBadge result={result} />
        
        {/* Show partial failures warning */}
        {hasPartialFailures && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 bg-warning/10 border-warning/30">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  {result.partialSuccess!.failedSymbols.length} symbols skipped
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Failed Symbols:</p>
                <ul className="text-xs text-muted-foreground">
                  {result.partialSuccess!.failedSymbols.slice(0, 5).map(f => (
                    <li key={f.symbol}>{f.symbol}: {f.error}</li>
                  ))}
                  {result.partialSuccess!.failedSymbols.length > 5 && (
                    <li>...and {result.partialSuccess!.failedSymbols.length - 5} more</li>
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Show Re-Sync button if there's a mismatch */}
        {hasReconciliationIssue && (
          <ReSyncTimeWindow hasReconciliationIssue={true} />
        )}
        
        {/* Always show Sync Again button after success */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="gap-1.5"
        >
          <Database className="h-3.5 w-3.5" />
          Sync Again
        </Button>
      </div>
    );
  }

  // Show error (error state from global store)
  if (status === 'error' || fullSyncError) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Sync failed
        </Badge>
        
        {/* Show resume if checkpoint exists */}
        {canResume && (
          <Button
            variant="default"
            size="sm"
            onClick={handleResume}
            className="gap-1.5"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}
        
        {/* Clear Retry button after error */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="gap-1.5"
        >
          <Database className="h-3.5 w-3.5" />
          Retry Sync
        </Button>
      </div>
    );
  }

  // Default: Show sync button (idle state)
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
              Fetches Binance history, groups into position lifecycles,
              aggregates fills with fees & funding, then inserts to local DB.
            </p>
            <p className="text-xs text-primary mt-1">
              ✓ Checkpoint-based resume if interrupted
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Full Sync with Aggregation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm">
                <p>
                  This will fetch your Binance Futures trading history
                  and process it through the aggregation layer.
                </p>
                
                {/* Sync Range Selector */}
                <div className="pt-2 border-t">
                  <SyncRangeSelector />
                </div>
                
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>Fetch income records (PnL, fees, funding)</li>
                  <li>Fetch trade fills in parallel for each symbol</li>
                  <li>Group fills into position lifecycles</li>
                  <li>Calculate weighted average prices</li>
                  <li>Validate and insert to local database</li>
                </ul>
                <div className="space-y-1">
                  <p className="text-primary font-medium">
                    ✓ Sync continues in background even if you navigate away.
                  </p>
                  <p className="text-primary font-medium">
                    ✓ Can resume from checkpoint if interrupted.
                  </p>
                  <p className="text-primary font-medium">
                    ✓ Partial success - failed symbols won't block others.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync}>
              <CloudDownload className="h-4 w-4 mr-2" />
              Start Full Sync ({selectedRange === 'max' ? 'All Time' : `${selectedRange} days`})
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
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
            {progress.message}
          </span>
          <SyncETADisplay compact />
        </div>
      </div>
    </div>
  );
}
