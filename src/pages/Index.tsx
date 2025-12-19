import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PortfolioMetrics } from "@/components/dashboard/PortfolioMetrics";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { 
  demoHoldings, 
  demoPortfolioMetrics, 
  demoTransactions,
  performanceData 
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

        {/* Metrics Cards */}
        <PortfolioMetrics metrics={demoPortfolioMetrics} />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart data={performanceData} />
          </div>
          <div>
            <AllocationChart data={demoPortfolioMetrics.allocationByType} />
          </div>
        </div>

        {/* Holdings Table and Recent Transactions */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <HoldingsTable holdings={demoHoldings} />
          </div>
          <div>
            <RecentTransactions transactions={demoTransactions} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
