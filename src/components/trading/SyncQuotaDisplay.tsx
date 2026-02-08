/**
 * SyncQuotaDisplay - Shows remaining daily sync quota
 * Displays usage bar and remaining count with warnings
 */
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { useSyncQuota } from "@/hooks/use-sync-quota";
import { cn } from "@/lib/utils";

interface SyncQuotaDisplayProps {
  compact?: boolean;
  className?: string;
}

export function SyncQuotaDisplay({ compact = false, className }: SyncQuotaDisplayProps) {
  const { data: quota, isLoading } = useSyncQuota();

  if (isLoading || !quota) {
    return null;
  }

  const { currentCount, maxQuota, remaining, usagePercent, isExhausted } = quota;

  // Determine status color
  const getStatusColor = () => {
    if (isExhausted) return "destructive";
    if (usagePercent >= 80) return "warning";
    return "default";
  };

  const statusColor = getStatusColor();
  const progressColor = isExhausted 
    ? "bg-destructive" 
    : usagePercent >= 80 
      ? "bg-warning" 
      : "bg-primary";

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 cursor-help",
                isExhausted && "bg-destructive/10 border-destructive/30 text-destructive",
                usagePercent >= 80 && !isExhausted && "bg-warning/10 border-warning/30 text-warning",
                className
              )}
            >
              <Zap className="h-3 w-3" />
              <span className="text-xs font-mono">{remaining}/{maxQuota}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1.5">
              <p className="font-medium">Daily Sync Quota</p>
              <div className="flex items-center gap-2">
                <Progress value={usagePercent} className="w-24 h-1.5" />
                <span className="text-xs text-muted-foreground">{usagePercent.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {remaining} syncs remaining today
              </p>
              {isExhausted && (
                <p className="text-xs text-destructive">
                  Quota resets at midnight UTC
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg border bg-muted/30", className)}>
      <div className={cn(
        "p-2 rounded-md",
        isExhausted ? "bg-destructive/10" : "bg-primary/10"
      )}>
        {isExhausted ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <Zap className="h-4 w-4 text-primary" />
        )}
      </div>
      
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Daily Sync Quota</span>
          <span className={cn(
            "text-sm font-mono",
            isExhausted && "text-destructive",
            usagePercent >= 80 && !isExhausted && "text-warning"
          )}>
            {remaining}/{maxQuota}
          </span>
        </div>
        <Progress 
          value={usagePercent} 
          className="h-1.5"
        />
        <p className="text-xs text-muted-foreground">
          {isExhausted 
            ? "Quota exhausted - resets at midnight UTC" 
            : `${remaining} syncs remaining today`
          }
        </p>
      </div>
    </div>
  );
}

/**
 * Inline quota indicator for use in headers/toolbars
 */
export function SyncQuotaInline() {
  const { data: quota, isLoading } = useSyncQuota();

  if (isLoading || !quota) return null;

  const { remaining, maxQuota, isExhausted } = quota;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isExhausted ? "text-destructive" : "text-muted-foreground"
          )}>
            <Zap className="h-3 w-3" />
            <span className="font-mono">{remaining}/{maxQuota}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Daily sync quota: {remaining} remaining</p>
          {isExhausted && (
            <p className="text-destructive text-xs mt-1">Resets at midnight UTC</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
