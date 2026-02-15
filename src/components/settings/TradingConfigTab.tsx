/**
 * TradingConfigTab - Consolidated trading configuration settings
 * Combines risk profile settings with default account preference
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Wallet, Shield, AlertTriangle } from "lucide-react";
import { useRiskProfile, useUpsertRiskProfile } from "@/hooks/use-risk-profile";
import { useAccounts } from "@/hooks/use-accounts";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { toast } from "sonner";
import { DEFAULT_RISK_PROFILE, RISK_THRESHOLDS } from "@/types/risk";

export function TradingConfigTab() {
  const { data: riskProfile, isLoading: riskLoading } = useRiskProfile();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: userSettings, isLoading: settingsLoading } = useUserSettings();
  const upsertRiskProfile = useUpsertRiskProfile();
  const updateUserSettings = useUpdateUserSettings();

  // Local state for risk settings
  const [riskPerTrade, setRiskPerTrade] = useState(DEFAULT_RISK_PROFILE.risk_per_trade_percent);
  const [maxDailyLoss, setMaxDailyLoss] = useState(DEFAULT_RISK_PROFILE.max_daily_loss_percent);
  const [maxPositionSize, setMaxPositionSize] = useState(DEFAULT_RISK_PROFILE.max_position_size_percent);
  const [maxConcurrentPositions, setMaxConcurrentPositions] = useState(DEFAULT_RISK_PROFILE.max_concurrent_positions);
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);

  // Sync with loaded data
  useEffect(() => {
    if (riskProfile) {
      setRiskPerTrade(riskProfile.risk_per_trade_percent || DEFAULT_RISK_PROFILE.risk_per_trade_percent);
      setMaxDailyLoss(riskProfile.max_daily_loss_percent || DEFAULT_RISK_PROFILE.max_daily_loss_percent);
      setMaxPositionSize(riskProfile.max_position_size_percent || DEFAULT_RISK_PROFILE.max_position_size_percent);
      setMaxConcurrentPositions(riskProfile.max_concurrent_positions || DEFAULT_RISK_PROFILE.max_concurrent_positions);
    }
  }, [riskProfile]);

  useEffect(() => {
    if (userSettings) {
      // Read from new dedicated column first, fallback to ai_settings for backward compatibility
      if (userSettings.default_trading_account_id) {
        setDefaultAccountId(userSettings.default_trading_account_id);
      } else {
        const aiSettings = userSettings.ai_settings as { default_trading_account_id?: string } | null;
        setDefaultAccountId(aiSettings?.default_trading_account_id || null);
      }
    }
  }, [userSettings]);

  // Filter to only trading accounts (not backtest)
  const tradingAccounts = accounts?.filter(acc => acc.account_type === 'trading') || [];

  const handleSaveRiskProfile = async () => {
    try {
      await upsertRiskProfile.mutateAsync({
        risk_per_trade_percent: riskPerTrade,
        max_daily_loss_percent: maxDailyLoss,
        max_position_size_percent: maxPositionSize,
        max_concurrent_positions: maxConcurrentPositions,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDefaultAccountChange = async (accountId: string) => {
    const newValue = accountId === 'none' ? null : accountId;
    setDefaultAccountId(newValue);
    
    try {
      // Use the dedicated column for default trading account
      await updateUserSettings.mutateAsync({
        default_trading_account_id: newValue,
      });
      toast.success("Default trading account updated");
    } catch (error) {
      toast.error("Failed to update default account");
    }
  };

  const isLoading = riskLoading || accountsLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Management Section */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Risk Management</CardTitle>
          </div>
          <CardDescription>
            Configure your risk parameters. These settings control position sizing and trading limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Risk per Trade */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Risk per Trade
                <InfoTooltip 
                  content="Maximum percentage of account to risk on a single trade. 1-2% is recommended for most traders."
                  variant="help"
                />
              </Label>
              <Badge variant={riskPerTrade <= 2 ? "default" : riskPerTrade <= 5 ? "secondary" : "destructive"}>
                {riskPerTrade}%
              </Badge>
            </div>
            <Slider
              value={[riskPerTrade]}
              onValueChange={([value]) => setRiskPerTrade(value)}
              min={0.5}
              max={10}
              step={0.5}
              aria-label={`Risk per trade: ${riskPerTrade}%`}
            />
            <p className="text-xs text-muted-foreground">
              Used for position sizing across the app (Risk Calculator, Trade Entry, AI risk monitoring)
            </p>
          </div>

          <Separator />

          {/* Max Daily Loss */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Max Daily Loss
                <InfoTooltip 
                  content="When this limit is reached, trading is blocked for the day to prevent revenge trading."
                  variant="warning"
                />
              </Label>
              <Badge variant={maxDailyLoss <= 3 ? "default" : maxDailyLoss <= 5 ? "secondary" : "destructive"}>
                {maxDailyLoss}%
              </Badge>
            </div>
            <Slider
              value={[maxDailyLoss]}
              onValueChange={([value]) => setMaxDailyLoss(value)}
              min={1}
              max={15}
              step={0.5}
              aria-label={`Max daily loss: ${maxDailyLoss}%`}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-[hsl(var(--chart-4))]" />
              <span>Warning at {RISK_THRESHOLDS.warning_percent}% • Trade Entry blocked in this app at 100%</span>
            </div>
          </div>

          <Separator />

          {/* Max Position Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Max Position Size
                <InfoTooltip 
                  content="Maximum percentage of capital to deploy in a single position."
                  variant="help"
                />
              </Label>
              <Badge variant="secondary">{maxPositionSize}%</Badge>
            </div>
            <Slider
              value={[maxPositionSize]}
              onValueChange={([value]) => setMaxPositionSize(value)}
              min={10}
              max={100}
              step={5}
              aria-label={`Max position size: ${maxPositionSize}%`}
            />
          </div>

          <Separator />

          {/* Max Concurrent Positions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Max Concurrent Positions</Label>
              <Badge variant="secondary">{maxConcurrentPositions}</Badge>
            </div>
            <Slider
              value={[maxConcurrentPositions]}
              onValueChange={([value]) => setMaxConcurrentPositions(value)}
              min={1}
              max={10}
              step={1}
              aria-label={`Max concurrent positions: ${maxConcurrentPositions}`}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of open positions at the same time
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleSaveRiskProfile}
              disabled={upsertRiskProfile.isPending}
              className="w-full sm:w-auto"
            >
              {upsertRiskProfile.isPending ? 'Saving...' : 'Save Risk Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Account Section */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>Default Trading Account</CardTitle>
          </div>
          <CardDescription>
            Select a default account for new trades. This will be pre-selected in the Trade Entry wizard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Trading Account</Label>
            <Select 
              value={defaultAccountId || 'none'} 
              onValueChange={handleDefaultAccountChange}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select default account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default (ask every time)</SelectItem>
                {tradingAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span>{account.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({account.currency})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tradingAccounts.length === 0 
                ? "No trading accounts available. Create one in the Accounts page."
                : `${tradingAccounts.length} trading ${tradingAccounts.length === 1 ? 'account' : 'accounts'} available`}
            </p>
            {tradingAccounts.length === 1 && !defaultAccountId && (
              <p className="text-xs text-[hsl(var(--chart-4))]">
                Only one account available — consider setting it as default to skip selection.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
