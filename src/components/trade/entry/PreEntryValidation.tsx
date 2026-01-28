/**
 * Step 1: Pre-Entry Validation
 * Auto-checks daily loss limits, position limits, and correlation
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, AlertTriangle, Loader2, ShieldCheck, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreTradeValidation } from "@/features/trade/usePreTradeValidation";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useTradingAccounts } from "@/hooks/use-trading-accounts";
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
  
  const activeTradingAccounts = tradingAccounts?.filter(a => a.is_active) || [];
  const selectedAccount = activeTradingAccounts.find(a => a.id === selectedAccountId);
  const accountBalance = selectedAccount ? Number(selectedAccount.current_balance) : 0;

  const { runAllChecks, isLoading } = usePreTradeValidation({
    accountBalance,
  });

  const [validationResult, setValidationResult] = useState<ReturnType<typeof runAllChecks> | null>(null);
  const [hasRun, setHasRun] = useState(false);

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

  const handleNext = () => {
    if (validationResult?.canProceed) {
      onNext();
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
