/**
 * RiskProfileSummaryCard - Displays current risk profile parameters
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield, AlertTriangle } from "lucide-react";
import { formatPercentUnsigned } from "@/lib/formatters";

interface RiskProfileData {
  risk_per_trade_percent: number;
  max_daily_loss_percent: number;
  max_position_size_percent: number;
  max_concurrent_positions: number;
}

interface RiskProfileSummaryCardProps {
  riskProfile: RiskProfileData | null | undefined;
  onConfigureClick: () => void;
}

export function RiskProfileSummaryCard({ 
  riskProfile, 
  onConfigureClick 
}: RiskProfileSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Risk Profile
        </CardTitle>
        <CardDescription>
          Your current risk management parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {riskProfile ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Risk per Trade</p>
              <p className="text-lg font-semibold">{formatPercentUnsigned(riskProfile.risk_per_trade_percent)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Max Daily Loss</p>
              <p className="text-lg font-semibold">{formatPercentUnsigned(riskProfile.max_daily_loss_percent)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Max Position Size</p>
              <p className="text-lg font-semibold">{formatPercentUnsigned(riskProfile.max_position_size_percent)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Max Positions</p>
              <p className="text-lg font-semibold">{riskProfile.max_concurrent_positions}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No risk profile configured"
            description="Set up your risk parameters to protect your capital."
            action={{
              label: "Configure Now",
              onClick: onConfigureClick,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
