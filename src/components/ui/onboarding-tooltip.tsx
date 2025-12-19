/**
 * Onboarding Tooltip for Nielsen Heuristics:
 * #6: Recognition rather than recall
 * #10: Help and documentation
 */

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the target element
}

interface OnboardingTooltipProps {
  steps: OnboardingStep[];
  storageKey: string;
  onComplete?: () => void;
}

export function useOnboarding(storageKey: string) {
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(`onboarding_${storageKey}`);
    setHasCompleted(completed === "true");
  }, [storageKey]);

  const complete = () => {
    localStorage.setItem(`onboarding_${storageKey}`, "true");
    setHasCompleted(true);
  };

  const reset = () => {
    localStorage.removeItem(`onboarding_${storageKey}`);
    setHasCompleted(false);
  };

  return { hasCompleted, complete, reset };
}

export function OnboardingTooltip({
  steps,
  storageKey,
  onComplete,
}: OnboardingTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { hasCompleted, complete } = useOnboarding(storageKey);

  if (hasCompleted || steps.length === 0) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      complete();
      onComplete?.();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleSkip = () => {
    complete();
    onComplete?.();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="w-80 shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirst}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button size="sm" onClick={handleNext} className="gap-1">
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick tip component for contextual help
interface QuickTipProps {
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
  storageKey?: string;
}

export function QuickTip({ children, className, dismissible = true, storageKey }: QuickTipProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (storageKey) {
      const isDismissed = localStorage.getItem(`tip_${storageKey}`);
      setDismissed(isDismissed === "true");
    }
  }, [storageKey]);

  const handleDismiss = () => {
    if (storageKey) {
      localStorage.setItem(`tip_${storageKey}`, "true");
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3",
        className
      )}
    >
      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-muted-foreground">{children}</div>
      {dismissible && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 -mt-1 -mr-1"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
