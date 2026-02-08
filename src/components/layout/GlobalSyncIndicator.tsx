/**
 * Global Sync Indicator - Persistent progress display for Full Sync
 * 
 * Shows in DashboardLayout header when sync is running.
 * Visible across all pages during navigation.
 */

import { useSyncStore, selectIsFullSyncRunning, selectFullSyncProgress, selectFullSyncStatus } from '@/store/sync-store';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';

export function GlobalSyncIndicator() {
  const isRunning = useSyncStore(selectIsFullSyncRunning);
  const progress = useSyncStore(selectFullSyncProgress);
  const status = useSyncStore(selectFullSyncStatus);
  
  // Only show when sync is running
  if (!isRunning || !progress) return null;
  
  const percent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  const phaseLabel: Record<string, string> = {
    'fetching-income': 'Fetching Income',
    'fetching-trades': 'Fetching Trades',
    'grouping': 'Grouping',
    'aggregating': 'Aggregating',
    'validating': 'Validating',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-primary">
          {phaseLabel[progress.phase] || progress.phase}
        </span>
        <Progress value={percent} className="h-1.5 w-20" />
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>
    </div>
  );
}

/**
 * Compact badge version for tighter spaces
 */
export function GlobalSyncBadge() {
  const status = useSyncStore(selectFullSyncStatus);
  const progress = useSyncStore(selectFullSyncProgress);
  
  if (status === 'idle') return null;
  
  if (status === 'running') {
    const percent = progress && progress.total > 0 
      ? Math.round((progress.current / progress.total) * 100) 
      : 0;
    
    return (
      <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-primary/20">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Syncing {percent}%</span>
      </Badge>
    );
  }
  
  if (status === 'success') {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-profit/10 text-profit border-profit/20">
        <CheckCircle className="h-3 w-3" />
        <span>Synced</span>
      </Badge>
    );
  }
  
  if (status === 'error') {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="h-3 w-3" />
        <span>Sync Failed</span>
      </Badge>
    );
  }
  
  return null;
}
