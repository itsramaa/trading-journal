/**
 * Rate Limit Display Component
 * Shows current API usage status with visual progress bars
 */

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApiRateLimit, getResetTimeRemaining, formatResetTime, type RateLimitStatus } from '@/hooks/use-api-rate-limit';
import { Activity } from 'lucide-react';

interface RateLimitItemProps {
  status: RateLimitStatus;
}

function RateLimitItem({ status }: RateLimitItemProps) {
  const [resetTime, setResetTime] = useState(getResetTimeRemaining(status.reset_at));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setResetTime(getResetTimeRemaining(status.reset_at));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status.reset_at]);
  
  const usagePercent = Math.min(100, status.usage_percent);
  const isWarning = usagePercent > 70;
  const isCritical = usagePercent > 90;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize font-medium">{status.endpoint_category}</span>
        <div className="flex items-center gap-2">
          <span className={isCritical ? 'text-destructive' : isWarning ? 'text-[hsl(var(--chart-4))]' : 'text-muted-foreground'}>
            {status.weight_used} / {status.max_weight}
          </span>

          {resetTime > 0 && (
            <Badge variant="outline" className="text-xs">
              {formatResetTime(resetTime)}
            </Badge>
          )}
        </div>
      </div>
      <Progress 
        value={usagePercent} 
        className={`h-2 ${isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-warning' : ''}`}
      />
    </div>
  );
}

interface RateLimitDisplayProps {
  exchange?: string;
}

export function RateLimitDisplay({ exchange = 'binance' }: RateLimitDisplayProps) {
  const { data: rateLimits, isLoading } = useApiRateLimit(exchange);
  
  if (isLoading || !rateLimits || rateLimits.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          API Usage (Current Window)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rateLimits.map((status) => (
          <RateLimitItem key={status.endpoint_category} status={status} />
        ))}
      </CardContent>
    </Card>
  );
}
