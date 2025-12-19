import { useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
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
    quantity: 100,
    price: 9500,
    totalAmount: 950000,
    fees: 0,
    date: new Date("2024-12-13"),
  },
  {
    id: "t8",
    portfolioId: "p1",
    assetId: "1",
    assetSymbol: "BTC",
    assetName: "Bitcoin",
    type: "SELL",
    quantity: 0.1,
    price: 68000,
    totalAmount: 6800,
    fees: 15,
    date: new Date("2024-12-12"),
  },
  {
    id: "t9",
    portfolioId: "p1",
    assetId: "9",
    assetSymbol: "MSFT",
    assetName: "Microsoft Corp.",
    type: "BUY",
    quantity: 15,
    price: 375,
    totalAmount: 5625,
    fees: 0,
    date: new Date("2024-12-10"),
  },
];

const Transactions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredTransactions = extendedTransactions.filter((t) => {
    const matchesSearch =
      t.assetSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assetName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalBuys = extendedTransactions
    .filter((t) => t.type === "BUY")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const totalSells = extendedTransactions
    .filter((t) => t.type === "SELL")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Manage and track your portfolio transactions.
            </p>
          </div>
          <TransactionForm />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{extendedTransactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Buys
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(totalBuys, 'USD')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sells
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-profit">
                +{formatCurrency(totalSells, 'USD')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px] max-w-sm">
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
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
              <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Transactions Table */}
        <TransactionsTable transactions={filteredTransactions} />
      </div>
    </DashboardLayout>
  );
};

export default Transactions;