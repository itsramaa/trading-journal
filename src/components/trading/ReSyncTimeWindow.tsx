/**
 * Re-Sync Time Window Component
 * Allows users to re-sync specific date range when reconciliation fails or there's a mismatch
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBinanceAggregatedSync } from '@/hooks/use-binance-aggregated-sync';
import type { DateRange } from 'react-day-picker';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (defaultStartDate && defaultEndDate) {
      return { from: defaultStartDate, to: defaultEndDate };
    }
    // Default to last 30 days
    return {
      from: subDays(new Date(), 30),
      to: new Date(),
    };
  });

  const { sync, isLoading, progress, result, error } = useBinanceAggregatedSync();

  const handleSync = () => {
    if (!dateRange?.from) return;

    const startDate = dateRange.from;
    const endDate = dateRange.to || new Date();
    const daysToSync = differenceInDays(endDate, startDate) + 1;

    // Pass the date range to sync
    sync({ daysToSync });
  };

  const handleClose = () => {
    setOpen(false);
  };

  const daysSelected = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from) + 1 
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button 
          variant={hasReconciliationIssue ? "destructive" : "outline"} 
          size="sm"
          className="gap-2"
          onClick={() => setOpen(true)}
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

          {/* Date Range Picker */}
          {!isLoading && !result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Select Date Range:</span>
                {daysSelected > 0 && (
                  <Badge variant="secondary">{daysSelected} days</Badge>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                >
                  Last 90 days
                </Button>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {isLoading && progress && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">{progress.phase}</span>
              </div>
              <Progress 
                value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">{progress.message}</p>
            </div>
          )}

          {/* Result */}
          {result && !isLoading && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 text-success">
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
  );
}
