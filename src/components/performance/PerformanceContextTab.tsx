/**
 * Performance Context Tab - Market Conditions, Event Impact, Volatility
 * With beginner-friendly tooltips (Phase 4)
 * Hides empty sections when no analyzable data exists
 */
import { useMemo } from "react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { CombinedContextualScore } from "@/components/analytics/contextual/CombinedContextualScore";
import { EventDayComparison } from "@/components/analytics/contextual/EventDayComparison";
import { FearGreedZoneChart } from "@/components/analytics/contextual/FearGreedZoneChart";
import { VolatilityLevelChart } from "@/components/analytics/contextual/VolatilityLevelChart";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import type { UnifiedMarketContext } from "@/types/market-context";

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
  // Check if any trades have market_context data
  const hasMarketContextData = useMemo(() => {
    return filteredTrades.some(t => {
      const ctx = t.market_context as unknown as UnifiedMarketContext;
      return ctx && Object.keys(ctx).length > 0;
    });
  }, [filteredTrades]);

  const hasEventData = contextualData && (
    contextualData.byEventProximity.eventDay?.totalTrades > 0 ||
    contextualData.byEventProximity.normalDay?.totalTrades > 0
  );

  const hasVolatilityData = contextualData && contextualData.byVolatility &&
    Object.values(contextualData.byVolatility).some((v: any) => v?.totalTrades > 0);

  const hasAnySection = hasMarketContextData || hasEventData || hasVolatilityData;

  if (!hasAnySection) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No contextual data available</p>
            <p className="text-sm mt-1">Complete trades with market context enabled to see environmental analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Market Conditions Overview */}
      {hasMarketContextData && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            Market Conditions Overview
            <InfoTooltip content="Mengukur sentimen pasar crypto secara keseluruhan. Extreme Fear sering jadi peluang beli, Extreme Greed menandakan potensi koreksi." />
          </h3>
          <CombinedContextualScore trades={filteredTrades} />
        </div>
      )}

      {/* Event Impact Analysis */}
      {hasEventData && contextualData && (
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
      {hasVolatilityData && contextualData && (
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
