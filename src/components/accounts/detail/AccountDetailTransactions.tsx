import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Filter,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { AccountTransactionType } from "@/types/account";

const TRANSACTION_TYPE_CONFIG: Record<
  AccountTransactionType,
  { label: string; icon: React.ElementType; color: string }
> = {
  deposit: { label: "Deposit", icon: ArrowDownCircle, color: "text-profit" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, color: "text-loss" },
};

interface Transaction {
  id: string;
  transaction_type: AccountTransactionType;
  amount: number;
  description?: string | null;
  notes?: string | null;
  created_at: string;
}

interface AccountDetailTransactionsProps {
  transactions: Transaction[] | undefined;
  transactionsLoading: boolean;
  isBinanceVirtual: boolean;
}

export function AccountDetailTransactions({
  transactions,
  transactionsLoading,
  isBinanceVirtual,
}: AccountDetailTransactionsProps) {
  const { format: formatCurrency } = useCurrencyConversion();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountTransactionType | "all">("all");

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

  // For Live/exchange accounts, show managed message
  if (isBinanceVirtual) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>Deposits and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Managed by exchange</p>
            <p className="text-sm mt-1">
              Deposits and withdrawals are handled directly on your exchange platform.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transaction History</CardTitle>
        <CardDescription>Deposits and withdrawals</CardDescription>
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
            <ArrowDownCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">
              {transactions?.length ? "No matching transactions" : "No transactions yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {transactions?.length
                ? "Try adjusting your search or filter."
                : "Start by making a deposit to fund your trading account."}
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
                  const TxIcon = config?.icon || ArrowDownCircle;
                  const isCredit = tx.transaction_type === "deposit";
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TxIcon className={`h-4 w-4 ${config?.color || ''}`} />
                          <span>{config?.label || tx.transaction_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || tx.notes || "-"}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${isCredit ? "text-profit" : "text-loss"}`}>
                        {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount))}
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
  );
}
