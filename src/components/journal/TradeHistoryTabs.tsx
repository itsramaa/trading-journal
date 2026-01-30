/**
 * TradeHistoryTabs - Sub-tabs for Binance and Paper trade history
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { TradeHistoryCard } from "@/components/trading/TradeHistoryCard";
import { Wifi, BookOpen, History, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface TradeHistoryTabsProps {
  binanceTrades: TradeEntry[];
  paperTrades: TradeEntry[];
  isBinanceConnected: boolean;
  lastSyncTime: Date | null;
  pendingRecords: number;
  isAutoSyncing: boolean;
  onSyncNow: () => void;
  onDeleteTrade: (trade: TradeEntry) => void;
  calculateRR: (trade: TradeEntry) => number;
  formatCurrency: (value: number, currency?: string) => string;
}

export function TradeHistoryTabs({
  binanceTrades,
  paperTrades,
  isBinanceConnected,
  lastSyncTime,
  pendingRecords,
  isAutoSyncing,
  onSyncNow,
  onDeleteTrade,
  calculateRR,
  formatCurrency,
}: TradeHistoryTabsProps) {
  return (
    <Tabs defaultValue="binance-history" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="binance-history" className="gap-2">
          <Wifi className="h-4 w-4" aria-hidden="true" />
          Binance
          {binanceTrades.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">{binanceTrades.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="paper-history" className="gap-2">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Paper
          {paperTrades.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">{paperTrades.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>
      
      {/* Binance History Sub-Tab */}
      <TabsContent value="binance-history">
        <div className="space-y-4">
          {isBinanceConnected && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm">
                <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">
                  {lastSyncTime 
                    ? `Last sync: ${format(lastSyncTime, 'HH:mm:ss')}`
                    : 'Auto-sync enabled'}
                </span>
                {pendingRecords > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {pendingRecords} pending
                  </Badge>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSyncNow}
                disabled={isAutoSyncing}
                aria-label="Sync trades from Binance"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isAutoSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {isAutoSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          )}
          
          {binanceTrades.length === 0 ? (
            <EmptyState
              icon={Wifi}
              title="No Binance trades found"
              description={isBinanceConnected 
                ? "Trades will auto-sync from Binance. Click 'Sync Now' to fetch the latest." 
                : "Connect your Binance account to import trade history."}
              action={isBinanceConnected ? {
                label: "Sync Now",
                onClick: onSyncNow,
              } : {
                label: "Go to Settings",
                onClick: () => window.location.href = '/settings',
              }}
            />
          ) : (
            binanceTrades.map((entry) => (
              <TradeHistoryCard 
                key={entry.id} 
                entry={entry} 
                onDelete={onDeleteTrade}
                calculateRR={calculateRR}
                formatCurrency={formatCurrency}
                isBinance={true}
              />
            ))
          )}
        </div>
      </TabsContent>
      
      {/* Paper History Sub-Tab */}
      <TabsContent value="paper-history">
        <div className="space-y-4">
          {paperTrades.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No paper trades found"
              description="No paper trades match your current filters."
            />
          ) : (
            paperTrades.map((entry) => (
              <TradeHistoryCard 
                key={entry.id} 
                entry={entry} 
                onDelete={onDeleteTrade}
                calculateRR={calculateRR}
                formatCurrency={formatCurrency}
                isBinance={false}
              />
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
