/**
 * Step 2: Strategy Selection with AI Recommendations
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Lightbulb, Target, Clock, Layers, CheckCircle, Sparkles, Star, TrendingUp, Brain, RefreshCw, Loader2 } from "lucide-react";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useAIStrategyRecommendation, StrategyRecommendation } from "@/hooks/use-ai-strategy-recommendation";
import { TIMEFRAME_OPTIONS, type TradingStrategyEnhanced } from "@/types/strategy";
import { cn } from "@/lib/utils";

interface StrategySelectionProps {
  onNext: () => void;
  onBack: () => void;
}

interface StrategyWithScore extends TradingStrategyEnhanced {
  aiScore?: number;
  aiReason?: string;
  strengths?: string[];
  considerations?: string[];
  winRateForPair?: number;
}

export function StrategySelection({ onNext, onBack }: StrategySelectionProps) {
  const { data: strategies = [], isLoading } = useTradingStrategies();
  const wizard = useTradeEntryWizard();
  const [selectedId, setSelectedId] = useState<string>(wizard.selectedStrategyId || "");
  const [strategiesWithScores, setStrategiesWithScores] = useState<StrategyWithScore[]>([]);
  const { getRecommendations, isLoading: aiLoading, result: aiResult } = useAIStrategyRecommendation();

  // Get pair/direction from wizard's tradeDetails (set in Step 3)
  const tradeDetails = wizard.tradeDetails;
  const pair = tradeDetails?.pair;
  const direction = tradeDetails?.direction;

  // Fetch AI recommendations when wizard has pair/direction
  const fetchAIRecommendations = async () => {
    if (pair && direction && strategies.length > 0) {
      const mappedStrategies = strategies.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || null,
        timeframe: (s as any).timeframe || null,
        market_type: (s as any).market_type || 'spot',
        min_confluences: (s as any).min_confluences || 4,
        min_rr: (s as any).min_rr || 1.5,
        entry_rules: (s as any).entry_rules || [],
        exit_rules: (s as any).exit_rules || [],
      }));
      await getRecommendations(pair, direction, mappedStrategies);
    }
  };

  // Auto-fetch when wizard data changes
  useEffect(() => {
    if (pair && direction && strategies.length > 0) {
      fetchAIRecommendations();
    }
  }, [pair, direction, strategies.length]);

  // Map AI recommendations to strategies
  useEffect(() => {
    if (strategies.length > 0) {
      const scored = strategies.map((strategy) => {
        // Check if we have AI recommendation for this strategy
        const aiRec = aiResult?.recommendations?.find(r => r.strategyId === strategy.id);
        
        if (aiRec) {
          return {
            ...strategy,
            aiScore: aiRec.confidenceScore,
            aiReason: aiRec.reasoning,
            strengths: aiRec.strengths,
            considerations: aiRec.considerations,
            winRateForPair: aiRec.winRateForPair,
          } as StrategyWithScore;
        }
        
        // Fallback to basic scoring if no AI result
        const hasRules = (strategy as any).entry_rules?.length > 0;
        const hasTimeframe = !!(strategy as any).timeframe;
        const hasMinRR = ((strategy as any).min_rr || 0) >= 1.5;
        const hasConfluences = ((strategy as any).min_confluences || 0) >= 3;
        
        let score = 50;
        if (hasRules) score += 15;
        if (hasTimeframe) score += 10;
        if (hasMinRR) score += 15;
        if (hasConfluences) score += 10;
        
        const reasons = [];
        if (hasRules) reasons.push("Well-defined entry rules");
        if (hasMinRR) reasons.push("Good risk-reward ratio");
        if (hasConfluences) reasons.push("Strong confluence requirements");
        if (!hasTimeframe) reasons.push("Consider adding a specific timeframe");
        
        return {
          ...strategy,
          aiScore: Math.round(score),
          aiReason: reasons.join(". ") || "Basic strategy structure",
          strengths: hasRules ? ["Has entry rules defined"] : [],
          considerations: !hasTimeframe ? ["No specific timeframe"] : [],
        } as StrategyWithScore;
      }).sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
      
      setStrategiesWithScores(scored);
    }
  }, [strategies, aiResult]);

  // Find selected strategy details
  const selectedStrategy = strategiesWithScores.find(s => s.id === selectedId);
  const recommendedStrategy = strategiesWithScores[0];

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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
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
          {/* AI Recommendation Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-medium">AI Strategy Analysis</span>
              {pair && (
                <Badge variant="outline" className="text-xs">{pair} {direction}</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAIRecommendations}
              disabled={aiLoading || !pair}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {aiLoading ? "Analyzing..." : "Refresh AI"}
            </Button>
          </div>

          {/* AI Overall Advice */}
          {aiResult?.overallAdvice && (
            <div className="p-3 rounded-lg border bg-muted/30 mb-4">
              <p className="text-sm text-muted-foreground">{aiResult.overallAdvice}</p>
            </div>
          )}

          {/* AI Recommendation */}
          {recommendedStrategy && recommendedStrategy.aiScore && recommendedStrategy.aiScore >= 70 && (
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Sparkles className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">AI Recommended Strategy</p>
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                      Top Pick
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: recommendedStrategy.color || '#3b82f6' }}
                    />
                    <span className="font-semibold">{recommendedStrategy.name}</span>
                    <Badge className={cn("text-xs", getScoreColor(recommendedStrategy.aiScore))}>
                      {recommendedStrategy.aiScore}% Match
                    </Badge>
                    {recommendedStrategy.winRateForPair && recommendedStrategy.winRateForPair > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {recommendedStrategy.winRateForPair.toFixed(0)}% win rate on {pair || 'pair'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{recommendedStrategy.aiReason}</p>
                  {recommendedStrategy.strengths && recommendedStrategy.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recommendedStrategy.strengths.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-green-500/10 text-green-600">✓ {s}</Badge>
                      ))}
                    </div>
                  )}
                  {selectedId !== recommendedStrategy.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => handleSelect(recommendedStrategy.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Use This Strategy
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Strategy Selector with AI Scores */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Your Strategies
              <Badge variant="outline" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                AI Scored
              </Badge>
            </Label>
            <Select value={selectedId} onValueChange={handleSelect}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select a strategy"} />
              </SelectTrigger>
              <SelectContent>
                {strategiesWithScores.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No strategies found. Create a strategy first.
                  </div>
                )}
                {strategiesWithScores.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: strategy.color || '#3b82f6' }}
                      />
                      <span className="flex-1">{strategy.name}</span>
                      {strategy.aiScore && (
                        <Badge variant="outline" className={cn("text-xs ml-2", getScoreColor(strategy.aiScore))}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {strategy.aiScore}%
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Strategy Details */}
          {selectedStrategy && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedStrategy.color || '#3b82f6' }}
                  />
                  <h3 className="font-semibold text-lg">{selectedStrategy.name}</h3>
                </div>
                {selectedStrategy.aiScore && (
                  <Badge className={cn("text-sm", getScoreColor(selectedStrategy.aiScore))}>
                    AI Score: {selectedStrategy.aiScore}%
                  </Badge>
                )}
              </div>

              {selectedStrategy.aiReason && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{selectedStrategy.aiReason}</p>
                </div>
              )}

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
