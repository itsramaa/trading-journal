import { useNavigate } from "react-router-dom";
import { CandlestickChart, FlaskConical, Wallet, MoreHorizontal, Trash2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts, useDeleteAccount } from "@/hooks/use-accounts";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/types/account";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  trading: CandlestickChart,
  backtest: FlaskConical,
  funding: Wallet,
};

interface AccountCardListProps {
  onSelectAccount?: (accountId: string) => void;
  onTransact?: (accountId: string, type: 'deposit' | 'withdraw' | 'transfer') => void;
  filterType?: AccountType;
  excludeBacktest?: boolean;
  backtestOnly?: boolean;
  emptyMessage?: string;
}

export function AccountCardList({ 
  onSelectAccount, 
  onTransact, 
  filterType, 
  excludeBacktest = false,
  backtestOnly = false,
  emptyMessage = "No accounts yet"
}: AccountCardListProps) {
  const navigate = useNavigate();
  const { data: allAccounts, isLoading } = useAccounts();
  const deleteAccount = useDeleteAccount();
  
  // Filter accounts based on type and backtest status
  const accounts = allAccounts?.filter(a => {
    // Type filter
    if (filterType && a.account_type !== filterType) return false;
    
    // Backtest filter for trading accounts
    if (filterType === 'trading') {
      const isBacktest = a.metadata?.is_backtest === true;
      if (excludeBacktest && isBacktest) return false;
      if (backtestOnly && !isBacktest) return false;
    }
    
    return true;
  });

  const handleCardClick = (accountId: string) => {
    navigate(`/accounts/${accountId}`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all transaction history.`)) {
      return;
    }

    try {
      await deleteAccount.mutateAsync(id);
      toast.success(`Account "${name}" deleted`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete account");
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!accounts?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CandlestickChart className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No accounts yet</h3>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => {
        const isBacktest = account.metadata?.is_backtest === true;
        const Icon = isBacktest ? FlaskConical : ACCOUNT_TYPE_ICONS[account.account_type] || CandlestickChart;
        const balance = Number(account.balance);
        const broker = account.metadata?.broker;

        return (
          <Card 
            key={account.id} 
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => handleCardClick(account.id)}
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isBacktest ? 'bg-chart-4/10' : 'bg-primary/10'}`}>
                  <Icon className={`h-5 w-5 ${isBacktest ? 'text-chart-4' : 'text-primary'}`} />
                </div>
                <div>
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  <CardDescription>
                    {broker || (isBacktest ? 'Paper Trading' : ACCOUNT_TYPE_LABELS[account.account_type])}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTransact?.(account.id, 'deposit'); }}>
                    Deposit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTransact?.(account.id, 'withdraw'); }}>
                    Withdraw
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTransact?.(account.id, 'transfer'); }}>
                    Transfer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(account.id, account.name); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-bold font-mono-numbers ${balance >= 0 ? '' : 'text-destructive'}`}>
                  {formatCurrency(balance, account.currency)}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={isBacktest ? "secondary" : "outline"}>
                    {isBacktest ? "Paper" : account.currency}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              {account.metadata?.account_number && (
                <p className="text-xs text-muted-foreground mt-2">
                  Account: {account.metadata.account_number}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
