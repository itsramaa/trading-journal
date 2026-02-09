import { useState } from "react";
import { ChevronDown, CheckCircle, XCircle, AlertTriangle, Clock, FileText, Brain, Bug, BarChart3, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { YouTubeImportDebugInfo as DebugInfoType, YouTubeImportDebugStep } from "@/types/backtest";

interface YouTubeImportDebugInfoProps {
  debugInfo: DebugInfoType;
}

const STEP_ICONS: Record<YouTubeImportDebugStep['status'], React.ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5 text-profit" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  failed: <XCircle className="h-3.5 w-3.5 text-loss" />,
  skipped: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

const STEP_COLORS: Record<YouTubeImportDebugStep['status'], string> = {
  success: 'border-profit/30 bg-profit/5',
  warning: 'border-warning/30 bg-warning/5',
  failed: 'border-loss/30 bg-loss/5',
  skipped: 'border-muted bg-muted/50',
};

const SOURCE_LABELS: Record<DebugInfoType['transcriptSource'], string> = {
  gemini: 'Gemini AI',
  youtube_captions: 'YouTube Captions',
  manual: 'Manual Input',
  unknown: 'Unknown',
};

const METHODOLOGY_LABELS: Record<string, string> = {
  indicator_based: 'Indicator Based',
  price_action: 'Price Action',
  smc: 'SMC',
  ict: 'ICT',
  wyckoff: 'Wyckoff',
  elliott_wave: 'Elliott Wave',
};

export function YouTubeImportDebugInfo({ debugInfo }: YouTubeImportDebugInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  const terminologyScore = debugInfo.methodologyRaw?.terminologyScore;
  const extractionQuality = debugInfo.extractionQuality;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Debug Info
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2 space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          {/* Processing Steps Timeline */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Processing Steps
            </h5>
            <div className="space-y-1.5">
              {debugInfo.processingSteps.map((step, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded border text-sm ${STEP_COLORS[step.status]}`}
                >
                  {STEP_ICONS[step.status]}
                  <span className="font-medium min-w-[140px]">
                    {step.step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="text-muted-foreground flex-1">{step.details}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript Info */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Transcript Info
            </h5>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline">
                Source: {SOURCE_LABELS[debugInfo.transcriptSource]}
              </Badge>
              <Badge variant="outline">
                {debugInfo.transcriptLength} words
              </Badge>
            </div>
            
            {debugInfo.transcriptPreview && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Preview (first 500 chars):</span>
                <ScrollArea className="h-[100px] rounded border border-border bg-background/50 p-2">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                    {debugInfo.transcriptPreview}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Methodology Detection Raw */}
          {debugInfo.methodologyRaw && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Methodology Detection
              </h5>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={
                    debugInfo.methodologyRaw.confidence >= 60 
                      ? 'border-profit/30 text-profit' 
                      : 'border-loss/30 text-loss'
                  }
                >
                  {debugInfo.methodologyRaw.methodology.replace(/_/g, ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {debugInfo.methodologyRaw.confidence}% confidence
                </Badge>
                {debugInfo.methodologyRaw.secondaryElements?.map((el, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    +{el}
                  </Badge>
                ))}
              </div>

              {/* Terminology Score Visualization */}
              {terminologyScore && (
                <div className="space-y-2 mt-3">
                  <span className="text-xs text-muted-foreground font-medium">Terminology Score:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(terminologyScore).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground min-w-[80px]">
                          {METHODOLOGY_LABELS[key] || key}
                        </span>
                        <Progress value={value * 10} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-6 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {debugInfo.methodologyRaw.evidence && debugInfo.methodologyRaw.evidence.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Evidence found:</span>
                  <ul className="list-disc list-inside text-xs text-muted-foreground pl-2">
                    {debugInfo.methodologyRaw.evidence.slice(0, 5).map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                    {debugInfo.methodologyRaw.evidence.length > 5 && (
                      <li className="text-xs opacity-50">
                        +{debugInfo.methodologyRaw.evidence.length - 5} more...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {debugInfo.methodologyRaw.reasoning && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">AI Reasoning:</span>
                  <div className="rounded border border-border bg-background/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      {debugInfo.methodologyRaw.reasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extraction Quality */}
          {extractionQuality && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Extraction Quality
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Overall</span>
                    <span className={extractionQuality.overall >= 70 ? 'text-profit' : 'text-yellow-500'}>
                      {extractionQuality.overall}%
                    </span>
                  </div>
                  <Progress value={extractionQuality.overall} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Entry Clarity</span>
                    <span className={extractionQuality.entryClarity >= 70 ? 'text-profit' : 'text-yellow-500'}>
                      {extractionQuality.entryClarity}%
                    </span>
                  </div>
                  <Progress value={extractionQuality.entryClarity} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Exit Clarity</span>
                    <span className={extractionQuality.exitClarity >= 70 ? 'text-profit' : 'text-yellow-500'}>
                      {extractionQuality.exitClarity}%
                    </span>
                  </div>
                  <Progress value={extractionQuality.exitClarity} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Risk Clarity</span>
                    <span className={extractionQuality.riskClarity >= 70 ? 'text-profit' : 'text-yellow-500'}>
                      {extractionQuality.riskClarity}%
                    </span>
                  </div>
                  <Progress value={extractionQuality.riskClarity} className="h-2" />
                </div>
                {extractionQuality.reproducibility !== undefined && (
                  <div className="space-y-1 col-span-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Reproducibility</span>
                      <span className={extractionQuality.reproducibility >= 70 ? 'text-profit' : 'text-yellow-500'}>
                        {extractionQuality.reproducibility}%
                      </span>
                    </div>
                    <Progress value={extractionQuality.reproducibility} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Information Gaps & Ambiguities */}
          {(debugInfo.informationGaps?.length || debugInfo.ambiguities?.length) && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Quality Notes
              </h5>
              
              {debugInfo.informationGaps && debugInfo.informationGaps.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Missing Information:</span>
                  <ul className="list-disc list-inside text-xs text-warning pl-2">
                    {debugInfo.informationGaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {debugInfo.ambiguities && debugInfo.ambiguities.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Ambiguous Statements:</span>
                  <ul className="list-disc list-inside text-xs text-warning pl-2">
                    {debugInfo.ambiguities.map((amb, i) => (
                      <li key={i}>{amb}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
