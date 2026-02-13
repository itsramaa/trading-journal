/**
 * ContextualOnboardingGuide - Collapsible onboarding banner for contextual analytics
 * Shows first-time users how to read contextual analytics data.
 * Dismissed state persisted via localStorage.
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Activity,
  Calendar,
  Lightbulb,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "contextual-analytics-onboarding-dismissed";

export function ContextualOnboardingGuide() {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20 bg-primary/5">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/10 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold">How to Read Contextual Analytics</span>
              <Badge variant="secondary" className="text-xs">New</Badge>
            </div>
            <div className="flex items-center gap-2">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Contextual Analytics correlates your trading performance with market conditions,
              helping you discover <strong>when</strong> you trade best.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* Fear/Greed */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Fear & Greed Index</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures market sentiment (0-100). See if you perform better in fearful or greedy markets.
                  </p>
                </div>
              </div>

              {/* Volatility */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border">
                <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Volatility Level</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Low/Medium/High volatility regimes. Find your optimal trading conditions.
                  </p>
                </div>
              </div>

              {/* Events */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border">
                <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Economic Events</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare your performance on high-impact event days vs. normal days.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">How to read:</strong> Win rate bars above 50% mean you have an edge in that condition. 
                Correlation values close to +1.0 or -1.0 indicate strong relationships between market conditions and your performance.
              </p>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleDismiss} className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                Got it, dismiss
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
