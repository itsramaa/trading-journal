/**
 * Calculator Input Fields - Position Size Calculator
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TrendingUp, TrendingDown, Wifi } from "lucide-react";
import { RISK_SLIDER_CONFIG, LEVERAGE_SLIDER_CONFIG } from "@/lib/constants/risk-thresholds";
import type { SupportedCurrency } from "@/hooks/use-currency-conversion";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  IDR: 'Rp',
};

interface CalculatorInputsProps {
  accountBalance: number;
  setAccountBalance: (value: number) => void;
  riskPercent: number;
  setRiskPercent: (value: number) => void;
  entryPrice: number;
  setEntryPrice: (value: number) => void;
  stopLossPrice: number;
  setStopLossPrice: (value: number) => void;
  direction: 'long' | 'short';
  setDirection: (value: 'long' | 'short') => void;
  leverage: number;
  setLeverage: (value: number) => void;
  source: 'binance' | 'paper' | 'manual';
  riskProfileDefault?: number;
  currency?: SupportedCurrency;
}

export function CalculatorInputs({
  accountBalance,
  setAccountBalance,
  riskPercent,
  setRiskPercent,
  entryPrice,
  setEntryPrice,
  stopLossPrice,
  setStopLossPrice,
  direction,
  setDirection,
  leverage,
  setLeverage,
  source,
  riskProfileDefault,
  currency = 'USD',
}: CalculatorInputsProps) {
  const sym = CURRENCY_SYMBOLS[currency] || '$';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Account Balance */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Account Balance ({sym})
          {source === 'binance' && (
            <Badge variant="outline" className="text-xs gap-1">
              <Wifi className="h-3 w-3" aria-hidden="true" />
              Binance
            </Badge>
          )}
          <InfoTooltip 
            content="Your total trading capital. Uses Binance wallet balance when connected."
            variant="info"
          />
        </Label>
        <Input
          type="number"
          value={accountBalance}
          onChange={(e) => setAccountBalance(Number(e.target.value))}
          min={0}
          aria-label={`Account balance in ${currency}`}
        />
        <p className="text-xs text-muted-foreground">
          {source === 'binance' ? 'From Binance wallet' : 'From paper trading account(s)'}
        </p>
      </div>
      
      {/* Risk Percent */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Risk per Trade (%)
          <InfoTooltip 
            content="The percentage of your account you're willing to lose if this trade hits stop loss. 1-2% is recommended."
            variant="help"
          />
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[riskPercent]}
            onValueChange={([value]) => setRiskPercent(value)}
            min={RISK_SLIDER_CONFIG.MIN}
            max={RISK_SLIDER_CONFIG.MAX}
            step={RISK_SLIDER_CONFIG.STEP}
            className="flex-1"
            aria-label={`Risk per trade: ${riskPercent}%`}
          />
          <span className="w-12 text-right font-medium">{riskPercent}%</span>
        </div>
        {riskProfileDefault && (
          <p className="text-xs text-muted-foreground">
            Profile default: {riskProfileDefault}%
          </p>
        )}
      </div>

      {/* Entry Price - prices are always in USD (exchange base) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Entry Price ($)
          <InfoTooltip 
            content="The price at which you plan to enter the trade. Always in USD (exchange quote currency)."
            variant="info"
          />
        </Label>
        <Input
          type="number"
          value={entryPrice}
          onChange={(e) => setEntryPrice(Number(e.target.value))}
          min={0}
          step={0.01}
          aria-label="Entry price in USD"
        />
      </div>

      {/* Stop Loss - prices are always in USD (exchange base) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Stop Loss Price ($)
          <InfoTooltip 
            content="The price at which you will exit the trade to limit losses. Must be below entry for longs, above for shorts. Always in USD (exchange quote currency)."
            variant="warning"
          />
        </Label>
        <Input
          type="number"
          value={stopLossPrice}
          onChange={(e) => setStopLossPrice(Number(e.target.value))}
          min={0}
          step={0.01}
          aria-label="Stop loss price in USD"
        />
      </div>

      {/* Direction */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Direction
          <InfoTooltip 
            content="Long: profit when price goes up. Short: profit when price goes down. Choose based on your market analysis."
            variant="info"
          />
        </Label>
        <div className="flex gap-2" role="group" aria-label="Trade direction">
          <button
            type="button"
            onClick={() => setDirection('long')}
            aria-pressed={direction === 'long'}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              direction === 'long'
                ? 'bg-profit-muted border-profit/50 text-profit'
                : 'border-border hover:bg-accent'
            }`}
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Long
          </button>
          <button
            type="button"
            onClick={() => setDirection('short')}
            aria-pressed={direction === 'short'}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              direction === 'short'
                ? 'bg-loss-muted border-loss/50 text-loss'
                : 'border-border hover:bg-accent'
            }`}
          >
            <TrendingDown className="h-4 w-4" aria-hidden="true" />
            Short
          </button>
        </div>
      </div>

      {/* Leverage */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Leverage
          <InfoTooltip 
            content="Multiplies both gains and losses. 10x leverage means 1% price move = 10% account change. Higher leverage = higher liquidation risk."
            variant="warning"
          />
        </Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[leverage]}
            onValueChange={([value]) => setLeverage(value)}
            min={LEVERAGE_SLIDER_CONFIG.MIN}
            max={LEVERAGE_SLIDER_CONFIG.MAX}
            step={LEVERAGE_SLIDER_CONFIG.STEP}
            className="flex-1"
            aria-label={`Leverage: ${leverage}x`}
          />
          <span className="w-12 text-right font-medium">{leverage}x</span>
        </div>
      </div>
    </div>
  );
}
