/**
 * Backtest Page - Standalone page for backtest runner
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, BarChart3 } from "lucide-react";
import { BacktestRunner, BacktestComparison } from "@/components/strategy";

export default function Backtest() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Play}
          title="Backtest"
          description="Test your strategies against historical data"
        />

        {/* Backtest Content */}
        <Tabs defaultValue="run" className="w-full">
          <TabsList className="mb-6 h-9 bg-muted/50">
            <TabsTrigger value="run" className="flex items-center gap-2 text-sm">
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Run Backtest</span>
              <span className="sm:hidden">Run</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Compare Results</span>
              <span className="sm:hidden">Compare</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="run">
            <BacktestRunner />
          </TabsContent>
          
          <TabsContent value="compare">
            <BacktestComparison />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
