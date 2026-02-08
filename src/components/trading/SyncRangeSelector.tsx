/**
 * Sync Range Selector - Allow user to choose sync time range
 */

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useSyncStore, type SyncRangeDays } from "@/store/sync-store";

const SYNC_OPTIONS: Array<{ value: SyncRangeDays; label: string; description: string }> = [
  { value: 30, label: "30 days", description: "~1-2 minutes" },
  { value: 90, label: "90 days", description: "~3-5 minutes (Recommended)" },
  { value: 180, label: "6 months", description: "~5-10 minutes" },
  { value: 365, label: "1 year", description: "~10-20 minutes" },
  { value: 730, label: "2 years", description: "~20-40 minutes" },
  { value: 'max', label: "All Time", description: "Fetch all available history" },
];

export function SyncRangeSelector() {
  const selectedRange = useSyncStore(state => state.selectedSyncRange);
  const setSyncRange = useSyncStore(state => state.setSyncRange);
  const isRunning = useSyncStore(state => state.fullSyncStatus === 'running');

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Sync Range</Label>
      <RadioGroup
        value={String(selectedRange)}
        onValueChange={(val) => setSyncRange(Number(val) as SyncRangeDays)}
        disabled={isRunning}
        className="grid grid-cols-2 gap-2"
      >
        {SYNC_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-start space-x-2">
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
    </div>
  );
}
