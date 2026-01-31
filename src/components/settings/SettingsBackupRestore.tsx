/**
 * Settings Backup/Restore Component
 * Export and import user settings, AI configuration, and trading data
 */

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Download, 
  Upload, 
  Settings2, 
  Database,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { format } from "date-fns";
import { toast } from "sonner";

interface BackupData {
  version: string;
  exportedAt: string;
  data: {
    settings?: {
      theme: string;
      language: string;
      notifications: Record<string, boolean>;
      ai_settings: Record<string, unknown>;
    };
    riskProfile?: {
      max_daily_loss_percent: number;
      max_weekly_drawdown_percent: number;
      risk_per_trade_percent: number;
      max_position_size_percent: number;
      max_concurrent_positions: number;
      max_correlated_exposure: number;
    };
    strategies?: Array<{
      name: string;
      description: string;
      timeframe: string;
      entry_rules: unknown;
      exit_rules: unknown;
      min_confluences: number;
      min_rr: number;
      tags: string[];
    }>;
  };
}

export function SettingsBackupRestore() {
  const [includeSettings, setIncludeSettings] = useState(true);
  const [includeRiskProfile, setIncludeRiskProfile] = useState(true);
  const [includeStrategies, setIncludeStrategies] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: userSettings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { data: riskProfile } = useRiskProfile();
  const { data: strategies } = useTradingStrategies();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backup: BackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {},
      };

      if (includeSettings && userSettings) {
        backup.data.settings = {
          theme: userSettings.theme,
          language: userSettings.language,
          notifications: {
            notify_price_alerts: userSettings.notify_price_alerts,
            notify_portfolio_updates: userSettings.notify_portfolio_updates,
            notify_weekly_report: userSettings.notify_weekly_report,
            notify_market_news: userSettings.notify_market_news,
            notify_email_enabled: userSettings.notify_email_enabled,
            notify_push_enabled: userSettings.notify_push_enabled,
          },
          ai_settings: userSettings.ai_settings || {},
        };
      }

      if (includeRiskProfile && riskProfile) {
        backup.data.riskProfile = {
          max_daily_loss_percent: riskProfile.max_daily_loss_percent ?? 3,
          max_weekly_drawdown_percent: riskProfile.max_weekly_drawdown_percent ?? 10,
          risk_per_trade_percent: riskProfile.risk_per_trade_percent ?? 1,
          max_position_size_percent: riskProfile.max_position_size_percent ?? 5,
          max_concurrent_positions: riskProfile.max_concurrent_positions ?? 3,
          max_correlated_exposure: riskProfile.max_correlated_exposure ?? 40,
        };
      }

      if (includeStrategies && strategies) {
        backup.data.strategies = strategies.map(s => ({
          name: s.name,
          description: s.description || '',
          timeframe: s.timeframe || '',
          entry_rules: s.entry_rules,
          exit_rules: s.exit_rules,
          min_confluences: s.min_confluences ?? 2,
          min_rr: s.min_rr ?? 2,
          tags: s.tags || [],
        }));
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading_journey_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Backup exported successfully');
    } catch (error) {
      toast.error('Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string) as BackupData;
        
        if (!backup.version || !backup.data) {
          throw new Error('Invalid backup file format');
        }
        
        setImportPreview(backup);
      } catch {
        toast.error('Invalid backup file');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview) return;
    
    setIsImporting(true);
    try {
      // Import settings
      if (importPreview.data.settings) {
        await updateSettings.mutateAsync({
          theme: importPreview.data.settings.theme,
          language: importPreview.data.settings.language,
          ...importPreview.data.settings.notifications,
          ai_settings: importPreview.data.settings.ai_settings as Record<string, never>,
        });
      }

      // Note: Risk profile and strategies would need their own mutation hooks
      // For now, we just update settings
      
      toast.success('Settings restored successfully');
      setImportPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to restore settings');
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Backup
          </CardTitle>
          <CardDescription>
            Download a backup of your settings and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <Label>App Settings & AI Configuration</Label>
              </div>
              <Switch 
                checked={includeSettings} 
                onCheckedChange={setIncludeSettings}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label>Risk Profile</Label>
              </div>
              <Switch 
                checked={includeRiskProfile} 
                onCheckedChange={setIncludeRiskProfile}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <Label>Trading Strategies</Label>
                {strategies && (
                  <Badge variant="secondary" className="text-xs">
                    {strategies.length} strategies
                  </Badge>
                )}
              </div>
              <Switch 
                checked={includeStrategies} 
                onCheckedChange={setIncludeStrategies}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleExport} 
            disabled={isExporting || (!includeSettings && !includeRiskProfile && !includeStrategies)}
            className="w-full gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Backup (JSON)
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Restore from Backup
          </CardTitle>
          <CardDescription>
            Import settings from a previously exported backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            id="backup-file-input"
          />
          
          {!importPreview ? (
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Select Backup File
            </Button>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Backup File Loaded</AlertTitle>
                <AlertDescription>
                  Exported on: {format(new Date(importPreview.exportedAt), 'PPP p')}
                </AlertDescription>
              </Alert>
              
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">Contents:</p>
                <div className="flex flex-wrap gap-2">
                  {importPreview.data.settings && (
                    <Badge variant="secondary">Settings</Badge>
                  )}
                  {importPreview.data.riskProfile && (
                    <Badge variant="secondary">Risk Profile</Badge>
                  )}
                  {importPreview.data.strategies && (
                    <Badge variant="secondary">
                      {importPreview.data.strategies.length} Strategies
                    </Badge>
                  )}
                </div>
              </div>

              <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-600">Warning</AlertTitle>
                <AlertDescription className="text-yellow-600">
                  This will overwrite your current settings. This action cannot be undone.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex-1 gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Restore Settings
                </Button>
                <Button 
                  variant="outline" 
                  onClick={cancelImport}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
