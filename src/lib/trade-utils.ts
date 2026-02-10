/**
 * Trade Utilities
 * Centralized utility functions for trade-related operations
 * DRY: Single source of truth for trade validation and formatting
 */

import type { TradeEntry } from "@/hooks/use-trade-entries";

// ============================================================================
// ENRICHMENT CHECKS
// ============================================================================

/**
 * Check if a trade needs enrichment (missing entry/exit prices)
 * Used by TradeGalleryCard, TradeHistoryCard, and enrichment workflows
 */
export function tradeNeedsEnrichment(trade: TradeEntry): boolean {
  return trade.source === 'binance' && (!trade.entry_price || trade.entry_price === 0);
}

/**
 * Check if trade has incomplete direction data
 */
export function tradeHasUnknownDirection(trade: TradeEntry): boolean {
  return trade.direction === 'UNKNOWN';
}

// ============================================================================
// BADGE VARIANTS
// ============================================================================

export type DirectionBadgeVariant = 'long' | 'short' | 'outline';

/**
 * Get badge variant for trade direction
 * Used by TradeHistoryCard and TradeGalleryCard
 */
export function getDirectionBadgeVariant(direction: string): DirectionBadgeVariant {
  if (direction === 'LONG') return 'long';
  if (direction === 'SHORT') return 'short';
  return 'outline';
}

/**
 * Get display text for trade direction
 */
export function getDirectionDisplay(direction: string): string {
  if (direction === 'UNKNOWN') return '?';
  return direction;
}

// ============================================================================
// RESULT HELPERS
// ============================================================================

export type TradeResult = 'win' | 'loss' | 'breakeven';

/**
 * Determine trade result from P&L
 */
export function getTradeResult(pnl: number | null | undefined): TradeResult {
  if (pnl === null || pnl === undefined) return 'breakeven';
  if (pnl > 0) return 'win';
  if (pnl < 0) return 'loss';
  return 'breakeven';
}

/**
 * Check if trade is profitable
 */
export function isTradeProfit(pnl: number | null | undefined): boolean {
  return (pnl ?? 0) > 0;
}

/**
 * Check if trade is a loss
 */
export function isTradeLoss(pnl: number | null | undefined): boolean {
  return (pnl ?? 0) < 0;
}

// ============================================================================
// RISK:REWARD CALCULATION
// ============================================================================

/**
 * Calculate Risk:Reward ratio for a trade
 * Returns 0 if required data is missing
 * Note: For auto-calculation on close, use calculateRMultiple from trade-metrics
 */
export function calculateRiskReward(trade: TradeEntry): number {
  if (!trade.stop_loss || !trade.entry_price || !trade.exit_price) return 0;
  const risk = Math.abs(trade.entry_price - trade.stop_loss);
  if (risk === 0) return 0;
  const reward = Math.abs(trade.exit_price - trade.entry_price);
  return reward / risk;
}

/**
 * Format R:R for display
 */
export function formatRiskReward(rr: number): string {
  if (rr <= 0) return '-';
  return `${rr.toFixed(2)}:1`;
}

// ============================================================================
// SCREENSHOT HELPERS
// ============================================================================

/**
 * Check if trade has screenshots
 */
export function tradeHasScreenshots(trade: TradeEntry): boolean {
  return Array.isArray(trade.screenshots) && trade.screenshots.length > 0;
}

/**
 * Get screenshot count
 */
export function getScreenshotCount(trade: TradeEntry): number {
  return Array.isArray(trade.screenshots) ? trade.screenshots.length : 0;
}

/**
 * Get thumbnail URL from trade screenshots
 */
export function getThumbnailUrl(trade: TradeEntry): string | null {
  if (!tradeHasScreenshots(trade)) return null;
  return trade.screenshots![0].url;
}

// ============================================================================
// NOTES HELPERS
// ============================================================================

/**
 * Check if trade has notes
 */
export function tradeHasNotes(trade: TradeEntry): boolean {
  return Boolean(trade.notes && trade.notes.length > 0);
}

/**
 * Get notes line count
 */
export function getNotesLineCount(trade: TradeEntry): number {
  if (!trade.notes) return 0;
  return trade.notes.split('\n').filter(line => line.trim()).length;
}

/**
 * Check if notes have multiple entries (more than 2 lines)
 */
export function hasMultipleNotes(trade: TradeEntry): boolean {
  return getNotesLineCount(trade) > 2;
}

/**
 * Check if notes contain recent timestamp
 */
export function hasRecentNoteTimestamp(trade: TradeEntry): boolean {
  if (!trade.notes) return false;
  const today = new Date().toLocaleDateString();
  return trade.notes.includes(`[${today}`) || 
    Boolean(trade.notes.match(/\[(\d{1,2}:\d{2}:\d{2}\s*[AP]?M?)\]/g));
}
