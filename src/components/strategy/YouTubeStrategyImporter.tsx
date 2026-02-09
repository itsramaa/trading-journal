import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Youtube, 
  FileText, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Save,
  Edit,
  Play,
  Clock,
  Target,
  Zap,
  Brain,
  ShieldAlert,
  Boxes,
  TrendingUp,
  Quote
} from "lucide-react";
import { useYouTubeStrategyImport } from "@/hooks/use-youtube-strategy-import";
import { StrategyValidationBadge } from "./StrategyValidationBadge";
import { YouTubeTranscriptGuide } from "./YouTubeTranscriptGuide";
import type { YouTubeStrategyDataV2, StrategyValidationV2, YouTubeImportStatus } from "@/types/backtest";

interface YouTubeStrategyImporterProps {
  onStrategyImported?: () => void;
  onStartBacktest?: (strategyId: string) => void;
}

// Methodology display config
const METHODOLOGY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  smc: { label: 'SMC', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Boxes className="h-3 w-3" /> },
  ict: { label: 'ICT', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <TrendingUp className="h-3 w-3" /> },
  indicator_based: { label: 'Indicator', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <Target className="h-3 w-3" /> },
  price_action: { label: 'Price Action', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <Zap className="h-3 w-3" /> },
  wyckoff: { label: 'Wyckoff', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: <Boxes className="h-3 w-3" /> },
  elliott_wave: { label: 'Elliott Wave', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', icon: <TrendingUp className="h-3 w-3" /> },
  hybrid: { label: 'Hybrid', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Brain className="h-3 w-3" /> },
};

export function YouTubeStrategyImporter({ 
  onStrategyImported,
  onStartBacktest 
}: YouTubeStrategyImporterProps) {
  const [inputMode, setInputMode] = useState<'url' | 'transcript'>('url');
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [importedStrategy, setImportedStrategy] = useState<YouTubeStrategyDataV2 | null>(null);
  const [validation, setValidation] = useState<StrategyValidationV2 | null>(null);
  const [importStatus, setImportStatus] = useState<YouTubeImportStatus | null>(null);
  const [statusReason, setStatusReason] = useState<string>('');

  const { 
    importStrategy, 
    saveToLibrary, 
    isImporting, 
    isSaving, 
    progress, 
    resetProgress 
  } = useYouTubeStrategyImport();

  const handleImport = async () => {
    try {
      const result = await importStrategy(
        inputMode === 'url' 
          ? { url } 
          : { transcript }
      );
      setImportedStrategy(result.strategy);
      setValidation(result.validation);
      setImportStatus(result.status);
      setStatusReason(result.reason || '');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSave = async () => {
    if (!importedStrategy) return;
    try {
      await saveToLibrary(importedStrategy);
      setImportedStrategy(null);
      setValidation(null);
      setImportStatus(null);
      setStatusReason('');
      setUrl('');
      setTranscript('');
      resetProgress();
      onStrategyImported?.();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleReset = () => {
    setImportedStrategy(null);
    setValidation(null);
    setImportStatus(null);
    setStatusReason('');
    resetProgress();
  };

  const canSave = importStatus === 'success' || importStatus === 'warning';

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!importedStrategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              Import Strategy from YouTube
            </CardTitle>
            <CardDescription>
              Paste a YouTube URL or transcript to extract trading strategy using AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'url' | 'transcript')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube URL
                </TabsTrigger>
                <TabsTrigger value="transcript" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Paste Transcript
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="youtube-url">YouTube Video URL</Label>
                  <Input
                    id="youtube-url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isImporting}
                  />
                  <p className="text-xs text-muted-foreground">
                    The system will automatically fetch the video transcript. If captions are unavailable, you'll be prompted to paste the transcript manually.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="transcript" className="space-y-4">
                {/* Transcript Guide */}
                <YouTubeTranscriptGuide />
                
                <div className="space-y-2">
                  <Label htmlFor="transcript">Video Transcript</Label>
                  <Textarea
                    id="transcript"
                    placeholder="Paste the full video transcript here for best results..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    disabled={isImporting}
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    For accuracy, paste the complete transcript. The AI will extract entry/exit rules, risk management, and methodology.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Progress */}
            {progress.stage !== 'idle' && progress.stage !== 'complete' && progress.stage !== 'error' && progress.stage !== 'blocked' && progress.stage !== 'warning' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} />
                {progress.details && (
                  <p className="text-xs text-muted-foreground">{progress.details}</p>
                )}
              </div>
            )}

            {/* Error */}
            {progress.stage === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">{progress.message}</div>
                  {progress.details && <p className="text-xs mt-1">{progress.details}</p>}
                </AlertDescription>
              </Alert>
            )}

            {/* Blocked */}
            {progress.stage === 'blocked' && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <ShieldAlert className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200">
                  <div className="font-medium">{progress.message}</div>
                  {progress.details && <p className="text-xs mt-1">{progress.details}</p>}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleImport}
              disabled={isImporting || (inputMode === 'url' ? !url : !transcript)}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting Strategy...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Extract Strategy with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Extracted Strategy Preview */}
      {importedStrategy && validation && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 flex-wrap">
                    {importedStrategy.strategyName}
                    <StrategyValidationBadge 
                      score={validation.score} 
                      missingCount={validation.missingElements.length}
                    />
                  </CardTitle>
                  <CardDescription>{importedStrategy.description}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {/* Methodology Badge */}
                  {importedStrategy.methodology && (
                    <Badge 
                      variant="outline" 
                      className={`flex items-center gap-1 ${METHODOLOGY_CONFIG[importedStrategy.methodology]?.color || ''}`}
                    >
                      {METHODOLOGY_CONFIG[importedStrategy.methodology]?.icon}
                      {METHODOLOGY_CONFIG[importedStrategy.methodology]?.label || importedStrategy.methodology}
                    </Badge>
                  )}
                  {/* Confidence Badge */}
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1 ${
                      importedStrategy.confidence >= 80 ? 'text-profit border-profit/30' :
                      importedStrategy.confidence >= 60 ? 'text-yellow-400 border-yellow-500/30' :
                      'text-loss border-loss/30'
                    }`}
                  >
                    <Brain className="h-3 w-3" />
                    {importedStrategy.confidence}% confidence
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Warning/Blocked Alert */}
              {importStatus === 'warning' && statusReason && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-200">
                    {statusReason}
                  </AlertDescription>
                </Alert>
              )}
              {importStatus === 'blocked' && statusReason && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    {statusReason}
                  </AlertDescription>
                </Alert>
              )}

              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {importedStrategy.timeframeContext?.primary || 'N/A'}
                </Badge>
                {importedStrategy.timeframeContext?.higherTF && (
                  <Badge variant="outline" className="text-xs">
                    HTF: {importedStrategy.timeframeContext.higherTF}
                  </Badge>
                )}
                <Badge variant={
                  importedStrategy.difficultyLevel === 'beginner' ? 'default' :
                  importedStrategy.difficultyLevel === 'intermediate' ? 'secondary' : 
                  'destructive'
                }>
                  {importedStrategy.difficultyLevel}
                </Badge>
                <Badge variant={
                  importedStrategy.riskLevel === 'low' ? 'default' :
                  importedStrategy.riskLevel === 'medium' ? 'secondary' : 
                  'destructive'
                }>
                  {importedStrategy.riskLevel} risk
                </Badge>
              </div>

              {/* Concepts Used (for SMC/ICT) */}
              {importedStrategy.conceptsUsed && importedStrategy.conceptsUsed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-purple-400" />
                    Concepts Used
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {importedStrategy.conceptsUsed.map((concept, i) => (
                      <Badge key={i} variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                        {concept.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Entry Rules - Structured */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-profit" />
                  Entry Rules ({importedStrategy.entryRules?.length || 0})
                </h4>
                {importedStrategy.entryRules && importedStrategy.entryRules.length > 0 ? (
                  <div className="space-y-2">
                    {importedStrategy.entryRules.map((rule, i) => (
                      <div key={i} className="p-3 rounded-md bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {rule.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {rule.concept.replace(/_/g, ' ')}
                          </span>
                          {rule.is_mandatory && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.condition}</p>
                        
                        {/* Source Quote Evidence */}
                        {rule.sourceQuote && (
                          <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Quote className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground italic">
                                "{rule.sourceQuote}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No entry rules extracted</p>
                )}
              </div>

              {/* Exit Rules */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-loss" />
                  Exit Rules
                </h4>
                {importedStrategy.exitRules && importedStrategy.exitRules.length > 0 ? (
                  <div className="space-y-2">
                    {importedStrategy.exitRules.map((rule, i) => (
                      <div 
                        key={i}
                        className={`p-3 rounded-md border ${
                          rule.type === 'take_profit' || rule.type === 'fixed_target' || rule.type === 'risk_reward' 
                            ? 'bg-profit-muted border-profit/20' :
                          rule.type === 'stop_loss' ? 'bg-loss-muted border-loss/20' :
                          'bg-muted/50 border-border/50'
                        }`}
                      >
                        <div className={`font-medium ${
                          rule.type === 'take_profit' || rule.type === 'fixed_target' || rule.type === 'risk_reward'
                            ? 'text-profit' :
                          rule.type === 'stop_loss' ? 'text-loss' :
                          'text-foreground'
                        }`}>
                          {rule.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        {rule.value ? (
                          <div className="font-mono">
                            {rule.value}{rule.unit === 'percent' ? '%' : rule.unit ? ` ${rule.unit}` : ''}
                          </div>
                        ) : rule.description ? (
                          <div className="text-sm text-muted-foreground">{rule.description}</div>
                        ) : (
                          <div className="text-sm text-muted-foreground">{rule.concept}</div>
                        )}
                        
                        {/* Source Quote Evidence */}
                        {rule.sourceQuote && (
                          <div className="mt-2 p-2 rounded bg-background/50 border border-border/30">
                            <div className="flex items-start gap-2">
                              <Quote className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground italic">
                                "{rule.sourceQuote}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No exit rules extracted</p>
                )}
              </div>

              {/* Risk Management */}
              {importedStrategy.riskManagement && (
                <div className="space-y-2">
                  <h4 className="font-medium">Risk Management</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {importedStrategy.riskManagement.riskRewardRatio && (
                      <div className="p-2 rounded bg-muted/50">
                        <div className="text-muted-foreground">R:R Ratio</div>
                        <div className="font-mono">1:{importedStrategy.riskManagement.riskRewardRatio}</div>
                      </div>
                    )}
                    {importedStrategy.riskManagement.stopLossLogic && (
                      <div className="p-2 rounded bg-muted/50 col-span-2">
                        <div className="text-muted-foreground">Stop Loss</div>
                        <div className="text-xs">{importedStrategy.riskManagement.stopLossLogic}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Indicators (if indicator-based) */}
              {importedStrategy.indicatorsUsed && importedStrategy.indicatorsUsed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Indicators Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {importedStrategy.indicatorsUsed.map((indicator, i) => (
                      <Badge key={i} variant="outline">{indicator}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* No indicators note for SMC/ICT */}
              {(importedStrategy.methodology === 'smc' || importedStrategy.methodology === 'ict') && 
               (!importedStrategy.indicatorsUsed || importedStrategy.indicatorsUsed.length === 0) && (
                <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-profit" />
                  Pure {METHODOLOGY_CONFIG[importedStrategy.methodology]?.label} strategy (no indicators)
                </p>
              )}

              {/* Suitable Pairs */}
              {importedStrategy.suitablePairs && importedStrategy.suitablePairs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Suitable Pairs</h4>
                  <div className="flex flex-wrap gap-2">
                    {importedStrategy.suitablePairs.map((pair, i) => (
                      <Badge key={i} variant="secondary">{pair}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Automation Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Automation Score</span>
                  <span>{importedStrategy.automationScore}%</span>
                </div>
                <Progress value={importedStrategy.automationScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {importedStrategy.automationScore >= 70 
                    ? "This strategy can be easily automated" 
                    : importedStrategy.automationScore >= 40
                    ? "Partial automation possible"
                    : "Requires manual execution and discretion"
                  }
                </p>
              </div>

              {/* Validation Warnings */}
              {validation.warnings && validation.warnings.length > 0 && (
                <Alert className="border-yellow-500/30 bg-yellow-500/5">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription>
                    <strong className="text-yellow-400">Warnings:</strong>
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Missing Elements */}
              {validation.missingElements && validation.missingElements.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Missing elements:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {validation.missingElements.map((el, i) => (
                        <li key={i}>{el}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={isSaving || !canSave}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save to Library
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <Edit className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
                {validation.isActionable && canSave && (
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      handleSave();
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Save & Backtest
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
