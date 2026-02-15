import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyValidationBadgeProps {
  score: number;
  missingCount?: number;
  className?: string;
}

const SCORE_TOOLTIP = "Score based on: entry rule count, exit rule presence, timeframe defined, pair specificity. Not a win rate prediction.";

export function StrategyValidationBadge({ 
  score, 
  missingCount = 0,
  className 
}: StrategyValidationBadgeProps) {
  const badge = score >= 80 ? (
    <Badge 
      variant="outline" 
      className={cn("bg-green-500/10 text-green-500 border-green-500/30", className)}
    >
      <CheckCircle className="h-3 w-3 mr-1" />
      Valid
    </Badge>
  ) : score >= 50 ? (
    <Badge 
      variant="outline" 
      className={cn("bg-yellow-500/10 text-yellow-500 border-yellow-500/30", className)}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      Incomplete{missingCount > 0 && ` (${missingCount})`}
    </Badge>
  ) : (
    <Badge 
      variant="outline" 
      className={cn("bg-red-500/10 text-red-500 border-red-500/30", className)}
    >
      <XCircle className="h-3 w-3 mr-1" />
      Invalid
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{SCORE_TOOLTIP}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
