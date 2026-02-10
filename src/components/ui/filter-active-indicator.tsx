/**
 * Filter Active Indicator
 * 
 * Visual badge component that displays when filters are active.
 * Ensures users always know they're viewing filtered data.
 * 
 * Nielsen Heuristic #1: Visibility of system status
 */
import { AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface FilterActiveIndicatorProps {
  /** Whether any filter is active */
  isActive: boolean;
  /** Active date range (if any) */
  dateRange?: DateRange;
  /** Number of non-date filters active */
  filterCount?: number;
  /** Custom scope label (overrides auto-generated text) */
  scopeLabel?: string;
  /** Callback to clear all filters */
  onClear?: () => void;
  /** Additional class names */
  className?: string;
}

export function FilterActiveIndicator({
  isActive,
  dateRange,
  filterCount = 0,
  scopeLabel,
  onClear,
  className,
}: FilterActiveIndicatorProps) {
  if (!isActive) return null;

  // Build display text
  const parts: string[] = [];
  
  // Date range
  if (dateRange?.from && dateRange?.to) {
    parts.push(`${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`);
  } else if (dateRange?.from) {
    parts.push(`From ${format(dateRange.from, "MMM d, yyyy")}`);
  } else if (dateRange?.to) {
    parts.push(`Until ${format(dateRange.to, "MMM d, yyyy")}`);
  }
  
  // Filter count
  if (filterCount > 0) {
    parts.push(`+${filterCount} filter${filterCount > 1 ? 's' : ''}`);
  }

  const displayText = scopeLabel 
    ? (parts.length > 0 ? `${scopeLabel} • ${parts.join(' • ')}` : scopeLabel)
    : (parts.length > 0 ? parts.join(' • ') : 'Filters active');

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-warning/10 border border-warning/30",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
      <span className="text-sm font-medium text-warning-foreground">
        Filtered View:
      </span>
      <span className="text-sm text-muted-foreground">
        {displayText}
      </span>
      {onClear && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 ml-auto text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

/**
 * Compact badge variant for inline use
 */
export function FilterActiveBadge({ 
  isActive, 
  className 
}: { 
  isActive: boolean;
  className?: string;
}) {
  if (!isActive) return null;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-warning/10 text-warning border-warning/30",
        className
      )}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      Filtered
    </Badge>
  );
}
