/**
 * Quick Reference R-Values - Position Size Calculator
 * Uses centralized currency conversion for user's preferred currency
 */
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface QuickReferenceRProps {
  potential1R: number;
  potential2R: number;
  potential3R: number;
}

export function QuickReferenceR({ potential1R, potential2R, potential3R }: QuickReferenceRProps) {
  const { formatCompact } = useCurrencyConversion();

  const rValues = [
    {
      label: '1R',
      value: potential1R,
      tooltip: '1R is your base risk unit. If you risk $100, then 1R = $100 profit. Use R-multiples to measure trade performance consistently.',
    },
    {
      label: '2R',
      value: potential2R,
      tooltip: '2R means you made twice your risk. A 2:1 reward-to-risk trade. This is often the minimum target for professional traders.',
    },
    {
      label: '3R',
      value: potential3R,
      tooltip: '3R means you made three times your risk. Excellent trades reach 3R+. Even with 40% win rate, 3R winners are highly profitable.',
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick reference R-values">
        {rValues.map(({ label, value, tooltip }) => (
          <Tooltip key={label} delayDuration={300}>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="cursor-help"
                tabIndex={0}
              >
                {label} = {formatCompact(value)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
