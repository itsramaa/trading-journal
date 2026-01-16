/**
 * Dynamic Currency Display Component
 * Shows user's default currency selector
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";

export function CurrencyDisplay() {
  const { t } = useTranslation();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const currency = settings?.default_currency || 'USD';
  const isIDR = currency === 'IDR';

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'IDR' : 'USD';
    updateSettings.mutate({ default_currency: newCurrency });
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

          <p className="text-xs text-muted-foreground text-center">
            {t('settings.currency')}: {isIDR ? t('currency.idr') : t('currency.usd')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
