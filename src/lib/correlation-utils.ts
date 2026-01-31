/**
 * Correlation Utilities
 * Static correlation map for crypto pairs and utility functions
 */

/**
 * Static correlation coefficients between major crypto pairs
 * Based on historical 30-day rolling correlations
 * Values range from -1 (inverse) to 1 (perfect correlation)
 */
export const CRYPTO_CORRELATIONS: Record<string, number> = {
  // BTC correlations
  'BTCUSDT-ETHUSDT': 0.82,
  'BTCUSDT-BNBUSDT': 0.75,
  'BTCUSDT-SOLUSDT': 0.78,
  'BTCUSDT-XRPUSDT': 0.68,
  'BTCUSDT-DOGEUSDT': 0.72,
  'BTCUSDT-ADAUSDT': 0.70,
  'BTCUSDT-AVAXUSDT': 0.76,
  'BTCUSDT-LINKUSDT': 0.74,
  'BTCUSDT-MATICUSDT': 0.73,
  'BTCUSDT-DOTUSDT': 0.71,
  
  // ETH correlations
  'ETHUSDT-BNBUSDT': 0.70,
  'ETHUSDT-SOLUSDT': 0.75,
  'ETHUSDT-XRPUSDT': 0.62,
  'ETHUSDT-DOGEUSDT': 0.65,
  'ETHUSDT-ADAUSDT': 0.68,
  'ETHUSDT-AVAXUSDT': 0.74,
  'ETHUSDT-LINKUSDT': 0.72,
  'ETHUSDT-MATICUSDT': 0.76,
  'ETHUSDT-DOTUSDT': 0.69,
  
  // BNB correlations
  'BNBUSDT-SOLUSDT': 0.65,
  'BNBUSDT-XRPUSDT': 0.58,
  'BNBUSDT-DOGEUSDT': 0.60,
  'BNBUSDT-ADAUSDT': 0.62,
  
  // SOL correlations
  'SOLUSDT-AVAXUSDT': 0.72,
  'SOLUSDT-LINKUSDT': 0.68,
  'SOLUSDT-MATICUSDT': 0.70,
  
  // Other pairs
  'XRPUSDT-DOGEUSDT': 0.55,
  'XRPUSDT-ADAUSDT': 0.64,
  'ADAUSDT-DOTUSDT': 0.67,
  'AVAXUSDT-MATICUSDT': 0.69,
};

export const CORRELATION_WARNING_THRESHOLD = 0.6;
export const CORRELATION_HIGH_THRESHOLD = 0.75;

export interface CorrelatedPair {
  pair1: string;
  pair2: string;
  correlation: number;
}

export interface CorrelationWarning {
  pairs: CorrelatedPair[];
  avgCorrelation: number;
  highRiskCount: number;
}

/**
 * Get correlation coefficient between two symbols
 * Handles both directions (A-B and B-A)
 */
export function getCorrelation(symbol1: string, symbol2: string): number {
  if (symbol1 === symbol2) return 1;
  
  const key1 = `${symbol1}-${symbol2}`;
  const key2 = `${symbol2}-${symbol1}`;
  
  return CRYPTO_CORRELATIONS[key1] ?? CRYPTO_CORRELATIONS[key2] ?? 0;
}

/**
 * Check correlation risk for open positions
 * Returns warning if multiple positions are correlated above threshold
 */
export function checkCorrelationRisk(
  symbols: string[],
  threshold: number = CORRELATION_WARNING_THRESHOLD
): CorrelationWarning | null {
  if (symbols.length < 2) return null;
  
  const correlatedPairs: CorrelatedPair[] = [];
  
  // Check all pairs
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const correlation = getCorrelation(symbols[i], symbols[j]);
      if (correlation >= threshold) {
        correlatedPairs.push({
          pair1: symbols[i],
          pair2: symbols[j],
          correlation,
        });
      }
    }
  }
  
  if (correlatedPairs.length === 0) return null;
  
  const avgCorrelation = correlatedPairs.reduce((sum, p) => sum + p.correlation, 0) / correlatedPairs.length;
  const highRiskCount = correlatedPairs.filter(p => p.correlation >= CORRELATION_HIGH_THRESHOLD).length;
  
  return {
    pairs: correlatedPairs,
    avgCorrelation,
    highRiskCount,
  };
}

/**
 * Get a human-readable correlation description
 */
export function getCorrelationLabel(correlation: number): string {
  if (correlation >= 0.9) return 'Very High';
  if (correlation >= 0.75) return 'High';
  if (correlation >= 0.6) return 'Moderate';
  if (correlation >= 0.4) return 'Low';
  return 'Very Low';
}

/**
 * Get unique symbols from position data
 */
export function extractSymbols(positions: Array<{ symbol: string }>): string[] {
  return [...new Set(positions.map(p => p.symbol))];
}
