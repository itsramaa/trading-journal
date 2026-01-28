/**
 * Step 4: Confluence Validation
 * Dynamic checklist based on strategy entry rules
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { DEFAULT_ENTRY_RULES, type EntryRule } from "@/types/strategy";

interface ConfluenceValidatorProps {
  onNext: () => void;
  onBack: () => void;
}

export function ConfluenceValidator({ onNext, onBack }: ConfluenceValidatorProps) {
  const wizard = useTradeEntryWizard();
  const strategyDetails = wizard.strategyDetails;
  
  // Get entry rules from strategy or use defaults
  const entryRules: EntryRule[] = (strategyDetails as any)?.entry_rules?.length > 0 
    ? (strategyDetails as any).entry_rules 
    : DEFAULT_ENTRY_RULES;

  const minConfluences = (strategyDetails as any)?.min_confluences || 4;
  
  const [checkedItems, setCheckedItems] = useState<string[]>(
    wizard.confluences?.checkedItems || []
  );

  const handleToggle = (ruleId: string) => {
    setCheckedItems(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  // Calculate progress
  const checkedCount = checkedItems.length;
  const mandatoryRules = entryRules.filter(r => r.is_mandatory);
  const mandatoryChecked = mandatoryRules.filter(r => checkedItems.includes(r.id)).length;
  const allMandatoryMet = mandatoryChecked === mandatoryRules.length;
  const meetsMinConfluences = checkedCount >= minConfluences;
  const canProceed = allMandatoryMet && meetsMinConfluences;

  // Update wizard state
  useEffect(() => {
    wizard.setConfluences({
      checkedItems,
      totalRequired: minConfluences,
      passed: canProceed,
      aiConfidence: 0, // Placeholder for AI
    });
  }, [checkedItems, canProceed, minConfluences]);

  const progressPercent = Math.min((checkedCount / minConfluences) * 100, 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Confluence Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Detection Placeholder */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">AI Confluence Detection</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI will automatically detect confluences from your chart.
                  <Badge variant="outline" className="ml-2">Coming in Phase 3</Badge>
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Confluences: {checkedCount}/{minConfluences}
              </span>
              <Badge variant={meetsMinConfluences ? "default" : "secondary"}>
                {meetsMinConfluences ? "Minimum Met" : `Need ${minConfluences - checkedCount} more`}
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Confluence Checklist */}
          <div className="space-y-3">
            {entryRules.map((rule) => {
              const isChecked = checkedItems.includes(rule.id);
              const isMandatory = rule.is_mandatory;

              return (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                    isChecked 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-muted-foreground",
                    isMandatory && !isChecked && "border-yellow-500/30"
                  )}
                  onClick={() => handleToggle(rule.id)}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(rule.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.condition}</span>
                      {isMandatory && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Type: {rule.type.replace('_', ' ').toUpperCase()}
                      {rule.indicator && ` • ${rule.indicator}`}
                    </p>
                  </div>
                  {isChecked ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation Status */}
          {!allMandatoryMet && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">Complete all required confluences to proceed</span>
            </div>
          )}

          {allMandatoryMet && !meetsMinConfluences && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                You need at least {minConfluences} confluences. Currently: {checkedCount}
              </span>
            </div>
          )}

          {canProceed && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                All confluence requirements met! Ready to proceed.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next: Position Sizing
        </Button>
      </div>
    </div>
  );
}
