/**
 * Performance Analytics - Overview and Strategies
 * Orchestrator component that delegates to sub-components
 */
import { useState, useMemo } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterActiveIndicator } from "@/components/ui/filter-active-indicator";
import { type AnalyticsSelection } from "@/components/analytics/AnalyticsLevelSelector";
import { type DateRange } from "@/components/trading/DateRangeFilter";
import { 
  BarChart3, Calendar, Activity, Trophy, FileText, Download 
} from "lucide-react";

// Sub-components
import { PerformanceFilters } from "@/components/performance/PerformanceFilters";
import { PerformanceKeyMetrics } from "@/components/performance/PerformanceKeyMetrics";
import { PerformanceContextTab } from "@/components/performance/PerformanceContextTab";
import { PerformanceMonthlyTab } from "@/components/performance/PerformanceMonthlyTab";
import { PerformanceStrategiesTab } from "@/components/performance/PerformanceStrategiesTab";

// Analytics components
import { DrawdownChart } from "@/components/analytics/charts/DrawdownChart";
import { TradingBehaviorAnalytics } from "@/components/analytics/TradingBehaviorAnalytics";
import { EquityCurveWithEvents } from "@/components/analytics/charts/EquityCurveWithEvents";
import { TradingHeatmapChart } from "@/components/analytics/charts/TradingHeatmapChart";
import { SevenDayStatsCard } from "@/components/analytics/SevenDayStatsCard";
import { SessionPerformanceChart } from "@/components/analytics/session/SessionPerformanceChart";

// Hooks
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useAccounts } from "@/hooks/use-accounts";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { useStrategyPerformance } from "@/hooks/use-strategy-performance";
import { useMonthlyPnl } from "@/hooks/use-monthly-pnl";
import { useContextualAnalytics } from "@/hooks/use-contextual-analytics";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { 
  filterTradesByDateRange, 
  filterTradesByStrategies,
  calculateTradingStats,
  calculateStrategyPerformance,
  generateEquityCurve,
} from "@/lib/trading-calculations";
import { Link } from "react-router-dom";
import type { UnifiedMarketContext } from "@/types/market-context";

export default function Performance() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [eventDaysOnly, setEventDaysOnly] = useState(false);
  const [analyticsSelection, setAnalyticsSelection] = useState<AnalyticsSelection>({ level: 'overall' });

  const { formatCompact } = useCurrencyConversion();

  // Data hooks
  const { data: modeFilteredTrades, isLoading: modeTradesLoading } = useModeFilteredTrades();
  const { data: allTrades, isLoading: allTradesLoading } = useTradeEntries();
  const { data: accounts = [] } = useAccounts();
  const { data: strategies = [] } = useTradingStrategies();
  const binanceStats = useBinanceDailyPnl();
  const strategyPerformanceMap = useStrategyPerformance();
  const { data: contextualData } = useContextualAnalytics();
  const monthlyStats = useMonthlyPnl();

  // Derive base trades based on analytics level
  const trades = useMemo(() => {
    const level = analyticsSelection.level;
    if (level === 'type') {
      if (!allTrades) return [];
      return allTrades.filter(t => {
        const isLive = t.trade_mode === 'live' || (!t.trade_mode && t.source === 'binance');
        return analyticsSelection.tradeType === 'live' ? isLive : !isLive;
      });
    }
    if (level === 'account') {
      if (!modeFilteredTrades) return [];
      return modeFilteredTrades.filter(t => t.trading_account_id === analyticsSelection.accountId);
    }
    if (level === 'exchange') {
      if (!modeFilteredTrades) return [];
      const exchangeAccountIds = new Set(
        accounts.filter(a => a.exchange === analyticsSelection.exchange).map(a => a.id)
      );
      return modeFilteredTrades.filter(t => t.trading_account_id && exchangeAccountIds.has(t.trading_account_id));
    }
    return modeFilteredTrades || [];
  }, [analyticsSelection, modeFilteredTrades, allTrades, accounts]);

  const tradesLoading = analyticsSelection.level === 'type' ? allTradesLoading : modeTradesLoading;

  // Filter trades
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    let filtered = filterTradesByDateRange(trades, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    if (eventDaysOnly) {
      filtered = filtered.filter(trade => {
        const context = trade.market_context as unknown as UnifiedMarketContext;
        return context?.events?.hasHighImpactToday === true;
      });
    }
    return filtered;
  }, [trades, dateRange, selectedStrategyIds, eventDaysOnly]);

  const eventDayTradeCount = useMemo(() => {
    if (!trades) return 0;
    return trades.filter(trade => {
      const context = trade.market_context as unknown as UnifiedMarketContext;
      return context?.events?.hasHighImpactToday === true;
    }).length;
  }, [trades]);

  const stats = useMemo(() => calculateTradingStats(filteredTrades), [filteredTrades]);
  const strategyPerformance = useMemo(() => calculateStrategyPerformance(filteredTrades, strategies), [filteredTrades, strategies]);
  const equityData = useMemo(() => generateEquityCurve(filteredTrades), [filteredTrades]);
  const chartFormatCurrency = (v: number) => formatCompact(v);

  if (tradesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={BarChart3} title="Performance Analytics" description="Deep dive into your trading performance metrics" />
        <MetricsGridSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Performance Analytics" description="Deep dive into your trading performance metrics">
        {analyticsSelection.level !== 'overall' && (
          <Badge variant="secondary" className="text-xs">
            {analyticsSelection.level === 'account' && `Account`}
            {analyticsSelection.level === 'exchange' && `Exchange: ${analyticsSelection.exchange}`}
            {analyticsSelection.level === 'type' && `${analyticsSelection.tradeType === 'paper' ? 'Paper' : 'Live'}`}
          </Badge>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link to="/export?tab=analytics">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Link>
        </Button>
      </PageHeader>

      <PerformanceFilters
        analyticsSelection={analyticsSelection}
        onAnalyticsSelectionChange={setAnalyticsSelection}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedStrategyIds={selectedStrategyIds}
        onSelectedStrategyIdsChange={setSelectedStrategyIds}
        strategies={strategies}
        eventDaysOnly={eventDaysOnly}
        onEventDaysOnlyChange={setEventDaysOnly}
        eventDayTradeCount={eventDayTradeCount}
      />

      {analyticsSelection.level !== 'overall' && (
        <FilterActiveIndicator
          isActive
          filterCount={0}
          onClear={() => setAnalyticsSelection({ level: 'overall' })}
          className="bg-primary/10 border-primary/30"
          scopeLabel={
            analyticsSelection.level === 'account'
              ? `Account: ${accounts.find(a => a.id === analyticsSelection.accountId)?.name || 'Unknown'}`
              : analyticsSelection.level === 'exchange'
                ? `Exchange: ${analyticsSelection.exchange}`
                : `Type: ${analyticsSelection.tradeType === 'paper' ? 'Paper' : 'Live'}`
          }
        />
      )}

      {trades && trades.length === 0 ? (
        <EmptyState icon={FileText} title="No trades recorded" description="Start logging your trades in the Trading Journal to see performance analytics here." />
      ) : (
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Monthly</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Context</span>
            </TabsTrigger>
            <TabsTrigger value="strategies" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Strategies</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <SevenDayStatsCard />
            <PerformanceKeyMetrics stats={stats} formatCurrency={chartFormatCurrency} binanceStats={binanceStats} />
            <TradingBehaviorAnalytics trades={filteredTrades} />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Equity Performance</h3>
              <EquityCurveWithEvents equityData={equityData} formatCurrency={chartFormatCurrency} />
            </div>

            {contextualData?.bySession && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Session Performance</h3>
                <div className="space-y-6">
                  <SessionPerformanceChart bySession={contextualData.bySession} />
                  <TradingHeatmapChart trades={filteredTrades} />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Risk Analysis</h3>
              <DrawdownChart />
            </div>
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly">
            <PerformanceMonthlyTab monthlyStats={monthlyStats} formatCurrency={chartFormatCurrency} />
          </TabsContent>

          {/* Context Tab */}
          <TabsContent value="context">
            <PerformanceContextTab filteredTrades={filteredTrades} contextualData={contextualData} />
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies">
            <PerformanceStrategiesTab
              strategies={strategies}
              strategyPerformance={strategyPerformance}
              strategyPerformanceMap={strategyPerformanceMap}
              formatCurrency={chartFormatCurrency}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
