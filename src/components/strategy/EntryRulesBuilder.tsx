/**
 * Entry Rules Builder - Dynamic UI for strategy entry rules
 * Per Trading Journey Markdown spec
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, TrendingUp, BarChart3, LineChart, Clock, Link, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntryRule, EntryRuleType } from "@/types/strategy";

interface EntryRulesBuilderProps {
  rules: EntryRule[];
  onChange: (rules: EntryRule[]) => void;
}

const RULE_TYPE_OPTIONS: { value: EntryRuleType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'price_action', label: 'Price Action', icon: TrendingUp, description: 'Support/Resistance, candlestick patterns' },
  { value: 'volume', label: 'Volume', icon: BarChart3, description: 'Volume confirmation signals' },
  { value: 'indicator', label: 'Indicator', icon: LineChart, description: 'RSI, MACD, EMA, etc.' },
  { value: 'higher_tf', label: 'Higher Timeframe', icon: Clock, description: 'HTF trend alignment' },
  { value: 'on_chain', label: 'On-Chain', icon: Link, description: 'Whale movements, funding rates' },
  { value: 'sentiment', label: 'Sentiment', icon: MessageSquare, description: 'Market sentiment, news' },
];

const INDICATOR_OPTIONS = [
  'RSI', 'MACD', 'EMA', 'SMA', 'Bollinger Bands', 'Stochastic', 
  'ATR', 'Volume Profile', 'VWAP', 'Ichimoku', 'Fibonacci'
];

export function EntryRulesBuilder({ rules, onChange }: EntryRulesBuilderProps) {
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleType, setNewRuleType] = useState<EntryRuleType>('price_action');

  const handleAddRule = () => {
    const ruleTypeInfo = RULE_TYPE_OPTIONS.find(r => r.value === newRuleType);
    const newRule: EntryRule = {
      id: `${newRuleType}_${Date.now()}`,
      type: newRuleType,
      condition: ruleTypeInfo?.description || '',
      is_mandatory: rules.length < 4, // First 4 rules are mandatory by default
      indicator: newRuleType === 'indicator' ? 'RSI' : undefined,
    };
    onChange([...rules, newRule]);
    setIsAddingRule(false);
  };

  const handleRemoveRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<EntryRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const getRuleIcon = (type: EntryRuleType) => {
    const option = RULE_TYPE_OPTIONS.find(r => r.value === type);
    return option?.icon || TrendingUp;
  };

  const getRuleLabel = (type: EntryRuleType) => {
    const option = RULE_TYPE_OPTIONS.find(r => r.value === type);
    return option?.label || type;
  };

  const mandatoryCount = rules.filter(r => r.is_mandatory).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Entry Rules (Confluences)</CardTitle>
          <Badge variant="outline" className="text-xs">
            {mandatoryCount} mandatory
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Define confluence requirements. Markdown spec requires min 4 confluences.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
            No entry rules defined. Add rules to define your confluence requirements.
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule, index) => {
              const Icon = getRuleIcon(rule.type);
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
                    rule.is_mandatory ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 hover:border-muted-foreground/20"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0 cursor-move" />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{getRuleLabel(rule.type)}</span>
                      {rule.is_mandatory && (
                        <Badge variant="default" className="text-[10px] h-4">Required</Badge>
                      )}
                    </div>
                    
                    <Input
                      value={rule.condition}
                      onChange={(e) => handleUpdateRule(rule.id, { condition: e.target.value })}
                      placeholder="Describe the condition..."
                      className="h-8 text-sm"
                    />
                    
                    {rule.type === 'indicator' && (
                      <Select
                        value={rule.indicator || 'RSI'}
                        onValueChange={(v) => handleUpdateRule(rule.id, { indicator: v })}
                      >
                        <SelectTrigger className="h-8 text-sm w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INDICATOR_OPTIONS.map((ind) => (
                            <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`mandatory-${rule.id}`}
                        checked={rule.is_mandatory}
                        onCheckedChange={(checked) => handleUpdateRule(rule.id, { is_mandatory: checked })}
                      />
                      <Label htmlFor={`mandatory-${rule.id}`} className="text-xs text-muted-foreground">
                        Mandatory for entry
                      </Label>
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
            <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as EntryRuleType)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPE_OPTIONS.map((option) => (
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
            Add Entry Rule
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
