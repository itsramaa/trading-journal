/**
 * PerformanceOnboardingTour — Interactive walkthrough for analytics features
 * Uses the existing OnboardingTooltip system with Performance-specific steps.
 */
import { OnboardingTooltip, useOnboarding } from "@/components/ui/onboarding-tooltip";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "performance-analytics";

const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Performance Analytics",
    description:
      "This is your command center for trading insights. Let's walk through the key features so you can get the most out of your data.",
  },
  {
    id: "filters",
    title: "Analytics Scope & Filters",
    description:
      "Use the level selector to switch between Overall, Per Account, Per Exchange, or Paper vs. Live views. Combine with date ranges and strategy filters for precision analysis.",
  },
  {
    id: "summary",
    title: "Performance Summary",
    description:
      "The summary card gives you a rule-based verdict on your trading edge — whether you're 'Consistent', have a 'Thin Edge', or need improvement. It's your quick health check.",
  },
  {
    id: "behavior",
    title: "Trading Behavior Analytics",
    description:
      "Analyze your trade duration patterns, Long vs. Short distribution, and order type performance. Understand your habits to improve decision-making.",
  },
  {
    id: "streaks",
    title: "Streak Analysis",
    description:
      "Track consecutive wins and losses, see how streaks affect your average P&L, and identify if you trade better or worse during hot/cold runs.",
  },
  {
    id: "tilt",
    title: "Tilt Detection",
    description:
      "AI-powered revenge trading detection. Monitors frequency escalation, sizing changes, loss sequences, and session drift to alert you when emotions may be driving decisions.",
  },
  {
    id: "whatif",
    title: "What-If Simulator",
    description:
      "Test hypothetical scenarios: 'What if my SL was 20% tighter?', 'What if I skipped low-confluence trades?', or 'What if I only took ≥2R setups?' See the projected impact instantly.",
  },
  {
    id: "equity",
    title: "Equity Curve & Sessions",
    description:
      "Visualize your cumulative P&L over time, analyze performance by trading session (Tokyo, London, New York), and spot patterns in your trading heatmap.",
  },
  {
    id: "risk",
    title: "Risk Analysis",
    description:
      "The Correlation Matrix shows pair-to-pair risk exposure, while the Drawdown Chart tracks your worst peak-to-trough declines. Essential for managing portfolio risk.",
  },
  {
    id: "tabs",
    title: "Explore More Tabs",
    description:
      "Don't forget the Monthly, Context, and Strategies tabs for deeper breakdowns by time period, market conditions, and individual strategy performance. Happy trading!",
  },
];

export function PerformanceOnboardingTour() {
  return (
    <OnboardingTooltip
      steps={TOUR_STEPS}
      storageKey={STORAGE_KEY}
    />
  );
}

export function ReplayTourButton() {
  const { hasCompleted, reset } = useOnboarding(STORAGE_KEY);

  if (!hasCompleted) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset}>
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Replay the analytics tour</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
