import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { Transaction } from "@/types/portfolio";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
    case 'TRANSFER_IN':
      return <ArrowDownLeft className="h-5 w-5 text-profit" />;
    case 'SELL':
    case 'TRANSFER_OUT':
      return <ArrowUpRight className="h-5 w-5 text-loss" />;
    default:
      return <RefreshCw className="h-5 w-5 text-muted-foreground" />;
  }
};

const getTransactionColor = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
    case 'TRANSFER_IN':
      return 'bg-profit-muted';
    case 'SELL':
    case 'TRANSFER_OUT':
      return 'bg-loss-muted';
    default:
      return 'bg-secondary';
  }
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary">
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                getTransactionColor(transaction.type)
              )}>
                {getTransactionIcon(transaction.type)}
              </div>
              <div>
                <p className="font-medium">{transaction.assetSymbol}</p>
                <p className="text-sm text-muted-foreground">
                  {transaction.type} · {transaction.quantity} @ {formatCurrency(transaction.price, 'USD')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "font-medium",
                transaction.type === 'BUY' ? "text-foreground" : "text-profit"
              )}>
                {transaction.type === 'BUY' ? '-' : '+'}
                {formatCurrency(transaction.totalAmount, 'USD')}
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(transaction.date)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}