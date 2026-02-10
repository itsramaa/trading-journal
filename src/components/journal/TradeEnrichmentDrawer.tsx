/**
 * TradeEnrichmentDrawer - Side panel for adding journal data to any trade
 * Supports strategies, screenshots, notes, emotional state, tags, AI Analysis
 * Refactored to use useTradeEnrichment hook
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScreenshotUploader } from "./ScreenshotUploader";
import { TradeTimeframeSection } from "./TradeTimeframeSection";
import { TradeRatingSection } from "./TradeRatingSection";
import { TradeReviewSection, type RuleCompliance } from "./TradeReviewSection";
import { 
  Lightbulb, 
  Save, 
  X, 
  TrendingUp, 
  TrendingDown,
  Wifi,
  FileText,
  Brain,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Lock,
  Target,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useTradeEnrichment } from "@/hooks/use-trade-enrichment";
import { useTradeAIAnalysis, AITradeAnalysis } from "@/hooks/use-trade-ai-analysis";
import { EMOTIONAL_STATES } from "@/types/trade-wizard";
import type { UnifiedPosition } from "./AllPositionsTable";
import { cn } from "@/lib/utils";

interface TradeEnrichmentDrawerProps {
  position: UnifiedPosition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

interface Screenshot {
  url: string;
  path: string;
}

// Legacy chart timeframe kept for backward compat display only
const CHART_TIMEFRAMES = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
];

// M-02: Post-Mortem Structured Display
function PostMortemSection({ analysis }: { analysis: { timestamp?: string; ai_review?: string; what_worked?: string[]; what_to_improve?: string[]; pattern_identified?: string | null; follow_up_actions?: string[]; entry_timing?: string; exit_efficiency?: string; sl_placement?: string; strategy_adherence?: string } }) {
  if (!analysis) return null;
  
  const sections = [
    { key: 'entry_timing', label: 'Entry Timing', icon: Target, value: analysis.entry_timing || analysis.ai_review },
    { key: 'exit_efficiency', label: 'Exit Efficiency', icon: TrendingUp, value: analysis.exit_efficiency },
    { key: 'sl_placement', label: 'SL Placement', icon: ShieldCheck, value: analysis.sl_placement },
    { key: 'strategy_adherence', label: 'Strategy Adherence', icon: Timer, value: analysis.strategy_adherence },
  ].filter(s => s.value);

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-chart-4" />
        Post-Trade Analysis
      </Label>
      
      {sections.length > 0 && (
        <div className="grid gap-2">
          {sections.map(({ key, label, icon: Icon, value }) => (
            <div key={key} className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p className="font-medium flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </p>
              <p className="text-muted-foreground text-xs">{value}</p>
            </div>
          ))}
        </div>
      )}
      
      {analysis.what_worked && analysis.what_worked.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-profit flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> What Worked
          </p>
          <ul className="space-y-0.5 ml-5">
            {analysis.what_worked.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">{item}</li>
            ))}
          </ul>
        </div>
      )}
      
      {analysis.what_to_improve && analysis.what_to_improve.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-loss flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> To Improve
          </p>
          <ul className="space-y-0.5 ml-5">
            {analysis.what_to_improve.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.follow_up_actions && analysis.follow_up_actions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium flex items-center gap-1">
            <Lightbulb className="h-3 w-3 text-chart-4" /> Follow-up Actions
          </p>
          <ul className="space-y-0.5 ml-5">
            {analysis.follow_up_actions.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// AI Analysis Display Component
function AIAnalysisDisplay({ analysis }: { analysis: AITradeAnalysis }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Overall Assessment */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="font-medium text-primary mb-1">Overall Assessment</p>
        <p className="text-muted-foreground">{analysis.overallAssessment}</p>
      </div>

      {/* Win Factors */}
      {analysis.winFactors.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium flex items-center gap-2 text-profit">
            <CheckCircle className="h-4 w-4" />
            Win Factors
          </p>
          <ul className="space-y-1 ml-6">
            {analysis.winFactors.map((factor, i) => (
              <li key={i} className="text-muted-foreground list-disc">{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Loss Factors */}
      {analysis.lossFactors.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium flex items-center gap-2 text-loss">
            <XCircle className="h-4 w-4" />
            Loss Factors
          </p>
          <ul className="space-y-1 ml-6">
            {analysis.lossFactors.map((factor, i) => (
              <li key={i} className="text-muted-foreground list-disc">{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Lessons */}
      {analysis.lessons.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-chart-4" />
            Lessons Learned
          </p>
          <ul className="space-y-1 ml-6">
            {analysis.lessons.map((lesson, i) => (
              <li key={i} className="text-muted-foreground list-disc">{lesson}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {analysis.improvements.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Improvements
          </p>
          <ul className="space-y-1 ml-6">
            {analysis.improvements.map((improvement, i) => (
              <li key={i} className="text-muted-foreground list-disc">{improvement}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pattern Update */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <p className="font-medium mb-2 flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Pattern Recognition
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Est. Win Rate:</span>
            <span className="ml-1 font-medium">{analysis.patternUpdate.newWinRate}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Confidence:</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                analysis.patternUpdate.confidenceChange === "increase" && "border-profit text-profit",
                analysis.patternUpdate.confidenceChange === "decrease" && "border-loss text-loss",
                analysis.patternUpdate.confidenceChange === "maintain" && "border-muted-foreground"
              )}
            >
              {analysis.patternUpdate.confidenceChange === "increase" && "↑"}
              {analysis.patternUpdate.confidenceChange === "decrease" && "↓"}
              {analysis.patternUpdate.confidenceChange === "maintain" && "→"}
              {" "}{analysis.patternUpdate.confidenceChange}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">{analysis.patternUpdate.recommendation}</p>
      </div>
    </div>
  );
}

export function TradeEnrichmentDrawer({
  position,
  open,
  onOpenChange,
  onSaved,
}: TradeEnrichmentDrawerProps) {
  const { data: strategies = [] } = useTradingStrategies();
  const { isSaving, loadLinkedStrategies, saveEnrichment } = useTradeEnrichment();
  const { analysis, isAnalyzing, requestAnalysis, clearAnalysis } = useTradeAIAnalysis();
  
  // Form state
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [notes, setNotes] = useState("");
  const [emotionalState, setEmotionalState] = useState<string>("");
  const [chartTimeframe, setChartTimeframe] = useState<string>("");
  const [customTags, setCustomTags] = useState<string>("");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [biasTimeframe, setBiasTimeframe] = useState<string>("");
  const [executionTimeframe, setExecutionTimeframe] = useState<string>("");
  const [precisionTimeframe, setPrecisionTimeframe] = useState<string>("");
  const [tradeRating, setTradeRating] = useState<string>("");
  const [lessonLearned, setLessonLearned] = useState<string>("");
  const [ruleCompliance, setRuleCompliance] = useState<RuleCompliance>({});

  // Load existing data when position changes
  useEffect(() => {
    const loadData = async () => {
      if (position && position.source === "paper") {
        const trade = position.originalData as TradeEntry;
        setNotes(trade.notes || "");
        setEmotionalState(trade.emotional_state || "");
        setScreenshots((trade as any).screenshots || []);
        setChartTimeframe((trade as any).chart_timeframe || "");
        setCustomTags(trade.tags?.join(", ") || "");
        setBiasTimeframe((trade as any).bias_timeframe || "");
        setExecutionTimeframe((trade as any).execution_timeframe || "");
        setPrecisionTimeframe((trade as any).precision_timeframe || "");
        setTradeRating((trade as any).trade_rating || "");
        setLessonLearned((trade as any).lesson_learned || "");
        setRuleCompliance((trade as any).rule_compliance || {});
        
        // Load linked strategies using hook
        const strategyIds = await loadLinkedStrategies(trade.id);
        setSelectedStrategies(strategyIds);
      } else {
        // Reset for Binance positions (no existing local data)
        setNotes("");
        setEmotionalState("");
        setScreenshots([]);
        setChartTimeframe("");
        setCustomTags("");
        setBiasTimeframe("");
        setExecutionTimeframe("");
        setPrecisionTimeframe("");
        setTradeRating("");
        setLessonLearned("");
        setRuleCompliance({});
        setSelectedStrategies([]);
      }
    };
    
    if (open && position) {
      loadData();
    }
  }, [position, open, loadLinkedStrategies]);

  const toggleStrategy = (strategyId: string) => {
    setSelectedStrategies((prev) =>
      prev.includes(strategyId)
        ? prev.filter((id) => id !== strategyId)
        : [...prev, strategyId]
    );
  };

  const handleSave = async () => {
    if (!position) return;
    if (!executionTimeframe) {
      toast.error("Execution timeframe is required");
      return;
    }
    try {
      await saveEnrichment(
        position,
        {
          notes,
          emotionalState,
          chartTimeframe,
          customTags,
          screenshots,
          selectedStrategies,
          biasTimeframe,
          executionTimeframe,
          precisionTimeframe,
          tradeRating,
          lessonLearned,
          ruleCompliance,
        },
        () => {
          onSaved?.();
          onOpenChange(false);
        }
      );
    } catch (error) {
      // Error handled in hook
    }
  };

  if (!position) return null;

  const isPaper = position.source === "paper";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant={isPaper ? "secondary" : "default"} className="gap-1">
              {isPaper ? (
                <>
                  <FileText className="h-3 w-3" />
                  Paper
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3" />
                  Binance
                </>
              )}
            </Badge>
            <span>{position.symbol}</span>
            <Badge 
              variant="outline"
              className={position.direction === "LONG" ? "text-profit" : "text-loss"}
            >
              {position.direction === "LONG" ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {position.direction}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Add journal data to enrich this trade for future analysis
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="space-y-6 py-6">
            {/* Strategies */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Strategies Used
              </Label>
              <div className="flex flex-wrap gap-2">
                {strategies.map((strategy) => (
                  <Badge
                    key={strategy.id}
                    variant={selectedStrategies.includes(strategy.id) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleStrategy(strategy.id)}
                  >
                    {strategy.name}
                  </Badge>
                ))}
                {strategies.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No strategies created yet
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Screenshots */}
            <div className="space-y-3">
              <ScreenshotUploader
                tradeId={position.id}
                screenshots={screenshots}
                onScreenshotsChange={setScreenshots}
              />
            </div>

            <Separator />

            {/* 3-Timeframe System */}
            <TradeTimeframeSection
              biasTimeframe={biasTimeframe}
              executionTimeframe={executionTimeframe}
              precisionTimeframe={precisionTimeframe}
              onBiasChange={setBiasTimeframe}
              onExecutionChange={setExecutionTimeframe}
              onPrecisionChange={setPrecisionTimeframe}
            />

            <Separator />

            {/* Trade Rating */}
            <TradeRatingSection
              rating={tradeRating}
              onRatingChange={setTradeRating}
            />

            <Separator />

            {/* Lesson Learned & Rule Compliance */}
            <TradeReviewSection
              lessonLearned={lessonLearned}
              ruleCompliance={ruleCompliance}
              onLessonChange={setLessonLearned}
              onRuleToggle={(ruleId) =>
                setRuleCompliance((prev) => ({
                  ...prev,
                  [ruleId]: !prev[ruleId],
                }))
              }
            />

            <Separator />

            {/* Emotional State */}
            <div className="space-y-3">
              <Label>Emotional State</Label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONAL_STATES.map((state) => (
                  <Badge
                    key={state.value}
                    variant={emotionalState === state.value ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => setEmotionalState(state.value)}
                  >
                    {state.emoji} {state.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-3">
              <Label>Trade Notes</Label>
              <Textarea
                placeholder="Why did you take this trade? What did you observe?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <Separator />

            {/* Custom Tags */}
            <div className="space-y-3">
              <Label>Custom Tags</Label>
              <Input
                placeholder="breakout, news-driven, trend-following (comma separated)"
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple tags with commas
              </p>
            </div>

            {/* Post-Trade Analysis (M-02) - Structured Post-Mortem */}
            {position.source === 'paper' && (position.originalData as any).post_trade_analysis && (
              <>
                <Separator />
                <PostMortemSection analysis={(position.originalData as any).post_trade_analysis} />
              </>
            )}

            {/* AI Analysis Section */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Trade Analysis
                </Label>
                {analysis && (
                  <Badge variant="outline" className="text-xs border-profit text-profit">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
              
              {!analysis ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (position) {
                      const trade = position.originalData as TradeEntry;
                      const strategyName = selectedStrategies.length > 0 
                        ? strategies.find(s => s.id === selectedStrategies[0])?.name
                        : undefined;
                      requestAnalysis(trade, strategyName);
                    }
                  }}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Request AI Analysis
                    </>
                  )}
                </Button>
              ) : (
                <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        View Analysis Results
                      </span>
                      {isAnalysisOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
                    <AIAnalysisDisplay analysis={analysis} />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* M-33: Read-only notice for live trades */}
            {position.source === 'paper' && ((position.originalData as TradeEntry).source === 'binance' || (position.originalData as TradeEntry).trade_mode === 'live') && (
              <>
                <Separator />
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Core trade data (price, quantity, direction) is read-only for live/synced trades. Only journal fields can be edited.</span>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
