/**
 * Binance Auto-Sync Toggle Component
 * Enables/disables periodic background synchronization of Binance data
 */
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STORAGE_KEY = 'binance_auto_sync_settings';

export interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTimestamp: number | null;
  notifyOnMismatch: boolean;
}

const DEFAULT_SETTINGS: AutoSyncSettings = {
  enabled: false,
  intervalMinutes: 60, // 1 hour default
  lastSyncTimestamp: null,
  notifyOnMismatch: true,
};

export function getAutoSyncSettings(): AutoSyncSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

export function saveAutoSyncSettings(settings: Partial<AutoSyncSettings>): AutoSyncSettings {
  const current = getAutoSyncSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

interface BinanceAutoSyncToggleProps {
  isConnected: boolean;
  onSettingsChange?: (settings: AutoSyncSettings) => void;
}

export function BinanceAutoSyncToggle({ 
  isConnected, 
  onSettingsChange 
}: BinanceAutoSyncToggleProps) {
  const [settings, setSettings] = useState<AutoSyncSettings>(getAutoSyncSettings);

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const handleToggle = (enabled: boolean) => {
    const updated = saveAutoSyncSettings({ enabled });
    setSettings(updated);
  };

  const handleIntervalChange = (value: string) => {
    const intervalMinutes = parseInt(value, 10);
    const updated = saveAutoSyncSettings({ intervalMinutes });
    setSettings(updated);
  };

  const handleNotifyChange = (notifyOnMismatch: boolean) => {
    const updated = saveAutoSyncSettings({ notifyOnMismatch });
    setSettings(updated);
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Auto-Sync
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Automatically sync your Binance data in the background
            </CardDescription>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardHeader>

      {settings.enabled && (
        <CardContent className="space-y-4 pt-0">
          {/* Interval Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Sync Interval</Label>
            </div>
            <Select
              value={settings.intervalMinutes.toString()}
              onValueChange={handleIntervalChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 min</SelectItem>
                <SelectItem value="30">Every 30 min</SelectItem>
                <SelectItem value="60">Every 1 hour</SelectItem>
                <SelectItem value="120">Every 2 hours</SelectItem>
                <SelectItem value="240">Every 4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mismatch Notification Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Notify on Data Mismatch</Label>
            </div>
            <Switch
              checked={settings.notifyOnMismatch}
              onCheckedChange={handleNotifyChange}
            />
          </div>

          {/* Last Sync Status */}
          {settings.lastSyncTimestamp && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last synced</span>
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-success" />
                {formatDistanceToNow(new Date(settings.lastSyncTimestamp), { addSuffix: true })}
              </Badge>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
