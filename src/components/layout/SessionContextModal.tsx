/**
 * Session Context Modal (H-04)
 * Forces user to explicitly select trade_mode + trade_style before first use.
 * Blocks navigation until submitted. Saves to user_settings.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  FileText, 
  Zap, 
  TrendingUp, 
  Clock 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type TradeMode, type TradingStyle, TRADE_MODE_LABELS, TRADING_STYLE_LABELS, TRADING_STYLE_TIMEFRAMES } from "@/hooks/use-trade-mode";
import { useUpdateUserSettings } from "@/hooks/use-user-settings";

interface SessionContextModalProps {
  open: boolean;
  onComplete: () => void;
}

const MODE_OPTIONS: { value: TradeMode; label: string; description: string; icon: typeof Wifi }[] = [
  {
    value: "paper",
    label: "Paper Trading",
    description: "Simulasi tanpa risiko. Data terpisah dari Live.",
    icon: FileText,
  },
  {
    value: "live",
    label: "Live Trading",
    description: "Data real dari Binance. Read-only, tidak bisa buat trade manual.",
    icon: Wifi,
  },
];

const STYLE_OPTIONS: { value: TradingStyle; label: string; timeframe: string; icon: typeof Zap }[] = [
  {
    value: "scalping",
    label: TRADING_STYLE_LABELS.scalping,
    timeframe: TRADING_STYLE_TIMEFRAMES.scalping,
    icon: Zap,
  },
  {
    value: "short_trade",
    label: TRADING_STYLE_LABELS.short_trade,
    timeframe: TRADING_STYLE_TIMEFRAMES.short_trade,
    icon: TrendingUp,
  },
  {
    value: "swing",
    label: TRADING_STYLE_LABELS.swing,
    timeframe: TRADING_STYLE_TIMEFRAMES.swing,
    icon: Clock,
  },
];

export function SessionContextModal({ open, onComplete }: SessionContextModalProps) {
  const [selectedMode, setSelectedMode] = useState<TradeMode | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<TradingStyle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateSettings = useUpdateUserSettings();

  const canSubmit = selectedMode !== null && selectedStyle !== null;

  const handleSubmit = async () => {
    if (!selectedMode || !selectedStyle) return;
    setIsSubmitting(true);

    try {
      // Single mutation to persist both values at once
      await updateSettings.mutateAsync({
        active_trade_mode: selectedMode,
        active_trading_style: selectedStyle,
      } as any);
    } catch (err) {
      console.error("[SessionContextModal] Failed to save to DB:", err);
    }

    // Always close modal regardless of success/failure
    setIsSubmitting(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* prevent dismiss */ }}>
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to Trading Journey</DialogTitle>
          <DialogDescription>
            Pilih mode dan gaya trading Anda sebelum melanjutkan. Ini bisa diubah kapan saja dari header.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Trading Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {MODE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedMode === opt.value;
                return (
                  <Card
                    key={opt.value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      isSelected && "border-primary ring-2 ring-primary/20"
                    )}
                    onClick={() => setSelectedMode(opt.value)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Trading Style
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {STYLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedStyle === opt.value;
                return (
                  <Card
                    key={opt.value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      isSelected && "border-primary ring-2 ring-primary/20"
                    )}
                    onClick={() => setSelectedStyle(opt.value)}
                  >
                    <CardContent className="p-3 space-y-1 text-center">
                      <Icon className={cn("h-5 w-5 mx-auto", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm font-medium block">{opt.label}</span>
                      <Badge variant="outline" className="text-xs">{opt.timeframe}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? "Menyimpan..." : "Mulai Trading"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
