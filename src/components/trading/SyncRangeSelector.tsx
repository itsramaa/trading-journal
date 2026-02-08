/**
 * Sync Range Selector - Allow user to choose sync time range
 */

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useSyncStore, type SyncRangeDays } from "@/store/sync-store";

const SYNC_OPTIONS: Array<{ value: SyncRangeDays; label: string; description: string }> = [
  { value: 30, label: "30 days", description: "~1-2 minutes" },
  { value: 90, label: "90 days", description: "~3-5 minutes (Recommended)" },
  { value: 180, label: "6 months", description: "~5-10 minutes" },
  { value: 365, label: "1 year", description: "~10-20 minutes" },
  { value: 730, label: "2 years", description: "~20-40 minutes" },
  { value: 'max', label: "All Time", description: "Entire history (may take 1+ hours)" },
];

export function SyncRangeSelector() {
  const selectedRange = useSyncStore(state => state.selectedSyncRange);
  const setSyncRange = useSyncStore(state => state.setSyncRange);
  const isRunning = useSyncStore(state => state.fullSyncStatus === 'running');

  const isMaxSelected = selectedRange === 'max';

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Sync Range</Label>
      <RadioGroup
        value={String(selectedRange)}
        onValueChange={(val) => setSyncRange(val === 'max' ? 'max' : Number(val) as SyncRangeDays)}
        disabled={isRunning}
        className="grid grid-cols-2 gap-2"
      >
        {SYNC_OPTIONS.map((option) => (
          <div key={String(option.value)} className="flex items-start space-x-2">
            <RadioGroupItem 
              value={String(option.value)} 
              id={`sync-${option.value}`}
              disabled={isRunning}
            />
            <Label 
              htmlFor={`sync-${option.value}`} 
              className="flex flex-col cursor-pointer"
            >
              <span className="font-medium text-sm">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Warning for All Time selection */}
      {isMaxSelected && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Warning:</strong> Syncing entire history since 2019 can take 1+ hours depending on your trading activity. 
            The process will continue in background even if you navigate away. 
            Consider using a shorter range for faster results.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
