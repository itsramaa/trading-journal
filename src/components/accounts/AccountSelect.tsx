import { CandlestickChart, FlaskConical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/formatters";
import type { AccountType } from "@/types/account";
import { isPaperAccount } from "@/lib/account-utils";

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  trading: CandlestickChart,
  backtest: FlaskConical,
};

interface AccountSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showBalance?: boolean;
  filterByCurrency?: string;
  filterByType?: AccountType;
  excludeBacktest?: boolean;
  backtestOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

export function AccountSelect({
  value,
  onValueChange,
  label = "Account",
  placeholder = "Select account",
  showBalance = true,
  filterByCurrency,
  filterByType,
  excludeBacktest = false,
  backtestOnly = false,
  disabled = false,
  className,
}: AccountSelectProps) {
  const { data: accounts, isLoading } = useAccounts();

  const filteredAccounts = accounts?.filter((a) => {
    if (!a.is_active) return false;
    if (filterByCurrency && a.currency !== filterByCurrency) return false;
    if (filterByType && a.account_type !== filterByType) return false;
    
    // Handle backtest filtering using canonical isPaperAccount
    const isPaper = isPaperAccount(a);
    if (excludeBacktest && isPaper) return false;
    if (backtestOnly && !isPaper) return false;
    
    return true;
  });

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredAccounts?.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No accounts found
          </div>
        )}
        {filteredAccounts?.map((account) => {
          const isPaper = isPaperAccount(account);
          const Icon = isPaper ? FlaskConical : ACCOUNT_TYPE_ICONS[account.account_type];
          
          return (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{account.name}</span>
                {isPaper && (
                  <span className="text-xs text-muted-foreground">(Paper)</span>
                )}
                {showBalance && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

interface AccountSelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showBalance?: boolean;
  filterByCurrency?: string;
  filterByType?: AccountType;
  excludeBacktest?: boolean;
  backtestOnly?: boolean;
  error?: string;
}

export function AccountSelectField({
  value,
  onValueChange,
  label = "Account",
  placeholder = "Select account",
  showBalance = true,
  filterByCurrency,
  filterByType,
  excludeBacktest,
  backtestOnly,
  error,
}: AccountSelectFieldProps) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <AccountSelect
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          showBalance={showBalance}
          filterByCurrency={filterByCurrency}
          filterByType={filterByType}
          excludeBacktest={excludeBacktest}
          backtestOnly={backtestOnly}
        />
      </FormControl>
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}
