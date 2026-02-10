/**
 * Margin History Tab Component
 * Displays margin additions and reductions for risk audit
 */

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  CheckCircle, 
  Clock,
  Wallet
} from "lucide-react";
import { useBinanceMarginHistory, useBinanceConnectionStatus } from "@/features/binance";
import { usePositions } from "@/hooks/use-positions";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MarginHistoryTab() {
  const { showExchangeData } = useModeVisibility();
  const { data: connectionStatus, isLoading: statusLoading } = useBinanceConnectionStatus();
  const isConfigured = connectionStatus?.isConfigured ?? false;
  
  const { positions, isLoading: positionsLoading } = usePositions();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");

  // Get symbols from active positions (already filtered by usePositions)
  const symbols = positions.map(p => p.symbol);

  // Fetch margin history for selected symbol
  const { 
    data: marginHistory, 
    isLoading: historyLoading 
  } = useBinanceMarginHistory(selectedSymbol || symbols[0] || "", { limit: 50 });

  const isLoading = statusLoading || positionsLoading || historyLoading;

  // Show not configured state first or hide in Paper mode (M-24)
  if (!statusLoading && (!isConfigured || !showExchangeData)) {
    return (
      <div className="mt-4">
        <BinanceNotConfiguredState 
          title={!showExchangeData ? "Live Mode Only" : "API Required"}
          description={!showExchangeData 
            ? "Margin history is only available in Live mode." 
            : "Connect your Binance API to view margin history for your positions."}
        />
      </div>
    );
  }

  if (isLoading && !marginHistory) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground mt-4">
        <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p>No active positions</p>
        <p className="text-sm">Open a position to track margin changes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Symbol selector */}
      <Select 
        value={selectedSymbol || symbols[0]} 
        onValueChange={setSelectedSymbol}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select symbol" />
        </SelectTrigger>
        <SelectContent>
          {symbols.map(symbol => (
            <SelectItem key={symbol} value={symbol}>
              {symbol}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Margin history list */}
      {!marginHistory || marginHistory.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-profit/50" />
          <p>No margin changes recorded</p>
          <p className="text-sm">Margin additions/reductions will appear here</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {marginHistory.map((change, index) => {
              const isAddition = change.type === 'ADD';
              
              return (
                <div 
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border bg-card",
                    isAddition 
                      ? "border-profit/30 bg-profit/5" 
                      : "border-chart-5/30 bg-chart-5/5"
                  )}
                >
                  <div className={cn(
                    "mt-0.5",
                    isAddition ? "text-profit" : "text-chart-5"
                  )}>
                    {isAddition ? (
                      <ArrowUpCircle className="h-5 w-5" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={isAddition ? "text-profit" : "text-chart-5"}
                      >
                        {isAddition ? "Add Margin" : "Reduce Margin"}
                      </Badge>
                      <Badge variant="secondary">
                        {change.positionSide}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(change.time), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount:</span>
                        <span className={cn(
                          "ml-1 font-medium",
                          isAddition ? "text-profit" : "text-chart-5"
                        )}>
                          {isAddition ? "+" : "-"}${Math.abs(change.amount).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Asset:</span>
                        <span className="ml-1 font-medium">{change.asset}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(change.time), 'MMM d, yyyy HH:mm:ss')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
