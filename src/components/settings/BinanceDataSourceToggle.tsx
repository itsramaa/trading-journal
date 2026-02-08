/**
 * Binance Data Source Toggle
 * Controls whether Binance trade history is included in Trade History page
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, History, Info, Loader2 } from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { toast } from "sonner";

interface BinanceDataSourceToggleProps {
  isConnected: boolean;
}

export function BinanceDataSourceToggle({ isConnected }: BinanceDataSourceToggleProps) {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const useBinanceHistory = settings?.use_binance_history ?? true;

  const handleToggle = async (checked: boolean) => {
    try {
      await updateSettings.mutateAsync({ use_binance_history: checked });
      toast.success(
        checked 
          ? "Binance trade history enabled" 
          : "Switched to local trades only"
      );
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Trade History Data Source</CardTitle>
          </div>
          <Badge variant={useBinanceHistory ? "default" : "secondary"}>
            {useBinanceHistory ? "Binance + Local" : "Local Only"}
          </Badge>
        </div>
        <CardDescription>
          Control which data sources appear in your Trade History
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label className="font-medium">Include Binance Trades</Label>
              <p className="text-sm text-muted-foreground">
                {useBinanceHistory 
                  ? "Showing synced Binance trades in history" 
                  : "Only showing paper trades and manual entries"}
              </p>
            </div>
          </div>
          <Switch
            checked={useBinanceHistory}
            onCheckedChange={handleToggle}
            disabled={updateSettings.isPending || !isConnected}
          />
        </div>

        {!isConnected && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Connect your Binance API first to enable this option.
            </AlertDescription>
          </Alert>
        )}

        {!useBinanceHistory && isConnected && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-muted-foreground">
              <strong>Local Only Mode:</strong> Trade History will only show paper trades 
              and manual entries. Binance synced data will be hidden but not deleted. 
              You can re-enable anytime.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Binance + Local:</strong> Shows all trades from Binance sync + paper/manual trades</p>
          <p><strong>Local Only:</strong> Hides Binance trades, useful for paper trading focus</p>
        </div>
      </CardContent>
    </Card>
  );
}
