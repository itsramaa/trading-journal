import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Download, TrendingUp, TrendingDown, ArrowRightLeft, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { demoTransactions } from "@/lib/demo-data";
import type { Transaction } from "@/types/portfolio";

// Extended transactions for demo
const extendedTransactions: Transaction[] = [
  ...demoTransactions,
  {
    id: "t7",
    portfolioId: "p1",
    assetId: "5",
    assetSymbol: "BBCA",
    assetName: "Bank Central Asia",
    type: "BUY",
    quantity: 1000,
    price: 9500,
    totalAmount: 9500000,
    fees: 47500,
    date: new Date("2024-12-12"),
    notes: "Monthly DCA",
  },
  {
    id: "t8",
    portfolioId: "p1",
    assetId: "4",
    assetSymbol: "NVDA",
    assetName: "NVIDIA Corp.",
    type: "BUY",
    quantity: 5,
    price: 850,
    totalAmount: 4250,
    fees: 5,
    date: new Date("2024-12-10"),
  },
];

const getTransactionConfig = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
      return { icon: TrendingDown, color: 'text-profit', bgColor: 'bg-profit/10', label: 'Buy' };
    case 'SELL':
      return { icon: TrendingUp, color: 'text-loss', bgColor: 'bg-loss/10', label: 'Sell' };
    case 'DIVIDEND':
      return { icon: RefreshCw, color: 'text-chart-4', bgColor: 'bg-chart-4/10', label: 'Dividend' };
    case 'TRANSFER_IN':
    case 'TRANSFER_OUT':
      return { icon: ArrowRightLeft, color: 'text-chart-6', bgColor: 'bg-chart-6/10', label: type === 'TRANSFER_IN' ? 'Transfer In' : 'Transfer Out' };
    default:
      return { icon: ArrowRightLeft, color: 'text-muted-foreground', bgColor: 'bg-muted', label: type };
  }
};

const Transactions = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const filteredTransactions = extendedTransactions
    .filter((tx) => {
      const matchesSearch = 
        tx.assetSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.assetName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const stats = {
    total: filteredTransactions.length,
    buys: filteredTransactions.filter(tx => tx.type === 'BUY').length,
    sells: filteredTransactions.filter(tx => tx.type === 'SELL').length,
    totalVolume: filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">View and manage your transaction history.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <TransactionForm />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Transactions</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Buy Orders</p>
              <p className="text-2xl font-bold mt-1 text-profit">{stats.buys}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Sell Orders</p>
              <p className="text-2xl font-bold mt-1 text-loss">{stats.sells}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Volume</p>
              <p className="text-2xl font-bold mt-1 font-mono-numbers">{formatCurrency(stats.totalVolume)}</p>
            </CardContent>
          </Card>
        </div>

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
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
              <SelectItem value="DIVIDEND">Dividend</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="pl-5 font-medium text-xs uppercase tracking-wider">Type</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider">Asset</TableHead>
                <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Quantity</TableHead>
                <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Price</TableHead>
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
                    <TableCell className="text-right font-mono-numbers text-sm">{tx.quantity}</TableCell>
                    <TableCell className="text-right font-mono-numbers text-sm">{formatCurrency(tx.price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono-numbers text-sm font-medium",
                        tx.type === 'BUY' ? "text-loss" : tx.type === 'SELL' ? "text-profit" : ""
                      )}>
                        {tx.type === 'BUY' ? '-' : tx.type === 'SELL' ? '+' : ''}{formatCurrency(tx.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-5 text-sm text-muted-foreground">{formatDate(tx.date)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
