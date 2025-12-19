import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PortfolioMetrics } from "@/components/dashboard/PortfolioMetrics";
import { HoldingsTable } from "@/components/dashboard/HoldingsTable";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useDefaultPortfolio, useHoldings, useTransactions } from "@/hooks/use-portfolio";
import { 
  transformHoldings, 
  transformTransactions, 
  calculateMetrics, 
  calculateAllocation 
} from "@/lib/data-transformers";
import { performanceData } from "@/lib/demo-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[300px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  );
}

function EmptyPortfolio() {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome! Let's set up your portfolio.</p>
      </div>
      
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Plus className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No Portfolio Yet</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Create your first portfolio to start tracking your investments and see your performance metrics.
        </p>
        <Button onClick={() => navigate('/portfolio')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Portfolio
        </Button>
      </Card>
    </div>
  );
}

function EmptyHoldings() {
  const navigate = useNavigate();
  
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
      <h3 className="font-semibold mb-2">No Holdings Yet</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-4">
        Add your first transaction to start tracking your portfolio performance.
      </p>
      <Button variant="outline" onClick={() => navigate('/transactions')}>
        Add Transaction
      </Button>
    </Card>
  );
}

const Index = () => {
  const { data: portfolio, isLoading: portfolioLoading } = useDefaultPortfolio();
  const { data: dbHoldings, isLoading: holdingsLoading } = useHoldings(portfolio?.id);
  const { data: dbTransactions, isLoading: transactionsLoading } = useTransactions(portfolio?.id, 5);

  const isLoading = portfolioLoading || holdingsLoading || transactionsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (!portfolio) {
    return (
      <DashboardLayout>
        <EmptyPortfolio />
      </DashboardLayout>
    );
  }

  const holdings = dbHoldings ? transformHoldings(dbHoldings) : [];
  const transactions = dbTransactions ? transformTransactions(dbTransactions) : [];
  const metrics = calculateMetrics(holdings);
  const allocation = calculateAllocation(holdings);

  if (holdings.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your portfolio.
            </p>
          </div>
          <PortfolioMetrics metrics={metrics} />
          <EmptyHoldings />
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

        {/* Metrics Cards */}
        <PortfolioMetrics metrics={metrics} />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart data={performanceData} />
          </div>
          <div>
            <AllocationChart data={allocation} />
          </div>
        </div>

        {/* Holdings Table and Recent Transactions */}
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <HoldingsTable holdings={holdings} />
          </div>
          <div>
            <RecentTransactions transactions={transactions} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
