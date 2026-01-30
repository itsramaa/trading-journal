/**
 * Trade History Page - Standalone page for trade history
 */
import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { History, CheckCircle } from "lucide-react";
import { useTradeEntries, TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useBinanceAutoSync } from "@/hooks/use-binance-auto-sync";
import { filterTradesByDateRange, filterTradesByStrategies } from "@/lib/trading-calculations";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { DateRange } from "@/components/trading/DateRangeFilter";
import { TradeFilters, TradeHistoryTabs } from "@/components/journal";

export default function TradeHistory() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [sortByAI, setSortByAI] = useState<'none' | 'asc' | 'desc'>('none');

  const { data: userSettings } = useUserSettings();
  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = connectionStatus?.isConnected ?? false;
  
  const { syncNow, isSyncing: isAutoSyncing, lastSyncTime, pendingRecords } = useBinanceAutoSync({
    autoSyncOnMount: false,
    enablePeriodicSync: false,
  });

  const displayCurrency = userSettings?.default_currency || 'USD';
  const formatCurrency = (value: number) => formatCurrencyUtil(value, displayCurrency);

  // Separate closed trades
  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);
  const binanceTrades = useMemo(() => closedTrades.filter(t => t.source === 'binance'), [closedTrades]);
  const paperTrades = useMemo(() => closedTrades.filter(t => t.source !== 'binance'), [closedTrades]);

  // Filter and sort
  const filterAndSortTrades = (tradesToFilter: typeof closedTrades) => {
    let filtered = filterTradesByDateRange(tradesToFilter, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    
    if (sortByAI !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const scoreA = a.ai_quality_score ?? -1;
        const scoreB = b.ai_quality_score ?? -1;
        return sortByAI === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      });
    }
    
    return filtered;
  };
  
  const filteredBinanceTrades = useMemo(() => filterAndSortTrades(binanceTrades), [binanceTrades, dateRange, selectedStrategyIds, sortByAI]);
  const filteredPaperTrades = useMemo(() => filterAndSortTrades(paperTrades), [paperTrades, dateRange, selectedStrategyIds, sortByAI]);

  const calculateRR = (trade: TradeEntry): number => {
    if (!trade.stop_loss || !trade.entry_price || !trade.exit_price) return 0;
    const risk = Math.abs(trade.entry_price - trade.stop_loss);
    if (risk === 0) return 0;
    const reward = Math.abs(trade.exit_price - trade.entry_price);
    return reward / risk;
  };

  if (tradesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Trade History
            </h1>
            <p className="text-muted-foreground">Review and analyze your completed trades</p>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Trade History
          </h1>
          <p className="text-muted-foreground">
            Review and analyze your completed trades
          </p>
        </div>

        {closedTrades.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No closed trades yet"
            description="Complete your first trade to see it in your history."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Closed Trades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TradeFilters
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                sortByAI={sortByAI}
                onSortByAIChange={setSortByAI}
                strategies={strategies}
                selectedStrategyIds={selectedStrategyIds}
                onStrategyIdsChange={setSelectedStrategyIds}
              />

              <TradeHistoryTabs
                binanceTrades={filteredBinanceTrades}
                paperTrades={filteredPaperTrades}
                isBinanceConnected={isBinanceConnected}
                lastSyncTime={lastSyncTime}
                pendingRecords={pendingRecords}
                isAutoSyncing={isAutoSyncing}
                onSyncNow={syncNow}
                onDeleteTrade={() => {}}
                calculateRR={calculateRR}
                formatCurrency={formatCurrency}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
