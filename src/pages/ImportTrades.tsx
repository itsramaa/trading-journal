/**
 * Import & Sync Trades - Professional Data Hub
 * Tabs: Incremental Sync | Full Recovery | On-Chain Scanner
 * Each tab owns its full vertical space with no cross-tab bleed
 */
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
import { Download, Zap, Database, Globe, Layers, Wifi, RefreshCw, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { useTradeMode } from "@/hooks/use-trade-mode";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useBinanceIncrementalSync } from "@/hooks/use-binance-incremental-sync";
import { BinanceFullSyncPanel } from "@/components/trading/BinanceFullSyncPanel";
import { useSyncStore, selectIsFullSyncRunning, selectCheckpoint } from "@/store/sync-store";
import { useTradeEnrichmentBinance, useTradesNeedingEnrichmentCount, type EnrichmentProgress } from "@/hooks/use-trade-enrichment-binance";

type ImportMode = 'incremental' | 'full-recovery' | 'solana';

const SUPPORTED_DEXS = [
  { name: 'Deriverse', status: 'Primary' },
  { name: 'Drift', status: 'Supported' },
  { name: 'Zeta Markets', status: 'Supported' },
  { name: 'Mango Markets', status: 'Supported' },
];

/** Shared banner for Binance tabs when not connected */
function NotConnectedBanner({ isPaperMode }: { isPaperMode: boolean }) {
  if (isPaperMode) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Binance sync is available in <strong>Live mode</strong>. Switch modes via the header selector to sync exchange trades.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <Wifi className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>Connect your Binance API credentials in Settings to start syncing trades.</span>
        <Button asChild variant="outline" size="sm" className="ml-3 shrink-0">
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default function ImportTrades() {
  const { tradeMode } = useTradeMode();
  const [retryKey, setRetryKey] = useState(0);
  const { showExchangeData } = useModeVisibility();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  const isPaperMode = tradeMode === 'paper';

  // Tab state via URL
  const [searchParams, setSearchParams] = useSearchParams();
  const isBinanceDisabled = isPaperMode || !isBinanceConnected;

  const defaultTab: ImportMode = isPaperMode
    ? 'solana'
    : isBinanceConnected
      ? 'incremental'
      : 'solana';

  const activeTab = (searchParams.get("tab") as ImportMode) || defaultTab;
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  // Incremental sync
  const { sync: triggerIncrementalSync, isLoading: isIncrementalSyncing, lastSyncTime, isStale } = useBinanceIncrementalSync({ autoSyncOnMount: false });

  // Full sync state
  const isFullSyncing = useSyncStore(selectIsFullSyncRunning);
  const checkpoint = useSyncStore(selectCheckpoint);
  const canResume = !!checkpoint;

  // Enrichment
  const enrichmentEnabled = !isPaperMode && isBinanceConnected;
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | null>(null);
  const { enrichTrades, isEnriching } = useTradeEnrichmentBinance();
  const { data: tradesNeedingEnrichment = 0 } = useTradesNeedingEnrichmentCount(enrichmentEnabled);

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

      {/* Mode Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="incremental" disabled={isBinanceDisabled} className="gap-2">
            <Zap className="h-4 w-4" />
            Incremental Sync
          </TabsTrigger>
          <TabsTrigger value="full-recovery" disabled={isBinanceDisabled} className="gap-2">
            <Database className="h-4 w-4" />
            Full Recovery
          </TabsTrigger>
          <TabsTrigger value="solana" className="gap-2">
            <Globe className="h-4 w-4" />
            On-Chain Scanner
          </TabsTrigger>
        </TabsList>

        {/* ── Incremental Sync Tab ── */}
        <TabsContent value="incremental" className="space-y-4">
          {isBinanceDisabled && <NotConnectedBanner isPaperMode={isPaperMode} />}

          <Card className={isBinanceDisabled ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Sync Latest Trades
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Incremental Sync Button */}
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
              </div>
            </CardContent>
          </Card>

          {/* Enrichment Card — only if trades need enrichment */}
          {enrichmentEnabled && (isEnriching || tradesNeedingEnrichment > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Trade Enrichment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isEnriching && enrichmentProgress ? (
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
                ) : (
                  <div className="flex items-center gap-3">
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
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* All enriched badge */}
          {!isEnriching && tradesNeedingEnrichment === 0 && enrichmentEnabled && (
            <Badge variant="outline" className="text-xs gap-1 text-profit">
              <CheckCircle className="h-3 w-3" />
              All trades enriched
            </Badge>
          )}
        </TabsContent>

        {/* ── Full Recovery Tab ── */}
        <TabsContent value="full-recovery" className="space-y-4">
          {isBinanceDisabled && <NotConnectedBanner isPaperMode={isPaperMode} />}

          <div className={isBinanceDisabled ? 'opacity-50 pointer-events-none' : ''}>
            <BinanceFullSyncPanel isBinanceConnected={isBinanceConnected && !isPaperMode} />
          </div>
        </TabsContent>

        {/* ── On-Chain Scanner Tab ── */}
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
