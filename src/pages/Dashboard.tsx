/**
 * Unified Dashboard with tab navigation
 * Consolidates Portfolio, Financial Freedom, and Trading dashboards
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioMetrics } from "@/components/dashboard/PortfolioMetrics";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { useGlobalShortcuts } from "@/components/ui/keyboard-shortcut";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { useHoldings, useTransactions, useDefaultPortfolio } from "@/hooks/use-portfolio";
import { transformHoldings, transformTransactions, calculateMetrics, calculateAllocation } from "@/lib/data-transformers";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAppStore } from "@/store/app-store";
import type { AllocationItem } from "@/types/portfolio";

// Lazy load heavy components
import { Suspense, lazy } from "react";
const FFDashboardContent = lazy(() => import("@/components/dashboard/FFDashboardContent"));
const TradingDashboardContent = lazy(() => import("@/components/dashboard/TradingDashboardContent"));

const Dashboard = () => {
  const { t } = useTranslation();
  useGlobalShortcuts();
  
  const { activeApp, setActiveApp } = useAppStore();
  const { data: settings } = useUserSettings();
  
  // Map activeApp to tab value
  const tabValue = activeApp === 'portfolio' ? 'portfolio' 
    : activeApp === 'financial-freedom' ? 'ff' 
    : 'trading';

  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: dbHoldings = [], isLoading: holdingsLoading } = useHoldings(defaultPortfolio?.id);
  const { data: dbTransactions = [], isLoading: transactionsLoading } = useTransactions(defaultPortfolio?.id, 10);

  // Transform database data to UI format
  const holdings = useMemo(() => transformHoldings(dbHoldings), [dbHoldings]);
  const transactions = useMemo(() => transformTransactions(dbTransactions), [dbTransactions]);
  const metrics = useMemo(() => {
    const baseMetrics = calculateMetrics(holdings);
    const oldestTx = dbTransactions.length > 0 
      ? new Date(Math.min(...dbTransactions.map(t => new Date(t.transaction_date).getTime())))
      : new Date();
    const yearsHeld = Math.max(0.1, (Date.now() - oldestTx.getTime()) / (365 * 24 * 60 * 60 * 1000));
    const cagr = baseMetrics.totalCostBasis > 0 
      ? (Math.pow(baseMetrics.totalValue / baseMetrics.totalCostBasis, 1 / yearsHeld) - 1) * 100 
      : 0;
    return { ...baseMetrics, cagr };
  }, [holdings, dbTransactions]);
  
  const allocationByType: AllocationItem[] = useMemo(() => {
    const marketAllocations = calculateAllocation(holdings);
    return marketAllocations.map(m => ({
      name: m.name,
      value: m.value,
      percentage: m.percentage,
      color: m.color,
    }));
  }, [holdings]);

  const isLoading = holdingsLoading || transactionsLoading;

  const handleTabChange = (value: string) => {
    if (value === 'portfolio') setActiveApp('portfolio');
    else if (value === 'ff') setActiveApp('financial-freedom');
    else if (value === 'trading') setActiveApp('trading-journey');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>

        {/* Quick Tip */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search across your portfolio, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> to see all keyboard shortcuts.
        </QuickTip>

        {/* Tab Navigation */}
        <Tabs value={tabValue} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="portfolio">{t('nav.portfolioOverview')}</TabsTrigger>
            <TabsTrigger value="ff">{t('nav.financialFreedom')}</TabsTrigger>
            <TabsTrigger value="trading">{t('nav.tradingJourney')}</TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6 mt-6">
            {isLoading ? (
              <MetricsGridSkeleton />
            ) : (
              <>
                <PortfolioMetrics metrics={metrics} />
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <PerformanceChart />
                  </div>
                  <div>
                    <AllocationChart data={allocationByType} />
                  </div>
                </div>
                <HoldingsTable holdings={holdings} />
                <RecentTransactions transactions={transactions} maxItems={5} />
              </>
            )}
          </TabsContent>

          {/* Financial Freedom Tab */}
          <TabsContent value="ff" className="mt-6">
            <Suspense fallback={<MetricsGridSkeleton />}>
              <FFDashboardContent />
            </Suspense>
          </TabsContent>

          {/* Trading Tab */}
          <TabsContent value="trading" className="mt-6">
            <Suspense fallback={<MetricsGridSkeleton />}>
              <TradingDashboardContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
