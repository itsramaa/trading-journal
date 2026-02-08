/**
 * Panel for viewing and restoring soft-deleted trades
 * Shows trades deleted within the last 30 days
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, RotateCcw, Calendar, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useDeletedTrades, useRestoreDeletedTrade } from "@/hooks/use-deleted-trades";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeletedTradesPanel() {
  const { data: deletedTrades, isLoading, error } = useDeletedTrades();
  const restoreTrade = useRestoreDeletedTrade();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const handleRestore = async (tradeId: string) => {
    setRestoringId(tradeId);
    try {
      await restoreTrade.mutateAsync(tradeId);
      setDialogOpen(null);
    } finally {
      setRestoringId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Deleted Trades
          </CardTitle>
          <CardDescription>Restore recently deleted trades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Deleted Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load deleted trades. The restore function may not be available yet.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Deleted Trades
          {deletedTrades && deletedTrades.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {deletedTrades.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Trades deleted within the last 30 days can be restored. After 30 days, they are permanently removed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!deletedTrades || deletedTrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No deleted trades</p>
            <p className="text-sm mt-1">Deleted trades will appear here for 30 days</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {deletedTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      trade.direction === 'LONG' 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {trade.direction === 'LONG' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trade.pair}</span>
                        <Badge variant="outline" className="text-xs">
                          {trade.source || 'manual'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(trade.trade_date), 'MMM d, yyyy')}</span>
                        <span className="text-xs">•</span>
                        <span className={trade.realized_pnl && trade.realized_pnl > 0 ? 'text-green-500' : 'text-red-500'}>
                          {trade.realized_pnl ? `$${Number(trade.realized_pnl).toFixed(2)}` : '-'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deleted {formatDistanceToNow(new Date(trade.deleted_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <Dialog open={dialogOpen === trade.id} onOpenChange={(open) => setDialogOpen(open ? trade.id : null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={restoringId === trade.id}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {restoringId === trade.id ? 'Restoring...' : 'Restore'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Restore Trade</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to restore this trade? It will appear back in your trade history.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{trade.pair}</span>
                            <Badge>{trade.direction}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Entry: ${Number(trade.entry_price).toFixed(2)} • 
                            P&L: {trade.realized_pnl ? `$${Number(trade.realized_pnl).toFixed(2)}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => handleRestore(trade.id)}
                          disabled={restoringId === trade.id}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {restoringId === trade.id ? 'Restoring...' : 'Confirm Restore'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
