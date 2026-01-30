import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyValidationBadgeProps {
  score: number;
  missingCount?: number;
  className?: string;
}

export function StrategyValidationBadge({ 
  score, 
  missingCount = 0,
  className 
}: StrategyValidationBadgeProps) {
  if (score >= 80) {
    return (
      <Badge 
        variant="outline" 
        className={cn("bg-green-500/10 text-green-500 border-green-500/30", className)}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        Valid
      </Badge>
    );
  }

  if (score >= 50) {
    return (
      <Badge 
        variant="outline" 
        className={cn("bg-yellow-500/10 text-yellow-500 border-yellow-500/30", className)}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        Incomplete{missingCount > 0 && ` (${missingCount})`}
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("bg-red-500/10 text-red-500 border-red-500/30", className)}
    >
      <XCircle className="h-3 w-3 mr-1" />
      Invalid
    </Badge>
  );
}
