/**
 * Trade Entry Wizard - Main Container
 * 7-step guided trade entry flow
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

interface TradeEntryWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export function TradeEntryWizard({ onClose, onComplete }: TradeEntryWizardProps) {
  const { currentStep, completedSteps, goToStep, nextStep, prevStep, reset } = useTradeEntryWizard();

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
