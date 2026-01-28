/**
 * Step 6: Final Checklist
 * Emotional state, confidence, and final validation
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Brain, Heart, CheckCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { EMOTIONAL_STATES } from "@/types/trade-wizard";

interface FinalChecklistProps {
  onNext: () => void;
  onBack: () => void;
}

export function FinalChecklist({ onNext, onBack }: FinalChecklistProps) {
  const wizard = useTradeEntryWizard();
  
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

  const handleNext = () => {
    wizard.setFinalChecklist({
      emotionalState: emotionalState as any,
      confidenceLevel,
      followingRules,
      tradeComment,
    });
    onNext();
  };

  // Generate auto-comment based on trade details
  const generateAutoComment = () => {
    const details = wizard.tradeDetails;
    const confluences = wizard.confluences;
    const strategy = wizard.strategyDetails;
    
    if (!details || !confluences) return;

    const comment = `${details.direction} ${details.pair} at ${details.entryPrice}. ` +
      `SL: ${details.stopLoss}, TP: ${details.takeProfit}. ` +
      `${confluences.checkedItems.length} confluences met. ` +
      `Strategy: ${strategy?.name || 'Manual'}. ` +
      `Feeling ${emotionalState}, confidence ${confidenceLevel}/10.`;
    
    setTradeComment(comment);
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
          {/* AI Verdict Placeholder */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">AI Final Verdict</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI will provide a final recommendation based on all checks.
                  <Badge variant="outline" className="ml-2">Coming in Phase 3</Badge>
                </p>
              </div>
            </div>
          </div>

          {/* Emotional State */}
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

          {/* Confidence Level */}
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

          {/* Following Rules Confirmation */}
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

          {/* Trade Comment */}
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

          {/* Validation Summary */}
          <div className="space-y-3">
            <h4 className="font-medium">Pre-Trade Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Confluences</p>
                <p className="font-bold">{wizard.confluences?.checkedItems.length || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Risk Amount</p>
                <p className="font-bold">${wizard.positionSizing?.risk_amount.toFixed(2) || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Position Size</p>
                <p className="font-bold">{wizard.positionSizing?.position_size.toFixed(4) || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Emotional State</p>
                <p className="font-bold capitalize">{emotionalState}</p>
              </div>
            </div>
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
