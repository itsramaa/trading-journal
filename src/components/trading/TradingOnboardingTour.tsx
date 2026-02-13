/**
 * TradingOnboardingTour - First-time user tour for /trading page
 * Shows quick action cards + tooltip-style highlights for core features.
 * Dismissed state persisted via localStorage.
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wand2,
  History,
  Calculator,
  BookOpen,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const STORAGE_KEY = "trading-onboarding-tour-dismissed";

interface QuickAction {
  icon: typeof Wand2;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

interface TradingOnboardingTourProps {
  onNewTrade?: () => void;
}

export function TradingOnboardingTour({ onNewTrade }: TradingOnboardingTourProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash
  const [step, setStep] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const quickActions: QuickAction[] = [
    {
      icon: Wand2,
      title: "New Trade",
      description: "Open the Trade Entry Wizard to log your first trade with AI validation",
      onClick: () => { onNewTrade?.(); handleDismiss(); },
    },
    {
      icon: History,
      title: "Trade History",
      description: "Review closed trades, add notes, and track your journaling progress",
      href: "/history",
    },
    {
      icon: Calculator,
      title: "Risk Calculator",
      description: "Calculate position sizes based on your risk profile and market conditions",
      href: "/risk-calculator",
    },
  ];

  const tourSteps = [
    {
      title: "Welcome to Your Trading Journal",
      description: "This is your command center for managing trades. The Active tab shows live positions, while Pending shows orders waiting to fill.",
    },
    {
      title: "AI-Powered Trade Entry",
      description: "The Trade Entry Wizard validates your setup with AI Pre-flight checks — scoring expectancy and warning about negative edge before you commit.",
    },
    {
      title: "Quick Actions",
      description: "Use these shortcuts to jump into the most common trading workflows. You can always find them in the sidebar navigation too.",
    },
  ];

  const currentStep = tourSteps[step];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        {/* Tour header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">{currentStep.title}</span>
            <Badge variant="secondary" className="text-xs">
              {step + 1}/{tourSteps.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{currentStep.description}</p>

        {/* Quick action cards — shown on step 2 (last step) */}
        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {quickActions.map((action) => {
              const content = (
                <div
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg bg-background/60 border cursor-pointer",
                    "hover:bg-background/80 hover:border-primary/30 transition-colors"
                  )}
                  onClick={action.onClick}
                >
                  <action.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-1">
                      {action.title}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </div>
                </div>
              );

              return action.href ? (
                <Link key={action.title} to={action.href} onClick={handleDismiss}>
                  {content}
                </Link>
              ) : (
                <div key={action.title}>{content}</div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
                Back
              </Button>
            )}
            {step < tourSteps.length - 1 ? (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s + 1)}>
                Next
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleDismiss} className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Got it, let's trade!
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
