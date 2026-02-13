/**
 * Re-Sync Time Window Component
 * Allows users to re-sync specific date range when reconciliation fails or there's a mismatch
 * Includes Force Re-fetch option with destructive warning
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarDays, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Trash2, Info, Zap } from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBinanceAggregatedSync } from '@/hooks/use-binance-aggregated-sync';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SyncETADisplay } from './SyncETADisplay';
import type { DateRange } from 'react-day-picker';

const PHASE_LABELS: Record<string, string> = {
  'fetching-income': 'Fetching Income',
  'fetching-trades': 'Fetching Trades',
  'grouping': 'Grouping Lifecycles',
  'aggregating': 'Aggregating',
  'validating': 'Validating',
  'inserting': 'Saving to DB',
};

function estimateDuration(days: number): string {
  if (days <= 7) return '~1-2 min';
  if (days <= 30) return '~2-5 min';
  if (days <= 90) return '~5-15 min';
  return '~15-30 min';
}

interface ReSyncTimeWindowProps {
  hasReconciliationIssue?: boolean;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
}

export function ReSyncTimeWindow({
  hasReconciliationIssue = false,
  defaultStartDate,
  defaultEndDate,
}: ReSyncTimeWindowProps) {
  const [open, setOpen] = useState(false);
  const [forceRefetch, setForceRefetch] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (defaultStartDate && defaultEndDate) {
      return { from: defaultStartDate, to: defaultEndDate };
    }
    return {
      from: subDays(new Date(), 30),
      to: new Date(),
    };
  });

  const { sync, isLoading, progress, result, error } = useBinanceAggregatedSync();

  const handleSync = () => {
    if (!dateRange?.from) return;

    if (forceRefetch) {
      setShowForceConfirm(true);
      return;
    }

    executeSync();
  };

  const executeSync = () => {
    if (!dateRange?.from) return;
    const endDate = dateRange.to || new Date();
    const daysToSync = differenceInDays(endDate, dateRange.from) + 1;
    sync({ daysToSync, forceRefetch });
    setForceRefetch(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const daysSelected = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from) + 1 
    : 0;

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const phaseLabel = progress?.phase
    ? (PHASE_LABELS[progress.phase] || progress.phase)
    : '';

  const isRateLimited = progress?.message?.toLowerCase().includes('rate limit') ||
                        progress?.message?.toLowerCase().includes('429');

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant={hasReconciliationIssue ? "destructive" : "outline"} 
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {hasReconciliationIssue ? 'Re-Sync (Fix Mismatch)' : 'Re-Sync Time Window'}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Re-Sync Specific Time Window
            </DialogTitle>
            <DialogDescription>
              Select a date range to re-sync from Binance. This is useful when reconciliation
              failed or you notice missing/mismatched data for a specific period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Show warning if there's a reconciliation issue */}
            {hasReconciliationIssue && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Data mismatch detected. Re-syncing this time window may fix the issue.
                </AlertDescription>
              </Alert>
            )}

            {/* Date Range Picker + Config */}
            {!isLoading && !result && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Select Date Range:</span>
                  {daysSelected > 0 && (
                    <Badge variant="secondary">{daysSelected} days</Badge>
                  )}
                  {daysSelected > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Est. {estimateDuration(daysSelected)}
                    </span>
                  )}
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM d, yyyy")} -{" "}
                            {format(dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>

                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                    Last 7 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                    Last 30 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}>
                    Last 90 days
                  </Button>
                </div>

                {/* Force Re-fetch Checkbox */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Checkbox
                    id="resync-force-refetch"
                    checked={forceRefetch}
                    onCheckedChange={(checked) => setForceRefetch(checked === true)}
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="resync-force-refetch" className="flex items-center gap-1.5 cursor-pointer">
                      <RefreshCw className="h-3.5 w-3.5 text-warning" />
                      Force Re-fetch
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Delete existing trades in this range and re-download
                    </span>
                  </div>
                </div>

                {/* Destructive warning when force re-fetch is checked */}
                {forceRefetch && (
                  <Alert variant="destructive" className="border-destructive/30">
                    <Trash2 className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <span className="font-semibold">DESTRUCTIVE:</span> All synced trades within the selected date range will be permanently deleted before re-downloading. Only use if data is inconsistent.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Progress Indicator */}
            {isLoading && progress && (
              <div className={`space-y-3 py-4 px-3 rounded-lg border ${
                isRateLimited ? 'bg-warning/10 border-warning/30' : 'bg-primary/10 border-primary/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className={`h-4 w-4 animate-spin ${isRateLimited ? 'text-warning' : 'text-primary'}`} />
                    <span className="text-sm font-medium">{phaseLabel}</span>
                    {isRateLimited && (
                      <Badge variant="outline" className="gap-1 bg-warning/10 border-warning/30 text-warning text-[10px] py-0 px-1.5">
                        <Zap className="h-2.5 w-2.5" />
                        Rate Limited
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{progress.message}</span>
                  <SyncETADisplay compact />
                </div>
              </div>
            )}

            {/* Result */}
            {result && !isLoading && (
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2 text-profit">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Re-sync completed!</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-muted-foreground">Trades Synced</div>
                    <div className="text-lg font-bold">{result.stats.validTrades}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="text-muted-foreground">Accuracy</div>
                    <div className="text-lg font-bold">
                      {result.reconciliation ? 
                        `${(100 - result.reconciliation.differencePercent).toFixed(1)}%` : 
                        'N/A'
                      }
                    </div>
                  </div>
                </div>
                {result.reconciliation && !result.reconciliation.isReconciled && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      PnL difference: ${Math.abs(result.reconciliation.difference).toFixed(2)}
                      ({result.reconciliation.differencePercent.toFixed(2)}% off)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Sync failed. Please try again.'}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSync} 
                  disabled={!dateRange?.from || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start Re-Sync
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleClose}>
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Re-fetch Confirmation */}
      <ConfirmDialog
        open={showForceConfirm}
        onOpenChange={setShowForceConfirm}
        title="Force Re-fetch — Delete & Re-download"
        description={`All synced trades within the selected date range (${daysSelected} days) will be permanently deleted before re-downloading. This cannot be undone. Continue?`}
        confirmLabel="Delete & Re-sync"
        onConfirm={() => {
          setShowForceConfirm(false);
          executeSync();
        }}
        variant="destructive"
      />
    </>
  );
}
