/**
 * TradeRatingSection - A-F trade quality self-assessment
 */
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const TRADE_RATINGS = [
  { value: "A", label: "A", description: "Perfect execution", color: "text-profit border-profit" },
  { value: "B", label: "B", description: "Good, minor flaws", color: "text-profit/80 border-profit/60" },
  { value: "C", label: "C", description: "Average", color: "text-chart-4 border-chart-4/60" },
  { value: "D", label: "D", description: "Below average", color: "text-chart-5 border-chart-5/60" },
  { value: "F", label: "F", description: "Poor execution", color: "text-loss border-loss" },
];

interface TradeRatingSectionProps {
  rating: string;
  onRatingChange: (rating: string) => void;
}

export function TradeRatingSection({ rating, onRatingChange }: TradeRatingSectionProps) {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Star className="h-4 w-4" />
        Trade Rating
      </Label>
      <div className="flex gap-2">
        {TRADE_RATINGS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => onRatingChange(r.value === rating ? "" : r.value)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition-colors cursor-pointer",
              rating === r.value
                ? `bg-primary/10 ${r.color} border-current`
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <span className="text-sm font-bold">{r.label}</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{r.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
