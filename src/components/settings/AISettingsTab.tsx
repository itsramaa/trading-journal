/**
 * AI Settings Tab - Configuration for AI features
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Sparkles, Target, TrendingUp, Shield, FileText, Loader2 } from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { toast } from "sonner";

interface AISettings {
  confluence_detection: boolean;
  quality_scoring: boolean;
  pattern_recognition: boolean;
  daily_suggestions: boolean;
  risk_monitoring: boolean;
  post_trade_analysis: boolean;
  confidence_threshold: number;
  suggestion_style: 'conservative' | 'balanced' | 'aggressive';
  learn_from_wins: boolean;
  learn_from_losses: boolean;
}

const defaultSettings: AISettings = {
  confluence_detection: true,
  quality_scoring: true,
  pattern_recognition: true,
  daily_suggestions: true,
  risk_monitoring: true,
  post_trade_analysis: true,
  confidence_threshold: 75,
  suggestion_style: 'balanced',
  learn_from_wins: true,
  learn_from_losses: true,
};

export function AISettingsTab() {
  const { data: userSettings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (userSettings?.ai_settings) {
      const stored = userSettings.ai_settings as unknown as AISettings;
      setSettings({ ...defaultSettings, ...stored });
    }
  }, [userSettings]);

  const handleToggle = (key: keyof AISettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const handleSliderChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, confidence_threshold: value[0] }));
    setHasChanges(true);
  };

  const handleStyleChange = (style: AISettings['suggestion_style']) => {
    setSettings(prev => ({ ...prev, suggestion_style: style }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        ai_settings: settings as unknown as Record<string, never>,
      });
      toast.success('AI settings saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save AI settings');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Features
          </CardTitle>
          <CardDescription>
            Enable or disable specific AI capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <Label>Confluence Detection</Label>
                <p className="text-xs text-muted-foreground">Auto-detect trade confluences</p>
              </div>
            </div>
            <Switch 
              checked={settings.confluence_detection}
              onCheckedChange={() => handleToggle('confluence_detection')}
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <Label>Trade Quality Scoring</Label>
                <p className="text-xs text-muted-foreground">Rate trade quality before entry</p>
              </div>
            </div>
            <Switch 
              checked={settings.quality_scoring}
              onCheckedChange={() => handleToggle('quality_scoring')}
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <Label>Pattern Recognition</Label>
                <p className="text-xs text-muted-foreground">Identify winning/losing patterns</p>
              </div>
            </div>
            <Switch 
              checked={settings.pattern_recognition}
              onCheckedChange={() => handleToggle('pattern_recognition')}
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-primary" />
              <div>
                <Label>Risk Monitoring</Label>
                <p className="text-xs text-muted-foreground">AI-powered risk alerts</p>
              </div>
            </div>
            <Switch 
              checked={settings.risk_monitoring}
              onCheckedChange={() => handleToggle('risk_monitoring')}
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <Label>Post-Trade Analysis</Label>
                <p className="text-xs text-muted-foreground">AI feedback after closing trades</p>
              </div>
            </div>
            <Switch 
              checked={settings.post_trade_analysis}
              onCheckedChange={() => handleToggle('post_trade_analysis')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Preferences - moved above Confidence Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>AI Learning Preferences</CardTitle>
          <CardDescription>
            What should AI learn from your trades?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Learn from Wins</Label>
              <p className="text-xs text-muted-foreground">Analyze winning patterns</p>
            </div>
            <Switch 
              checked={settings.learn_from_wins}
              onCheckedChange={() => handleToggle('learn_from_wins')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Learn from Losses</Label>
              <p className="text-xs text-muted-foreground">Identify losing patterns to avoid</p>
            </div>
            <Switch 
              checked={settings.learn_from_losses}
              onCheckedChange={() => handleToggle('learn_from_losses')}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Confidence Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>AI Confidence Threshold</CardTitle>
          <CardDescription>
            Minimum confidence level for AI recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Threshold Level</Label>
            <Badge variant="outline">{settings.confidence_threshold}%</Badge>
          </div>
          <Slider
            value={[settings.confidence_threshold]}
            onValueChange={handleSliderChange}
            min={60}
            max={90}
            step={5}
          />
          <p className="text-xs text-muted-foreground">
            AI suggestions below this confidence level will be marked as less reliable
          </p>
        </CardContent>
      </Card>

      {/* Suggestion Style */}
      <Card>
        <CardHeader>
          <CardTitle>AI Suggestion Style</CardTitle>
          <CardDescription>
            How aggressive should AI recommendations be?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(['conservative', 'balanced', 'aggressive'] as const).map((style) => (
              <Button
                key={style}
                variant={settings.suggestion_style === style ? "default" : "outline"}
                className="h-auto py-4 flex-col gap-1"
                onClick={() => handleStyleChange(style)}
              >
                <span className="capitalize font-medium">{style}</span>
                <span className="text-xs opacity-70">
                  {style === 'conservative' && 'Fewer, safer signals'}
                  {style === 'balanced' && 'Balanced approach'}
                  {style === 'aggressive' && 'More opportunities'}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save AI Settings'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
