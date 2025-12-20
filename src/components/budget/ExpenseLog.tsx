import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBudgetTransactions, useDeleteBudgetTransaction, BudgetCategory } from "@/hooks/use-budget";
import { Button } from "@/components/ui/button";
import { Trash2, Receipt } from "lucide-react";
import { format } from "date-fns";
import type { Account } from "@/types/account";

interface ExpenseLogProps {
  categories: BudgetCategory[];
  accounts: Account[];
}

export function ExpenseLog({ categories, accounts }: ExpenseLogProps) {
  const { data: transactions = [] } = useBudgetTransactions();
  const deleteTransaction = useDeleteBudgetTransaction();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `Rp${(value / 1000000).toFixed(1)}jt`;
    return `Rp${value.toLocaleString()}`;
  };

  const getCategoryName = (categoryId: string) => 
    categories.find(c => c.id === categoryId)?.name || "Unknown";

  const getAccountName = (accountId: string | null) => 
    accountId ? accounts.find(a => a.id === accountId)?.name : null;

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Log
          </CardTitle>
          <CardDescription>Recent expenses will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No expenses recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Expense Log
        </CardTitle>
        <CardDescription>Recent expenses from all categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.slice(0, 10).map((tx) => {
            const accountName = getAccountName(tx.account_id);
            return (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{tx.description || "Expense"}</p>
                    <Badge variant="outline" className="text-xs">
                      {getCategoryName(tx.category_id)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{format(new Date(tx.transaction_date), "dd MMM yyyy")}</span>
                    {accountName && (
                      <>
                        <span>•</span>
                        <span>from {accountName}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-destructive">
                    -{formatCurrency(Number(tx.amount))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteTransaction.mutate(tx.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}