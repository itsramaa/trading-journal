/**
 * Info Tooltip for Nielsen Heuristics:
 * #6: Recognition rather than recall
 * #10: Help and documentation
 */

import { HelpCircle, Info, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  variant?: "info" | "help" | "warning";
  className?: string;
}

export function InfoTooltip({
  content,
  side = "top",
  variant = "info",
  className,
}: InfoTooltipProps) {
  const Icon = variant === "help" ? HelpCircle : variant === "warning" ? AlertCircle : Info;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-0.5 transition-colors",
              "text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              variant === "warning" && "text-yellow-500 hover:text-yellow-400",
              className
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">More information</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Pre-configured tooltips for common financial terms
export function ProfitLossTooltip() {
  return (
    <InfoTooltip
      content="Profit/Loss shows the difference between your current value and total cost basis. Green indicates profit, red indicates loss."
    />
  );
}

export function AllocationTooltip() {
  return (
    <InfoTooltip
      content="Allocation shows what percentage of your total portfolio value each asset or category represents."
    />
  );
}

export function AvgCostTooltip() {
  return (
    <InfoTooltip
      content="Average cost is calculated by dividing your total investment by the number of units purchased. This is used to calculate your profit/loss."
    />
  );
}

export function CAGRTooltip() {
  return (
    <InfoTooltip
      content="CAGR (Compound Annual Growth Rate) represents the average annual return of your portfolio over time, assuming profits were reinvested."
    />
  );
}

export function DayChangeTooltip() {
  return (
    <InfoTooltip
      content="Day change shows how much your portfolio value has changed in the last 24 hours based on price movements."
    />
  );
}
