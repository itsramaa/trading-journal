import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { 
  ArrowLeft, 
  Wallet, 
  Building2, 
  Smartphone, 
  TrendingUp, 
  Banknote, 
  WalletCards,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  PiggyBank,
  Shield,
  Target,
  CandlestickChart,
  Receipt,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts, useAccountTransactions } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/formatters";
import type { AccountType, AccountTransactionType } from "@/types/account";

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  bank: Building2,
  ewallet: Smartphone,
  broker: TrendingUp,
  cash: Banknote,
  soft_wallet: WalletCards,
  investment: PiggyBank,
  emergency: Shield,
  goal_savings: Target,
  trading: CandlestickChart,
};

const TRANSACTION_TYPE_CONFIG: Record<
  AccountTransactionType,
  { label: string; icon: React.ElementType; color: string }
> = {
  deposit: { label: "Deposit", icon: ArrowDownCircle, color: "text-profit" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, color: "text-loss" },
  transfer_in: { label: "Transfer In", icon: ArrowLeftRight, color: "text-chart-3" },
  transfer_out: { label: "Transfer Out", icon: ArrowLeftRight, color: "text-chart-4" },
  expense: { label: "Expense", icon: Receipt, color: "text-loss" },
  income: { label: "Income", icon: DollarSign, color: "text-profit" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, color: "text-muted-foreground" },
};

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useAccountTransactions(accountId);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountTransactionType | "all">("all");

  const account = accounts?.find((a) => a.id === accountId);
  
  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      const matchesSearch = searchQuery === "" || 
        (tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (tx.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesType = typeFilter === "all" || tx.transaction_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter]);
  
  // Export/Import handlers
  const handleExportData = async () => {
    if (!transactions) return [];
    return transactions.map((tx) => ({
      date: format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss"),
      type: tx.transaction_type,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description || "",
      notes: tx.notes || "",
    }));
  };
  
  const handleImportData = async (data: Record<string, unknown>[]) => {
    // For now, just validate and log - actual import would require more complex logic
    console.log("Import data:", data);
    throw new Error("Import is not yet implemented for account transactions");
  };
  const Icon = account ? ACCOUNT_TYPE_ICONS[account.account_type] : Wallet;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!transactions?.length) return null;
    
    const totalDeposits = transactions
      .filter((t) => t.transaction_type === "deposit" || t.transaction_type === "transfer_in")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalWithdrawals = transactions
      .filter((t) => t.transaction_type === "withdrawal" || t.transaction_type === "transfer_out")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const netFlow = totalDeposits - totalWithdrawals;
    
    const thisMonthTxs = transactions.filter((t) => {
      const txDate = new Date(t.created_at);
      const now = new Date();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    return {
      totalDeposits,
      totalWithdrawals,
      netFlow,
      totalTransactions: transactions.length,
      thisMonthCount: thisMonthTxs.length,
    };
  }, [transactions]);

  // Integration summary - which features use this account
  const integrations = useMemo(() => {
    if (!account) return [];
    
    const items = [];
    
    // Check if it's a trading account
    items.push({ name: "Trading Account", linked: account.account_type === "trading" || account.account_type === "broker" });
    
    // Budget tracking (all accounts can track expenses)
    items.push({ name: "Budget Expenses", linked: true });
    
    // Emergency Fund
    items.push({ name: "Emergency Fund", linked: account.account_type === "emergency" });
    
    // Portfolio transactions
    items.push({ name: "Portfolio Transactions", linked: account.account_type === "broker" || account.account_type === "investment" });
    
    return items;
  }, [account]);

  if (accountsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!account) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Account not found</p>
          <Button onClick={() => navigate("/accounts")} className="mt-4">
            Back to Accounts
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>{account.name} | Account Detail</title>
        <meta name="description" content={`View transactions and details for ${account.name}`} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/accounts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: account.color || "hsl(var(--primary))" }}
          >
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <p className="text-muted-foreground capitalize">
              {account.account_type.replace("_", " ")} • {account.currency}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(Number(account.balance), account.currency)}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-xl font-bold text-profit">
                    +{formatCurrency(stats?.totalDeposits || 0, account.currency)}
                  </p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-profit/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                  <p className="text-xl font-bold text-loss">
                    -{formatCurrency(stats?.totalWithdrawals || 0, account.currency)}
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-loss/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Flow</p>
                  <p className={`text-xl font-bold ${(stats?.netFlow || 0) >= 0 ? "text-profit" : "text-loss"}`}>
                    {formatCurrency(stats?.netFlow || 0, account.currency)}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold">{stats?.thisMonthCount || 0} transactions</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integration Summary</CardTitle>
            <CardDescription>How this account connects with other features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {integrations.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className={`h-2 w-2 rounded-full ${item.linked ? "bg-profit" : "bg-muted"}`} />
                  <span className="text-sm">{item.name}</span>
                  <Badge variant={item.linked ? "default" : "secondary"} className="ml-auto text-xs">
                    {item.linked ? "Linked" : "Not Linked"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Transaction History</CardTitle>
                <CardDescription>All transactions for this account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col gap-3 mb-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="transfer_in">Transfer In</SelectItem>
                  <SelectItem value="transfer_out">Transfer Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {transactionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !filteredTransactions?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">
                  {transactions?.length ? "No matching transactions" : "No transactions yet"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {transactions?.length 
                    ? "Try adjusting your search or filter." 
                    : "Start by making a deposit, withdrawal, or transfer."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => {
                      const config = TRANSACTION_TYPE_CONFIG[tx.transaction_type];
                      const TxIcon = config.icon;
                      const isCredit = tx.transaction_type === "deposit" || tx.transaction_type === "transfer_in";

                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TxIcon className={`h-4 w-4 ${config.color}`} />
                              <span>{config.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.description || tx.notes || "-"}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${isCredit ? "text-profit" : "text-loss"}`}>
                            {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount), tx.currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
