/**
 * Bulk Export Page - Consolidated Export Hub
 * Tabs: Exchange | Journal | Analytics | Reports | Backup
 */
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Info,
  Settings2,
  Database,
  LineChart,
  Grid3X3,
  Brain,
  ClipboardList,
  Lock,
} from "lucide-react";
import { format, subDays, startOfYear, endOfDay, startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useBinanceConnectionStatus } from "@/features/binance";
import { 
  useBulkExportWorkflow, 
  getExportTypeLabel, 
  getExportTypeDescription,
  type BulkExportType 
} from "@/features/binance/useBinanceBulkExport";
import { SettingsBackupRestore } from "@/components/settings/SettingsBackupRestore";
import { JournalExportCard } from "@/components/settings/JournalExportCard";
import { useTradeMode, TRADE_MODE_LABELS } from "@/hooks/use-trade-mode";
import { usePerformanceExport } from "@/hooks/use-performance-export";
import { useContextualExport } from "@/hooks/use-contextual-export";
import { useContextualAnalytics } from "@/hooks/use-contextual-analytics";
import { useWeeklyReportExport } from "@/hooks/use-weekly-report-export";
import { useReconciliationExport } from "@/hooks/use-reconciliation-export";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { useBinanceWeeklyPnl } from "@/hooks/use-binance-weekly-pnl";
import { useSyncStore } from "@/store/sync-store";
import { exportHeatmapCSV } from "@/lib/export/heatmap-export";
import { calculateTradingStats } from "@/lib/trading-calculations";
import { logAuditEvent } from "@/lib/audit-logger";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const exportTypes: { type: BulkExportType; icon: typeof FileText }[] = [
  { type: 'transaction', icon: Receipt },
  { type: 'order', icon: FileText },
  { type: 'trade', icon: BarChart3 },
];

/** Compute date range label from trades */
function getTradesDateRange(trades: { trade_date: string }[]): string {
  if (!trades.length) return '';
  const sorted = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  const from = format(new Date(sorted[0].trade_date), 'MMM d, yyyy');
  const to = format(new Date(sorted[sorted.length - 1].trade_date), 'MMM d, yyyy');
  return `${from} – ${to}`;
}

export default function BulkExport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || undefined;

  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected;
  const { tradeMode } = useTradeMode();

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfYear(new Date()),
    to: endOfDay(new Date()),
  });

  const { progress, startExport, downloadFile, resetProgress } = useBulkExportWorkflow();

  // Analytics export hooks
  const { exportToCSV: exportPerfCSV, exportToPDF: exportPerfPDF } = usePerformanceExport();
  const { exportContextualPDF } = useContextualExport();
  const { data: contextualData } = useContextualAnalytics();
  const { exportCurrentWeek, exportLastWeek, isGenerating: isWeeklyGenerating } = useWeeklyReportExport();
  const { exportReconciliationCSV, exportReconciliationPDF } = useReconciliationExport();

  // Data for analytics exports
  const { data: trades = [] } = useModeFilteredTrades();
  const binanceStats = useBinanceDailyPnl();
  const weeklyStats = useBinanceWeeklyPnl();
  const lastSyncResult = useSyncStore(state => state.fullSyncResult);

  const closedTrades = useMemo(() => trades.filter(t => t.status === 'closed'), [trades]);
  const stats = useMemo(() => calculateTradingStats(closedTrades), [closedTrades]);
  const closedTradesDateRange = useMemo(() => getTradesDateRange(closedTrades), [closedTrades]);

  // Weekly report date ranges
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subDays(thisWeekStart, 7);
  const lastWeekEnd = subDays(thisWeekStart, 1);

  const handleExport = async (type: BulkExportType) => {
    try {
      const url = await startExport(type, startOfDay(dateRange.from), endOfDay(dateRange.to));
      if (url) {
        const filename = `binance_${type}_${format(dateRange.from, 'yyyyMMdd')}_${format(dateRange.to, 'yyyyMMdd')}.csv`;
        downloadFile(url, filename);
        toast.success(`${getExportTypeLabel(type)} downloaded successfully`);
        
        // Audit log
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          logAuditEvent(user.id, {
            action: 'export_completed',
            entityType: 'sync_operation',
            metadata: { exportType: type, from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
          });
        }
      }
    } catch {
      toast.error(`Failed to export ${getExportTypeLabel(type)}`);
    }
  };

  const handlePerformanceExport = (type: 'csv' | 'pdf') => {
    const symbolBreakdown = binanceStats.isConnected && binanceStats.bySymbol
      ? Object.entries(binanceStats.bySymbol)
          .filter(([symbol]) => symbol !== 'N/A')
          .map(([symbol, data]) => ({
            symbol,
            trades: data.count,
            pnl: data.pnl,
            fees: data.fees,
            funding: data.funding,
            net: data.pnl - data.fees + data.funding + data.rebates,
          }))
      : undefined;

    const exportData = {
      trades: closedTrades.map(t => ({
        id: t.id, pair: t.pair, direction: t.direction,
        entry_price: t.entry_price, exit_price: t.exit_price,
        quantity: t.quantity, pnl: t.pnl,
        trade_date: t.trade_date, status: t.status, fees: t.fees,
      })),
      stats,
      dateRange: { from: null, to: null },
      symbolBreakdown,
      weeklyData: weeklyStats.dailyData,
    };

    if (type === 'csv') exportPerfCSV(exportData);
    else exportPerfPDF(exportData);
    toast.success(`Performance ${type.toUpperCase()} exported`);
  };

  const presetRanges = [
    { label: 'Last 30 Days', from: subDays(new Date(), 30), to: new Date() },
    { label: 'Last 90 Days', from: subDays(new Date(), 90), to: new Date() },
    { label: 'Year to Date', from: startOfYear(new Date()), to: new Date() },
    { label: 'Last Year', from: startOfYear(new Date(new Date().getFullYear() - 1, 0, 1)), to: new Date(new Date().getFullYear() - 1, 11, 31) },
  ];

  const resolvedDefaultTab = defaultTab || (isConnected ? "binance" : "journal");
  const activeTab = searchParams.get('tab') || resolvedDefaultTab;
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Connection label
  const connectionLabel = isConnected
    ? `Connected: Binance Futures (${tradeMode === 'live' ? 'Live' : 'Testnet'})`
    : '📝 Paper Mode';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Download}
        title="Bulk Export & Backup"
        description="Download trading history, analytics reports, and backup settings"
      >
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnected ? `🔗 ${connectionLabel}` : connectionLabel}
        </Badge>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="binance" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Exchange</span>
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Journal</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <LineChart className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
        </TabsList>

        {/* Exchange Export Tab */}
        <TabsContent value="binance" className="space-y-6">
          {!isConnected ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Exchange Not Connected</AlertTitle>
              <AlertDescription>
                Connect your exchange API in Settings → Exchange to export transaction, 
                order, and trade history for tax reporting.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>About Exchange Exports</AlertTitle>
                <AlertDescription>
                  Exchange bulk export requests are processed asynchronously. Large date ranges may take 
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
                    Selected range: {format(dateRange.from, 'MMM d, yyyy')} – {format(dateRange.to, 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All timestamps are in UTC. End date is inclusive.
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

                        {isWorking && (
                          <Progress value={(exportProgress.pollCount / 30) * 100} className="h-2" />
                        )}

                        {hasError && (
                          <p className="text-sm text-loss">{exportProgress.error}</p>
                        )}

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
                              <Button variant="outline" onClick={() => resetProgress(type)}>
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
                      <span><strong>Trade History</strong> includes individual executed fills with entry/exit prices and quantities.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-chart-4">•</span>
                      <span>All amounts are denominated in your <strong>margin asset</strong> (typically USDT). Multi-asset margin accounts may include other stablecoins.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-chart-4">•</span>
                      <span>Consult a tax professional for guidance on cryptocurrency taxation in your jurisdiction.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Journal Export Tab */}
        <TabsContent value="journal" className="space-y-6">
          <JournalExportCard />
        </TabsContent>

        {/* Analytics Export Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Performance Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Performance Report
                </CardTitle>
                <CardDescription>
                  Full performance analytics including Win Rate, Profit Factor, equity curve, and symbol breakdown.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary">
                  {closedTrades.length} trades{closedTradesDateRange ? ` (${closedTradesDateRange})` : ''}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handlePerformanceExport('csv')}
                    disabled={closedTrades.length === 0}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handlePerformanceExport('pdf')}
                    disabled={closedTrades.length === 0}
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Heatmap Export */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5 text-primary" />
                  Trading Heatmap
                </CardTitle>
                <CardDescription>
                  Time-based performance grid showing P&L by day and hour slot.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="secondary">
                  {closedTrades.length} trades{closedTradesDateRange ? ` (${closedTradesDateRange})` : ''}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    exportHeatmapCSV(closedTrades);
                    toast.success('Heatmap CSV exported');
                  }}
                  disabled={closedTrades.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>

            {/* Contextual Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Contextual Analytics
                </CardTitle>
                <CardDescription>
                  Performance segmented by Fear/Greed Index, Volatility, and Event Days.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contextualData && contextualData.tradesWithContext > 0 ? (
                  <Badge variant="secondary">
                    {contextualData.tradesWithContext} trades analyzed
                  </Badge>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {contextualData 
                      ? 'No trades have market context attached. Enrich trades via Import & Sync.'
                      : 'No trades match contextual filters for the selected period.'}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    if (contextualData) {
                      exportContextualPDF(contextualData);
                      toast.success('Contextual PDF exported');
                    }
                  }}
                  disabled={!contextualData || contextualData.tradesWithContext === 0}
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Sync Reconciliation Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Sync Reconciliation Report
                </CardTitle>
                <CardDescription>
                  Compares exchange trades with journal records to detect discrepancies in P&L, lifecycle, and trade details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lastSyncResult ? (
                  <Badge variant="secondary">
                    {lastSyncResult.stats.validTrades} trades
                  </Badge>
                ) : (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>No reconciliation data available.</p>
                    <p className="text-xs">Run a Full Recovery sync from Import & Sync to generate this report.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => {
                      if (lastSyncResult) {
                        exportReconciliationCSV(lastSyncResult);
                        toast.success('Reconciliation CSV exported');
                      }
                    }}
                    disabled={!lastSyncResult}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => {
                      if (lastSyncResult) {
                        exportReconciliationPDF(lastSyncResult);
                        toast.success('Reconciliation PDF exported');
                      }
                    }}
                    disabled={!lastSyncResult}
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Report */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Weekly Report
                </CardTitle>
                <CardDescription>
                  Generate and download weekly performance summary as PDF.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={exportCurrentWeek}
                    disabled={isWeeklyGenerating}
                  >
                    {isWeeklyGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    This Week ({format(thisWeekStart, 'MMM d')} – {format(thisWeekEnd, 'MMM d')})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={exportLastWeek}
                    disabled={isWeeklyGenerating}
                  >
                    {isWeeklyGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Last Week ({format(lastWeekStart, 'MMM d')} – {format(lastWeekEnd, 'MMM d')})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backup/Restore Tab */}
        <TabsContent value="backup" className="space-y-6">
          <SettingsBackupRestore />
        </TabsContent>
      </Tabs>

      {/* Privacy & Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <Lock className="h-3 w-3" />
        <p>
          All data is stored encrypted at rest. Exported files are generated locally in your browser 
          and are not uploaded to any server. Exchange exports are fetched via secure server-side functions.
        </p>
      </div>
    </div>
  );
}
