import { format } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, ArrowRightLeft, Receipt, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountTransactions, useAccounts } from "@/hooks/use-accounts";
import type { AccountTransactionType } from "@/types/account";
import { formatCurrency } from "@/lib/formatters";

const TRANSACTION_TYPE_CONFIG: Record<
  AccountTransactionType,
  { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  deposit: { label: "Deposit", icon: ArrowDownCircle, variant: "default" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, variant: "destructive" },
  transfer_in: { label: "Transfer In", icon: ArrowRightLeft, variant: "secondary" },
  transfer_out: { label: "Transfer Out", icon: ArrowLeftRight, variant: "outline" },
  expense: { label: "Expense", icon: Receipt, variant: "destructive" },
  income: { label: "Income", icon: DollarSign, variant: "default" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, variant: "secondary" },
};

interface AccountTransactionsTableProps {
  accountId?: string;
  limit?: number;
}

export function AccountTransactionsTable({ accountId, limit }: AccountTransactionsTableProps) {
  const { data: transactions, isLoading } = useAccountTransactions(accountId, limit);
  const { data: accounts } = useAccounts();

  const getAccountName = (id: string) => {
    return accounts?.find((a) => a.id === id)?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ArrowLeftRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No transactions yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Start by making a deposit, withdrawal, or transfer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const config = TRANSACTION_TYPE_CONFIG[tx.transaction_type];
            const Icon = config.icon;
            const isCredit = tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in';

            return (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {getAccountName(tx.account_id)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {tx.description || "-"}
                </TableCell>
                <TableCell className={`text-right font-mono ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                  {isCredit ? '+' : '-'}{formatCurrency(Number(tx.amount), tx.currency)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
