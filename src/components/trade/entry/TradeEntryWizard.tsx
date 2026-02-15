/**
 * Trade Entry Wizard - Main Container
 * 5-step guided trade entry flow with Express Mode option
 * Enhanced: Heuristic Evaluation + Accessibility fixes + Analytics tracking
 */
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { logAuditEvent } from "@/lib/audit-logger";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { WizardProgress } from "./WizardProgress";
import { SetupStep } from "./SetupStep";
import { ConfluenceValidator } from "./ConfluenceValidator";
import { PositionSizingStep } from "./PositionSizingStep";
import { FinalChecklist } from "./FinalChecklist";
import { TradeConfirmation } from "./TradeConfirmation";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useTradingGate } from "@/hooks/use-trading-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, AlertTriangle, ShieldAlert, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { EXPRESS_STEPS, FULL_STEPS } from "@/types/trade-wizard";

interface TradeEntryWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

function TradingBlockedState({ reason, status, onClose }: { reason: string; status: string; onClose: () => void }) {
  const isDisabled = status === 'disabled';
  
  return (
    <div 
      className="flex flex-col h-full min-h-[400px]"
      role="alert"
      aria-live="assertive"
    >
      <div className={cn(
        "p-4 border-b bg-background",
        isDisabled ? "border-loss/30" : "border-[hsl(var(--chart-4))]/30"
      )}>
        <div className="flex items-center gap-2">
          <ShieldAlert className={cn("h-5 w-5", isDisabled ? "text-loss" : "text-[hsl(var(--chart-4))]")} aria-hidden="true" />
          <span className="font-semibold">Trade Entry Wizard</span>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className={cn(
          "max-w-md",
          isDisabled ? "border-loss/30 bg-loss/5" : "border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/5"
        )}>
          <CardHeader className="text-center">
            <div className={cn(
              "mx-auto mb-4 p-4 rounded-full",
              isDisabled ? "bg-loss/10" : "bg-[hsl(var(--chart-4))]/10"
            )}>
              {isDisabled ? (
                <XCircle className="h-12 w-12 text-loss" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-[hsl(var(--chart-4))]" aria-hidden="true" />
              )}
            </div>
            <CardTitle className={cn(isDisabled ? "text-loss" : "text-[hsl(var(--chart-4))]")}>
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
                  <Link to="/risk-analytics">
                    <ShieldAlert className="h-4 w-4 mr-2" aria-hidden="true" />
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
  const { currentStep, completedSteps, goToStep, nextStep, prevStep, reset, mode, setMode } = useTradeEntryWizard();
  const { canTrade, reason, status } = useTradingGate();
  const { user } = useAuth();
  const startTimeRef = useRef(Date.now());
  const hasTrackedStartRef = useRef(false);
  const prevStepRef = useRef(currentStep);

  const isExpressMode = mode === 'express';
  const activeSteps = isExpressMode ? EXPRESS_STEPS : FULL_STEPS;

  // Track wizard start + audit log
  useEffect(() => {
    if (!hasTrackedStartRef.current) {
      trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_START, { step: currentStep, mode });
      if (user?.id) {
        logAuditEvent(user.id, {
          action: 'trade_created',
          entityType: 'trade_entry',
          metadata: { wizard_event: 'started', mode },
        });
      }
      hasTrackedStartRef.current = true;
    }
    
    return () => {
      // Track abandonment if wizard is unmounted without completion
      if (hasTrackedStartRef.current && currentStep !== 'confirmation') {
        trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_ABANDON, {
          lastStep: currentStep,
          duration: Date.now() - startTimeRef.current,
          mode,
        });
        if (user?.id) {
          logAuditEvent(user.id, {
            action: 'trade_created',
            entityType: 'trade_entry',
            metadata: { wizard_event: 'abandoned', lastStep: currentStep, mode },
          });
        }
      }
    };
  }, []);

  // Track step changes via audit log
  useEffect(() => {
    if (prevStepRef.current !== currentStep && user?.id) {
      logAuditEvent(user.id, {
        action: 'trade_created',
        entityType: 'trade_entry',
        metadata: { wizard_event: 'step_changed', from: prevStepRef.current, to: currentStep, mode },
      });
      prevStepRef.current = currentStep;
    }
  }, [currentStep, user?.id, mode]);

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? 'express' : 'full');
    trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_START, { 
      mode: checked ? 'express' : 'full',
      switched: true,
    });
  };

  const handleCancel = useCallback(() => {
    trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_ABANDON, {
      lastStep: currentStep,
      duration: Date.now() - startTimeRef.current,
      mode,
    });
    reset();
    onClose();
  }, [reset, onClose, currentStep, mode]);

  const handleComplete = useCallback(async () => {
    trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_COMPLETE, {
      stepsCompleted: completedSteps.length,
      duration: Date.now() - startTimeRef.current,
      mode,
    });
    hasTrackedStartRef.current = false; // Prevent double-tracking
    reset();
    onComplete();
  }, [reset, onComplete, completedSteps, mode]);

  const handleStepClick = useCallback((step: typeof currentStep) => {
    // Only allow going back to completed steps
    if (completedSteps.includes(step)) {
      goToStep(step);
    }
  }, [completedSteps, goToStep]);

  // Check if trading is blocked (moved after all hooks)
  if (!canTrade && status === 'disabled') {
    return <TradingBlockedState reason={reason} status={status} onClose={onClose} />;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'setup':
        return (
          <SetupStep
            onNext={nextStep}
            onCancel={handleCancel}
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
    <div 
      className="flex flex-col h-full max-h-[85vh]"
      role="dialog"
      aria-label="Trade Entry Wizard"
      aria-describedby="wizard-description"
    >
      <span id="wizard-description" className="sr-only">
        A step-by-step wizard to help you enter trades with proper risk management and validation.
      </span>
      
      {/* Warning banner if in warning state */}
      {status === 'warning' && (
        <div 
          className="px-4 py-2 bg-[hsl(var(--chart-4))]/10 border-b border-[hsl(var(--chart-4))]/30 flex items-center gap-2"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" aria-hidden="true" />
          <span className="text-sm text-[hsl(var(--chart-4))]">{reason}</span>
        </div>
      )}
      
      {/* Progress Header with Mode Toggle */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="express-mode" className="text-sm font-medium cursor-pointer">
              Express Mode
            </Label>
            <Switch
              id="express-mode"
              checked={isExpressMode}
              onCheckedChange={handleModeToggle}
              disabled={currentStep !== 'setup'}
            />
            {isExpressMode && (
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                {activeSteps.length} steps
              </Badge>
            )}
          </div>
          {isExpressMode && (
            <p className="text-xs text-muted-foreground">
              Quick entry without AI validation
            </p>
          )}
        </div>
        <WizardProgress
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          steps={activeSteps}
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
