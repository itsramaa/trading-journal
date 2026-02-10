/**
 * TradeRatingBadge - Reusable badge for displaying A-F trade rating
 */
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const RATING_STYLES: Record<string, string> = {
  A: "border-profit text-profit",
  B: "border-profit/60 text-profit/80",
  C: "border-chart-4/60 text-chart-4",
  D: "border-chart-5/60 text-chart-5",
  F: "border-loss text-loss",
};

interface TradeRatingBadgeProps {
  rating: string | null | undefined;
  className?: string;
}

export function TradeRatingBadge({ rating, className }: TradeRatingBadgeProps) {
  if (!rating) return null;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-xs", RATING_STYLES[rating] || "", className)}
    >
      <Star className="h-3 w-3" />
      {rating}
    </Badge>
  );
}
