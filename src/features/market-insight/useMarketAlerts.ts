/**
 * Market Alerts Hook
 * Monitors for extreme Fear & Greed, Crypto+Macro conflicts, OI spikes, funding divergence
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMarketSentiment } from "./useMarketSentiment";
import { useMacroAnalysis } from "./useMacroAnalysis";

interface AlertConfig {
  enabled: boolean;
  fearGreedExtremeThreshold?: { low: number; high: number };
  showConflictAlerts?: boolean;
  /** OI change % threshold to trigger alert (default 5) */
  oiSpikeThreshold?: number;
  /** Enable funding/price divergence alerts */
  showDivergenceAlerts?: boolean;
}

const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  fearGreedExtremeThreshold: { low: 25, high: 75 },
  showConflictAlerts: true,
  oiSpikeThreshold: 5,
  showDivergenceAlerts: true,
};

export function useMarketAlerts(config: AlertConfig = DEFAULT_CONFIG) {
  const { data: sentimentData } = useMarketSentiment();
  const { data: macroData } = useMacroAnalysis();
  
  // Track what alerts we've already shown to avoid spam
  const shownAlerts = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!config.enabled || !sentimentData) return;
    
    const fearGreed = sentimentData.sentiment.fearGreed.value;
    const thresholds = config.fearGreedExtremeThreshold || { low: 25, high: 75 };
    
    // Check for Extreme Fear
    if (fearGreed <= thresholds.low) {
      const alertKey = `extreme-fear-${Math.floor(Date.now() / (1000 * 60 * 60))}`;
      if (!shownAlerts.current.has(alertKey)) {
        shownAlerts.current.add(alertKey);
        toast.warning("⚠️ Extreme Fear Detected", {
          description: `Fear & Greed Index at ${fearGreed} - potential accumulation opportunity for long-term positions`,
          duration: 10000,
        });
      }
    }
    
    // Check for Extreme Greed
    if (fearGreed >= thresholds.high) {
      const alertKey = `extreme-greed-${Math.floor(Date.now() / (1000 * 60 * 60))}`;
      if (!shownAlerts.current.has(alertKey)) {
        shownAlerts.current.add(alertKey);
        toast.warning("⚠️ Extreme Greed Detected", {
          description: `Fear & Greed Index at ${fearGreed} - consider taking profits and reducing exposure`,
          duration: 10000,
        });
      }
    }
  }, [config.enabled, sentimentData, config.fearGreedExtremeThreshold]);
  
  // Crypto vs Macro conflict
  useEffect(() => {
    if (!config.enabled || !config.showConflictAlerts || !sentimentData || !macroData) return;
    
    const cryptoSentiment = sentimentData.sentiment.overall;
    const macroSentiment = macroData.macro.overallSentiment;
    
    const cryptoBullish = cryptoSentiment === 'bullish';
    const macroBullish = macroSentiment === 'bullish';
    const cryptoBearish = cryptoSentiment === 'bearish';
    const macroBearish = macroSentiment === 'bearish';
    
    const hasConflict = (cryptoBullish && macroBearish) || (cryptoBearish && macroBullish);
    
    if (hasConflict) {
      const alertKey = `conflict-${cryptoSentiment}-${macroSentiment}-${Math.floor(Date.now() / (1000 * 60 * 30))}`;
      if (!shownAlerts.current.has(alertKey)) {
        shownAlerts.current.add(alertKey);
        toast.info("📊 Market Sentiment Conflict", {
          description: `Crypto: ${cryptoSentiment.toUpperCase()} vs Macro: ${macroSentiment.toUpperCase()} - reduce position size and use tight stops`,
          duration: 8000,
        });
      }
    }
  }, [config.enabled, config.showConflictAlerts, sentimentData, macroData]);

  // OI spike + Funding divergence alerts from market-insight edge function data
  useEffect(() => {
    if (!config.enabled || !sentimentData) return;

    const oiChanges = (sentimentData as any).oiChanges as Array<{ symbol: string; oiChange24hPct: number }> | undefined;
    const divergences = (sentimentData as any).divergences as Array<{ symbol: string; hasDivergence: boolean; type: string; description: string }> | undefined;

    // OI spike alerts
    const oiThreshold = config.oiSpikeThreshold ?? 5;
    if (oiChanges) {
      for (const oi of oiChanges) {
        if (Math.abs(oi.oiChange24hPct) >= oiThreshold) {
          const alertKey = `oi-spike-${oi.symbol}-${Math.floor(Date.now() / (1000 * 60 * 60))}`;
          if (!shownAlerts.current.has(alertKey)) {
            shownAlerts.current.add(alertKey);
            const direction = oi.oiChange24hPct > 0 ? 'building' : 'unwinding';
            toast.info(`📈 OI ${direction.charAt(0).toUpperCase() + direction.slice(1)} on ${oi.symbol}`, {
              description: `OI change ${oi.oiChange24hPct > 0 ? '+' : ''}${oi.oiChange24hPct.toFixed(1)}% (24h) — ${
                oi.oiChange24hPct > 0 ? 'breakout or squeeze imminent' : 'deleveraging, expect volatility'
              }`,
              duration: 8000,
            });
          }
        }
      }
    }

    // Funding/price divergence alerts
    if (config.showDivergenceAlerts !== false && divergences) {
      for (const div of divergences) {
        if (div.hasDivergence) {
          const alertKey = `divergence-${div.symbol}-${div.type}-${Math.floor(Date.now() / (1000 * 60 * 30))}`;
          if (!shownAlerts.current.has(alertKey)) {
            shownAlerts.current.add(alertKey);
            toast.warning(`⚡ Funding/Price Divergence on ${div.symbol}`, {
              description: div.description,
              duration: 10000,
            });
          }
        }
      }
    }
  }, [config.enabled, config.oiSpikeThreshold, config.showDivergenceAlerts, sentimentData]);
  
  // Cleanup old alerts periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (shownAlerts.current.size > 20) {
        shownAlerts.current.clear();
      }
    }, 60 * 60 * 1000);
    
    return () => clearInterval(cleanup);
  }, []);
  
  return {
    alertsEnabled: config.enabled,
    fearGreedValue: sentimentData?.sentiment.fearGreed.value,
    isExtremeCondition: sentimentData ? (
      sentimentData.sentiment.fearGreed.value <= (config.fearGreedExtremeThreshold?.low || 25) ||
      sentimentData.sentiment.fearGreed.value >= (config.fearGreedExtremeThreshold?.high || 75)
    ) : false
  };
}
