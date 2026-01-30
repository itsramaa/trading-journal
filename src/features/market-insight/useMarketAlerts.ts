/**
 * Market Alerts Hook
 * Monitors for extreme Fear & Greed, Crypto+Macro conflicts, high-impact events
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMarketSentiment } from "./useMarketSentiment";
import { useMacroAnalysis } from "./useMacroAnalysis";

interface AlertConfig {
  enabled: boolean;
  fearGreedExtremeThreshold?: { low: number; high: number };
  showConflictAlerts?: boolean;
}

const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  fearGreedExtremeThreshold: { low: 25, high: 75 },
  showConflictAlerts: true
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
      const alertKey = `extreme-fear-${Math.floor(Date.now() / (1000 * 60 * 60))}`; // Once per hour
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
  
  useEffect(() => {
    if (!config.enabled || !config.showConflictAlerts || !sentimentData || !macroData) return;
    
    // Detect crypto vs macro conflict
    const cryptoSentiment = sentimentData.sentiment.overall;
    const macroSentiment = macroData.macro.overallSentiment;
    
    const cryptoBullish = cryptoSentiment === 'bullish';
    const macroBullish = macroSentiment === 'bullish';
    const cryptoBearish = cryptoSentiment === 'bearish';
    const macroBearish = macroSentiment === 'bearish';
    
    // Conflict: one bullish, one bearish
    const hasConflict = (cryptoBullish && macroBearish) || (cryptoBearish && macroBullish);
    
    if (hasConflict) {
      const alertKey = `conflict-${cryptoSentiment}-${macroSentiment}-${Math.floor(Date.now() / (1000 * 60 * 30))}`; // Once per 30 min
      if (!shownAlerts.current.has(alertKey)) {
        shownAlerts.current.add(alertKey);
        toast.info("📊 Market Sentiment Conflict", {
          description: `Crypto: ${cryptoSentiment.toUpperCase()} vs Macro: ${macroSentiment.toUpperCase()} - reduce position size and use tight stops`,
          duration: 8000,
        });
      }
    }
  }, [config.enabled, config.showConflictAlerts, sentimentData, macroData]);
  
  // Cleanup old alerts periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const twoHoursAgo = now - (2 * 60 * 60 * 1000);
      // Reset if alerts are getting stale
      if (shownAlerts.current.size > 20) {
        shownAlerts.current.clear();
      }
    }, 60 * 60 * 1000); // Every hour
    
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
