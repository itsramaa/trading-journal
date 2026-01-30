/**
 * Strategy Management - Enhanced per Trading Journey Markdown spec
 * Includes: Library, YouTube Import, Backtesting
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Target, MoreVertical, Edit, Trash2, Tag, Clock, TrendingUp, Shield, Zap, ListChecks, LogOut, Brain, Star, X, ChevronsUpDown, Youtube, Play, Library, History, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { 
  useTradingStrategies, 
  useCreateTradingStrategy, 
  useUpdateTradingStrategy, 
  useDeleteTradingStrategy,
  TradingStrategy 
} from "@/hooks/use-trading-strategies";
import { useStrategyPerformance, getQualityScoreLabel } from "@/hooks/use-strategy-performance";
import { TIMEFRAME_OPTIONS, COMMON_PAIRS, type TimeframeType, type MarketType, type EntryRule, type ExitRule, DEFAULT_ENTRY_RULES, DEFAULT_EXIT_RULES } from "@/types/strategy";
import { EntryRulesBuilder } from "@/components/strategy/EntryRulesBuilder";
import { ExitRulesBuilder } from "@/components/strategy/ExitRulesBuilder";
import { YouTubeStrategyImporter } from "@/components/strategy/YouTubeStrategyImporter";
import { BacktestRunner } from "@/components/strategy/BacktestRunner";
import { BacktestComparison } from "@/components/strategy/BacktestComparison";
import { StrategyValidationBadge } from "@/components/strategy/StrategyValidationBadge";
import { useBaseAssets } from "@/hooks/use-trading-pairs";

const strategyColors = [
  { name: 'Blue', value: 'blue' },
  { name: 'Green', value: 'green' },
  { name: 'Purple', value: 'purple' },
  { name: 'Orange', value: 'orange' },
  { name: 'Red', value: 'red' },
  { name: 'Teal', value: 'teal' },
  { name: 'Pink', value: 'pink' },
  { name: 'Yellow', value: 'yellow' },
];

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  green: 'bg-green-500/20 text-green-500 border-green-500/30',
  purple: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  red: 'bg-red-500/20 text-red-500 border-red-500/30',
  teal: 'bg-teal-500/20 text-teal-500 border-teal-500/30',
  pink: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
};

const strategyFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  tags: z.string().optional(),
  color: z.string().default('blue'),
  timeframe: z.string().optional(),
  market_type: z.string().default('spot'),
  min_confluences: z.number().min(1).max(10).default(4),
  min_rr: z.number().min(0.5).max(10).default(1.5),
});

type StrategyFormValues = z.infer<typeof strategyFormSchema>;

export default function StrategyManagement() {
  const [activeTab, setActiveTab] = useState('library');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<TradingStrategy | null>(null);
  const [deletingStrategy, setDeletingStrategy] = useState<TradingStrategy | null>(null);
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('');
  const [selectedMarketType, setSelectedMarketType] = useState<string>('spot');
  const [selectedValidPairs, setSelectedValidPairs] = useState<string[]>(['BTC', 'ETH', 'BNB']);
  const [entryRules, setEntryRules] = useState<EntryRule[]>([]);
  const [exitRules, setExitRules] = useState<ExitRule[]>([]);

  const { data: strategies, isLoading } = useTradingStrategies();
  const strategyPerformance = useStrategyPerformance();
  const createStrategy = useCreateTradingStrategy();
  const updateStrategy = useUpdateTradingStrategy();
  const deleteStrategy = useDeleteTradingStrategy();
  
  // Dynamic base assets from database (replaces hardcoded COMMON_PAIRS)
  const { data: baseAssets, isLoading: assetsLoading } = useBaseAssets();
  const availablePairs = baseAssets.length > 0 ? baseAssets : COMMON_PAIRS;

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: '',
      color: 'blue',
      timeframe: '',
      market_type: 'spot',
      min_confluences: 4,
      min_rr: 1.5,
    },
  });

  const handleOpenAdd = () => {
    form.reset({ 
      name: '', 
      description: '', 
      tags: '', 
      color: 'blue',
      timeframe: '',
      market_type: 'spot',
      min_confluences: 4,
      min_rr: 1.5,
    });
    setSelectedColor('blue');
    setSelectedTimeframe('');
    setSelectedMarketType('spot');
    setSelectedValidPairs(['BTC', 'ETH', 'BNB']);
    setEntryRules(DEFAULT_ENTRY_RULES.slice(0, 4)); // Start with 4 default entry rules
    setExitRules(DEFAULT_EXIT_RULES);
    setEditingStrategy(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (strategy: TradingStrategy) => {
    form.reset({
      name: strategy.name,
      description: strategy.description || '',
      tags: strategy.tags?.join(', ') || '',
      color: strategy.color || 'blue',
      min_confluences: strategy.min_confluences || 4,
      min_rr: strategy.min_rr || 1.5,
    });
    setSelectedColor(strategy.color || 'blue');
    setSelectedTimeframe(strategy.timeframe || '');
    setSelectedMarketType(strategy.market_type || 'spot');
    setSelectedValidPairs(strategy.valid_pairs || ['BTC', 'ETH', 'BNB']);
    setEntryRules(strategy.entry_rules || []);
    setExitRules(strategy.exit_rules || []);
    setEditingStrategy(strategy);
    setIsAddOpen(true);
  };

  const handleSubmit = async (values: StrategyFormValues) => {
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
          color: selectedColor,
          timeframe: selectedTimeframe as any || undefined,
          market_type: selectedMarketType as any || 'spot',
          min_confluences: values.min_confluences,
          min_rr: values.min_rr,
          valid_pairs: selectedValidPairs,
          entry_rules: entryRules,
          exit_rules: exitRules,
        });
      } else {
        await createStrategy.mutateAsync({
          name: values.name,
          description: values.description,
          tags: tagsArray,
          color: selectedColor,
          timeframe: selectedTimeframe as any || undefined,
          market_type: selectedMarketType as any || 'spot',
          min_confluences: values.min_confluences,
          min_rr: values.min_rr,
          valid_pairs: selectedValidPairs,
          entry_rules: entryRules,
          exit_rules: exitRules,
        });
      }
      setIsAddOpen(false);
      setEditingStrategy(null);
      form.reset();
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
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Strategy & Rules
            </h1>
            <p className="text-muted-foreground">Create, import, and backtest your trading strategies</p>
          </div>
          {activeTab === 'library' && (
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" />
              New Strategy
            </Button>
          )}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube Import
            </TabsTrigger>
            <TabsTrigger value="backtest" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Backtest
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6 mt-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{strategies?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {strategies?.filter(s => s.is_active).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Spot Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {strategies?.filter(s => s.market_type === 'spot' || !s.market_type).length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Futures Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {strategies?.filter(s => s.market_type === 'futures').length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

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
                {strategies.map((strategy) => {
                  const performance = strategyPerformance.get(strategy.id);
              const qualityScore = performance?.aiQualityScore || 0;
              const scoreInfo = getQualityScoreLabel(qualityScore);
              
              return (
                <Card key={strategy.id} className={`border-l-4 ${colorClasses[strategy.color || 'blue']?.replace('bg-', 'border-l-')?.split(' ')[0] || 'border-l-blue-500'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorClasses[strategy.color || 'blue']?.split(' ')[0]}`} />
                        <CardTitle className="text-lg">{strategy.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* AI Quality Score Badge */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={`text-xs ${scoreInfo.colorClass}`}>
                                <Brain className="h-3 w-3 mr-1" />
                                {qualityScore > 0 ? `${qualityScore}%` : 'N/A'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm space-y-1">
                                <p className="font-medium">AI Quality Score: {scoreInfo.label}</p>
                                {performance && performance.totalTrades > 0 ? (
                                  <>
                                    <p>Win Rate: {(performance.winRate * 100).toFixed(1)}%</p>
                                    <p>Trades: {performance.totalTrades}</p>
                                    <p>Profit Factor: {performance.profitFactor.toFixed(2)}</p>
                                  </>
                                ) : (
                                  <p>No trade data available</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(strategy)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setActiveTab('backtest');
                            }}>
                              <Play className="h-4 w-4 mr-2" />
                              Run Backtest
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingStrategy(strategy)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {strategy.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Strategy metadata badges - now using actual data */}
                      <div className="flex flex-wrap gap-2">
                        {strategy.timeframe && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {strategy.timeframe}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {strategy.market_type || 'spot'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {strategy.min_confluences || 4} confluences
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          {strategy.min_rr || 1.5}:1 R:R
                        </Badge>
                      </div>

                      {/* Performance stats if available */}
                      {performance && performance.totalTrades > 0 && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {performance.wins}W / {performance.losses}L
                          </span>
                          <span>|</span>
                          <span className={performance.winRate >= 0.5 ? 'text-green-500' : 'text-red-500'}>
                            {(performance.winRate * 100).toFixed(0)}% WR
                          </span>
                        </div>
                      )}

                      {strategy.tags && strategy.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {strategy.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Created {format(new Date(strategy.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
                })}
              </div>
            )}
          </TabsContent>

          {/* YouTube Import Tab */}
          <TabsContent value="import" className="mt-6">
            <YouTubeStrategyImporter onStrategyImported={() => setActiveTab('library')} />
          </TabsContent>

          {/* Backtest Tab with Sub-tabs */}
          <TabsContent value="backtest" className="mt-6">
            <Tabs defaultValue="run" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="run" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">Run Backtest</span>
                  <span className="sm:hidden">Run</span>
                </TabsTrigger>
                <TabsTrigger value="compare" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Compare</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="run">
                <BacktestRunner />
              </TabsContent>
              
              <TabsContent value="compare">
                <BacktestComparison />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStrategy ? 'Edit Strategy' : 'Create Strategy'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="entry">
                    <ListChecks className="h-3 w-3 mr-1" />
                    Entry Rules
                  </TabsTrigger>
                  <TabsTrigger value="exit">
                    <LogOut className="h-3 w-3 mr-1" />
                    Exit Rules
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input {...form.register("name")} placeholder="e.g., Breakout Strategy" />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      {...form.register("description")} 
                      placeholder="Describe when and how you use this strategy..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Timeframe</Label>
                      <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEFRAME_OPTIONS.map(tf => (
                            <SelectItem key={tf.value} value={tf.value}>
                              {tf.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Market Type</Label>
                      <Select value={selectedMarketType} onValueChange={setSelectedMarketType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select market" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spot">Spot</SelectItem>
                          <SelectItem value="futures">Futures</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                  </div>

                  {/* Valid Pairs Multi-select with Searchable Combobox */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Valid Trading Pairs
                    </Label>
                    
                    {/* Selected pairs display */}
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-muted/30">
                      {selectedValidPairs.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No pairs selected</span>
                      ) : (
                        selectedValidPairs.map((pair) => (
                          <Badge key={pair} variant="secondary" className="gap-1">
                            {pair}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-destructive" 
                              onClick={() => setSelectedValidPairs(prev => prev.filter(p => p !== pair))}
                            />
                          </Badge>
                        ))
                      )}
                    </div>
                    
                    {/* Searchable Combobox to add pairs */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="text-muted-foreground">Add trading pair...</span>
                          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search pairs..." />
                          <CommandList>
                            <CommandEmpty>No pair found.</CommandEmpty>
                            <CommandGroup>
                              {availablePairs
                                .filter(pair => !selectedValidPairs.includes(pair))
                                .map((pair) => (
                                  <CommandItem
                                    key={pair}
                                    value={pair}
                                    onSelect={() => setSelectedValidPairs(prev => [...prev, pair])}
                                  >
                                    {pair}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    <p className="text-xs text-muted-foreground">
                      Search and add pairs valid for this strategy. Selected: {selectedValidPairs.length}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input 
                      {...form.register("tags")} 
                      placeholder="e.g., momentum, trend-following, scalping"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {strategyColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedColor(color.value)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            colorClasses[color.value]?.split(' ')[0]
                          } ${
                            selectedColor === color.value
                              ? 'ring-2 ring-offset-2 ring-primary'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="entry" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min. Confluences</Label>
                      <Input 
                        type="number"
                        {...form.register("min_confluences", { valueAsNumber: true })} 
                        min={1}
                        max={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum indicators needed before entry
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Min. Risk:Reward</Label>
                      <Input 
                        type="number"
                        {...form.register("min_rr", { valueAsNumber: true })} 
                        min={0.5}
                        max={10}
                        step={0.1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum R:R ratio for entries
                      </p>
                    </div>
                  </div>

                  <EntryRulesBuilder 
                    rules={entryRules}
                    onChange={setEntryRules}
                  />
                </TabsContent>

                <TabsContent value="exit" className="space-y-4 pt-4">
                  <ExitRulesBuilder 
                    rules={exitRules}
                    onChange={setExitRules}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createStrategy.isPending || updateStrategy.isPending}
                >
                  {createStrategy.isPending || updateStrategy.isPending
                    ? 'Saving...'
                    : editingStrategy
                    ? 'Update'
                    : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

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
