import { format as formatDate } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, FileText } from "lucide-react";
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
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

const TRANSACTION_TYPE_CONFIG: Record<
  AccountTransactionType,
  { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  deposit: { label: "Deposit", icon: ArrowDownCircle, variant: "default" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, variant: "destructive" },
};

interface AccountTransactionsTableProps {
  accountId?: string;
  limit?: number;
}

export function AccountTransactionsTable({ accountId, limit }: AccountTransactionsTableProps) {
  const { data: transactions, isLoading } = useAccountTransactions(accountId, limit);
  const { data: accounts } = useAccounts();
  const { format } = useCurrencyConversion();

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
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No transactions yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Start by making a deposit to fund your trading account.
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
            const Icon = config?.icon || ArrowDownCircle;
            const isCredit = tx.transaction_type === 'deposit';

            return (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">
                  {formatDate(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <Badge variant={config?.variant || "secondary"} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {config?.label || tx.transaction_type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {getAccountName(tx.account_id)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {tx.description || "-"}
                </TableCell>
                <TableCell className={`text-right font-mono ${isCredit ? 'text-profit' : 'text-loss'}`}>
                  {isCredit ? '+' : '-'}{format(Number(tx.amount))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
