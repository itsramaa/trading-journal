/**
 * Step 2: Strategy Selection
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Lightbulb, Target, Clock, Layers, CheckCircle } from "lucide-react";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { TIMEFRAME_OPTIONS, type TradingStrategyEnhanced } from "@/types/strategy";

interface StrategySelectionProps {
  onNext: () => void;
  onBack: () => void;
}

export function StrategySelection({ onNext, onBack }: StrategySelectionProps) {
  const { data: strategies = [], isLoading } = useTradingStrategies();
  const wizard = useTradeEntryWizard();
  const [selectedId, setSelectedId] = useState<string>(wizard.selectedStrategyId || "");

  // Find selected strategy details
  const selectedStrategy = strategies.find(s => s.id === selectedId) as TradingStrategyEnhanced | undefined;

  const handleSelect = (strategyId: string) => {
    setSelectedId(strategyId);
    const strategy = strategies.find(s => s.id === strategyId);
    if (strategy) {
      wizard.setStrategy(strategyId, strategy as TradingStrategyEnhanced);
    }
  };

  const handleNext = () => {
    if (selectedId && selectedStrategy) {
      onNext();
    }
  };

  const getTimeframeLabel = (tf: string | null) => {
    if (!tf) return "Any";
    return TIMEFRAME_OPTIONS.find(t => t.value === tf)?.label || tf;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Select Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Recommendation Placeholder */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">AI Strategy Recommendation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on current market conditions, AI analysis will suggest the best strategy.
                  <Badge variant="outline" className="ml-2">Coming in Phase 3</Badge>
                </p>
              </div>
            </div>
          </div>

          {/* Strategy Selector */}
          <div className="space-y-2">
            <Label>Your Strategies</Label>
            <Select value={selectedId} onValueChange={handleSelect}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select a strategy"} />
              </SelectTrigger>
              <SelectContent>
                {strategies.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No strategies found. Create a strategy first.
                  </div>
                )}
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: strategy.color || '#3b82f6' }}
                      />
                      <span>{strategy.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Strategy Details */}
          {selectedStrategy && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedStrategy.color || '#3b82f6' }}
                />
                <h3 className="font-semibold text-lg">{selectedStrategy.name}</h3>
              </div>

              {selectedStrategy.description && (
                <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Timeframe</p>
                    <p className="font-medium">{getTimeframeLabel((selectedStrategy as any).timeframe)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Market</p>
                    <p className="font-medium capitalize">{(selectedStrategy as any).market_type || 'Spot'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Min Confluences</p>
                    <p className="font-medium">{(selectedStrategy as any).min_confluences || 4}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Min R:R</p>
                    <p className="font-medium">{(selectedStrategy as any).min_rr || 1.5}:1</p>
                  </div>
                </div>
              </div>

              {/* Valid Pairs */}
              {(selectedStrategy as any).valid_pairs?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Valid Pairs</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedStrategy as any).valid_pairs.map((pair: string) => (
                      <Badge key={pair} variant="secondary">{pair}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedStrategy.tags && selectedStrategy.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedStrategy.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!selectedId}>
          Next: Trade Details
        </Button>
      </div>
    </div>
  );
}
