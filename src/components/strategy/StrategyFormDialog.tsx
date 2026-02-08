/**
 * Strategy Form Dialog - Create/Edit strategy dialog
 */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Target, ListChecks, LogOut, X, ChevronsUpDown } from "lucide-react";
import { EntryRulesBuilder } from "@/components/strategy/EntryRulesBuilder";
import { ExitRulesBuilder } from "@/components/strategy/ExitRulesBuilder";
import { TIMEFRAME_OPTIONS, COMMON_PAIRS, DEFAULT_ENTRY_RULES, DEFAULT_EXIT_RULES, type EntryRule, type ExitRule } from "@/types/strategy";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";
import { STRATEGY_COLORS, STRATEGY_COLOR_CLASSES, STRATEGY_DEFAULTS, STRATEGY_FORM_CONSTRAINTS } from "@/lib/constants/strategy-config";

const strategyFormSchema = z.object({
  name: z.string()
    .min(1, "Strategy name is required. Give your strategy a memorable name.")
    .max(50, "Strategy name is too long. Please use 50 characters or less."),
  description: z.string().max(500, "Description is too long.").optional(),
  tags: z.string().optional(),
  color: z.string().default(STRATEGY_DEFAULTS.COLOR),
  timeframe: z.string().optional(),
  market_type: z.string().default(STRATEGY_DEFAULTS.MARKET_TYPE),
  min_confluences: z.number()
    .min(STRATEGY_FORM_CONSTRAINTS.MIN_CONFLUENCES.MIN)
    .max(STRATEGY_FORM_CONSTRAINTS.MIN_CONFLUENCES.MAX)
    .default(STRATEGY_DEFAULTS.MIN_CONFLUENCES),
  min_rr: z.number()
    .min(STRATEGY_FORM_CONSTRAINTS.MIN_RR.MIN)
    .max(STRATEGY_FORM_CONSTRAINTS.MIN_RR.MAX)
    .default(STRATEGY_DEFAULTS.MIN_RR),
});

type StrategyFormValues = z.infer<typeof strategyFormSchema>;

interface StrategyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStrategy: TradingStrategy | null;
  availablePairs: string[];
  onSubmit: (values: StrategyFormValues & {
    validPairs: string[];
    entryRules: EntryRule[];
    exitRules: ExitRule[];
    color: string;
    timeframe: string;
    marketType: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function StrategyFormDialog({
  open,
  onOpenChange,
  editingStrategy,
  availablePairs,
  onSubmit,
  isPending,
}: StrategyFormDialogProps) {
  const [selectedColor, setSelectedColor] = useState<string>(STRATEGY_DEFAULTS.COLOR);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('');
  const [selectedMarketType, setSelectedMarketType] = useState<string>(STRATEGY_DEFAULTS.MARKET_TYPE);
  const [selectedValidPairs, setSelectedValidPairs] = useState<string[]>([...STRATEGY_DEFAULTS.VALID_PAIRS]);
  const [entryRules, setEntryRules] = useState<EntryRule[]>([]);
  const [exitRules, setExitRules] = useState<ExitRule[]>([]);

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: '',
      color: STRATEGY_DEFAULTS.COLOR,
      timeframe: '',
      market_type: STRATEGY_DEFAULTS.MARKET_TYPE,
      min_confluences: STRATEGY_DEFAULTS.MIN_CONFLUENCES,
      min_rr: STRATEGY_DEFAULTS.MIN_RR,
    },
  });

  // Reset form when dialog opens/closes or editing strategy changes
  useEffect(() => {
    if (open) {
      if (editingStrategy) {
        form.reset({
          name: editingStrategy.name,
          description: editingStrategy.description || '',
          tags: editingStrategy.tags?.join(', ') || '',
          color: editingStrategy.color || STRATEGY_DEFAULTS.COLOR,
          min_confluences: editingStrategy.min_confluences || STRATEGY_DEFAULTS.MIN_CONFLUENCES,
          min_rr: editingStrategy.min_rr || STRATEGY_DEFAULTS.MIN_RR,
        });
        setSelectedColor(editingStrategy.color || STRATEGY_DEFAULTS.COLOR);
        setSelectedTimeframe(editingStrategy.timeframe || '');
        setSelectedMarketType(editingStrategy.market_type || STRATEGY_DEFAULTS.MARKET_TYPE);
        setSelectedValidPairs(editingStrategy.valid_pairs || [...STRATEGY_DEFAULTS.VALID_PAIRS]);
        setEntryRules(editingStrategy.entry_rules || []);
        setExitRules(editingStrategy.exit_rules || []);
      } else {
        form.reset({
          name: '',
          description: '',
          tags: '',
          color: STRATEGY_DEFAULTS.COLOR,
          timeframe: '',
          market_type: STRATEGY_DEFAULTS.MARKET_TYPE,
          min_confluences: STRATEGY_DEFAULTS.MIN_CONFLUENCES,
          min_rr: STRATEGY_DEFAULTS.MIN_RR,
        });
        setSelectedColor(STRATEGY_DEFAULTS.COLOR);
        setSelectedTimeframe('');
        setSelectedMarketType(STRATEGY_DEFAULTS.MARKET_TYPE);
        setSelectedValidPairs([...STRATEGY_DEFAULTS.VALID_PAIRS]);
        setEntryRules(DEFAULT_ENTRY_RULES.slice(0, STRATEGY_DEFAULTS.DEFAULT_ENTRY_RULES_COUNT));
        setExitRules(DEFAULT_EXIT_RULES);
      }
    }
  }, [open, editingStrategy, form]);

  const handleSubmit = async (values: StrategyFormValues) => {
    await onSubmit({
      ...values,
      validPairs: selectedValidPairs,
      entryRules,
      exitRules,
      color: selectedColor,
      timeframe: selectedTimeframe,
      marketType: selectedMarketType,
    });
  };

  const pairsToShow = availablePairs.length > 0 ? availablePairs : COMMON_PAIRS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <ListChecks className="h-3 w-3 mr-1" aria-hidden="true" />
                Entry Rules
              </TabsTrigger>
              <TabsTrigger value="exit">
                <LogOut className="h-3 w-3 mr-1" aria-hidden="true" />
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

              {/* Valid Pairs Multi-select */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" aria-hidden="true" />
                  Valid Trading Pairs
                </Label>
                
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
                          aria-label={`Remove ${pair}`}
                        />
                      </Badge>
                    ))
                  )}
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="text-muted-foreground">Add trading pair...</span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search pairs..." />
                      <CommandList>
                        <CommandEmpty>No pair found.</CommandEmpty>
                        <CommandGroup>
                          {pairsToShow
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
                  Selected: {selectedValidPairs.length}
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
                  {STRATEGY_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      aria-label={`Select ${color.name} color`}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        STRATEGY_COLOR_CLASSES[color.value]
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
                    min={STRATEGY_FORM_CONSTRAINTS.MIN_CONFLUENCES.MIN}
                    max={STRATEGY_FORM_CONSTRAINTS.MIN_CONFLUENCES.MAX}
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
                    min={STRATEGY_FORM_CONSTRAINTS.MIN_RR.MIN}
                    max={STRATEGY_FORM_CONSTRAINTS.MIN_RR.MAX}
                    step={STRATEGY_FORM_CONSTRAINTS.MIN_RR.STEP}
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending}
            >
              {isPending ? 'Saving...' : editingStrategy ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
