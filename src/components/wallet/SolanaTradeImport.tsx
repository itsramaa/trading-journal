/**
 * Solana Trade Import - Full import flow UI
 * Scan wallet → Review trades → Import to journal
 */
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Loader2, 
  Search, 
  CheckCircle, 
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useSolanaTradeImport } from '@/hooks/use-solana-trade-import';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function SolanaTradeImport() {
  const { connected, publicKey } = useWallet();
  const {
    status,
    result,
    selectedTrades,
    fetchTrades,
    importSelected,
    toggleTrade,
    selectAll,
    deselectAll,
    reset,
    importedCount,
  } = useSolanaTradeImport();
  const [scanLimit, setScanLimit] = useState(50);

  if (!connected) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Connect your Solana wallet to scan and import trades from Deriverse and other DEXs.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Done state
  if (status === 'done') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-profit/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-profit" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Import Complete</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Successfully imported {importedCount} trades into your journal.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scan Again
            </Button>
            <Button asChild>
              <a href="/trading">View Journal</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Import On-Chain Trades
            </CardTitle>
            <CardDescription className="mt-1">
              Scan your wallet for Deriverse & Solana DEX trades
            </CardDescription>
          </div>
          {publicKey && (
            <Badge variant="outline" className="font-mono text-xs">
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Controls */}
        {(status === 'idle' || status === 'error') && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Transactions to scan</label>
                <div className="flex gap-2">
                  {[50, 100, 200].map(n => (
                    <Button
                      key={n}
                      variant={scanLimit === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setScanLimit(n)}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => fetchTrades(scanLimit)}
            >
              <Search className="h-4 w-4 mr-2" />
              Scan Wallet Transactions
            </Button>
            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-loss">
                <AlertCircle className="h-4 w-4" />
                Failed to scan. Please try again.
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {status === 'fetching' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Scanning transactions...</p>
              <p className="text-sm text-muted-foreground">
                Parsing {scanLimit} recent transactions for DEX activity
              </p>
            </div>
            <Progress value={33} className="w-48" />
          </div>
        )}

        {/* Results */}
        {status === 'parsed' && result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{result.totalTransactions}</p>
                <p className="text-xs text-muted-foreground">Scanned</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">{result.parsedCount}</p>
                <p className="text-xs text-muted-foreground">Trades Found</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{selectedTrades.size}</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
            </div>

            {result.trades.length > 0 ? (
              <>
                {/* Select controls */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedTrades.size} of {result.trades.length} selected
                  </span>
                </div>

                {/* Trade List */}
                <ScrollArea className="h-[320px] rounded-lg border">
                  <div className="divide-y">
                    {result.trades.map((trade) => (
                      <div
                        key={trade.signature}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                          selectedTrades.has(trade.signature) && "bg-primary/5"
                        )}
                        onClick={() => toggleTrade(trade.signature)}
                      >
                        <Checkbox
                          checked={selectedTrades.has(trade.signature)}
                          onCheckedChange={() => toggleTrade(trade.signature)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {trade.direction === 'LONG' ? (
                              <ArrowUpRight className="h-4 w-4 text-profit" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-loss" />
                            )}
                            <span className="font-medium text-sm">{trade.pair}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {trade.programName}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{format(new Date(trade.blockTime * 1000), 'MMM dd, yyyy HH:mm')}</span>
                            <span>Qty: {trade.quantity.toFixed(4)}</span>
                            <span>Fee: {trade.fees.toFixed(6)} SOL</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-mono font-medium",
                            trade.pnl >= 0 ? "text-profit" : "text-loss"
                          )}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(4)} SOL
                          </p>
                          <a
                            href={`https://solscan.io/tx/${trade.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 justify-end"
                          >
                            View tx <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                {/* Import Button */}
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={reset}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={importSelected}
                    disabled={selectedTrades.size === 0}
                    className="min-w-[160px]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Import {selectedTrades.size} Trades
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  No DEX trades found in recent {result.totalTransactions} transactions.
                </p>
                <Button variant="outline" onClick={() => fetchTrades(200)}>
                  Scan More Transactions
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Importing */}
        {status === 'importing' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Importing trades to your journal...</p>
            <Progress value={66} className="w-48" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
