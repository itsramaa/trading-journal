/**
 * Trade Entry Wizard - Main Container
 * 7-step guided trade entry flow with trading gate check
 */
import { useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WizardProgress } from "./WizardProgress";
import { PreEntryValidation } from "./PreEntryValidation";
import { StrategySelection } from "./StrategySelection";
import { TradeDetails } from "./TradeDetails";
import { ConfluenceValidator } from "./ConfluenceValidator";
import { PositionSizingStep } from "./PositionSizingStep";
import { FinalChecklist } from "./FinalChecklist";
import { TradeConfirmation } from "./TradeConfirmation";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useTradingGate } from "@/hooks/use-trading-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface TradeEntryWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

function TradingBlockedState({ reason, status, onClose }: { reason: string; status: string; onClose: () => void }) {
  const isDisabled = status === 'disabled';
  
  return (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <ShieldAlert className={isDisabled ? "h-5 w-5 text-red-500" : "h-5 w-5 text-yellow-500"} />
          <span className="font-semibold">Trade Entry Wizard</span>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className={isDisabled ? "border-red-500/30 bg-red-500/5 max-w-md" : "border-yellow-500/30 bg-yellow-500/5 max-w-md"}>
          <CardHeader className="text-center">
            <div className={isDisabled ? "mx-auto mb-4 p-4 rounded-full bg-red-500/10" : "mx-auto mb-4 p-4 rounded-full bg-yellow-500/10"}>
              {isDisabled ? (
                <XCircle className="h-12 w-12 text-red-500" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-yellow-500" />
              )}
            </div>
            <CardTitle className={isDisabled ? "text-red-500" : "text-yellow-500"}>
              {isDisabled ? "Trading Disabled" : "Trading Warning"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              {reason || "You have reached your daily loss limit. Trading is disabled for today to protect your capital."}
            </p>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {isDisabled 
                  ? "Trading will be re-enabled tomorrow at 00:00 UTC."
                  : "You can still trade, but proceed with caution."}
              </p>
              
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link to="/risk">
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    View Risk Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TradeEntryWizard({ onClose, onComplete }: TradeEntryWizardProps) {
  const { currentStep, completedSteps, goToStep, nextStep, prevStep, reset } = useTradeEntryWizard();
  const { canTrade, reason, status } = useTradingGate();

  // Check if trading is blocked
  if (!canTrade && status === 'disabled') {
    return <TradingBlockedState reason={reason} status={status} onClose={onClose} />;
  }

  const handleCancel = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleComplete = useCallback(async () => {
    reset();
    onComplete();
  }, [reset, onComplete]);

  const handleStepClick = useCallback((step: typeof currentStep) => {
    // Only allow going back to completed steps
    if (completedSteps.includes(step)) {
      goToStep(step);
    }
  }, [completedSteps, goToStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 'pre-validation':
        return (
          <PreEntryValidation
            onNext={nextStep}
            onCancel={handleCancel}
          />
        );
      case 'strategy':
        return (
          <StrategySelection
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'details':
        return (
          <TradeDetails
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'confluence':
        return (
          <ConfluenceValidator
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'sizing':
        return (
          <PositionSizingStep
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'checklist':
        return (
          <FinalChecklist
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'confirmation':
        return (
          <TradeConfirmation
            onExecute={handleComplete}
            onBack={prevStep}
            onCancel={handleCancel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Warning banner if in warning state */}
      {status === 'warning' && (
        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-yellow-500">{reason}</span>
        </div>
      )}
      
      {/* Progress Header */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <WizardProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Step Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {renderStep()}
        </div>
      </ScrollArea>
    </div>
  );
}
