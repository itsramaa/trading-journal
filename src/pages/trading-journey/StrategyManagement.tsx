/**
 * Strategy Management - Refactored per Trading Journey Markdown spec
 * Components extracted: StrategyCard, StrategyFormDialog, StrategyStats
 */
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, Youtube, Library } from "lucide-react";
import { 
  useTradingStrategies, 
  useCreateTradingStrategy, 
  useUpdateTradingStrategy, 
  useDeleteTradingStrategy,
  TradingStrategy 
} from "@/hooks/use-trading-strategies";
import { useStrategyPerformance } from "@/hooks/use-strategy-performance";
import { useBaseAssets } from "@/hooks/use-trading-pairs";
import { 
  StrategyCard, 
  StrategyStats, 
  StrategyFormDialog,
  YouTubeStrategyImporter,
} from "@/components/strategy";
import type { EntryRule, ExitRule } from "@/types/strategy";

export default function StrategyManagement() {
  const [activeTab, setActiveTab] = useState('library');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<TradingStrategy | null>(null);
  const [deletingStrategy, setDeletingStrategy] = useState<TradingStrategy | null>(null);

  const { data: strategies, isLoading } = useTradingStrategies();
  const strategyPerformance = useStrategyPerformance();
  const createStrategy = useCreateTradingStrategy();
  const updateStrategy = useUpdateTradingStrategy();
  const deleteStrategy = useDeleteTradingStrategy();
  
  // Dynamic base assets from database
  const { data: baseAssets } = useBaseAssets();

  const handleOpenAdd = () => {
    setEditingStrategy(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (strategy: TradingStrategy) => {
    setEditingStrategy(strategy);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: {
    name: string;
    description?: string;
    tags?: string;
    validPairs: string[];
    entryRules: EntryRule[];
    exitRules: ExitRule[];
    color: string;
    timeframe: string;
    marketType: string;
    min_confluences: number;
    min_rr: number;
  }) => {
    const tagsArray = values.tags
      ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    try {
      if (editingStrategy) {
        await updateStrategy.mutateAsync({
          id: editingStrategy.id,
          name: values.name,
          description: values.description,
          tags: tagsArray,
          color: values.color,
          timeframe: values.timeframe as any || undefined,
          market_type: values.marketType as any || 'spot',
          min_confluences: values.min_confluences,
          min_rr: values.min_rr,
          valid_pairs: values.validPairs,
          entry_rules: values.entryRules,
          exit_rules: values.exitRules,
        });
      } else {
        await createStrategy.mutateAsync({
          name: values.name,
          description: values.description,
          tags: tagsArray,
          color: values.color,
          timeframe: values.timeframe as any || undefined,
          market_type: values.marketType as any || 'spot',
          min_confluences: values.min_confluences,
          min_rr: values.min_rr,
          valid_pairs: values.validPairs,
          entry_rules: values.entryRules,
          exit_rules: values.exitRules,
        });
      }
      setIsFormOpen(false);
      setEditingStrategy(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deletingStrategy) return;
    try {
      await deleteStrategy.mutateAsync(deletingStrategy.id);
      setDeletingStrategy(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategy & Rules</h1>
            <p className="text-muted-foreground">Create and manage your trading strategies</p>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Strategy & Rules</h1>
                <p className="text-muted-foreground text-sm">Create, import, and backtest your trading strategies</p>
              </div>
            </div>
          </div>
          {activeTab === 'library' && (
            <Button onClick={handleOpenAdd} className="shrink-0" aria-label="Create new trading strategy">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Strategy
            </Button>
          )}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-11" aria-label="Strategy management sections">
            <TabsTrigger value="library" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" aria-label="Strategy library">
              <Library className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Library</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" aria-label="Import strategy from YouTube">
              <Youtube className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">YouTube Import</span>
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6 mt-6">
            {/* Strategy Stats */}
            <StrategyStats strategies={strategies} />

            {/* Strategies List */}
            {!strategies || strategies.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No strategies created"
                description="Create your first trading strategy to track and analyze your setups."
                action={{
                  label: "Create Strategy",
                  onClick: handleOpenAdd,
                }}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {strategies.map((strategy) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    performance={strategyPerformance.get(strategy.id)}
                    onEdit={handleOpenEdit}
                    onDelete={setDeletingStrategy}
                    onBacktest={(id) => {/* Navigation handled in StrategyCard */}}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* YouTube Import Tab */}
          <TabsContent value="import" className="mt-6">
            <YouTubeStrategyImporter onStrategyImported={() => setActiveTab('library')} />
          </TabsContent>
        </Tabs>

        {/* Strategy Form Dialog */}
        <StrategyFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          editingStrategy={editingStrategy}
          availablePairs={baseAssets}
          onSubmit={handleFormSubmit}
          isPending={createStrategy.isPending || updateStrategy.isPending}
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingStrategy}
          onOpenChange={(open) => !open && setDeletingStrategy(null)}
          title="Delete Strategy"
          description={`Are you sure you want to delete "${deletingStrategy?.name}"? This will remove the strategy from all trades that use it.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
}
