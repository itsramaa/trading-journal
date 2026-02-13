/**
 * Sync Range Selector - Allow user to choose sync time range
 * Tiered warnings based on range size + card-style radio items
 */

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { useSyncStore, type SyncRangeDays } from "@/store/sync-store";
import { cn } from "@/lib/utils";

type WarningTier = 'safe' | 'caution' | 'warning' | 'danger';

const SYNC_OPTIONS: Array<{
  value: SyncRangeDays;
  label: string;
  est: string;
  tier: WarningTier;
  recommended?: boolean;
}> = [
  { value: 30,    label: "30 days",   est: "~1-2 min",   tier: 'safe' },
  { value: 90,    label: "90 days",   est: "~3-5 min",   tier: 'safe',    recommended: true },
  { value: 180,   label: "6 months",  est: "~5-10 min",  tier: 'caution' },
  { value: 365,   label: "1 year",    est: "~10-20 min", tier: 'warning' },
  { value: 730,   label: "2 years",   est: "~20-40 min", tier: 'warning' },
  { value: 'max', label: "All Time",  est: "1+ hours",   tier: 'danger' },
];

function getSelectedTier(range: SyncRangeDays): WarningTier {
  return SYNC_OPTIONS.find(o => o.value === range)?.tier ?? 'safe';
}

export function SyncRangeSelector() {
  const selectedRange = useSyncStore(state => state.selectedSyncRange);
  const setSyncRange = useSyncStore(state => state.setSyncRange);
  const isRunning = useSyncStore(state => state.fullSyncStatus === 'running');

  const selectedTier = getSelectedTier(selectedRange);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Sync Range</Label>
      <RadioGroup
        value={String(selectedRange)}
        onValueChange={(val) => setSyncRange(val === 'max' ? 'max' : Number(val) as SyncRangeDays)}
        disabled={isRunning}
        className="grid grid-cols-2 gap-2"
      >
        {SYNC_OPTIONS.map((option) => {
          const isSelected = selectedRange === option.value;
          return (
            <label
              key={String(option.value)}
              htmlFor={`sync-${option.value}`}
              className={cn(
                "flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors",
                isSelected ? "border-primary bg-primary/5" : "border-border",
                isRunning && "opacity-50 cursor-not-allowed"
              )}
            >
              <RadioGroupItem
                value={String(option.value)}
                id={`sync-${option.value}`}
                disabled={isRunning}
                className="mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm flex items-center gap-1.5">
                  {option.label}
                  {option.recommended && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Recommended
                    </Badge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{option.est}</span>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      {/* Tiered warnings */}
      {selectedTier === 'caution' && (
        <Alert className="mt-3">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            May take longer if you have many active trading pairs.
          </AlertDescription>
        </Alert>
      )}

      {selectedTier === 'warning' && (
        <Alert className="mt-3 border-destructive/30 [&>svg]:text-destructive/70">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Large sync range. Binance rate limits (1200 weight/min) may cause automatic pauses.
            Checkpoint resume handles interruptions. Process continues in background.
          </AlertDescription>
        </Alert>
      )}

      {selectedTier === 'danger' && (
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
