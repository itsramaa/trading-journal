import { useBudgetTransactions, useDeleteBudgetTransaction } from "@/hooks/use-budget";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Account } from "@/types/account";

interface CategoryExpenseListProps {
  categoryId: string;
  accounts: Account[];
}

export function CategoryExpenseList({ categoryId, accounts }: CategoryExpenseListProps) {
  const { data: transactions = [] } = useBudgetTransactions(categoryId);
  const deleteTransaction = useDeleteBudgetTransaction();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `Rp${(value / 1000000).toFixed(1)}jt`;
    return `Rp${value.toLocaleString()}`;
  };

  const getAccountName = (accountId: string | null) => 
    accountId ? accounts.find(a => a.id === accountId)?.name : null;

  if (transactions.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No expenses in this category yet
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3 pt-3 border-t">
      {transactions.slice(0, 5).map((tx) => {
        const accountName = getAccountName(tx.account_id);
        return (
          <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{tx.description || "Expense"}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(new Date(tx.transaction_date), "dd MMM")}</span>
                {accountName && (
                  <>
                    <span>•</span>
                    <span className="truncate">{accountName}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="font-semibold text-destructive whitespace-nowrap">
                -{formatCurrency(Number(tx.amount))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTransaction.mutate(tx.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
      {transactions.length > 5 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          +{transactions.length - 5} more expenses
        </p>
      )}
    </div>
  );
}