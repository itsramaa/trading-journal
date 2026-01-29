/**
 * Step 4: Final Checklist
 * Reordered: Emotional state, Confidence, AI verdict
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Brain, Heart, CheckCircle, Sparkles, Loader2, AlertTriangle, TrendingUp, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useAITradeQuality } from "@/features/ai/useAITradeQuality";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { EMOTIONAL_STATES } from "@/types/trade-wizard";
import { calculateTradingStats } from "@/lib/trading-calculations";
import { toast } from "sonner";

interface FinalChecklistProps {
  onNext: () => void;
  onBack: () => void;
}

export function FinalChecklist({ onNext, onBack }: FinalChecklistProps) {
  const wizard = useTradeEntryWizard();
  const { getQualityScore, isLoading: aiLoading, result: aiResult, error: aiError } = useAITradeQuality();
  const { data: trades = [] } = useTradeEntries();
  
  const [emotionalState, setEmotionalState] = useState<string>(
    wizard.finalChecklist?.emotionalState || "calm"
  );
  const [confidenceLevel, setConfidenceLevel] = useState(
    wizard.finalChecklist?.confidenceLevel || 7
  );
  const [followingRules, setFollowingRules] = useState(
    wizard.finalChecklist?.followingRules || false
  );
  const [tradeComment, setTradeComment] = useState(
    wizard.finalChecklist?.tradeComment || ""
  );

  const isEmotionallyReady = emotionalState === "calm" || emotionalState === "confident";
  const isConfident = confidenceLevel >= 6;
  const canProceed = followingRules && isEmotionallyReady;

  // Get data from wizard
  const { tradeDetails, priceLevels, positionSizing, confluences, strategyDetails } = wizard;

  // Calculate user stats for AI
  const userStats = calculateTradingStats(trades);

  // Request AI quality score
  const handleGetAIVerdict = async () => {
    if (!tradeDetails || !priceLevels || !positionSizing || !confluences) {
      toast.error("Missing trade data");
      return;
    }

    const rr = Math.abs(priceLevels.takeProfit - priceLevels.entryPrice) / 
               Math.abs(priceLevels.entryPrice - priceLevels.stopLoss);

    await getQualityScore({
      tradeSetup: {
        pair: tradeDetails.pair,
        direction: tradeDetails.direction,
        entryPrice: priceLevels.entryPrice,
        stopLoss: priceLevels.stopLoss,
        takeProfit: priceLevels.takeProfit,
        timeframe: tradeDetails.timeframe,
        rr,
      },
      confluenceData: {
        confluences_detected: confluences.checkedItems.length,
        confluences_required: confluences.totalRequired,
        overall_confidence: confluences.aiConfidence,
        verdict: confluences.passed ? 'pass' : 'fail',
      },
      positionSizing: {
        position_size: positionSizing.position_size,
        risk_amount: positionSizing.risk_amount,
        risk_percent: (positionSizing.risk_amount / wizard.accountBalance) * 100,
        capital_deployment_percent: positionSizing.capital_deployment_percent,
      },
      emotionalState,
      confidenceLevel,
      userStats: {
        winRate: userStats.winRate,
        avgWin: userStats.avgWin,
        avgLoss: userStats.avgLoss,
        totalTrades: userStats.totalTrades,
      },
    });

    if (aiError) {
      toast.error(aiError);
    }
  };

  // Auto-request AI verdict when step loads
  useEffect(() => {
    if (!aiResult && !aiLoading && tradeDetails && priceLevels && positionSizing && confluences) {
      handleGetAIVerdict();
    }
  }, [tradeDetails, priceLevels, positionSizing, confluences]);

  const handleNext = () => {
    wizard.setFinalChecklist({
      emotionalState: emotionalState as any,
      confidenceLevel,
      followingRules,
      tradeComment,
      aiQualityScore: aiResult?.score,
      aiConfidence: aiResult?.confidence,
    });
    onNext();
  };

  // Generate auto-comment based on trade details
  const generateAutoComment = () => {
    if (!tradeDetails || !priceLevels || !confluences) return;

    const aiPart = aiResult ? ` AI Score: ${aiResult.score}/10 (${aiResult.recommendation}).` : '';

    const comment = `${tradeDetails.direction} ${tradeDetails.pair} at ${priceLevels.entryPrice}. ` +
      `SL: ${priceLevels.stopLoss}, TP: ${priceLevels.takeProfit}. ` +
      `${confluences.checkedItems.length} confluences met. ` +
      `Strategy: ${strategyDetails?.name || 'Manual'}. ` +
      `Feeling ${emotionalState}, confidence ${confidenceLevel}/10.${aiPart}`;
    
    setTradeComment(comment);
  };

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'execute': return 'bg-green-500/10 border-green-500/30 text-green-600';
      case 'wait': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600';
      case 'skip': return 'bg-red-500/10 border-red-500/30 text-red-600';
      default: return 'bg-muted/50 border-border';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Final Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. Emotional State - FIRST */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              How are you feeling right now?
            </Label>
            <Select value={emotionalState} onValueChange={setEmotionalState}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMOTIONAL_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    <span className="flex items-center gap-2">
                      <span>{state.emoji}</span>
                      <span>{state.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isEmotionallyReady && (
              <p className="text-sm text-yellow-600">
                ⚠️ Trading while anxious, fearful, or in FOMO can lead to poor decisions.
                Consider taking a break.
              </p>
            )}
          </div>

          {/* 2. Trade Confidence Level - SECOND */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Trade Confidence Level: {confidenceLevel}/10
            </Label>
            <Slider
              value={[confidenceLevel]}
              onValueChange={(v) => setConfidenceLevel(v[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uncertain</span>
              <span>Very Confident</span>
            </div>
            {!isConfident && (
              <p className="text-sm text-yellow-600">
                ⚠️ Low confidence may indicate missing confluences or unclear setup.
              </p>
            )}
          </div>

          {/* 3. AI Final Verdict - THIRD */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">AI Final Verdict</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI-powered quality assessment of your trade setup.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGetAIVerdict}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>

            {aiLoading && !aiResult && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}

            {aiResult && (
              <div className="space-y-4">
                {/* Score and Recommendation */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-background/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Quality Score</p>
                    <p className={cn("text-3xl font-bold", getScoreColor(aiResult.score))}>
                      {aiResult.score}/10
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {aiResult.confidence}% confidence
                    </p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border text-center flex flex-col justify-center",
                    getRecommendationStyle(aiResult.recommendation)
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                    <p className="text-xl font-bold uppercase">
                      {aiResult.recommendation}
                    </p>
                  </div>
                </div>

                {/* Factors */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Key Factors:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {aiResult.factors.slice(0, 4).map((factor, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded bg-background/50">
                        {factor.impact === 'positive' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : factor.impact === 'negative' ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs truncate">{factor.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {factor.score}/10
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reasoning */}
                <p className="text-sm text-muted-foreground italic">
                  "{aiResult.reasoning}"
                </p>
              </div>
            )}

            {aiError && !aiResult && (
              <p className="text-sm text-red-500">{aiError}</p>
            )}
          </div>

          {/* 4. Pre-Trade Summary - FOURTH */}
          <div className="space-y-3">
            <h4 className="font-medium">Pre-Trade Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Confluences</p>
                <p className="font-bold">{confluences?.checkedItems.length || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Risk Amount</p>
                <p className="font-bold">${positionSizing?.risk_amount.toFixed(2) || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Position Size</p>
                <p className="font-bold">{positionSizing?.position_size.toFixed(4) || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">AI Score</p>
                <p className={cn("font-bold", aiResult ? getScoreColor(aiResult.score) : '')}>
                  {aiResult ? `${aiResult.score}/10` : '--'}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Trade Comment / Notes - FIFTH */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Trade Comment / Notes</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateAutoComment}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Auto Generate
              </Button>
            </div>
            <Textarea
              value={tradeComment}
              onChange={(e) => setTradeComment(e.target.value)}
              placeholder="Document your trade setup, reasoning, and any observations..."
              rows={4}
            />
          </div>

          {/* 6. Following Rules Confirmation - LAST */}
          <div className={cn(
            "p-4 rounded-lg border transition-colors",
            followingRules ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"
          )}>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={followingRules}
                onCheckedChange={(checked) => setFollowingRules(checked === true)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium">I confirm this trade follows my strategy rules</p>
                <p className="text-sm text-muted-foreground mt-1">
                  By checking this, you acknowledge that this trade setup aligns with your 
                  predefined strategy rules and is not impulsive.
                </p>
              </div>
            </label>
          </div>

          {/* Ready Status */}
          {canProceed && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                All checks complete. Ready to execute trade!
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Next: Review & Execute
        </Button>
      </div>
    </div>
  );
}
