/**
 * Interactive Tour - Step-by-step guided walkthrough with spotlight overlay
 * Highlights actual DOM elements and provides contextual explanations
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the target element to highlight */
  target: string;
  /** Position of the tooltip relative to the target */
  position?: "top" | "bottom" | "left" | "right";
}

interface InteractiveTourProps {
  steps: TourStep[];
  storageKey: string;
  onComplete?: () => void;
}

function getTooltipPosition(
  rect: DOMRect,
  position: TourStep["position"] = "bottom",
  tooltipWidth: number = 320,
  tooltipHeight: number = 180
) {
  const padding = 12;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (position) {
    case "top":
      top = rect.top - tooltipHeight - padding;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case "bottom":
      top = rect.bottom + padding;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - padding;
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + padding;
      break;
  }

  // Clamp within viewport
  left = Math.max(12, Math.min(left, viewportW - tooltipWidth - 12));
  top = Math.max(12, Math.min(top, viewportH - tooltipHeight - 12));

  // If tooltip overlaps target when on bottom, try top
  if (position === "bottom" && top < rect.bottom + padding) {
    const altTop = rect.top - tooltipHeight - padding;
    if (altTop > 12) top = altTop;
  }

  return { top, left };
}

export function InteractiveTour({
  steps,
  storageKey,
  onComplete,
}: InteractiveTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if tour was completed
  useEffect(() => {
    const completed = localStorage.getItem(`tour_${storageKey}`);
    if (completed !== "true") {
      // Auto-start for first-time users after a delay
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const updateTargetRect = useCallback(() => {
    if (!isActive || !steps[currentStep]) return;
    const el = document.querySelector(steps[currentStep].target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Scroll element into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep, steps]);

  useEffect(() => {
    updateTargetRect();
    // Update on resize/scroll
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);
    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [updateTargetRect]);

  // Re-measure after scroll settles
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(updateTargetRect, 400);
    return () => clearTimeout(timer);
  }, [currentStep, isActive, updateTargetRect]);

  const completeTour = useCallback(() => {
    localStorage.setItem(`tour_${storageKey}`, "true");
    setIsActive(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  const handleNext = () => {
    if (currentStep >= steps.length - 1) {
      completeTour();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!isActive) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const spotlightPadding = 8;

  const tooltipPos = targetRect
    ? getTooltipPosition(targetRect, step.position)
    : { top: window.innerHeight / 2 - 90, left: window.innerWidth / 2 - 160 };

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-label="Interactive tour">
      {/* Overlay with spotlight cutout using CSS clip-path */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-all duration-300"
        onClick={handleSkip}
        style={
          targetRect
            ? {
                clipPath: `polygon(
                  0% 0%, 0% 100%, 
                  ${targetRect.left - spotlightPadding}px 100%, 
                  ${targetRect.left - spotlightPadding}px ${targetRect.top - spotlightPadding}px, 
                  ${targetRect.right + spotlightPadding}px ${targetRect.top - spotlightPadding}px, 
                  ${targetRect.right + spotlightPadding}px ${targetRect.bottom + spotlightPadding}px, 
                  ${targetRect.left - spotlightPadding}px ${targetRect.bottom + spotlightPadding}px, 
                  ${targetRect.left - spotlightPadding}px 100%, 
                  100% 100%, 100% 0%
                )`,
              }
            : undefined
        }
      />

      {/* Spotlight border ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - spotlightPadding,
            left: targetRect.left - spotlightPadding,
            width: targetRect.width + spotlightPadding * 2,
            height: targetRect.height + spotlightPadding * 2,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute w-80 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-xl border bg-card shadow-xl p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{step.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {currentStep + 1} / {steps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleSkip}
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Progress bar */}
          <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={isFirst}
              className="gap-1 h-8 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <div className="flex gap-2">
              {!isLast && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Skip
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="gap-1 h-8 text-xs">
                {isLast ? "Done!" : "Next"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Button to restart the tour manually */
export function TourTriggerButton({
  storageKey,
  onStart,
  className,
}: {
  storageKey: string;
  onStart: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-1.5 h-7 text-xs", className)}
      onClick={() => {
        localStorage.removeItem(`tour_${storageKey}`);
        onStart();
      }}
    >
      <Play className="h-3 w-3" />
      Tour
    </Button>
  );
}
