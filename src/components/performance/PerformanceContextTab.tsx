/**
 * Performance Context Tab - Market Conditions, Event Impact, Volatility
 * With beginner-friendly tooltips (Phase 4)
 */
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { CombinedContextualScore } from "@/components/analytics/contextual/CombinedContextualScore";
import { EventDayComparison } from "@/components/analytics/contextual/EventDayComparison";
import { FearGreedZoneChart } from "@/components/analytics/contextual/FearGreedZoneChart";
import { VolatilityLevelChart } from "@/components/analytics/contextual/VolatilityLevelChart";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface ContextualData {
  byEventProximity: {
    eventDay: any;
    normalDay: any;
  };
  byFearGreed: any;
  byVolatility: any;
}

interface PerformanceContextTabProps {
  filteredTrades: TradeEntry[];
  contextualData: ContextualData | undefined;
}

export function PerformanceContextTab({ filteredTrades, contextualData }: PerformanceContextTabProps) {
  return (
    <div className="space-y-8">
      {/* Market Conditions Overview */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          Market Conditions Overview
          <InfoTooltip content="Mengukur sentimen pasar crypto secara keseluruhan. Extreme Fear sering jadi peluang beli, Extreme Greed menandakan potensi koreksi." />
        </h3>
        <CombinedContextualScore trades={filteredTrades} />
      </div>

      {/* Event Impact Analysis */}
      {contextualData && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            Event Impact Analysis
            <InfoTooltip content="Membandingkan performa trading Anda pada hari ada berita ekonomi besar vs hari biasa. Helps identify if news events help or hurt your trading." />
          </h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <EventDayComparison 
              eventDayMetrics={contextualData.byEventProximity.eventDay}
              normalDayMetrics={contextualData.byEventProximity.normalDay}
            />
            <FearGreedZoneChart byFearGreed={contextualData.byFearGreed} />
          </div>
        </div>
      )}

      {/* Volatility Analysis */}
      {contextualData && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            Volatility Analysis
            <InfoTooltip content="Mengukur seberapa liar pergerakan harga. High volatility = potensi profit besar tapi risiko juga tinggi. Track which volatility regime suits your strategy best." />
          </h3>
          <VolatilityLevelChart byVolatility={contextualData.byVolatility} />
        </div>
      )}
    </div>
  );
}
