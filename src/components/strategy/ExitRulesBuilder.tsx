/**
 * Exit Rules Builder - Dynamic UI for strategy exit rules
 * Per Trading Journey Markdown spec
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExitRule, ExitRuleType, ExitRuleUnit } from "@/types/strategy";
import {
  EXIT_RULE_TYPES,
  UNIT_OPTIONS,
  EXIT_RULE_COLOR_CLASSES,
  getExitRuleTypeConfig,
  getUnitLabel,
} from "@/lib/constants/strategy-rules";

interface ExitRulesBuilderProps {
  rules: ExitRule[];
  onChange: (rules: ExitRule[]) => void;
}

export function ExitRulesBuilder({ rules, onChange }: ExitRulesBuilderProps) {
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleType, setNewRuleType] = useState<ExitRuleType>('take_profit');

  const handleAddRule = () => {
    const ruleConfig = getExitRuleTypeConfig(newRuleType);
    const newRule: ExitRule = {
      id: `${newRuleType}_${Date.now()}`,
      type: newRuleType,
      value: ruleConfig?.defaultValue || 1,
      unit: ruleConfig?.defaultUnit || 'rr',
    };
    onChange([...rules, newRule]);
    setIsAddingRule(false);
  };

  const handleRemoveRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<ExitRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const getRuleIcon = (type: ExitRuleType) => {
    const option = getExitRuleTypeConfig(type);
    return option?.icon || Target;
  };

  const getRuleLabel = (type: ExitRuleType) => {
    const option = getExitRuleTypeConfig(type);
    return option?.label || type;
  };

  const getRuleColor = (type: ExitRuleType) => {
    return EXIT_RULE_COLOR_CLASSES[type] || 'border-border bg-muted/30';
  };

  // Compute effective R:R from TP/SL
  const effectiveRR = useMemo(() => {
    const tp = rules.find(r => r.type === 'take_profit' && r.unit === 'rr');
    const sl = rules.find(r => r.type === 'stop_loss' && r.unit === 'rr');
    if (tp && sl && sl.value > 0) return tp.value / sl.value;
    return null;
  }, [rules]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Exit Rules</CardTitle>
          <div className="flex items-center gap-2">
            {effectiveRR !== null && (
              <Badge variant="secondary" className="text-xs">
                Effective R:R {effectiveRR.toFixed(1)}:1
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {rules.length} rules
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Define take profit, stop loss, and other exit conditions.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
            No exit rules defined. Add TP/SL rules for proper risk management.
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => {
              const Icon = getRuleIcon(rule.type);
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    getRuleColor(rule.type)
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  
                  <div className="flex-1">
                    <Label className="text-sm font-medium">{getRuleLabel(rule.type)}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={rule.value}
                        onChange={(e) => handleUpdateRule(rule.id, { value: parseFloat(e.target.value) || 0 })}
                        className="h-8 w-20 text-sm"
                        step={0.1}
                        min={0}
                      />
                      <Select
                        value={rule.unit}
                        onValueChange={(v) => handleUpdateRule(rule.id, { unit: v as ExitRuleUnit })}
                      >
                        <SelectTrigger className="h-8 w-20 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rule.type === 'time_based' && (
                        <span className="text-xs text-muted-foreground">hours</span>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {isAddingRule ? (
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
            <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as ExitRuleType)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXIT_RULE_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAddRule}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingRule(false)}>Cancel</Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsAddingRule(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Exit Rule
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
