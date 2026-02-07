/**
 * PreflightResultCard - Visual 5-Layer Analysis Display
 * 
 * Displays AI Pre-flight results with:
 * - Verdict Banner (PROCEED/CAUTION/SKIP)
 * - Core Metrics (Expectancy, Confidence, Context Similarity)
 * - 5-Layer Analysis Accordion
 * - Risk & Bias Flags
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  TrendingUp,
  Layers,
  Shield,
  Brain,
  ChevronDown,
  ChevronUp,
  X,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreflightResponse, EdgeStrength, RiskFlag, BiasFlag } from "@/types/preflight";

interface PreflightResultCardProps {
  result: PreflightResponse;
  isLoading?: boolean;
  onDismiss?: () => void;
  showFullDetails?: boolean;
}

// Verdict styling
const VERDICT_CONFIG = {
  PROCEED: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-600",
    icon: CheckCircle,
  },
  CAUTION: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-600",
    icon: AlertTriangle,
  },
  SKIP: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    text: "text-destructive",
    icon: XCircle,
  },
};

// Edge strength styling
const EDGE_STRENGTH_CONFIG: Record<EdgeStrength, { label: string; className: string }> = {
  STRONG: { label: "Strong Edge", className: "bg-profit/10 text-profit border-profit/30" },
  WEAK: { label: "Weak Edge", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  NONE: { label: "No Edge", className: "bg-muted text-muted-foreground border-border" },
  NEGATIVE: { label: "Negative Edge", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

// Layer status indicator
function LayerStatusBadge({ passed, label }: { passed: boolean; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        passed
          ? "bg-green-500/10 text-green-600 border-green-500/30"
          : "bg-destructive/10 text-destructive border-destructive/30"
      )}
    >
      {passed ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
      {label || (passed ? "PASS" : "FAIL")}
    </Badge>
  );
}

// Metric row component
function MetricRow({ label, value, threshold, warning }: { label: string; value: string | number; threshold?: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", warning && "text-yellow-600")}>{value}</span>
        {threshold && <span className="text-xs text-muted-foreground">/{threshold}</span>}
      </div>
    </div>
  );
}

// Flag badge component
function FlagBadge({ flag, type }: { flag: string; type: 'risk' | 'bias' }) {
  const formatFlag = (f: string) => f.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs",
        type === 'risk' 
          ? "bg-destructive/10 text-destructive border-destructive/30"
          : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
      )}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      {formatFlag(flag)}
    </Badge>
  );
}

// Loading skeleton
function PreflightSkeleton() {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

export function PreflightResultCard({ 
  result, 
  isLoading, 
  onDismiss,
  showFullDetails = true 
}: PreflightResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(showFullDetails);
  
  if (isLoading) {
    return <PreflightSkeleton />;
  }
  
  const verdictConfig = VERDICT_CONFIG[result.verdict];
  const VerdictIcon = verdictConfig.icon;
  const edgeConfig = EDGE_STRENGTH_CONFIG[result.edgeStrength];
  
  const { layers } = result;

  return (
    <Card className={cn("border", verdictConfig.border, verdictConfig.bg)}>
      <CardContent className="p-4 space-y-4">
        {/* Verdict Banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VerdictIcon className={cn("h-6 w-6", verdictConfig.text)} />
            <div>
              <h3 className={cn("font-bold text-lg uppercase", verdictConfig.text)}>
                {result.verdict}
              </h3>
              <p className="text-xs text-muted-foreground">
                Analyzed {result.tradesSampled} trades
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm font-semibold">
              {result.confidence}% Confidence
            </Badge>
            {onDismiss && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {/* Expectancy */}
          <div className="p-3 rounded-lg bg-background/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Expectancy</p>
            <p className={cn(
              "text-lg font-bold",
              result.expectancy >= 0.30 ? "text-profit" :
              result.expectancy >= 0.10 ? "text-yellow-600" :
              result.expectancy > 0 ? "text-muted-foreground" : "text-destructive"
            )}>
              {result.expectancy >= 0 ? "+" : ""}{result.expectancy.toFixed(2)}R
            </p>
            <Badge variant="outline" className={cn("text-xs mt-1", edgeConfig.className)}>
              {edgeConfig.label}
            </Badge>
          </div>

          {/* Confidence */}
          <div className="p-3 rounded-lg bg-background/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <p className="text-lg font-bold">{result.confidence}%</p>
            <Progress 
              value={result.confidence} 
              className="h-1.5 mt-2"
            />
          </div>

          {/* Context Match */}
          <div className="p-3 rounded-lg bg-background/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">Context Match</p>
            <p className={cn(
              "text-lg font-bold",
              result.contextSimilarity >= 0.6 ? "text-profit" :
              result.contextSimilarity >= 0.4 ? "text-yellow-600" : "text-destructive"
            )}>
              {Math.round(result.contextSimilarity * 100)}%
            </p>
            <Progress 
              value={result.contextSimilarity * 100} 
              className="h-1.5 mt-2"
            />
          </div>
        </div>

        {/* Flags Display */}
        {(result.riskFlags.length > 0 || result.biasFlags.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {result.riskFlags.map((flag) => (
              <FlagBadge key={flag} flag={flag} type="risk" />
            ))}
            {result.biasFlags.map((flag) => (
              <FlagBadge key={flag} flag={flag} type="bias" />
            ))}
          </div>
        )}

        {/* Expand/Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Layer Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Layer Details
            </>
          )}
        </Button>

        {/* Layer Analysis Accordion */}
        {isExpanded && (
          <Accordion type="multiple" defaultValue={["layer1", "layer2"]} className="space-y-2">
            {/* Layer 1: Data Sufficiency */}
            <AccordionItem value="layer1" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Layer 1: Data Sufficiency</span>
                  <LayerStatusBadge passed={layers.dataSufficiency.passed} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-1 border-t pt-2">
                  <MetricRow 
                    label="Total Trades" 
                    value={layers.dataSufficiency.totalTrades} 
                    threshold="≥20"
                    warning={layers.dataSufficiency.totalTrades < 20}
                  />
                  <MetricRow 
                    label="Trades (60 days)" 
                    value={layers.dataSufficiency.tradesLast60Days} 
                    threshold="≥10"
                    warning={layers.dataSufficiency.tradesLast60Days < 10}
                  />
                  <MetricRow 
                    label="Max Gap (days)" 
                    value={layers.dataSufficiency.maxGapDays} 
                    threshold="≤14"
                    warning={layers.dataSufficiency.maxGapDays > 14}
                  />
                  {layers.dataSufficiency.issues.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-destructive/5 border border-destructive/20">
                      <p className="text-xs text-destructive font-medium mb-1">Issues:</p>
                      <ul className="text-xs text-destructive space-y-0.5">
                        {layers.dataSufficiency.issues.map((issue, i) => (
                          <li key={i}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Layer 2: Edge Validation */}
            <AccordionItem value="layer2" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Layer 2: Edge Validation</span>
                  <LayerStatusBadge passed={layers.edgeValidation.passed} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-1 border-t pt-2">
                  <MetricRow 
                    label="Expectancy" 
                    value={`${layers.edgeValidation.expectancy >= 0 ? '+' : ''}${layers.edgeValidation.expectancy.toFixed(2)}R`} 
                  />
                  <MetricRow 
                    label="Win Rate" 
                    value={`${(layers.edgeValidation.winRate * 100).toFixed(1)}%`} 
                  />
                  <MetricRow 
                    label="Avg Win" 
                    value={`${layers.edgeValidation.avgWinR.toFixed(2)}R`} 
                  />
                  <MetricRow 
                    label="Avg Loss" 
                    value={`${layers.edgeValidation.avgLossR.toFixed(2)}R`} 
                  />
                  <MetricRow 
                    label="Profit Factor" 
                    value={layers.edgeValidation.profitFactor.toFixed(2)} 
                  />
                  <div className="mt-2">
                    <Badge variant="outline" className={edgeConfig.className}>
                      {edgeConfig.label}
                    </Badge>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Layer 3: Context Similarity */}
            <AccordionItem value="layer3" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Layer 3: Context Similarity</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(layers.contextSimilarity.score * 100)}%
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Similarity Score</span>
                    <div className="flex items-center gap-2 flex-1 ml-4">
                      <Progress value={layers.contextSimilarity.score * 100} className="h-2" />
                      <span className="text-xs font-medium w-10 text-right">
                        {Math.round(layers.contextSimilarity.score * 100)}%
                      </span>
                    </div>
                  </div>
                  <MetricRow 
                    label="Relevant Trades" 
                    value={layers.contextSimilarity.relevantTradeCount} 
                  />
                  
                  {layers.contextSimilarity.matchedDimensions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Matched:</p>
                      <div className="flex flex-wrap gap-1">
                        {layers.contextSimilarity.matchedDimensions.map((dim) => (
                          <Badge key={dim} variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            {dim}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {layers.contextSimilarity.mismatchedDimensions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Mismatched:</p>
                      <div className="flex flex-wrap gap-1">
                        {layers.contextSimilarity.mismatchedDimensions.map((dim) => (
                          <Badge key={dim} variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            {dim}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Layer 4: Stability & Risk */}
            <AccordionItem value="layer4" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Layer 4: Stability & Risk</span>
                  <LayerStatusBadge passed={layers.stability.passed} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-1 border-t pt-2">
                  <MetricRow 
                    label="Std Dev (R)" 
                    value={layers.stability.stdDevR.toFixed(2)} 
                    warning={layers.stability.stdDevR > 2.0}
                  />
                  <MetricRow 
                    label="Max Drawdown (R)" 
                    value={layers.stability.maxDrawdownR.toFixed(2)} 
                  />
                  <MetricRow 
                    label="Max Losing Streak" 
                    value={layers.stability.maxLosingStreak} 
                    warning={layers.stability.maxLosingStreak >= 5}
                  />
                  <MetricRow 
                    label="Profit Concentration" 
                    value={`${(layers.stability.profitConcentration * 100).toFixed(0)}%`} 
                    warning={layers.stability.profitConcentration >= 0.5}
                  />
                  
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">Stability Factor</span>
                    <div className="flex items-center gap-2 flex-1 ml-4">
                      <Progress value={layers.stability.stabilityFactor * 100} className="h-2" />
                      <span className="text-xs font-medium w-10 text-right">
                        {(layers.stability.stabilityFactor * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  {layers.stability.flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {layers.stability.flags.map((flag) => (
                        <FlagBadge key={flag} flag={flag} type="risk" />
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Layer 5: Bias Detection */}
            <AccordionItem value="layer5" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Layer 5: Bias Detection</span>
                  {layers.biasDetection.flags.length === 0 ? (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Clean
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      {layers.biasDetection.flags.length} bias detected
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-2 border-t pt-2">
                  <MetricRow 
                    label="Confidence Penalty" 
                    value={`-${layers.biasDetection.penalty}%`} 
                    warning={layers.biasDetection.penalty > 0}
                  />
                  
                  {layers.biasDetection.details.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {layers.biasDetection.details.map((detail, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "p-2 rounded border text-xs",
                            detail.severity === 'HIGH' && "bg-destructive/5 border-destructive/30",
                            detail.severity === 'MEDIUM' && "bg-yellow-500/5 border-yellow-500/30",
                            detail.severity === 'LOW' && "bg-muted border-border"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              detail.severity === 'HIGH' && "text-destructive border-destructive/30",
                              detail.severity === 'MEDIUM' && "text-yellow-600 border-yellow-500/30",
                              detail.severity === 'LOW' && "text-muted-foreground"
                            )}>
                              {detail.severity}
                            </Badge>
                            <span className="font-medium">{detail.type.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-muted-foreground">{detail.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
                      <CheckCircle className="h-4 w-4" />
                      No behavioral biases detected
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Reasoning */}
        <div className="p-3 rounded-lg bg-background/50 border">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">AI Reasoning</p>
              <p className="text-sm whitespace-pre-line">{result.reasoning}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PreflightResultCard;
