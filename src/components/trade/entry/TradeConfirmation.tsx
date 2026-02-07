/**
 * Step 5: Trade Confirmation
 * Final review and execute with AI summary
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Rocket, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Clock,
  CheckCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface TradeConfirmationProps {
  onExecute: () => Promise<void>;
  onBack: () => void;
  onCancel: () => void;
}

export function TradeConfirmation({ onExecute, onBack, onCancel }: TradeConfirmationProps) {
  const wizard = useTradeEntryWizard();
  const { user } = useAuth();
  const { format, formatPnl } = useCurrencyConversion();
  
  const { 
    tradeDetails, 
    priceLevels,
    positionSizing, 
    confluences, 
    strategyDetails, 
    finalChecklist,
    isSubmitting 
  } = wizard;

  if (!tradeDetails || !priceLevels || !positionSizing) {
    return (
      <div className="text-center py-8">
        <p>Missing trade data. Please go back and complete all steps.</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Calculate R:R
  const risk = Math.abs(priceLevels.entryPrice - priceLevels.stopLoss);
  const reward = Math.abs(priceLevels.takeProfit - priceLevels.entryPrice);
  const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : "0";

  const handleExecute = async () => {
    if (!user?.id) return;
    const success = await wizard.submitTrade(user.id);
    if (success) {
      onExecute();
    }
  };

  // Get AI quality data if available from wizard state (passed from FinalChecklist)
  const aiConfidence = confluences?.aiConfidence || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Trade Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trade Overview */}
          <div className={cn(
            "p-6 rounded-lg border-2 text-center",
            tradeDetails.direction === "LONG" 
              ? "border-green-500/30 bg-green-500/5" 
              : "border-red-500/30 bg-red-500/5"
          )}>
            <Badge 
              variant="default" 
              className={cn(
                "text-lg px-4 py-1 mb-4",
                tradeDetails.direction === "LONG" ? "bg-green-600" : "bg-red-600"
              )}
            >
              {tradeDetails.direction === "LONG" ? (
                <TrendingUp className="h-5 w-5 mr-2" />
              ) : (
                <TrendingDown className="h-5 w-5 mr-2" />
              )}
              {tradeDetails.direction} {tradeDetails.pair}
            </Badge>
            <div className="text-4xl font-bold mb-2">
              {format(priceLevels.entryPrice)}
            </div>
            <div className="text-muted-foreground">Entry Price</div>
          </div>

          {/* Trade Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
              <p className="text-xl font-bold text-red-500">
                {format(priceLevels.stopLoss)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
              <p className="text-xl font-bold text-green-500">
                {format(priceLevels.takeProfit)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">R:R Ratio</p>
              <p className="text-xl font-bold">1:{rrRatio}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Timeframe</p>
              <p className="text-xl font-bold uppercase">{tradeDetails.timeframe}</p>
            </div>
          </div>

          <Separator />

          {/* Position & Risk */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Position & Risk
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Position Size</p>
                <p className="font-bold">{positionSizing.position_size.toFixed(4)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Position Value</p>
                <p className="font-bold">{format(positionSizing.position_value)}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 text-center">
                <p className="text-xs text-muted-foreground">Max Loss</p>
                <p className="font-bold text-red-500">{formatPnl(-positionSizing.risk_amount)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Capital Used</p>
                <p className="font-bold">{positionSizing.capital_deployment_percent.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Strategy & Confluences */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Strategy & Confluences
            </h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Strategy:</span>
                <Badge variant="secondary">
                  {strategyDetails?.name || "Manual Trade"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confluences:</span>
                <Badge variant="default">
                  {confluences?.checkedItems.length || 0} met
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Emotional State:</span>
                <Badge variant="outline" className="capitalize">
                  {finalChecklist?.emotionalState || "N/A"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confidence:</span>
                <Badge variant="outline">
                  {finalChecklist?.confidenceLevel || 0}/10
                </Badge>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          {aiConfidence > 0 && (
            <>
              <Separator />
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-medium">AI Analysis Summary</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Confluence AI Confidence: {aiConfidence}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  AI will continue monitoring this trade for automated alerts and post-trade analysis.
                </p>
              </div>
            </>
          )}

          {/* Trade Comment */}
          {finalChecklist?.tradeComment && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Trade Notes</h4>
                <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                  {finalChecklist.tradeComment}
                </p>
              </div>
            </>
          )}

          {/* Final Confirmation */}
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Ready to Execute</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Please review all details above. Once executed, the trade will be logged 
              and monitored. You can close the position manually at any time.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Trade will be timestamped with current date/time</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <Button 
          size="lg" 
          onClick={handleExecute}
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5 mr-2" />
              Execute Trade
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
