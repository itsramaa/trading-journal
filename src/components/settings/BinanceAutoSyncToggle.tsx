/**
 * Binance Auto-Sync Toggle Component
 * Enables/disables periodic background synchronization of Binance data
 * Now includes push notification controls and background sync options
 */
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Clock, AlertCircle, CheckCircle2, Bell, BellOff, Server, Smartphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { isBackgroundSyncSupported } from '@/lib/background-sync';

const STORAGE_KEY = 'binance_auto_sync_settings';

export interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTimestamp: number | null;
  notifyOnMismatch: boolean;
  serverSyncEnabled: boolean; // New: server-side 4h cron
  browserBackgroundEnabled: boolean; // New: service worker sync
}

const DEFAULT_SETTINGS: AutoSyncSettings = {
  enabled: false,
  intervalMinutes: 60, // 1 hour default
  lastSyncTimestamp: null,
  notifyOnMismatch: true,
  serverSyncEnabled: true, // Server sync every 4h by default
  browserBackgroundEnabled: true, // Browser background enabled by default
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
  const { 
    isSupported: isPushSupported, 
    isSubscribed, 
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush 
  } = usePushNotifications();
  
  const isBgSyncSupported = isBackgroundSyncSupported();

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

  const handleServerSyncChange = (serverSyncEnabled: boolean) => {
    const updated = saveAutoSyncSettings({ serverSyncEnabled });
    setSettings(updated);
  };

  const handleBrowserBackgroundChange = (browserBackgroundEnabled: boolean) => {
    const updated = saveAutoSyncSettings({ browserBackgroundEnabled });
    setSettings(updated);
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribePush();
    } else {
      await subscribePush();
    }
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
              Auto-Sync & Notifications
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Configure automatic Binance sync and push notifications
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
          {/* Browser Background Sync */}
          {isBgSyncSupported && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm">Browser Background Sync</Label>
                  <p className="text-xs text-muted-foreground">Sync continues when tab is closed</p>
                </div>
              </div>
              <Switch
                checked={settings.browserBackgroundEnabled}
                onCheckedChange={handleBrowserBackgroundChange}
              />
            </div>
          )}

          {/* Server-side Sync (4h cron) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm">Server Sync (Every 4 hours)</Label>
                <p className="text-xs text-muted-foreground">Runs even when browser is closed</p>
              </div>
            </div>
            <Switch
              checked={settings.serverSyncEnabled}
              onCheckedChange={handleServerSyncChange}
            />
          </div>

          <Separator />

          {/* Interval Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Tab Open Sync Interval</Label>
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

          <Separator />

          {/* Push Notifications */}
          {isPushSupported && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSubscribed ? (
                  <Bell className="h-4 w-4 text-success" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <Label className="text-sm">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when sync completes
                  </p>
                </div>
              </div>
              <Button
                variant={isSubscribed ? "outline" : "default"}
                size="sm"
                onClick={handlePushToggle}
                disabled={isPushLoading}
              >
                {isPushLoading ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
              </Button>
            </div>
          )}

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

          {/* Support Status */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {isBgSyncSupported ? '✓ Background Sync' : '✗ Background Sync'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {isPushSupported ? '✓ Push Notifications' : '✗ Push Notifications'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✓ Server Cron (4h)
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
