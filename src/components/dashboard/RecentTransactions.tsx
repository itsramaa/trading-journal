import { ArrowDownLeft, ArrowUpRight, RefreshCw, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useAppStore, convertCurrency } from "@/store/app-store";
import type { Transaction } from "@/types/portfolio";

interface RecentTransactionsProps {
  transactions: Transaction[];
  maxItems?: number;
}

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
    case 'TRANSFER_IN':
      return <ArrowDownLeft className="h-4 w-4 text-profit" />;
    case 'SELL':
    case 'TRANSFER_OUT':
      return <ArrowUpRight className="h-4 w-4 text-loss" />;
    case 'DIVIDEND':
      return <RefreshCw className="h-4 w-4 text-chart-4" />;
    default:
      return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTransactionColor = (type: Transaction['type']) => {
  switch (type) {
    case 'BUY':
    case 'TRANSFER_IN':
      return 'bg-profit/10';
    case 'SELL':
    case 'TRANSFER_OUT':
      return 'bg-loss/10';
    case 'DIVIDEND':
      return 'bg-chart-4/10';
    default:
      return 'bg-muted';
  }
};

export function RecentTransactions({ transactions, maxItems = 5 }: RecentTransactionsProps) {
  const { currency, exchangeRate } = useAppStore();
  
  const displayedTransactions = transactions.slice(0, maxItems);

  const formatValue = (value: number) => {
    const converted = currency === 'IDR' ? convertCurrency(value, 'USD', 'IDR', exchangeRate) : value;
    return formatCurrency(converted, currency === 'IDR' ? 'ID' : 'US');
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedTransactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No transactions yet
          </div>
        ) : (
          displayedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  getTransactionColor(transaction.type)
                )}>
                  {getTransactionIcon(transaction.type)}
                </div>
                <div>
                  <p className="font-medium text-sm">{transaction.assetSymbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.type === 'DIVIDEND' 
                      ? 'Dividend' 
                      : `${transaction.type.replace('_', ' ')} · ${transaction.quantity}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-medium text-sm font-mono-numbers",
                  transaction.type === 'SELL' || transaction.type === 'DIVIDEND' ? "text-profit" : 
                  transaction.type === 'BUY' ? "text-loss" : "text-foreground"
                )}>
                  {transaction.type === 'BUY' || transaction.type === 'TRANSFER_OUT' ? '-' : '+'}
                  {formatValue(transaction.totalAmount)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
