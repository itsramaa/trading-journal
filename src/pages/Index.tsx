import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PortfolioMetrics } from "@/components/dashboard/PortfolioMetrics";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { 
  demoHoldings, 
  demoTransactions, 
  demoPortfolioMetrics, 
  demoAllocationByType,
} from "@/lib/demo-data";

const Index = () => {
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

        {/* Metrics Cards - now includes CAGR */}
        <PortfolioMetrics metrics={demoPortfolioMetrics} />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <AllocationChart data={demoAllocationByType} />
          </div>
        </div>

        {/* Holdings Table - full width */}
        <HoldingsTable holdings={demoHoldings} />

        {/* Recent Transactions - below holdings, no view all */}
        <RecentTransactions transactions={demoTransactions} maxItems={5} />
      </div>
    </DashboardLayout>
  );
};

export default Index;
