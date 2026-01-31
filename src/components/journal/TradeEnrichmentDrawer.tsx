/**
 * TradeEnrichmentDrawer - Side panel for adding journal data to any trade
 * Supports strategies, screenshots, notes, emotional state, tags
 * Refactored to use useTradeEnrichment hook
 */
import { useState, useEffect } from "react";
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
import { ScreenshotUploader } from "./ScreenshotUploader";
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
} from "lucide-react";
import { TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useTradeEnrichment } from "@/hooks/use-trade-enrichment";
import { EMOTIONAL_STATES } from "@/types/trade-wizard";
import type { UnifiedPosition } from "./AllPositionsTable";

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

const CHART_TIMEFRAMES = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
];

export function TradeEnrichmentDrawer({
  position,
  open,
  onOpenChange,
  onSaved,
}: TradeEnrichmentDrawerProps) {
  const { data: strategies = [] } = useTradingStrategies();
  const { isSaving, loadLinkedStrategies, saveEnrichment } = useTradeEnrichment();
  
  // Form state
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [notes, setNotes] = useState("");
  const [emotionalState, setEmotionalState] = useState<string>("");
  const [chartTimeframe, setChartTimeframe] = useState<string>("");
  const [customTags, setCustomTags] = useState<string>("");

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

            {/* Chart Timeframe */}
            <div className="space-y-3">
              <Label>Chart Timeframe</Label>
              <Select value={chartTimeframe} onValueChange={setChartTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* AI Analysis Button (placeholder) */}
            <div className="pt-4">
              <Button variant="outline" className="w-full" disabled>
                <Brain className="h-4 w-4 mr-2" />
                Request AI Analysis (Coming Soon)
              </Button>
            </div>
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
