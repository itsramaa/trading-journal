/**
 * Bulk Export Page - Tax Reporting
 * Phase 5: Download history exports for tax and accounting
 */
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FileSpreadsheet, 
  Calendar as CalendarIcon, 
  Loader2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FileText,
  Receipt,
  BarChart3,
  Info
} from "lucide-react";
import { format, subDays, startOfYear, endOfDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useBinanceConnectionStatus } from "@/features/binance";
import { 
  useBulkExportWorkflow, 
  getExportTypeLabel, 
  getExportTypeDescription,
  type BulkExportType 
} from "@/features/binance/useBinanceBulkExport";
import { toast } from "sonner";

const exportTypes: { type: BulkExportType; icon: typeof FileText }[] = [
  { type: 'transaction', icon: Receipt },
  { type: 'order', icon: FileText },
  { type: 'trade', icon: BarChart3 },
];

export default function BulkExport() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected;

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfYear(new Date()),
    to: endOfDay(new Date()),
  });

  const { progress, startExport, downloadFile, resetProgress } = useBulkExportWorkflow();

  const handleExport = async (type: BulkExportType) => {
    try {
      const url = await startExport(type, startOfDay(dateRange.from), endOfDay(dateRange.to));
      if (url) {
        const filename = `binance_${type}_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.csv`;
        downloadFile(url, filename);
        toast.success(`${getExportTypeLabel(type)} downloaded successfully`);
      }
    } catch {
      toast.error(`Failed to export ${getExportTypeLabel(type)}`);
    }
  };

  const presetRanges = [
    { label: 'Last 30 Days', from: subDays(new Date(), 30), to: new Date() },
    { label: 'Last 90 Days', from: subDays(new Date(), 90), to: new Date() },
    { label: 'Year to Date', from: startOfYear(new Date()), to: new Date() },
    { label: 'Last Year', from: startOfYear(new Date(new Date().getFullYear() - 1, 0, 1)), to: new Date(new Date().getFullYear() - 1, 11, 31) },
  ];

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              Bulk Export
            </h1>
            <p className="text-muted-foreground">
              Download trading history for tax reporting
            </p>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Binance Not Connected</AlertTitle>
            <AlertDescription>
              Please connect your Binance API in Settings → Exchange to use bulk export features.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            Bulk Export
          </h1>
          <p className="text-muted-foreground">
            Download trading history for tax reporting and analysis
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>About Bulk Exports</AlertTitle>
          <AlertDescription>
            Binance processes bulk export requests asynchronously. Large date ranges may take 
            a few minutes to prepare. The download will start automatically once ready.
          </AlertDescription>
        </Alert>

        {/* Date Range Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date Range
            </CardTitle>
            <CardDescription>
              Choose the period for your export. Maximum range is 1 year.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              {presetRanges.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ from: preset.from, to: preset.to })}
                  className={cn(
                    dateRange.from.getTime() === preset.from.getTime() &&
                    dateRange.to.getTime() === preset.to.getTime() &&
                    "border-primary bg-primary/10"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Custom Date Pickers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateRange.from, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                      disabled={(date) => date > new Date() || date > dateRange.to}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateRange.to, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                      disabled={(date) => date > new Date() || date < dateRange.from}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Selected range: {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>

        {/* Export Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {exportTypes.map(({ type, icon: Icon }) => {
            const exportProgress = progress[type];
            const isWorking = exportProgress.status === 'requesting' || exportProgress.status === 'waiting';
            const isReady = exportProgress.status === 'ready';
            const hasError = exportProgress.status === 'error';

            return (
              <Card key={type} className={cn(
                "transition-all",
                isReady && "border-profit/50 bg-profit/5",
                hasError && "border-loss/50 bg-loss/5"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {getExportTypeLabel(type)}
                  </CardTitle>
                  <CardDescription>
                    {getExportTypeDescription(type)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {exportProgress.status === 'idle' && (
                      <Badge variant="secondary">Ready to Export</Badge>
                    )}
                    {isWorking && (
                      <Badge variant="default" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {exportProgress.status === 'requesting' ? 'Requesting...' : `Preparing (${exportProgress.pollCount})`}
                      </Badge>
                    )}
                    {isReady && (
                      <Badge variant="default" className="gap-1 bg-profit text-profit-foreground">
                        <CheckCircle className="h-3 w-3" />
                        Ready
                      </Badge>
                    )}
                    {hasError && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {isWorking && (
                    <Progress 
                      value={(exportProgress.pollCount / 30) * 100} 
                      className="h-2"
                    />
                  )}

                  {/* Error Message */}
                  {hasError && (
                    <p className="text-sm text-loss">{exportProgress.error}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {isReady && exportProgress.url ? (
                      <>
                        <Button 
                          className="flex-1 gap-2"
                          onClick={() => {
                            const filename = `binance_${type}_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.csv`;
                            downloadFile(exportProgress.url!, filename);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download CSV
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => resetProgress(type)}
                        >
                          Reset
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="w-full gap-2"
                        onClick={() => handleExport(type)}
                        disabled={isWorking}
                      >
                        {isWorking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4" />
                        )}
                        {isWorking ? 'Processing...' : 'Export CSV'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tax Reporting Tips */}
        <Card className="border-chart-4/30 bg-chart-4/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-chart-4" />
              Tax Reporting Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-chart-4">•</span>
                <span><strong>Transaction History</strong> contains all income types: realized P&L, funding fees, commissions, and rebates.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-chart-4">•</span>
                <span><strong>Trade History</strong> includes individual trade details with entry/exit prices and quantities.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-chart-4">•</span>
                <span>All amounts are in <strong>USDT</strong>. Convert to your local currency using the exchange rate on the transaction date.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-chart-4">•</span>
                <span>Consult a tax professional for guidance on cryptocurrency taxation in your jurisdiction.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
