/**
 * Step 1: Pre-Entry Validation
 * Auto-checks daily loss limits, position limits, correlation, and AI Pre-flight
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertTriangle, Loader2, ShieldCheck, Building2, Brain, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreTradeValidation } from "@/features/trade/usePreTradeValidation";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useTradingAccounts } from "@/hooks/use-trading-accounts";
import { useAIPreflight } from "@/features/ai/useAIPreflight";
import type { ValidationResult } from "@/types/trade-wizard";

interface PreEntryValidationProps {
  onNext: () => void;
  onCancel: () => void;
}

function ValidationItem({ result, label, icon }: { result: ValidationResult; label: string; icon: React.ReactNode }) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-lg border transition-colors",
      result.status === 'pass' && "border-green-500/30 bg-green-500/5",
      result.status === 'warning' && "border-yellow-500/30 bg-yellow-500/5",
      result.status === 'fail' && "border-red-500/30 bg-red-500/5"
    )}>
      <div className={cn(
        "mt-0.5",
        result.status === 'pass' && "text-green-500",
        result.status === 'warning' && "text-yellow-500",
        result.status === 'fail' && "text-red-500"
      )}>
        {result.status === 'pass' && <CheckCircle className="h-5 w-5" />}
        {result.status === 'warning' && <AlertTriangle className="h-5 w-5" />}
        {result.status === 'fail' && <XCircle className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="font-medium">{label}</span>
          <Badge 
            variant="outline" 
            className={cn(
              result.status === 'pass' && "border-green-500 text-green-500",
              result.status === 'warning' && "border-yellow-500 text-yellow-500",
              result.status === 'fail' && "border-red-500 text-red-500"
            )}
          >
            {result.status.toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{result.message}</p>
        {result.maxValue > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  result.status === 'pass' && "bg-green-500",
                  result.status === 'warning' && "bg-yellow-500",
                  result.status === 'fail' && "bg-red-500"
                )}
                style={{ width: `${Math.min((result.currentValue / result.maxValue) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {result.currentValue.toFixed(1)}/{result.maxValue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PreEntryValidation({ onNext, onCancel }: PreEntryValidationProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const { data: tradingAccounts, isLoading: accountsLoading } = useTradingAccounts();
  const wizard = useTradeEntryWizard();
  const aiPreflight = useAIPreflight();
  
  const activeTradingAccounts = tradingAccounts?.filter(a => a.is_active) || [];
  const selectedAccount = activeTradingAccounts.find(a => a.id === selectedAccountId);
  const accountBalance = selectedAccount ? Number(selectedAccount.current_balance) : 0;

  const { runAllChecks, isLoading } = usePreTradeValidation({
    accountBalance,
  });

  const [validationResult, setValidationResult] = useState<ReturnType<typeof runAllChecks> | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [showAIPreflight, setShowAIPreflight] = useState(false);

  // Run validation when account is selected
  useEffect(() => {
    if (selectedAccountId && accountBalance > 0) {
      const result = runAllChecks();
      setValidationResult(result);
      setHasRun(true);
      wizard.setPreValidation(result);
      wizard.setTradingAccount(selectedAccountId, accountBalance);
    }
  }, [selectedAccountId, accountBalance]);

  // Run AI Pre-flight check
  const handleAIPreflight = async () => {
    if (!selectedAccountId) return;
    
    setShowAIPreflight(true);
    
    // Mock user history data - in production this would come from actual trade data
    const mockUserHistory = [
      { pair: 'BTC/USDT', winRate: 65, totalTrades: 24, avgWin: 150, avgLoss: 80 },
      { pair: 'ETH/USDT', winRate: 58, totalTrades: 18, avgWin: 120, avgLoss: 90 },
    ];
    
    await aiPreflight.mutateAsync({
      pair: 'BTC/USDT', // Will be updated in next step
      direction: 'LONG',
      userHistory: mockUserHistory,
      currentMarketConditions: {
        trend: 'bullish',
        volatility: 'moderate',
      },
    });
  };

  const handleNext = () => {
    if (validationResult?.canProceed) {
      onNext();
    }
  };

  const getAIVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'proceed': return 'text-green-500 border-green-500';
      case 'caution': return 'text-yellow-500 border-yellow-500';
      case 'skip': return 'text-red-500 border-red-500';
      default: return 'text-muted-foreground border-muted';
    }
  };

  const getAIVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'proceed': return '🟢';
      case 'caution': return '🟡';
      case 'skip': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Pre-Entry Validation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Select Trading Account
            </Label>
            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger>
                <SelectValue placeholder={accountsLoading ? "Loading..." : "Select trading account"} />
              </SelectTrigger>
              <SelectContent>
                {activeTradingAccounts.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No trading accounts found. Create a trading account first.
                  </div>
                )}
                {activeTradingAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span>{account.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ${Number(account.current_balance).toLocaleString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedAccountId && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a trading account to run pre-trade validation</p>
            </div>
          )}

          {selectedAccountId && isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Running validation checks...</span>
            </div>
          )}

          {hasRun && validationResult && (
            <div className="space-y-3">
              <ValidationItem
                result={validationResult.dailyLossCheck}
                label="Daily Loss Limit"
                icon={<span className="text-xs">📊</span>}
              />
              <ValidationItem
                result={validationResult.positionLimitCheck}
                label="Position Limit"
                icon={<span className="text-xs">📈</span>}
              />
              <ValidationItem
                result={validationResult.correlationCheck}
                label="Correlation Check"
                icon={<span className="text-xs">🔗</span>}
              />

              {/* AI Pre-flight Section */}
              <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="font-medium">AI Pre-flight Analysis</span>
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  </div>
                  {!showAIPreflight && !aiPreflight.data && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAIPreflight}
                      disabled={aiPreflight.isPending}
                    >
                      {aiPreflight.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-1" />
                          Run AI Check
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {aiPreflight.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your historical data and market conditions...
                  </div>
                )}

                {aiPreflight.data && (
                  <div className="space-y-3">
                    {/* AI Verdict */}
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      getAIVerdictColor(aiPreflight.data.verdict)
                    )}>
                      <span className="text-xl">{getAIVerdictIcon(aiPreflight.data.verdict)}</span>
                      <div>
                        <p className="font-semibold uppercase">{aiPreflight.data.verdict}</p>
                        <p className="text-sm opacity-80">Confidence: {aiPreflight.data.confidence}%</p>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          Win Prediction
                        </div>
                        <p className="text-lg font-bold text-green-500">
                          {aiPreflight.data.winPrediction}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Similar Setups</div>
                        <p className="text-lg font-bold">{aiPreflight.data.similarSetups.count}</p>
                        <p className="text-xs text-muted-foreground">
                          Avg Win: ${aiPreflight.data.similarSetups.avgWin}
                        </p>
                      </div>
                    </div>

                    {/* Market Regime */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground mb-1">Market Regime</div>
                      <p className="font-medium">{aiPreflight.data.marketRegime}</p>
                    </div>

                    {/* Reasoning */}
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">AI Reasoning:</p>
                      <p>{aiPreflight.data.reasoning}</p>
                    </div>
                  </div>
                )}

                {aiPreflight.error && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <XCircle className="h-4 w-4" />
                    Failed to run AI analysis. You can continue without it.
                  </div>
                )}

                {!showAIPreflight && !aiPreflight.data && !aiPreflight.isPending && (
                  <p className="text-sm text-muted-foreground">
                    Run AI analysis to get a verdict based on your historical performance and current market conditions.
                  </p>
                )}
              </div>

              {/* Overall Status */}
              <div className={cn(
                "mt-4 p-4 rounded-lg border-2 text-center",
                validationResult.overallStatus === 'pass' && "border-green-500 bg-green-500/10",
                validationResult.overallStatus === 'warning' && "border-yellow-500 bg-yellow-500/10",
                validationResult.overallStatus === 'fail' && "border-red-500 bg-red-500/10"
              )}>
                {validationResult.canProceed ? (
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <CheckCircle className="h-6 w-6" />
                    <span className="font-semibold text-lg">All Checks Passed - Ready to Trade</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-red-500">
                    <XCircle className="h-6 w-6" />
                    <span className="font-semibold text-lg">Cannot Proceed - Fix Issues Above</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!validationResult?.canProceed}
        >
          Next: Select Strategy
        </Button>
      </div>
    </div>
  );
}
