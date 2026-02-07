/**
 * Dynamic Currency Display Component
 * Shows user's default currency selector with exchange rate info
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { RefreshCw } from "lucide-react";

export function CurrencyDisplay() {
  const { t } = useTranslation();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { rate, isLoading: rateLoading, refetch } = useExchangeRate();

  const currency = settings?.default_currency || 'USD';
  const isIDR = currency === 'IDR';

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'IDR' : 'USD';
    updateSettings.mutate({ default_currency: newCurrency });
  };

  // Format exchange rate for display
  const formatRate = (r: number) => {
    return r.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 min-w-[80px] font-medium"
        >
          <span className="text-xs text-muted-foreground">
            {isIDR ? '🇮🇩' : '🇺🇸'}
          </span>
          {currency}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('currency.select') || 'Select Currency'}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant={currency === 'USD' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => currency !== 'USD' && toggleCurrency()}
              disabled={updateSettings.isPending}
            >
              🇺🇸 USD
            </Button>
            <Button
              variant={currency === 'IDR' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => currency !== 'IDR' && toggleCurrency()}
              disabled={updateSettings.isPending}
            >
              🇮🇩 IDR
            </Button>
          </div>

          {/* Exchange Rate Info */}
          <div className="p-2 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Exchange Rate</p>
                <p className="text-sm font-medium">
                  $1 = Rp {formatRate(rate)}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => refetch()}
                disabled={rateLoading}
              >
                <RefreshCw className={`h-3 w-3 ${rateLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isIDR 
              ? 'Values will be converted to IDR' 
              : 'Showing values in USD'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
