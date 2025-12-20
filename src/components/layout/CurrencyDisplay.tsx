/**
 * Dynamic Currency Display Component
 * Shows user's default currency with live exchange rate
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowRightLeft, TrendingUp, RefreshCw } from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";

export function CurrencyDisplay() {
  const { t } = useTranslation();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { data: exchangeRate, isLoading: rateLoading, refetch } = useExchangeRate();

  const currency = settings?.default_currency || 'USD';
  const isIDR = currency === 'IDR';

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'IDR' : 'USD';
    updateSettings.mutate({ default_currency: newCurrency });
  };

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rate);
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
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('currency.exchangeRate')}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetch()}
              disabled={rateLoading}
            >
              <RefreshCw className={cn("h-3 w-3", rateLoading && "animate-spin")} />
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <span className="font-medium">1 USD</span>
            </div>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-lg">🇮🇩</span>
              <span className="font-medium">
                {rateLoading ? '...' : `Rp ${formatRate(exchangeRate || 15500)}`}
              </span>
            </div>
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

          <p className="text-xs text-muted-foreground text-center">
            {t('settings.currency')}: {isIDR ? t('currency.idr') : t('currency.usd')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
