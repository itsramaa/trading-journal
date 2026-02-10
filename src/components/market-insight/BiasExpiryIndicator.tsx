/**
 * BiasExpiryIndicator - Visual indicator for AI bias validity
 * Shows remaining time and expired state per Phase 5 spec
 */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BiasExpiryIndicatorProps {
  validUntil?: string;
  onExpired?: () => void;
  className?: string;
}

export function BiasExpiryIndicator({ validUntil, onExpired, className }: BiasExpiryIndicatorProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const expiryTime = validUntil ? new Date(validUntil).getTime() : 0;
  const remainingMs = expiryTime - now;
  const isExpired = !!validUntil && remainingMs <= 0;
  const isWarning = !!validUntil && !isExpired && remainingMs < 5 * 60 * 1000;

  useEffect(() => {
    if (isExpired && onExpired) {
      onExpired();
    }
  }, [isExpired, onExpired]);

  if (!validUntil) return null;

  const formatRemaining = () => {
    if (isExpired) return "Expired";
    const minutes = Math.floor(remainingMs / 60_000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 text-xs font-medium",
        isExpired && "border-destructive/50 text-destructive bg-destructive/10",
        isWarning && !isExpired && "border-chart-4/50 text-chart-4 bg-chart-4/10",
        !isExpired && !isWarning && "border-profit/50 text-profit bg-profit/10",
        className
      )}
    >
      {isExpired ? (
        <AlertTriangle className="h-3 w-3" />
      ) : isWarning ? (
        <Clock className="h-3 w-3" />
      ) : (
        <CheckCircle className="h-3 w-3" />
      )}
      {isExpired ? "Bias Expired — Refresh" : `Valid: ${formatRemaining()}`}
    </Badge>
  );
}
