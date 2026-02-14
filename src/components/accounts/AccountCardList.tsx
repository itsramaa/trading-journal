import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CandlestickChart, FlaskConical, MoreHorizontal, Trash2, ChevronRight, Pencil, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts, useDeleteAccount } from "@/hooks/use-accounts";
import { ACCOUNT_TYPE_LABELS, type AccountType, type Account } from "@/types/account";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { isPaperAccount } from "@/lib/account-utils";
import { useBinanceConnectionStatus, useBinanceBalance, useBinancePositions } from "@/features/binance";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { toast } from "sonner";

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  trading: CandlestickChart,
  backtest: FlaskConical,
};

interface AccountCardListProps {
  onSelectAccount?: (accountId: string) => void;
  onTransact?: (accountId: string, type: 'deposit' | 'withdraw') => void;
  onEdit?: (account: Account) => void;
  filterType?: AccountType;
  excludeBacktest?: boolean;
  backtestOnly?: boolean;
  emptyMessage?: string;
}

export function AccountCardList({ 
  onSelectAccount, 
  onTransact,
  onEdit,
  filterType, 
  excludeBacktest = false,
  backtestOnly = false,
  emptyMessage = "No accounts yet"
}: AccountCardListProps) {
  const navigate = useNavigate();
  const { data: allAccounts, isLoading } = useAccounts();
  const deleteAccount = useDeleteAccount();
  const { format } = useCurrencyConversion();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const { showPaperData } = useModeVisibility();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: binanceBalance } = useBinanceBalance();
  const { data: binancePositions } = useBinancePositions();
  
  const isConnected = !showPaperData && (connectionStatus?.isConnected ?? false);
  const activePositions = isConnected ? (binancePositions?.filter(p => p.positionAmt !== 0) || []) : [];
  
  // Filter accounts based on type and backtest status
  const accounts = allAccounts?.filter(a => {
    // Type filter
    if (filterType && a.account_type !== filterType) return false;
    
    // Paper/Live filter for trading accounts
    if (filterType === 'trading') {
      const paper = isPaperAccount(a);
      if (excludeBacktest && paper) return false;
      if (backtestOnly && !paper) return false;
    }
    
    return true;
  });

  const handleCardClick = (accountId: string) => {
    navigate(`/accounts/${accountId}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAccount.mutateAsync(deleteTarget.id);
      toast.success(`Account "${deleteTarget.name}" moved to trash`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete account");
    } finally {
      setDeleteTarget(null);
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

  const hasContent = (accounts?.length ?? 0) > 0 || isConnected;

  if (!hasContent) {
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
    <>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Binance Virtual Card - Live mode only */}
      {isConnected && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow group border-primary/20"
          onClick={() => navigate('/accounts/binance')}
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Binance Futures</CardTitle>
                <CardDescription>Connected Exchange</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-profit border-profit/30">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-numbers">
                {format(Number(binanceBalance?.totalWalletBalance) || 0)}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">USDT</Badge>
              </div>
            </div>
            {activePositions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {activePositions.length} open position{activePositions.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* DB Accounts */}
      {accounts?.map((account) => {
        const isBacktest = isPaperAccount(account);
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
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(account); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTransact?.(account.id, 'deposit'); }}>
                    Deposit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTransact?.(account.id, 'withdraw'); }}>
                    Withdraw
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: account.id, name: account.name }); }}
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
                  {format(balance)}
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

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This account will be moved to trash and can be recovered within 30 days via Settings. All associated transaction history will be preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
