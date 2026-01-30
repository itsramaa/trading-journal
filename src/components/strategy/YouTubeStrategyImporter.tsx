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
  Brain
} from "lucide-react";
import { useYouTubeStrategyImport } from "@/hooks/use-youtube-strategy-import";
import { StrategyValidationBadge } from "./StrategyValidationBadge";
import type { YouTubeStrategyImport, StrategyValidation } from "@/types/backtest";

interface YouTubeStrategyImporterProps {
  onStrategyImported?: () => void;
  onStartBacktest?: (strategyId: string) => void;
}

export function YouTubeStrategyImporter({ 
  onStrategyImported,
  onStartBacktest 
}: YouTubeStrategyImporterProps) {
  const [inputMode, setInputMode] = useState<'url' | 'transcript'>('url');
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [importedStrategy, setImportedStrategy] = useState<YouTubeStrategyImport | null>(null);
  const [validation, setValidation] = useState<StrategyValidation | null>(null);

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
    resetProgress();
  };

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
                    Note: Video transcripts may not always be available. Use "Paste Transcript" as fallback.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="transcript" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transcript">Video Transcript or Description</Label>
                  <Textarea
                    id="transcript"
                    placeholder="Paste the video transcript or description here..."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    disabled={isImporting}
                    className="min-h-[200px]"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Progress */}
            {progress.stage !== 'idle' && progress.stage !== 'complete' && progress.stage !== 'error' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} />
              </div>
            )}

            {/* Error */}
            {progress.stage === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{progress.message}</AlertDescription>
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
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {importedStrategy.strategyName}
                    <StrategyValidationBadge 
                      score={validation.score} 
                      missingCount={validation.missingElements.length}
                    />
                  </CardTitle>
                  <CardDescription>{importedStrategy.description}</CardDescription>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  {importedStrategy.confidenceScore}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {importedStrategy.timeframe}
                </Badge>
                <Badge variant="secondary">
                  {importedStrategy.type.replace('_', ' ')}
                </Badge>
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

              {/* Entry Conditions */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  Entry Conditions
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {importedStrategy.entryConditions.map((condition, i) => (
                    <li key={i}>{condition}</li>
                  ))}
                </ul>
              </div>

              {/* Exit Conditions */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  Exit Conditions
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
                    <div className="text-green-500 font-medium">Take Profit</div>
                    <div>{importedStrategy.exitConditions.takeProfit}{importedStrategy.exitConditions.takeProfitUnit === 'percent' ? '%' : ` ${importedStrategy.exitConditions.takeProfitUnit}`}</div>
                  </div>
                  <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <div className="text-red-500 font-medium">Stop Loss</div>
                    <div>{importedStrategy.exitConditions.stopLoss}{importedStrategy.exitConditions.stopLossUnit === 'percent' ? '%' : ` ${importedStrategy.exitConditions.stopLossUnit}`}</div>
                  </div>
                </div>
              </div>

              {/* Indicators */}
              <div className="space-y-2">
                <h4 className="font-medium">Indicators Used</h4>
                <div className="flex flex-wrap gap-2">
                  {importedStrategy.indicatorsUsed.map((indicator, i) => (
                    <Badge key={i} variant="outline">{indicator}</Badge>
                  ))}
                </div>
              </div>

              {/* Suitable Pairs */}
              <div className="space-y-2">
                <h4 className="font-medium">Suitable Pairs</h4>
                <div className="flex flex-wrap gap-2">
                  {importedStrategy.suitablePairs.map((pair, i) => (
                    <Badge key={i} variant="secondary">{pair}</Badge>
                  ))}
                </div>
              </div>

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
                    : "Requires manual execution"
                  }
                </p>
              </div>

              {/* Validation Warnings */}
              {!validation.isValid && validation.missingElements.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
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
                <Button onClick={handleSave} disabled={isSaving}>
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
                {validation.isValid && (
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      // Save first, then trigger backtest
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
