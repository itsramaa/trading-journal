import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PortfolioMetrics } from "@/components/dashboard/PortfolioMetrics";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { OnboardingTooltip, QuickTip } from "@/components/ui/onboarding-tooltip";
import { useGlobalShortcuts } from "@/components/ui/keyboard-shortcut";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { useHoldings, useTransactions, useDefaultPortfolio } from "@/hooks/use-portfolio";
import { transformHoldings, transformTransactions, calculateMetrics, calculateAllocation } from "@/lib/data-transformers";
import type { AllocationItem } from "@/types/portfolio";

const onboardingSteps = [
  {
    id: "welcome",
    title: "Welcome to Your Portfolio!",
    description: "This dashboard gives you a complete overview of your investments. Let's take a quick tour.",
  },
  {
    id: "metrics",
    title: "Portfolio Metrics",
    description: "The cards at the top show your total value, profit/loss, and key performance indicators.",
  },
  {
    id: "charts",
    title: "Performance Charts",
    description: "Track your portfolio growth over time and see your asset allocation breakdown.",
  },
  {
    id: "holdings",
    title: "Your Holdings",
    description: "View all your assets, their current values, and performance. Click any row for details.",
  },
  {
    id: "shortcuts",
    title: "Keyboard Shortcuts",
    description: "Press Shift+? anytime to see available keyboard shortcuts for faster navigation.",
  },
];

const Index = () => {
  // Enable global keyboard shortcuts
  useGlobalShortcuts();

  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: dbHoldings = [], isLoading: holdingsLoading } = useHoldings(defaultPortfolio?.id);
  const { data: dbTransactions = [], isLoading: transactionsLoading } = useTransactions(defaultPortfolio?.id, 10);

  // Transform database data to UI format
  const holdings = useMemo(() => transformHoldings(dbHoldings), [dbHoldings]);
  const transactions = useMemo(() => transformTransactions(dbTransactions), [dbTransactions]);
  const metrics = useMemo(() => {
    const baseMetrics = calculateMetrics(holdings);
    // Calculate CAGR
    const oldestTx = dbTransactions.length > 0 
      ? new Date(Math.min(...dbTransactions.map(t => new Date(t.transaction_date).getTime())))
      : new Date();
    const yearsHeld = Math.max(0.1, (Date.now() - oldestTx.getTime()) / (365 * 24 * 60 * 60 * 1000));
    const cagr = baseMetrics.totalCostBasis > 0 
      ? (Math.pow(baseMetrics.totalValue / baseMetrics.totalCostBasis, 1 / yearsHeld) - 1) * 100 
      : 0;
    return { ...baseMetrics, cagr };
  }, [holdings, dbTransactions]);
  
  // Calculate allocation for pie chart (simple version without assets array)
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your portfolio.</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your portfolio.
          </p>
        </div>

        {/* Quick Tip - Nielsen H10: Help and documentation */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search across your portfolio, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> to see all keyboard shortcuts.
        </QuickTip>

        {/* Metrics Cards - now includes CAGR */}
        <PortfolioMetrics metrics={metrics} />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <AllocationChart data={allocationByType} />
          </div>
        </div>

        {/* Holdings Table - full width */}
        <HoldingsTable holdings={holdings} />

        {/* Recent Transactions - below holdings, no view all */}
        <RecentTransactions transactions={transactions} maxItems={5} />
      </div>

      {/* Onboarding - Nielsen H6 & H10 */}
      <OnboardingTooltip steps={onboardingSteps} storageKey="dashboard" />
    </DashboardLayout>
  );
};

export default Index;
