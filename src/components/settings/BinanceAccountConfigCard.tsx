/**
 * Binance Account Configuration Display
 * Shows Hedge Mode, Multi-Assets Mode, BNB Burn status
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  Settings2, 
  Shield, 
  Coins, 
  Flame,
  CheckCircle,
  XCircle 
} from "lucide-react";
import { useExtendedAccountData } from "@/features/binance";

interface ConfigItemProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  enabled: boolean | undefined;
  isLoading: boolean;
}

function ConfigItem({ icon, label, tooltip, enabled, isLoading }: ConfigItemProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm font-medium">{label}</span>
          <InfoTooltip content={tooltip} />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
        <InfoTooltip content={tooltip} />
      </div>
      <Badge 
        variant={enabled ? "default" : "secondary"} 
        className={`gap-1 ${enabled ? 'bg-profit/20 text-profit hover:bg-profit/30' : ''}`}
      >
        {enabled ? (
          <>
            <CheckCircle className="h-3 w-3" />
            Enabled
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3" />
            Disabled
          </>
        )}
      </Badge>
    </div>
  );
}

export function BinanceAccountConfigCard() {
  const { accountConfig, multiAssetsMode, bnbBurnStatus, isLoading, error } = useExtendedAccountData();

  if (error) {
    return null; // Don't show card if there's an error fetching
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Account Configuration
        </CardTitle>
        <CardDescription>
          Current Binance Futures account settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ConfigItem
          icon={<Shield className="h-4 w-4" />}
          label="Hedge Mode"
          tooltip="When enabled, allows you to hold both LONG and SHORT positions on the same symbol simultaneously. Recommended for advanced hedging strategies."
          enabled={accountConfig?.dualSidePosition}
          isLoading={isLoading}
        />

        <ConfigItem
          icon={<Coins className="h-4 w-4" />}
          label="Multi-Assets Mode"
          tooltip="When enabled, all assets in your margin wallet contribute to your collateral. Increases capital efficiency but also increases risk exposure."
          enabled={multiAssetsMode?.multiAssetsMargin}
          isLoading={isLoading}
        />

        <ConfigItem
          icon={<Flame className="h-4 w-4" />}
          label="BNB Fee Burn"
          tooltip="When enabled, trading fees are paid using BNB with a 10% discount. Make sure you have BNB in your futures wallet."
          enabled={bnbBurnStatus?.feeBurn}
          isLoading={isLoading}
        />

        {accountConfig?.feeTier !== undefined && !isLoading && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">
                <Settings2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Fee Tier</span>
              <InfoTooltip content="Your current VIP fee tier on Binance. Higher tiers get lower trading fees based on trading volume." />
            </div>
            <Badge variant="outline">
              VIP {accountConfig.feeTier}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
