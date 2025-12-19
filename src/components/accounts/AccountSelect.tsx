import { Building2 } from "lucide-react";
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

interface AccountSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showBalance?: boolean;
  filterByCurrency?: string;
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
  disabled = false,
  className,
}: AccountSelectProps) {
  const { data: accounts, isLoading } = useAccounts();

  const filteredAccounts = filterByCurrency
    ? accounts?.filter((a) => a.currency === filterByCurrency && a.is_active)
    : accounts?.filter((a) => a.is_active);

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
        {filteredAccounts?.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2 w-full">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{account.name}</span>
              {showBalance && (
                <span className="text-xs text-muted-foreground ml-2">
                  {formatCurrency(Number(account.balance), account.currency)}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
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
  error?: string;
}

export function AccountSelectField({
  value,
  onValueChange,
  label = "Account",
  placeholder = "Select account",
  showBalance = true,
  filterByCurrency,
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
        />
      </FormControl>
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}
