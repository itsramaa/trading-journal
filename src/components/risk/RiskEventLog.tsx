/**
 * Risk Event Log - Displays history of risk events + Binance liquidations + Margin History
 * System-First: Risk Events tab works without Binance, Liquidations/Margin require connection
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Shield, XCircle, CheckCircle, Clock, Skull, TrendingDown, Wallet, Wifi } from "lucide-react";
import { useRiskEvents } from "@/hooks/use-risk-events";
import { useBinanceForceOrders, useBinanceConnectionStatus } from "@/features/binance";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MarginHistoryTab } from "./MarginHistoryTab";
import { Link } from "react-router-dom";

const eventTypeConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
  warning_70: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Warning (70%)',
  },
  warning_90: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    label: 'Danger (90%)',
  },
  limit_reached: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Limit Reached',
  },
  trading_disabled: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Trading Disabled',
  },
  trading_enabled: {
    icon: CheckCircle,
    color: 'text-green-500',
    label: 'Trading Enabled',
  },
  position_limit_warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Position Limit',
  },
  correlation_warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Correlation Warning',
  },
  liquidation: {
    icon: Skull,
    color: 'text-red-500',
    label: 'Liquidation',
  },
  adl: {
    icon: TrendingDown,
    color: 'text-orange-500',
    label: 'ADL',
  },
};

export function RiskEventLog() {
  const { events, isLoading } = useRiskEvents();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConfigured = connectionStatus?.isConfigured ?? false;
  
  // Only fetch Binance data when configured
  const { data: forceOrders, isLoading: liquidationsLoading } = useBinanceForceOrders(
    { limit: 50 },
    { enabled: isConfigured }
  );

  const hasLiquidations = forceOrders && forceOrders.length > 0;

  if (isLoading && liquidationsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Event Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Event Log
        </CardTitle>
        <CardDescription>
          Risk events, threshold breaches, and liquidation history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">
              Risk Events
              {events && events.length > 0 && (
                <Badge variant="secondary" className="ml-2">{events.length}</Badge>
              )}
            </TabsTrigger>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value="liquidations" disabled={!isConfigured}>
                    Liquidations
                    {hasLiquidations && (
                      <Badge variant="destructive" className="ml-2">{forceOrders.length}</Badge>
                    )}
                    {!isConfigured && <Wifi className="h-3 w-3 ml-1 opacity-50" />}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!isConfigured && (
                <TooltipContent>
                  <p>Connect Binance to view liquidation history</p>
                </TooltipContent>
              )}
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <TabsTrigger value="margin" className="gap-1" disabled={!isConfigured}>
                    <Wallet className="h-3 w-3" />
                    Margin
                    {!isConfigured && <Wifi className="h-3 w-3 ml-1 opacity-50" />}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {!isConfigured && (
                <TooltipContent>
                  <p>Connect Binance to view margin history</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TabsList>
          
          <TabsContent value="events" className="mt-4">
            {!events || events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
                <p>No risk events recorded</p>
                <p className="text-sm">Your trading has been within safe limits</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {events.map((event) => {
                    const config = eventTypeConfig[event.event_type] || {
                      icon: AlertTriangle,
                      color: 'text-muted-foreground',
                      label: event.event_type,
                    };
                    const Icon = config.icon;

                    return (
                      <div 
                        key={event.id} 
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className={cn("mt-0.5", config.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{event.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              Trigger: <span className="font-medium">{event.trigger_value.toFixed(1)}%</span>
                            </span>
                            <span>
                              Threshold: <span className="font-medium">{event.threshold_value.toFixed(1)}%</span>
                            </span>
                            <span>
                              Date: {format(new Date(event.event_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="liquidations" className="mt-4">
            {!isConfigured ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wifi className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Connect Exchange Required</p>
                <p className="text-sm">Link your Binance account to view liquidation history</p>
                <Link 
                  to="/settings?tab=exchange" 
                  className="inline-block mt-4 text-sm text-primary hover:underline"
                >
                  Go to Settings →
                </Link>
              </div>
            ) : !hasLiquidations ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
                <p>No liquidations recorded</p>
                <p className="text-sm">Great job managing your risk!</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {forceOrders.map((order) => (
                    <div 
                      key={order.orderId} 
                      className="flex items-start gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5"
                    >
                      <div className="mt-0.5 text-red-500">
                        <Skull className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive">
                            {order.symbol}
                          </Badge>
                          <Badge variant="outline" className={order.side === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                            {order.side} (Close {order.positionSide})
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(order.time), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Qty:</span>
                            <span className="ml-1 font-medium">{order.executedQty}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Price:</span>
                            <span className="ml-1 font-medium">${order.avgPrice.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Order ID: {order.orderId} • {format(new Date(order.time), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="margin">
            <MarginHistoryTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
