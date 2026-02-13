/**
 * Binance Full Sync Panel - Inline Card UI for triggering and monitoring aggregated sync
 * Features: Full Sync config, Progress indicator, Reconciliation status, Re-Sync, Resume
 * 
 * Uses global sync store for persistent state across navigation.
 * Renders everything inline within a Card (no dialogs).
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CloudDownload, 
  Loader2, 
  Database,
  AlertTriangle,
  PlayCircle,
  X,
  Clock,
  RefreshCw,
  Zap,
  Info,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useBinanceAggregatedSync } from "@/hooks/use-binance-aggregated-sync";
import { useSyncStore, selectFullSyncStatus, selectFullSyncProgress, selectFullSyncResult, selectSyncRange, selectCheckpoint } from "@/store/sync-store";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { SyncReconciliationReportInline } from "./SyncReconciliationReport";
import { SyncQuotaDisplay } from "./SyncQuotaDisplay";
import { ReSyncTimeWindow } from "./ReSyncTimeWindow";
import { SyncRangeSelector } from "./SyncRangeSelector";
import { SyncETADisplay } from "./SyncETADisplay";
import { useSyncQuota } from "@/hooks/use-sync-quota";
import type { AggregationProgress } from "@/services/binance/types";
import { toast } from "sonner";

const PHASE_LABELS: Record<string, string> = {
  'fetching-income': 'Fetching Income',
  'fetching-trades': 'Fetching Trades',
  'grouping': 'Grouping Lifecycles',
  'aggregating': 'Aggregating',
  'validating': 'Validating',
  'inserting': 'Saving to DB',
};

interface BinanceFullSyncPanelProps {
  isBinanceConnected: boolean;
}

export function BinanceFullSyncPanel({ isBinanceConnected }: BinanceFullSyncPanelProps) {
  const [forceRefetch, setForceRefetch] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  
  const { sync, resumeSync, canResume, clearCheckpoint } = useBinanceAggregatedSync();
  const { data: quotaInfo } = useSyncQuota();
  
  const status = useSyncStore(selectFullSyncStatus);
  const progress = useSyncStore(selectFullSyncProgress);
  const result = useSyncStore(selectFullSyncResult);
  const selectedRange = useSyncStore(selectSyncRange);
  const fullSyncError = useSyncStore(state => state.fullSyncError);
  const checkpoint = useSyncStore(selectCheckpoint);
  const resetFullSync = useSyncStore(state => state.resetFullSync);

  if (!isBinanceConnected) return null;

  const isQuotaExhausted = quotaInfo?.isExhausted ?? false;

  const handleSync = () => {
    if (isQuotaExhausted) {
      toast.error('Daily sync quota exhausted. Resets at midnight UTC.');
      return;
    }
    if (status === 'running') {
      toast.info('Sync already in progress');
      return;
    }
    // If force re-fetch is enabled, show confirmation dialog first
    if (forceRefetch) {
      setShowForceConfirm(true);
      return;
    }
    executeSync();
  };

  const executeSync = () => {
    console.log('[FullSyncPanel] Starting sync with forceRefetch:', forceRefetch);
    sync({ daysToSync: selectedRange, forceRefetch });
    setForceRefetch(false);
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
    setShowDiscardConfirm(false);
    toast.info('Checkpoint discarded');
  };

  const handleSyncAgain = () => {
    resetFullSync();
  };

  // Determine result states
  const hasReconciliationIssue = result && !result.reconciliation.isReconciled;
  const hasPartialFailures = result?.partialSuccess && (
    result.partialSuccess.failedSymbols.length > 0 || 
    result.partialSuccess.failedBatches.length > 0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Full Sync — Recovery / Initial Setup
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">Advanced</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">

        {/* === CHECKPOINT STATE === */}
        {canResume && status === 'idle' && (
          <CheckpointResumeSection
            checkpoint={checkpoint}
            onResume={handleResume}
            onDiscard={() => setShowDiscardConfirm(true)}
            onFreshSync={handleSync}
            isQuotaExhausted={isQuotaExhausted}
          />
        )}

        {/* === RUNNING STATE === */}
        {status === 'running' && progress && (
          <SyncProgressIndicator progress={progress} />
        )}

        {/* === SUCCESS STATE === */}
        {status === 'success' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <SyncStatusBadge result={result} />

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

              {hasReconciliationIssue && (
                <ReSyncTimeWindow hasReconciliationIssue={true} />
              )}

              <Button variant="outline" size="sm" onClick={handleSyncAgain} className="gap-1.5 ml-auto">
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Again
              </Button>
            </div>

            {/* Inline Reconciliation Report */}
            <SyncReconciliationReportInline result={result} />
          </div>
        )}

        {/* === ERROR STATE === */}
        {(status === 'error' || (fullSyncError && status !== 'success' && status !== 'running')) && (
          <div className="space-y-3">
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Sync failed
              {fullSyncError && <span className="ml-1 font-normal">— {fullSyncError}</span>}
            </Badge>

            <div className="flex flex-wrap items-center gap-2">
              {canResume && (
                <Button variant="default" size="sm" onClick={handleResume} className="gap-1.5">
                  <PlayCircle className="h-3.5 w-3.5" />
                  Resume
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSync} disabled={isQuotaExhausted} className="gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Retry Sync
              </Button>
            </div>
          </div>
        )}

        {/* === IDLE STATE (no checkpoint) === */}
        {status === 'idle' && !canResume && (
          <div className="space-y-4">
            {/* Quota */}
            <SyncQuotaDisplay />

            {/* Range Selector */}
            <SyncRangeSelector />

            {/* Force Re-fetch */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Checkbox 
                id="force-refetch" 
                checked={forceRefetch}
                onCheckedChange={(checked) => setForceRefetch(checked === true)}
              />
              <div className="flex flex-col">
                <Label htmlFor="force-refetch" className="flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className="h-3.5 w-3.5 text-warning" />
                  Force Re-fetch
                </Label>
                <span className="text-xs text-muted-foreground">
                  Delete existing trades and re-download all data from Binance
                </span>
              </div>
            </div>

            {/* Destructive warning when force re-fetch is checked */}
            {forceRefetch && (
              <Alert variant="destructive" className="border-destructive/30">
                <Trash2 className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <span className="font-semibold">DESTRUCTIVE:</span> All locally synced Binance trades will be permanently deleted before re-downloading from Binance for the selected range. Only use if data is inconsistent or corrupted.
                </AlertDescription>
              </Alert>
            )}

            {/* Info bullets */}
            <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Fetch income records (PnL, fees, funding)</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Checkpoint-based resume if interrupted</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Partial success — failed symbols won't block others</span>
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleSync}
              disabled={isQuotaExhausted}
              className="gap-2 w-full"
            >
              <CloudDownload className="h-4 w-4" />
              Start Full Sync ({selectedRange === 'max' ? 'All Time' : `${selectedRange} days`})
            </Button>
          </div>
        )}

        {/* === CONFIRMATION DIALOGS === */}
        <ConfirmDialog
          open={showForceConfirm}
          onOpenChange={setShowForceConfirm}
          title="Force Re-fetch — Delete & Re-download"
          description="All locally synced Binance trades will be permanently deleted before re-downloading. This cannot be undone. Continue?"
          confirmLabel="Delete & Re-sync"
          onConfirm={() => {
            setShowForceConfirm(false);
            executeSync();
          }}
          variant="destructive"
        />

        <ConfirmDialog
          open={showDiscardConfirm}
          onOpenChange={setShowDiscardConfirm}
          title="Discard Sync Checkpoint"
          description={`This will discard all sync progress (${checkpoint?.processedSymbols.length || 0}/${checkpoint?.allSymbols.length || 0} symbols processed). You will need to start a fresh sync. Continue?`}
          confirmLabel="Discard Progress"
          onConfirm={handleDiscardCheckpoint}
          variant="warning"
        />

      </CardContent>
    </Card>
  );
}

/** Enriched checkpoint resume section */
function CheckpointResumeSection({
  checkpoint,
  onResume,
  onDiscard,
  onFreshSync,
  isQuotaExhausted,
}: {
  checkpoint: ReturnType<typeof selectCheckpoint> extends (state: any) => infer R ? R : any;
  onResume: () => void;
  onDiscard: () => void;
  onFreshSync: () => void;
  isQuotaExhausted: boolean;
}) {
  const phaseLabel = checkpoint?.currentPhase 
    ? (PHASE_LABELS[checkpoint.currentPhase] || checkpoint.currentPhase)
    : 'Unknown';

  const checkpointAge = checkpoint?.lastCheckpointTime
    ? formatDistanceToNow(new Date(checkpoint.lastCheckpointTime), { addSuffix: true })
    : null;

  const syncRangeLabel = checkpoint?.syncRangeDays
    ? (checkpoint.syncRangeDays === 9999 ? 'All Time' : `${checkpoint.syncRangeDays} days`)
    : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Badge variant="outline" className="gap-1.5 bg-warning/10 border-warning/30 text-warning-foreground">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            Incomplete sync ({checkpoint?.processedSymbols.length || 0}/{checkpoint?.allSymbols.length || 0} symbols)
          </span>
        </Badge>

        <div className="pl-1 space-y-0.5 text-xs text-muted-foreground">
          <div>Phase: <span className="text-foreground font-medium">{phaseLabel}</span></div>
          <div className="flex items-center gap-2">
            {syncRangeLabel && <span>Range: {syncRangeLabel}</span>}
            {syncRangeLabel && checkpointAge && <span>•</span>}
            {checkpointAge && <span>Saved {checkpointAge}</span>}
          </div>
          <div className="text-muted-foreground/70 italic">Resume will continue from where it left off</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="default" size="sm" onClick={onResume} className="gap-1.5">
          <PlayCircle className="h-3.5 w-3.5" />
          Resume from Checkpoint
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard} className="gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Discard
        </Button>
        <Button variant="outline" size="sm" onClick={onFreshSync} disabled={isQuotaExhausted} className="gap-1.5">
          <Database className="h-3.5 w-3.5" />
          Fresh Sync
        </Button>
      </div>

      {/* Still show range selector for fresh sync option */}
      <div className="border-t pt-3">
        <SyncRangeSelector />
      </div>
    </div>
  );
}

function SyncProgressIndicator({ progress }: { progress: AggregationProgress }) {
  const percent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  const phaseLabel = PHASE_LABELS[progress.phase] || progress.phase;

  const isRateLimited = progress.message?.toLowerCase().includes('rate limit') || 
                         progress.message?.toLowerCase().includes('429');

  // Stale sync detection — warn if no progress for 2 minutes
  const [lastProgressTime, setLastProgressTime] = useState(Date.now());
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    setLastProgressTime(Date.now());
    setIsStale(false);
  }, [progress.current, progress.phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastProgressTime > 120_000) {
        setIsStale(true);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [lastProgressTime]);

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
        isRateLimited 
          ? 'bg-warning/10 border-warning/30' 
          : 'bg-primary/10 border-primary/20'
      }`}>
        <Loader2 className={`h-4 w-4 animate-spin ${isRateLimited ? 'text-warning' : 'text-primary'}`} />
        <div className="flex flex-col gap-1 min-w-[200px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{phaseLabel}</span>
              {isRateLimited && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 bg-warning/10 border-warning/30 text-warning text-[10px] py-0 px-1.5">
                        <Zap className="h-2.5 w-2.5" />
                        Rate Limited
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">API rate limit hit. Sync will auto-retry with delay.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
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

      {isStale && (
        <Alert variant="destructive" className="mt-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Sync appears stuck (no progress for 2 minutes). Consider canceling and retrying.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
