import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Filter, Download, TrendingUp, TrendingDown, 
  ArrowRightLeft, RefreshCw, AlertCircle, ArrowDownLeft, 
  ArrowUpRight, Coins, Calendar
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyTransactions, EmptySearchResults } from "@/components/ui/empty-state";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCompactCurrency, formatDate } from "@/lib/formatters";
import { useTransactions, useDefaultPortfolio } from "@/hooks/use-portfolio";
import { transformTransactions } from "@/lib/data-transformers";
import type { Transaction } from "@/types/portfolio";

const getTransactionConfig = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
      return { icon: ArrowDownLeft, color: 'text-profit', bgColor: 'bg-profit/10', label: 'Buy' };
    case 'SELL':
      return { icon: ArrowUpRight, color: 'text-loss', bgColor: 'bg-loss/10', label: 'Sell' };
    case 'DIVIDEND':
      return { icon: Coins, color: 'text-chart-4', bgColor: 'bg-chart-4/10', label: 'Dividend' };
    case 'TRANSFER_IN':
      return { icon: ArrowDownLeft, color: 'text-chart-2', bgColor: 'bg-chart-2/10', label: 'Transfer In' };
    case 'TRANSFER_OUT':
      return { icon: ArrowUpRight, color: 'text-chart-3', bgColor: 'bg-chart-3/10', label: 'Transfer Out' };
    default:
      return { icon: ArrowRightLeft, color: 'text-muted-foreground', bgColor: 'bg-muted', label: type };
  }
};

const Transactions = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: dbTransactions = [], isLoading } = useTransactions(defaultPortfolio?.id);

  // Transform database transactions to UI format
  const transactions = useMemo(() => transformTransactions(dbTransactions), [dbTransactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    
    return transactions
      .filter((tx) => {
        const matchesSearch = 
          tx.assetSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.assetName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || tx.type === typeFilter;
        
        // Date filter
        let matchesDate = true;
        if (dateFilter !== "all") {
          const txDate = new Date(tx.date);
          const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
          
          switch (dateFilter) {
            case "7d":
              matchesDate = diffDays <= 7;
              break;
            case "30d":
              matchesDate = diffDays <= 30;
              break;
            case "90d":
              matchesDate = diffDays <= 90;
              break;
            case "1y":
              matchesDate = diffDays <= 365;
              break;
          }
        }
        
        return matchesSearch && matchesType && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, typeFilter, dateFilter]);

  const filteredStats = useMemo(() => ({
    total: filteredTransactions.length,
    buys: filteredTransactions.filter(tx => tx.type === 'BUY').length,
    sells: filteredTransactions.filter(tx => tx.type === 'SELL').length,
    transferIn: filteredTransactions.filter(tx => tx.type === 'TRANSFER_IN').length,
    transferOut: filteredTransactions.filter(tx => tx.type === 'TRANSFER_OUT').length,
    dividends: filteredTransactions.filter(tx => tx.type === 'DIVIDEND').length,
    buyVolume: filteredTransactions.filter(tx => tx.type === 'BUY').reduce((sum, tx) => sum + tx.totalAmount, 0),
    sellVolume: filteredTransactions.filter(tx => tx.type === 'SELL').reduce((sum, tx) => sum + tx.totalAmount, 0),
    transferInVolume: filteredTransactions.filter(tx => tx.type === 'TRANSFER_IN').reduce((sum, tx) => sum + tx.totalAmount, 0),
    transferOutVolume: filteredTransactions.filter(tx => tx.type === 'TRANSFER_OUT').reduce((sum, tx) => sum + tx.totalAmount, 0),
    dividendVolume: filteredTransactions.filter(tx => tx.type === 'DIVIDEND').reduce((sum, tx) => sum + tx.totalAmount, 0),
    totalVolume: filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0),
  }), [filteredTransactions]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">View and manage your transaction history.</p>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">View and manage your transaction history.</p>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export transactions to CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AddTransactionDialog />
          </div>
        </div>

        {/* Stats Cards - 7 Cards Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {/* Total */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold mt-1">{filteredStats.total}</p>
              <p className="text-xs text-muted-foreground font-mono-numbers mt-1">
                {formatCompactCurrency(filteredStats.totalVolume)}
              </p>
            </CardContent>
          </Card>

          {/* Buy Orders */}
          <Card 
            className={cn(
              "border-border/50 cursor-pointer transition-all hover:border-profit/50",
              typeFilter === "BUY" && "border-profit ring-1 ring-profit/20"
            )}
            onClick={() => setTypeFilter(typeFilter === "BUY" ? "all" : "BUY")}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-profit/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-3 w-3 text-profit" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Buys</p>
              </div>
              <p className="text-2xl font-bold mt-1 text-profit">{filteredStats.buys}</p>
              <p className="text-xs text-muted-foreground font-mono-numbers mt-1">
                {formatCompactCurrency(filteredStats.buyVolume)}
              </p>
            </CardContent>
          </Card>

          {/* Sell Orders */}
          <Card 
            className={cn(
              "border-border/50 cursor-pointer transition-all hover:border-loss/50",
              typeFilter === "SELL" && "border-loss ring-1 ring-loss/20"
            )}
            onClick={() => setTypeFilter(typeFilter === "SELL" ? "all" : "SELL")}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-loss/10 flex items-center justify-center">
                  <ArrowUpRight className="h-3 w-3 text-loss" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sells</p>
              </div>
              <p className="text-2xl font-bold mt-1 text-loss">{filteredStats.sells}</p>
              <p className="text-xs text-muted-foreground font-mono-numbers mt-1">
                {formatCompactCurrency(filteredStats.sellVolume)}
              </p>
            </CardContent>
          </Card>

          {/* Transfer In */}
          <Card 
            className={cn(
              "border-border/50 cursor-pointer transition-all hover:border-chart-2/50",
              typeFilter === "TRANSFER_IN" && "border-chart-2 ring-1 ring-chart-2/20"
            )}
            onClick={() => setTypeFilter(typeFilter === "TRANSFER_IN" ? "all" : "TRANSFER_IN")}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-3 w-3 text-chart-2" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Transfer In</p>
              </div>
              <p className="text-2xl font-bold mt-1">{filteredStats.transferIn}</p>
              <p className="text-xs text-muted-foreground font-mono-numbers mt-1">
                {formatCompactCurrency(filteredStats.transferInVolume)}
              </p>
            </CardContent>
          </Card>

          {/* Transfer Out */}
          <Card 
            className={cn(
              "border-border/50 cursor-pointer transition-all hover:border-chart-3/50",
              typeFilter === "TRANSFER_OUT" && "border-chart-3 ring-1 ring-chart-3/20"
            )}
            onClick={() => setTypeFilter(typeFilter === "TRANSFER_OUT" ? "all" : "TRANSFER_OUT")}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-chart-3/10 flex items-center justify-center">
                  <ArrowUpRight className="h-3 w-3 text-chart-3" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Transfer Out</p>
              </div>
              <p className="text-2xl font-bold mt-1">{filteredStats.transferOut}</p>
              <p className="text-xs text-muted-foreground font-mono-numbers mt-1">
                {formatCompactCurrency(filteredStats.transferOutVolume)}
              </p>
            </CardContent>
          </Card>

          {/* Dividends */}
          <Card 
            className={cn(
              "border-border/50 cursor-pointer transition-all hover:border-chart-4/50",
              typeFilter === "DIVIDEND" && "border-chart-4 ring-1 ring-chart-4/20"
            )}
            onClick={() => setTypeFilter(typeFilter === "DIVIDEND" ? "all" : "DIVIDEND")}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-chart-4/10 flex items-center justify-center">
                  <Coins className="h-3 w-3 text-chart-4" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Dividends</p>
              </div>
              <p className="text-2xl font-bold mt-1">{filteredStats.dividends}</p>
              <p className="text-xs text-muted-foreground font-mono-numbers mt-1">
                {formatCompactCurrency(filteredStats.dividendVolume)}
              </p>
            </CardContent>
          </Card>

          {/* Net Flow */}
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Net Flow</p>
              <p className={cn(
                "text-2xl font-bold mt-1 font-mono-numbers",
                (filteredStats.sellVolume + filteredStats.dividendVolume - filteredStats.buyVolume) >= 0 
                  ? "text-profit" 
                  : "text-loss"
              )}>
                {(filteredStats.sellVolume + filteredStats.dividendVolume - filteredStats.buyVolume) >= 0 ? '+' : ''}
                {formatCompactCurrency(filteredStats.sellVolume + filteredStats.dividendVolume - filteredStats.buyVolume)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Realized gains</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
              <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
              <SelectItem value="DIVIDEND">Dividend</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          {(typeFilter !== "all" || dateFilter !== "all" || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setTypeFilter("all");
                setDateFilter("all");
                setSearchQuery("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length > 0 ? (
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="pl-5 font-medium text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="font-medium text-xs uppercase tracking-wider">Asset</TableHead>
                  <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Quantity</TableHead>
                  <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Price</TableHead>
                  <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Fees</TableHead>
                  <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Total</TableHead>
                  <TableHead className="text-right font-medium text-xs uppercase tracking-wider pr-5">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx, index) => {
                  const config = getTransactionConfig(tx.type);
                  const Icon = config.icon;
                  
                  return (
                    <TableRow 
                      key={tx.id} 
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer transition-colors",
                        index === filteredTransactions.length - 1 && "border-0"
                      )}
                      onClick={() => navigate(`/asset/${tx.assetSymbol}`)}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2">
                          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", config.bgColor)}>
                            <Icon className={cn("h-4 w-4", config.color)} />
                          </div>
                          <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{tx.assetSymbol}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{tx.assetName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono-numbers text-sm">
                        {tx.type === 'DIVIDEND' ? '--' : tx.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono-numbers text-sm">
                        {tx.price > 0 ? formatCurrency(tx.price) : '--'}
                      </TableCell>
                      <TableCell className="text-right font-mono-numbers text-sm text-muted-foreground">
                        {tx.fees > 0 ? formatCurrency(tx.fees) : '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-mono-numbers text-sm font-medium",
                          tx.type === 'BUY' || tx.type === 'TRANSFER_OUT' ? "text-loss" : 
                          tx.type === 'SELL' || tx.type === 'DIVIDEND' || tx.type === 'TRANSFER_IN' ? "text-profit" : ""
                        )}>
                          {tx.type === 'BUY' || tx.type === 'TRANSFER_OUT' ? '-' : '+'}
                          {formatCurrency(tx.totalAmount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-5 text-sm text-muted-foreground">
                        {formatDate(tx.date)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : transactions.length === 0 ? (
          <EmptyTransactions />
        ) : (
          <EmptySearchResults 
            onClearSearch={() => {
              setTypeFilter("all");
              setDateFilter("all");
              setSearchQuery("");
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
