import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  ArrowLeft,
  CandlestickChart,
  FlaskConical,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Trash2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { EditAccountDialog } from "@/components/accounts/EditAccountDialog";
import { useDeleteAccount } from "@/hooks/use-accounts";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { isPaperAccount } from "@/lib/account-utils";
import { toast } from "sonner";
import type { Account, AccountType } from "@/types/account";

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  trading: CandlestickChart,
  backtest: FlaskConical,
};

interface AccountDetailHeaderProps {
  account: Account | null;
  isBinanceVirtual: boolean;
  displayName: string;
  displayBalance: number;
  displaySubtitle: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  unrealizedPnl?: number;
}

export function AccountDetailHeader({
  account,
  isBinanceVirtual,
  displayName,
  displayBalance,
  displaySubtitle,
  onRefresh,
  isRefreshing,
  unrealizedPnl = 0,
}: AccountDetailHeaderProps) {
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();
  const { format: formatCurrency } = useCurrencyConversion();

  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isBacktest = account ? isPaperAccount(account) : false;
  const DetailIcon = isBinanceVirtual
    ? Activity
    : account
      ? isBacktest ? FlaskConical : ACCOUNT_TYPE_ICONS[account.account_type]
      : CandlestickChart;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate("/accounts")} className="self-start">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isBacktest && !isBinanceVirtual ? 'bg-chart-4' : 'bg-primary'}`}>
          <DetailIcon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
            {isBinanceVirtual && (
              <Badge variant="outline" className="text-profit border-profit/30">Live</Badge>
            )}
            {!isBinanceVirtual && isBacktest && <Badge variant="secondary">Paper Trading</Badge>}
            {!isBinanceVirtual && account?.exchange && account.exchange !== 'manual' && (
              <Badge variant="outline" className="capitalize">{account.exchange}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{displaySubtitle}</p>
        </div>
        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="text-right">
            <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
              {isBinanceVirtual && unrealizedPnl !== 0 ? 'Balance (Realized)' : 'Balance'}
              <InfoTooltip content={isBinanceVirtual ? "Realized wallet balance on exchange, excluding unrealized P&L from open positions." : "Current account balance including all realized gains/losses and capital flows."} />
            </p>
            <p className="text-2xl font-bold">{formatCurrency(displayBalance)}</p>
            {isBinanceVirtual && unrealizedPnl !== 0 && (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                  Equity: <span className="font-semibold text-foreground">{formatCurrency(displayBalance + unrealizedPnl)}</span>
                  <InfoTooltip content="Balance + Unrealized P&L. Represents total account value if all positions were closed now." />
                </p>
                <p className={`text-sm font-medium ${unrealizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(unrealizedPnl))} unrealized
                </p>
              </div>
            )}
          </div>
          {isBinanceVirtual ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setDefaultTransactionTab('deposit'); setTransactionDialogOpen(true); }}>
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Deposit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setDefaultTransactionTab('withdraw'); setTransactionDialogOpen(true); }}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Withdraw
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Dialogs - DB accounts only */}
      {!isBinanceVirtual && account && (
        <>
          <AccountTransactionDialog
            open={transactionDialogOpen}
            onOpenChange={setTransactionDialogOpen}
            defaultAccount={account}
            defaultTab={defaultTransactionTab}
          />
          <EditAccountDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            account={account}
          />
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{account.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This account will be moved to trash and can be recovered within 30 days via Settings. All associated transaction history will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      await deleteAccount.mutateAsync(account.id);
                      toast.success(`Account "${account.name}" moved to trash`);
                      navigate("/accounts");
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to delete account");
                    }
                  }}
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
