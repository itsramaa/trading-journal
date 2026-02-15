/**
 * RiskSettingsForm - Form for configuring risk profile settings
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Settings } from "lucide-react";

interface RiskSettingsFormProps {
  riskPerTrade: number;
  maxDailyLoss: number;
  maxWeeklyDrawdown: number;
  maxPositionSize: number;
  maxConcurrentPositions: number;
  onRiskPerTradeChange: (value: number) => void;
  onMaxDailyLossChange: (value: number) => void;
  onMaxWeeklyDrawdownChange: (value: number) => void;
  onMaxPositionSizeChange: (value: number) => void;
  onMaxConcurrentPositionsChange: (value: number) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function RiskSettingsForm({
  riskPerTrade,
  maxDailyLoss,
  maxWeeklyDrawdown,
  maxPositionSize,
  maxConcurrentPositions,
  onRiskPerTradeChange,
  onMaxDailyLossChange,
  onMaxWeeklyDrawdownChange,
  onMaxPositionSizeChange,
  onMaxConcurrentPositionsChange,
  onSave,
  isSaving,
}: RiskSettingsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Risk Profile Settings
        </CardTitle>
        <CardDescription>
          Configure your risk management parameters. These will be used for position sizing and trade validation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk per Trade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Risk per Trade
              <InfoTooltip 
                content="The percentage of your account you're willing to lose on a single trade. 1-2% is recommended for most traders."
                variant="help"
              />
            </Label>
            <span className="font-medium text-primary">{riskPerTrade}%</span>
          </div>
          <Slider
            value={[riskPerTrade]}
            onValueChange={([value]) => onRiskPerTradeChange(value)}
            min={0.5}
            max={10}
            step={0.5}
            aria-label={`Risk per trade: ${riskPerTrade}%`}
          />
          <p className="text-xs text-muted-foreground">
            Maximum percentage of account to risk on a single trade
          </p>
        </div>

        {/* Max Daily Loss */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Max Daily Loss
              <InfoTooltip 
                content="When you hit this limit, trading is disabled for the day. This protects you from revenge trading and emotional decisions."
                variant="warning"
              />
            </Label>
            <span className="font-medium text-primary">{maxDailyLoss}%</span>
          </div>
          <Slider
            value={[maxDailyLoss]}
            onValueChange={([value]) => onMaxDailyLossChange(value)}
            min={1}
            max={20}
            step={1}
            aria-label={`Max daily loss: ${maxDailyLoss}%`}
          />
          <p className="text-xs text-muted-foreground">
            Stop trading for the day when this loss limit is reached
          </p>
        </div>

        {/* Max Weekly Drawdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Max Weekly Drawdown
              <InfoTooltip 
                content="The maximum decline from your weekly peak before you should reduce position sizes. Helps prevent catastrophic losses."
                variant="help"
              />
            </Label>
            <span className="font-medium text-primary">{maxWeeklyDrawdown}%</span>
          </div>
          <Slider
            value={[maxWeeklyDrawdown]}
            onValueChange={([value]) => onMaxWeeklyDrawdownChange(value)}
            min={5}
            max={30}
            step={1}
            aria-label={`Max weekly drawdown: ${maxWeeklyDrawdown}%`}
          />
          <p className="text-xs text-muted-foreground">
            Maximum drawdown allowed per week before reducing position sizes
          </p>
        </div>

        {/* Max Position Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Max Position Size
              <InfoTooltip 
                content="Maximum percentage of capital to deploy in a single position. Helps prevent overconcentration."
                variant="help"
              />
            </Label>
            <span className="font-medium text-primary">{maxPositionSize}%</span>
          </div>
          <Slider
            value={[maxPositionSize]}
            onValueChange={([value]) => onMaxPositionSizeChange(value)}
            min={10}
            max={100}
            step={5}
            aria-label={`Max position size: ${maxPositionSize}%`}
          />
          <p className="text-xs text-muted-foreground">
            Maximum percentage of capital to deploy in a single position
          </p>
        </div>

        {/* Max Concurrent Positions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Max Concurrent Positions
              <InfoTooltip 
                content="Maximum open positions at once. Limits concentration risk and cognitive overload."
                variant="help"
              />
            </Label>
            <span className="font-medium text-primary">{maxConcurrentPositions}</span>
          </div>
          <Slider
            value={[maxConcurrentPositions]}
            onValueChange={([value]) => onMaxConcurrentPositionsChange(value)}
            min={1}
            max={10}
            step={1}
            aria-label={`Max concurrent positions: ${maxConcurrentPositions}`}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of open positions allowed at the same time
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={onSave}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? 'Saving...' : 'Save Risk Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
