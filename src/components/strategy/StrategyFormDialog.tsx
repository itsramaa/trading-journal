/**
 * Strategy Form Dialog - Create/Edit strategy dialog
 * Enhanced with Position Sizing, Trade Management, and Futures fields
 */
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Target, ListChecks, LogOut, X, ChevronsUpDown, Clock, Layers, Settings2, AlertTriangle } from "lucide-react";
import { EntryRulesBuilder } from "@/components/strategy/EntryRulesBuilder";
import { ExitRulesBuilder } from "@/components/strategy/ExitRulesBuilder";
import { ExpectancyPreview } from "@/components/strategy/ExpectancyPreview";
import { 
  TIMEFRAME_OPTIONS, 
  COMMON_PAIRS, 
  DEFAULT_ENTRY_RULES, 
  DEFAULT_EXIT_RULES, 
  DEFAULT_TRADE_MANAGEMENT,
  type EntryRule, 
  type ExitRule,
  type TradingMethodology,
  type TradingStyle,
  type TradingSession,
  type DifficultyLevel,
  type PositionSizingModel,
  type MarginMode,
  type TradeManagement,
} from "@/types/strategy";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";
import { 
  STRATEGY_COLORS, 
  STRATEGY_COLOR_CLASSES, 
  STRATEGY_DEFAULTS, 
  STRATEGY_FORM_CONSTRAINTS,
  METHODOLOGY_OPTIONS,
  TRADING_STYLE_OPTIONS,
  SESSION_OPTIONS,
  DIFFICULTY_OPTIONS,
  POSITION_SIZING_MODELS,
  KELLY_FRACTION_CAP,
  KELLY_MIN_TRADES_WARNING,
  ATR_DEFAULTS,
} from "@/lib/constants/strategy-config";

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
    higherTimeframe: string;
    lowerTimeframe: string;
    marketType: string;
    methodology: TradingMethodology;
    tradingStyle: TradingStyle;
    sessionPreference: TradingSession[];
    difficultyLevel: DifficultyLevel | null;
    positionSizingModel: PositionSizingModel;
    positionSizingValue: number;
    tradeManagement: TradeManagement;
    defaultLeverage: number;
    marginMode: MarginMode;
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
  const [selectedHigherTimeframe, setSelectedHigherTimeframe] = useState<string>('');
  const [selectedLowerTimeframe, setSelectedLowerTimeframe] = useState<string>('');
  const [selectedMarketType, setSelectedMarketType] = useState<string>(STRATEGY_DEFAULTS.MARKET_TYPE);
  const [selectedValidPairs, setSelectedValidPairs] = useState<string[]>([...STRATEGY_DEFAULTS.VALID_PAIRS]);
  const [entryRules, setEntryRules] = useState<EntryRule[]>([]);
  const [exitRules, setExitRules] = useState<ExitRule[]>([]);
  // Professional trading fields
  const [selectedMethodology, setSelectedMethodology] = useState<TradingMethodology>(STRATEGY_DEFAULTS.METHODOLOGY);
  const [selectedTradingStyle, setSelectedTradingStyle] = useState<TradingStyle>(STRATEGY_DEFAULTS.TRADING_STYLE);
  const [selectedSessions, setSelectedSessions] = useState<TradingSession[]>([...STRATEGY_DEFAULTS.SESSION_PREFERENCE]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);
  // Position sizing
  const [positionSizingModel, setPositionSizingModel] = useState<PositionSizingModel>('fixed_percent');
  const [positionSizingValue, setPositionSizingValue] = useState<number>(STRATEGY_DEFAULTS.POSITION_SIZING_VALUE);
  // Trade management
  const [tradeManagement, setTradeManagement] = useState<TradeManagement>({ ...DEFAULT_TRADE_MANAGEMENT });
  // Futures-specific
  const [defaultLeverage, setDefaultLeverage] = useState<number>(STRATEGY_DEFAULTS.DEFAULT_LEVERAGE);
  const [marginMode, setMarginMode] = useState<MarginMode>('cross');

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

  // Computed effective R:R from exit rules — only when units are consistent
  const effectiveRR = useMemo(() => {
    const tp = exitRules.find(r => r.type === 'take_profit');
    const sl = exitRules.find(r => r.type === 'stop_loss');
    if (!tp || !sl || sl.value <= 0) return null;
    // Only compute if both use the same unit
    if (tp.unit !== sl.unit) return null;
    return tp.value / sl.value;
  }, [exitRules]);

  // Detect unit mismatch between TP and SL
  const hasUnitMismatch = useMemo(() => {
    const tp = exitRules.find(r => r.type === 'take_profit');
    const sl = exitRules.find(r => r.type === 'stop_loss');
    if (!tp || !sl) return false;
    return tp.unit !== sl.unit;
  }, [exitRules]);

  // Structural validation warnings
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    const minConf = form.getValues('min_confluences');
    const minRR = form.getValues('min_rr');
    
    if (minConf > entryRules.length) {
      warnings.push(`Min confluences (${minConf}) exceeds total entry rules (${entryRules.length}).`);
    }
    
    const mandatoryCount = entryRules.filter(r => r.is_mandatory).length;
    if (mandatoryCount >= minConf && entryRules.length === mandatoryCount && entryRules.length > 0) {
      warnings.push('All rules are mandatory — min confluences has no effect.');
    }
    
    if (exitRules.length === 0) {
      warnings.push('No exit rules defined. Strategy is incomplete without TP/SL.');
    }
    
    if (effectiveRR !== null && effectiveRR < minRR) {
      warnings.push(`Effective R:R (${effectiveRR.toFixed(1)}) is below minimum (${minRR}).`);
    }
    
    if (positionSizingModel === 'kelly') {
      warnings.push(`Kelly sizing requires verified win-rate data from ${KELLY_MIN_TRADES_WARNING}+ trades. Using fractional Kelly (${KELLY_FRACTION_CAP}x) until validated.`);
    }

    if (selectedMarketType === 'futures' && defaultLeverage <= 1) {
      warnings.push('Futures strategy with 1x leverage — consider setting appropriate leverage.');
    }

    // TP/SL unit mismatch
    if (hasUnitMismatch) {
      warnings.push('TP and SL use different units — Effective R:R cannot be calculated. Use consistent units for accurate validation.');
    }
    
    return warnings;
  }, [entryRules, exitRules, effectiveRR, hasUnitMismatch, positionSizingModel, selectedMarketType, defaultLeverage, form]);

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
        setSelectedHigherTimeframe(editingStrategy.higher_timeframe || '');
        setSelectedLowerTimeframe(editingStrategy.lower_timeframe || '');
        setSelectedMarketType(editingStrategy.market_type || STRATEGY_DEFAULTS.MARKET_TYPE);
        setSelectedValidPairs(editingStrategy.valid_pairs || [...STRATEGY_DEFAULTS.VALID_PAIRS]);
        setEntryRules(editingStrategy.entry_rules || []);
        setExitRules(editingStrategy.exit_rules || []);
        setSelectedMethodology(editingStrategy.methodology || STRATEGY_DEFAULTS.METHODOLOGY);
        setSelectedTradingStyle(editingStrategy.trading_style || STRATEGY_DEFAULTS.TRADING_STYLE);
        setSelectedSessions(editingStrategy.session_preference || [...STRATEGY_DEFAULTS.SESSION_PREFERENCE]);
        setSelectedDifficulty(editingStrategy.difficulty_level || null);
        setPositionSizingModel(editingStrategy.position_sizing_model || 'fixed_percent');
        setPositionSizingValue(editingStrategy.position_sizing_value ?? STRATEGY_DEFAULTS.POSITION_SIZING_VALUE);
        setTradeManagement(editingStrategy.trade_management || { ...DEFAULT_TRADE_MANAGEMENT });
        setDefaultLeverage(editingStrategy.default_leverage ?? STRATEGY_DEFAULTS.DEFAULT_LEVERAGE);
        setMarginMode(editingStrategy.margin_mode || 'cross');
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
        setSelectedHigherTimeframe('');
        setSelectedLowerTimeframe('');
        setSelectedMarketType(STRATEGY_DEFAULTS.MARKET_TYPE);
        setSelectedValidPairs([...STRATEGY_DEFAULTS.VALID_PAIRS]);
        setEntryRules(DEFAULT_ENTRY_RULES.slice(0, STRATEGY_DEFAULTS.DEFAULT_ENTRY_RULES_COUNT));
        setExitRules(DEFAULT_EXIT_RULES);
        setSelectedMethodology(STRATEGY_DEFAULTS.METHODOLOGY);
        setSelectedTradingStyle(STRATEGY_DEFAULTS.TRADING_STYLE);
        setSelectedSessions([...STRATEGY_DEFAULTS.SESSION_PREFERENCE]);
        setSelectedDifficulty(null);
        setPositionSizingModel('fixed_percent');
        setPositionSizingValue(STRATEGY_DEFAULTS.POSITION_SIZING_VALUE);
        setTradeManagement({ ...DEFAULT_TRADE_MANAGEMENT });
        setDefaultLeverage(STRATEGY_DEFAULTS.DEFAULT_LEVERAGE);
        setMarginMode('cross');
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
      higherTimeframe: selectedHigherTimeframe,
      lowerTimeframe: selectedLowerTimeframe,
      marketType: selectedMarketType,
      methodology: selectedMethodology,
      tradingStyle: selectedTradingStyle,
      sessionPreference: selectedSessions,
      difficultyLevel: selectedDifficulty,
      positionSizingModel: positionSizingModel,
      positionSizingValue: positionSizingValue,
      tradeManagement: tradeManagement,
      defaultLeverage: defaultLeverage,
      marginMode: marginMode,
    });
  };

  const toggleSession = (session: TradingSession) => {
    if (session === 'all') {
      setSelectedSessions(['all']);
    } else {
      const withoutAll = selectedSessions.filter(s => s !== 'all');
      if (withoutAll.includes(session)) {
        const updated = withoutAll.filter(s => s !== session);
        setSelectedSessions(updated.length === 0 ? ['all'] : updated);
      } else {
        setSelectedSessions([...withoutAll, session]);
      }
    }
  };

  const pairsToShow = availablePairs.length > 0 ? availablePairs : COMMON_PAIRS;

  const updateTradeManagement = (updates: Partial<TradeManagement>) => {
    setTradeManagement(prev => ({ ...prev, ...updates }));
  };

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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="method">
                <Layers className="h-3 w-3 mr-1" aria-hidden="true" />
                Method
              </TabsTrigger>
              <TabsTrigger value="entry">
                <ListChecks className="h-3 w-3 mr-1" aria-hidden="true" />
                Entry
              </TabsTrigger>
              <TabsTrigger value="exit">
                <LogOut className="h-3 w-3 mr-1" aria-hidden="true" />
                Exit
              </TabsTrigger>
              <TabsTrigger value="manage">
                <Settings2 className="h-3 w-3 mr-1" aria-hidden="true" />
                Manage
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
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

            {/* Methodology & Timeframes Tab */}
            <TabsContent value="method" className="space-y-4 pt-4">
              {/* Trading Methodology */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  Trading Methodology
                </Label>
                <RadioGroup 
                  value={selectedMethodology} 
                  onValueChange={(v) => setSelectedMethodology(v as TradingMethodology)}
                  className="grid grid-cols-2 gap-2"
                >
                  {METHODOLOGY_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`method-${opt.value}`} />
                      <Label htmlFor={`method-${opt.value}`} className="text-sm font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {METHODOLOGY_OPTIONS.find(m => m.value === selectedMethodology)?.description}
                </p>
              </div>

              {/* Trading Style */}
              <div className="space-y-2">
                <Label>Trading Style</Label>
                <Select value={selectedTradingStyle} onValueChange={(v) => setSelectedTradingStyle(v as TradingStyle)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADING_STYLE_OPTIONS.map(style => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label} ({style.typicalTimeframes})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Multi-Timeframe Analysis */}
              <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Multi-Timeframe Analysis
                </Label>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Higher TF (Bias)</Label>
                    <Select value={selectedHigherTimeframe || "none"} onValueChange={(v) => setSelectedHigherTimeframe(v === "none" ? "" : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <SelectItem key={tf.value} value={tf.value}>
                            {tf.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Primary TF *</Label>
                    <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
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

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Lower TF (Entry)</Label>
                    <Select value={selectedLowerTimeframe || "none"} onValueChange={(v) => setSelectedLowerTimeframe(v === "none" ? "" : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <SelectItem key={tf.value} value={tf.value}>
                            {tf.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Session Preference */}
              <div className="space-y-2">
                <Label>Preferred Sessions</Label>
                <div className="flex flex-wrap gap-2">
                  {SESSION_OPTIONS.map((session) => (
                    <Badge
                      key={session.value}
                      variant={selectedSessions.includes(session.value) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleSession(session.value)}
                    >
                      {session.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedSessions.includes('all') 
                    ? 'Strategy works on all trading sessions' 
                    : `Optimized for: ${selectedSessions.map(s => SESSION_OPTIONS.find(o => o.value === s)?.label).join(', ')}`
                  }
                </p>
              </div>

              {/* Difficulty Level */}
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <RadioGroup 
                  value={selectedDifficulty || ''} 
                  onValueChange={(v) => setSelectedDifficulty(v as DifficultyLevel || null)}
                  className="flex gap-4"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`diff-${opt.value}`} />
                      <Label htmlFor={`diff-${opt.value}`} className="text-sm font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Market Type */}
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

              {/* Futures-specific fields */}
              {selectedMarketType === 'futures' && (
                <div className="space-y-4 p-3 border rounded-lg bg-muted/20">
                  <Label className="text-sm font-medium">Futures Settings</Label>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Default Leverage</Label>
                      <span className="text-sm font-medium">{defaultLeverage}x</span>
                    </div>
                    <Slider
                      value={[defaultLeverage]}
                      onValueChange={([v]) => setDefaultLeverage(v)}
                      min={STRATEGY_FORM_CONSTRAINTS.LEVERAGE.MIN}
                      max={STRATEGY_FORM_CONSTRAINTS.LEVERAGE.MAX}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      {defaultLeverage <= 5 ? 'Conservative' : defaultLeverage <= 20 ? 'Moderate' : 'Aggressive'} leverage
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Margin Mode</Label>
                    <Select value={marginMode} onValueChange={(v) => setMarginMode(v as MarginMode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cross">Cross Margin</SelectItem>
                        <SelectItem value="isolated">Isolated Margin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Entry Rules Tab */}
            <TabsContent value="entry" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Min. Confluences</Label>
                <Input 
                  type="number"
                  {...form.register("min_confluences", { valueAsNumber: true })} 
                  min={STRATEGY_FORM_CONSTRAINTS.MIN_CONFLUENCES.MIN}
                  max={STRATEGY_FORM_CONSTRAINTS.MIN_CONFLUENCES.MAX}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum indicators needed before entry (mandatory + optional combined)
                </p>
              </div>

              <EntryRulesBuilder 
                rules={entryRules}
                onChange={setEntryRules}
              />
            </TabsContent>

            {/* Exit Rules Tab */}
            <TabsContent value="exit" className="space-y-4 pt-4">
              {/* Min R:R validation gate */}
              <div className="space-y-2">
                <Label>Min. Risk:Reward (Validation Gate)</Label>
                <Input 
                  type="number"
                  {...form.register("min_rr", { valueAsNumber: true })} 
                  min={STRATEGY_FORM_CONSTRAINTS.MIN_RR.MIN}
                  max={STRATEGY_FORM_CONSTRAINTS.MIN_RR.MAX}
                  step={STRATEGY_FORM_CONSTRAINTS.MIN_RR.STEP}
                />
                <p className="text-xs text-muted-foreground">
                  Trades must meet this minimum R:R ratio before entry is allowed
                </p>
                {effectiveRR !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Effective R:R from exit rules:</span>
                    <Badge variant={effectiveRR >= (form.getValues('min_rr') || STRATEGY_DEFAULTS.MIN_RR) ? "default" : "destructive"}>
                      {effectiveRR.toFixed(1)}:1
                    </Badge>
                    {effectiveRR < (form.getValues('min_rr') || STRATEGY_DEFAULTS.MIN_RR) && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Below min R:R
                      </span>
                    )}
                  </div>
                )}
              </div>

              <ExitRulesBuilder 
                rules={exitRules}
                onChange={setExitRules}
              />

              {/* Expectancy Preview */}
              <ExpectancyPreview effectiveRR={effectiveRR} />

              {/* Position Sizing */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <Label className="text-sm font-medium">Position Sizing Model</Label>
                  <Select value={positionSizingModel} onValueChange={(v) => {
                    setPositionSizingModel(v as PositionSizingModel);
                    const model = POSITION_SIZING_MODELS.find(m => m.value === v);
                    if (model) setPositionSizingValue(model.defaultValue);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_SIZING_MODELS.map(m => (
                        <SelectItem key={m.value} value={m.value} disabled={m.value === 'kelly'}>
                          {m.label}{m.value === 'kelly' ? ' (requires history)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {POSITION_SIZING_MODELS.find(m => m.value === positionSizingModel)?.description}
                  </p>

                  {/* Kelly warning — disabled without trade history */}
                  {positionSizingModel === 'kelly' && (
                    <div className="p-2 rounded-md bg-[hsl(var(--chart-4))]/10 border border-[hsl(var(--chart-4))]/30">
                      <p className="text-xs text-[hsl(var(--chart-4))] flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Kelly is disabled until this strategy has {KELLY_MIN_TRADES_WARNING}+ verified trades. Switch to Fixed % Risk until then.
                      </p>
                    </div>
                  )}

                  {positionSizingModel !== 'kelly' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={positionSizingValue}
                        onChange={(e) => setPositionSizingValue(parseFloat(e.target.value) || 0)}
                        className="w-24"
                        step={0.1}
                        min={0}
                      />
                      <span className="text-sm text-muted-foreground">
                        {POSITION_SIZING_MODELS.find(m => m.value === positionSizingModel)?.unit}
                      </span>
                    </div>
                  )}

                  {/* ATR Parameters */}
                  {positionSizingModel === 'atr_based' && (
                    <div className="space-y-2 p-2 border rounded-md bg-muted/20">
                      <Label className="text-xs font-medium">ATR Parameters</Label>
                      <p className="text-[10px] text-muted-foreground">
                        Position Size = Risk Amount / (ATR × Multiplier). These parameters will be consumed by the backtest engine.
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Period</Label>
                          <Input
                            type="number"
                            value={tradeManagement.atr_period ?? ATR_DEFAULTS.PERIOD.DEFAULT}
                            onChange={(e) => updateTradeManagement({ atr_period: parseInt(e.target.value) || ATR_DEFAULTS.PERIOD.DEFAULT })}
                            className="w-20 h-8"
                            min={ATR_DEFAULTS.PERIOD.MIN}
                            max={ATR_DEFAULTS.PERIOD.MAX}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Multiplier</Label>
                          <Input
                            type="number"
                            value={tradeManagement.atr_multiplier ?? ATR_DEFAULTS.MULTIPLIER.DEFAULT}
                            onChange={(e) => updateTradeManagement({ atr_multiplier: parseFloat(e.target.value) || ATR_DEFAULTS.MULTIPLIER.DEFAULT })}
                            className="w-20 h-8"
                            step={ATR_DEFAULTS.MULTIPLIER.STEP}
                            min={ATR_DEFAULTS.MULTIPLIER.MIN}
                            max={ATR_DEFAULTS.MULTIPLIER.MAX}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trade Management Tab */}
            <TabsContent value="manage" className="space-y-4 pt-4">
              {/* Partial Take Profit */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Partial Take Profit</Label>
                    <Switch
                      checked={tradeManagement.partial_tp_enabled}
                      onCheckedChange={(checked) => updateTradeManagement({ partial_tp_enabled: checked })}
                    />
                  </div>
                  {tradeManagement.partial_tp_enabled && (
                    <div className="space-y-2">
                      {tradeManagement.partial_tp_levels.map((level, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Close</span>
                          <Input
                            type="number"
                            value={level.percent}
                            onChange={(e) => {
                              const updated = [...tradeManagement.partial_tp_levels];
                              updated[idx] = { ...updated[idx], percent: parseFloat(e.target.value) || 0 };
                              updateTradeManagement({ partial_tp_levels: updated });
                            }}
                            className="w-16 h-8"
                            min={0}
                            max={100}
                          />
                          <span className="text-xs text-muted-foreground">% at</span>
                          <Input
                            type="number"
                            value={level.at_rr}
                            onChange={(e) => {
                              const updated = [...tradeManagement.partial_tp_levels];
                              updated[idx] = { ...updated[idx], at_rr: parseFloat(e.target.value) || 0 };
                              updateTradeManagement({ partial_tp_levels: updated });
                            }}
                            className="w-16 h-8"
                            step={0.5}
                            min={0}
                          />
                          <span className="text-xs text-muted-foreground">R</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const updated = tradeManagement.partial_tp_levels.filter((_, i) => i !== idx);
                              updateTradeManagement({ partial_tp_levels: updated });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateTradeManagement({ 
                          partial_tp_levels: [...tradeManagement.partial_tp_levels, { percent: 50, at_rr: 1 }]
                        })}
                      >
                        + Add Level
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Move SL to BE */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Move SL to Breakeven</Label>
                    <Switch
                      checked={tradeManagement.move_sl_to_be}
                      onCheckedChange={(checked) => updateTradeManagement({ move_sl_to_be: checked })}
                    />
                  </div>
                  {tradeManagement.move_sl_to_be && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">When price reaches</span>
                      <Input
                        type="number"
                        value={tradeManagement.move_sl_to_be_at_rr}
                        onChange={(e) => updateTradeManagement({ move_sl_to_be_at_rr: parseFloat(e.target.value) || 1 })}
                        className="w-16 h-8"
                        step={0.5}
                        min={0.5}
                      />
                      <span className="text-sm text-muted-foreground">R in profit</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Kill Switch Rules */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <Label className="text-sm font-medium">Kill Switch / Limits</Label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground min-w-[140px]">Max trades/day</Label>
                      <Input
                        type="number"
                        value={tradeManagement.max_trades_per_day ?? ''}
                        onChange={(e) => updateTradeManagement({ max_trades_per_day: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-20 h-8"
                        placeholder="—"
                        min={1}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground min-w-[140px]">Max daily loss %</Label>
                      <Input
                        type="number"
                        value={tradeManagement.max_daily_loss_percent ?? ''}
                        onChange={(e) => updateTradeManagement({ max_daily_loss_percent: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-20 h-8"
                        placeholder="—"
                        step={0.5}
                        min={0}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm text-muted-foreground min-w-[140px]">Max consec. losses</Label>
                      <Input
                        type="number"
                        value={tradeManagement.max_consecutive_losses ?? ''}
                        onChange={(e) => updateTradeManagement({ max_consecutive_losses: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-20 h-8"
                        placeholder="—"
                        min={1}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to disable. Kill switch stops trading when limit is reached.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="space-y-1 p-3 rounded-lg bg-[hsl(var(--chart-4))]/10 border border-[hsl(var(--chart-4))]/30">
              <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--chart-4))]">
                <AlertTriangle className="h-4 w-4" />
                {validationWarnings.length} validation warning{validationWarnings.length > 1 ? 's' : ''}
              </div>
              {validationWarnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground ml-6">{w}</p>
              ))}
            </div>
          )}

          {/* Form-level error feedback */}
          {Object.keys(form.formState.errors).length > 0 && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              Please fix the following errors:
              <ul className="list-disc list-inside mt-1">
                {Object.entries(form.formState.errors).map(([key, error]) => (
                  <li key={key}>{error?.message || `Invalid ${key}`}</li>
                ))}
              </ul>
            </div>
          )}

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
