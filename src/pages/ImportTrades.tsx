/**
 * Import & Sync Trades - Unified Data Import Hub
 * Tabs: Binance Sync | Solana Import
 * Hybrid approach: auto incremental + manual full sync
 */
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { SolanaTradeImport } from "@/components/wallet/SolanaTradeImport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Zap, Shield, Globe, Layers, Wifi, RefreshCw, Loader2, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { format } from "date-fns";
import { useTradeMode } from "@/hooks/use-trade-mode";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useBinanceIncrementalSync } from "@/hooks/use-binance-incremental-sync";
import { BinanceFullSyncPanel } from "@/components/trading/BinanceFullSyncPanel";
import { useSyncStore, selectIsFullSyncRunning, selectFullSyncStatus, selectCheckpoint } from "@/store/sync-store";
import { useTradeEnrichmentBinance, useTradesNeedingEnrichmentCount, type EnrichmentProgress } from "@/hooks/use-trade-enrichment-binance";
import { Link } from "react-router-dom";

const SUPPORTED_DEXS = [
  { name: 'Deriverse', status: 'Primary' },
  { name: 'Drift', status: 'Supported' },
  { name: 'Zeta Markets', status: 'Supported' },
  { name: 'Mango Markets', status: 'Supported' },
];

export default function ImportTrades() {
  const { tradeMode } = useTradeMode();
  const [retryKey, setRetryKey] = useState(0);
  const { showExchangeData } = useModeVisibility();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  const isPaperMode = tradeMode === 'paper';

  // Controlled tab state via URL
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = isPaperMode ? "solana" : "binance";
  const activeTab = searchParams.get("tab") || defaultTab;
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  // Incremental sync
  const { sync: triggerIncrementalSync, isLoading: isIncrementalSyncing, lastSyncTime, isStale } = useBinanceIncrementalSync({ autoSyncOnMount: false });

  // Full sync state
  const isFullSyncing = useSyncStore(selectIsFullSyncRunning);
  const fullSyncStatus = useSyncStore(selectFullSyncStatus);
  const checkpoint = useSyncStore(selectCheckpoint);
  const canResume = !!checkpoint;
  const fullSyncAutoOpen = isFullSyncing || canResume;

  // Enrichment — only query when relevant
  const enrichmentEnabled = !isPaperMode && isBinanceConnected;
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | null>(null);
  const { enrichTrades, isEnriching } = useTradeEnrichmentBinance();
  const { data: tradesNeedingEnrichment = 0 } = useTradesNeedingEnrichmentCount(enrichmentEnabled);

  // Whether Binance tab content is interactive
  const isBinanceDisabled = isPaperMode || !isBinanceConnected;

  return (
    <ErrorBoundary title="Import & Sync" onRetry={() => setRetryKey(k => k + 1)}>
    <div key={retryKey} className="space-y-6">
      <PageHeader
        icon={Download}
        title="Import & Sync Trades"
        description="Import trades from exchanges, wallets, or sync your trading history"
      >
        <Badge variant={isPaperMode ? "secondary" : "default"} className="gap-1.5">
          {isPaperMode ? "Paper Mode" : "Live Mode"}
        </Badge>
      </PageHeader>

      {/* Feature Highlights */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={`border-border/50 ${isPaperMode ? 'opacity-50' : ''}`}>
          <CardContent className="flex items-start gap-3 pt-5 pb-4">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Auto Incremental Sync
                {isPaperMode && <span className="text-muted-foreground ml-1 text-xs">(Live only)</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically fetches new trades since last sync checkpoint
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-start gap-3 pt-5 pb-4">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Duplicate Protection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Already imported trades are automatically skipped
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-start gap-3 pt-5 pb-4">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Multi-Source Support</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Binance Futures, Solana DEXs (Deriverse, Drift, Zeta)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="binance" className="gap-2">
            <Wifi className="h-4 w-4" />
            Binance Sync
          </TabsTrigger>
          <TabsTrigger value="solana" className="gap-2">
            <Globe className="h-4 w-4" />
            Solana Import
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">Experimental</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Binance Sync Tab */}
        <TabsContent value="binance" className="space-y-4">
          {/* Paper mode banner */}
          {isPaperMode && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Binance sync is available in <strong>Live mode</strong>. Switch modes via the header selector to sync exchange trades.
              </AlertDescription>
            </Alert>
          )}

          {/* Not connected banner (Live mode only) */}
          {!isPaperMode && !isBinanceConnected && (
            <Alert>
              <Wifi className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Connect your Binance API credentials in Settings to start syncing trades.</span>
                <Button asChild variant="outline" size="sm" className="ml-3 shrink-0">
                  <Link to="/settings">Go to Settings</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions — always rendered, disabled when not available */}
          <Card className={isBinanceDisabled ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Incremental Sync — show for first-time users too */}
                {!isFullSyncing && !isIncrementalSyncing && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={triggerIncrementalSync}
                          disabled={isBinanceDisabled}
                          className="gap-2"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span className="text-xs">
                            {lastSyncTime ? (
                              <>
                                Incremental Sync
                                <span className="text-muted-foreground ml-1">
                                  (last: {format(lastSyncTime, 'HH:mm')})
                                </span>
                                {isStale && <span className="text-warning ml-1">(stale)</span>}
                              </>
                            ) : (
                              'Start First Sync'
                            )}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{lastSyncTime ? 'Fetch only new trades since last sync checkpoint' : 'Perform your first incremental sync to import recent trades'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {isIncrementalSyncing && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing new trades...
                  </Badge>
                )}

                {/* Enrichment Progress */}
                {isEnriching && enrichmentProgress && (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {enrichmentProgress.message || 'Enriching trades...'}
                      </span>
                      <div className="flex items-center gap-2">
                        <Progress value={enrichmentProgress.percent ?? 0} className="w-32 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {(enrichmentProgress.percent ?? 0).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enrich Button */}
                {!isEnriching && tradesNeedingEnrichment > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => enrichTrades({
                            daysBack: 730,
                            onProgress: setEnrichmentProgress,
                          })}
                          disabled={isBinanceDisabled}
                          className="gap-2"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Enrich {tradesNeedingEnrichment} Trades
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Fetch accurate entry/exit prices from Binance for trades with missing data</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* All enriched */}
                {!isEnriching && tradesNeedingEnrichment === 0 && enrichmentEnabled && (
                  <Badge variant="outline" className="text-xs gap-1 text-profit">
                    <CheckCircle className="h-3 w-3" />
                    All trades enriched
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advanced: Full Sync */}
          <div className={`space-y-2 ${isBinanceDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-2 py-2 px-1 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Advanced: Full Sync (Recovery)</span>
            </div>
            <p className="text-xs text-muted-foreground px-1 -mt-1 mb-2">
              Complete re-download of all trade history. Use when incremental sync misses data or for initial setup.
            </p>
            <BinanceFullSyncPanel isBinanceConnected={isBinanceConnected && !isPaperMode} />
          </div>
        </TabsContent>

        {/* Solana Import Tab */}
        <TabsContent value="solana" className="space-y-4">
          <SolanaTradeImport />

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Supported Protocols
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_DEXS.map(dex => (
                  <Badge
                    key={dex.name}
                    variant={dex.status === 'Primary' ? 'default' : 'outline'}
                    className="gap-1.5"
                  >
                    {dex.name}
                    {dex.status === 'Supported' && (
                      <span className="text-[10px] opacity-70">{dex.status}</span>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  );
}