import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/demo-data";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  transaction.type === 'BUY' ? "bg-profit-muted" : "bg-loss-muted"
                )}
              >
                {transaction.type === 'BUY' ? (
                  <ArrowDownLeft className="h-5 w-5 text-profit" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-loss" />
                )}
              </div>
              <div>
                <p className="font-medium">{transaction.assetSymbol}</p>
                <p className="text-sm text-muted-foreground">
                  {transaction.type} · {transaction.quantity} @ ${transaction.price.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "font-medium",
                transaction.type === 'BUY' ? "text-foreground" : "text-profit"
              )}>
                {transaction.type === 'BUY' ? '-' : '+'}${transaction.total.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(transaction.date)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
