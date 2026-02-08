/**
 * Sync ETA Display - Shows estimated time remaining
 */

import { Clock } from "lucide-react";
import { useSyncStore, selectSyncETA } from "@/store/sync-store";

function formatETA(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "Calculating...";
  
  if (seconds < 60) {
    return `~${seconds}s remaining`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `~${minutes}m ${remainingSeconds}s remaining`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `~${hours}h ${remainingMinutes}m remaining`;
}

interface SyncETADisplayProps {
  compact?: boolean;
}

export function SyncETADisplay({ compact = false }: SyncETADisplayProps) {
  const eta = useSyncStore(selectSyncETA);
  const isRunning = useSyncStore(state => state.fullSyncStatus === 'running');
  
  if (!isRunning) return null;
  
  const etaText = formatETA(eta);
  
  if (compact) {
    return (
      <span className="text-xs text-muted-foreground">
        {etaText}
      </span>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{etaText}</span>
    </div>
  );
}
