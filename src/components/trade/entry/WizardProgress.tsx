/**
 * Wizard Progress Indicator Component
 */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, STEP_LABELS, type WizardStep } from "@/types/trade-wizard";

interface WizardProgressProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepClick?: (step: WizardStep) => void;
  steps?: WizardStep[];
}

export function WizardProgress({ 
  currentStep, 
  completedSteps, 
  onStepClick,
  steps = WIZARD_STEPS,
}: WizardProgressProps) {
  const currentStepIndex = steps.indexOf(currentStep) + 1;
  const totalSteps = steps.length;
  
  return (
    <nav 
      className="w-full"
      role="navigation"
      aria-label={`Trade entry progress: Step ${currentStepIndex} of ${totalSteps}, ${STEP_LABELS[currentStep]}`}
    >
      {/* Desktop view */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;
          const isClickable = isCompleted || isCurrent;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Step indicator */}
              <button
                onClick={() => isClickable && onStepClick?.(step)}
                disabled={!isClickable}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${STEP_LABELS[step]}: ${isCompleted ? "Completed" : isCurrent ? "Current step" : "Not started"}`}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-all",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && !isCompleted && "border-primary text-primary bg-primary/10",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground bg-background",
                  isClickable && "cursor-pointer hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{index + 1}</span>
                )}
              </button>
              
              {/* Step label */}
              <span
                className={cn(
                  "ml-2 text-sm font-medium whitespace-nowrap",
                  isCurrent && "text-primary",
                  isCompleted && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}
              >
                {STEP_LABELS[step]}
              </span>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-3",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view - compact */}
      <div className="md:hidden">
        <div className="flex items-center justify-center gap-2 mb-2">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step);
            const isCurrent = step === currentStep;

            return (
              <div
                key={step}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isCompleted && "bg-primary",
                  isCurrent && !isCompleted && "bg-primary w-4",
                  !isCompleted && !isCurrent && "bg-muted-foreground/30"
                )}
              />
            );
          })}
        </div>
        <div className="text-center">
          <span className="text-sm font-medium text-primary">
            Step {steps.indexOf(currentStep) + 1}/{steps.length}: {STEP_LABELS[currentStep]}
          </span>
        </div>
      </div>
    </nav>
  );
}
