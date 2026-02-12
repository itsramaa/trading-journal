/**
 * SIMULATION Mode Banner (H-03)
 * Persistent amber banner shown when trade_mode === 'paper'
 * Non-dismissible, appears on ALL pages via DashboardLayout
 */
import { AlertTriangle } from "lucide-react";
import { useTradeMode } from "@/hooks/use-trade-mode";

export function SimulationBanner() {
  const { isPaper, isLoading } = useTradeMode();

  if (isLoading || !isPaper) return null;

  return (
    <div
      className="w-full px-4 py-2 bg-[hsl(var(--chart-4))]/15 border-b border-[hsl(var(--chart-4))]/30 flex items-center justify-center gap-2"
      role="status"
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" aria-hidden="true" />
      <span className="text-sm font-medium text-[hsl(var(--chart-4))]">
        ⚠ SIMULATION MODE — Data does not affect Live statistics
      </span>
    </div>
  );
}
