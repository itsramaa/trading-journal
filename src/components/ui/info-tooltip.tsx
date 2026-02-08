/**
 * Info Tooltip for Nielsen Heuristics:
 * #6: Recognition rather than recall
 * #10: Help and documentation
 */

import { forwardRef } from "react";
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

export const InfoTooltip = forwardRef<HTMLButtonElement, InfoTooltipProps>(
  function InfoTooltip({ content, side = "top", variant = "info", className }, ref) {
    const Icon = variant === "help" ? HelpCircle : variant === "warning" ? AlertCircle : Info;
    
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              ref={ref}
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
);

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

// Trading-specific tooltips
export function RiskRewardTooltip() {
  return (
    <InfoTooltip
      content="Risk-to-Reward (R:R) Ratio measures potential profit relative to potential loss. A 2:1 ratio means you could gain $2 for every $1 risked. Higher ratios (2:1+) are generally preferred."
    />
  );
}

export function ConfluenceScoreTooltip() {
  return (
    <InfoTooltip
      content="Confluence Score (1-5) indicates how many entry conditions align. Higher scores suggest stronger trade setups. A score of 4+ is recommended before entering a trade."
    />
  );
}

export function FearGreedTooltip() {
  return (
    <InfoTooltip
      content="Fear & Greed Index (0-100) measures market sentiment. <25 = Extreme Fear (potential buy signal), >75 = Extreme Greed (potential sell signal). Use for contrarian strategies."
    />
  );
}

export function LeverageTooltip() {
  return (
    <InfoTooltip
      content="Leverage multiplies both gains and losses. 10x leverage means a 1% price move equals 10% account change. Higher leverage = higher risk of liquidation."
      variant="warning"
    />
  );
}

export function LiquidationPriceTooltip() {
  return (
    <InfoTooltip
      content="Liquidation price is where your position is automatically closed to prevent further losses. Keep adequate margin and use stop losses before this level."
      variant="warning"
    />
  );
}

export function DrawdownTooltip() {
  return (
    <InfoTooltip
      content="Drawdown measures the peak-to-trough decline in your account value. A 10% max drawdown means your account dropped 10% from its highest point before recovering."
    />
  );
}

export function WinRateTooltip() {
  return (
    <InfoTooltip
      content="Win Rate is the percentage of profitable trades. A 60% win rate means 6 out of 10 trades were winners. Combined with R:R, this determines overall profitability."
    />
  );
}

export function ProfitFactorTooltip() {
  return (
    <InfoTooltip
      content="Profit Factor = Gross Profits ÷ Gross Losses. A factor >1 means profitable. 1.5+ is good, 2.0+ is excellent. Below 1 means losing money overall."
    />
  );
}

export function AIQualityScoreTooltip() {
  return (
    <InfoTooltip
      content="AI Quality Score (0-100%) rates your trade based on setup quality, risk management, and market conditions. 80%+ = Excellent, 60-79% = Good, <60% = Needs improvement."
    />
  );
}

export function PositionSizeTooltip() {
  return (
    <InfoTooltip
      content="Position Size is the amount of capital allocated to a single trade. Proper sizing (typically 1-2% risk per trade) protects your account from large losses."
    />
  );
}

export function StopLossTooltip() {
  return (
    <InfoTooltip
      content="Stop Loss is a predetermined exit price to limit losses. Setting a stop loss before entering ensures you don't lose more than planned if the trade goes wrong."
    />
  );
}

export function TakeProfitTooltip() {
  return (
    <InfoTooltip
      content="Take Profit is a predetermined exit price to lock in gains. It ensures you capture profits before the market reverses. Often set based on R:R ratio targets."
    />
  );
}
