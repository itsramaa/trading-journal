/**
 * Backtest Page - Standalone page for backtest runner
 * 
 * Scope: Basic Mode — single strategy backtesting suitable for trading journal.
 * Walk-forward optimization is out of scope (advanced quant tool, not journal feature).
 */
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Play, BarChart3 } from "lucide-react";
import { BacktestRunner, BacktestComparison } from "@/components/strategy";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export default function Backtest() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'run';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  return (
    <ErrorBoundary title="Backtest failed to load">
      <div className="space-y-6" role="region" aria-label="Backtest">
        <PageHeader
          icon={Play}
          title="Backtest"
          description="Test your strategies against historical data"
        >
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs font-normal">Basic Mode</Badge>
            <InfoTooltip content="Single-strategy backtesting for trading journal analysis. Walk-forward optimization is not included." />
          </div>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
    </ErrorBoundary>
  );
}
