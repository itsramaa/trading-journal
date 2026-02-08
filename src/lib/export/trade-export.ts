/**
 * Trade Export Utilities
 * Centralized functions for exporting trades to CSV/JSON
 * Extracted from TradeHistory.tsx for SRP compliance
 */

import { format } from "date-fns";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { CSV_EXPORT_HEADERS, TRADE_HISTORY_CONFIG } from "@/lib/constants/trade-history";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportOptions {
  /** Include header row in CSV */
  includeHeader?: boolean;
  /** Date format for export */
  dateFormat?: string;
  /** Delimiter for CSV */
  delimiter?: string;
}

export interface TradeExportRow {
  date: string;
  pair: string;
  direction: string;
  entry: number;
  exit: number | null;
  pnl: number;
  result: string;
  notes: string;
}

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Format a single trade for export
 */
export function formatTradeForExport(trade: TradeEntry, dateFormat?: string): TradeExportRow {
  const df = dateFormat || TRADE_HISTORY_CONFIG.export.dateFormat;
  return {
    date: format(new Date(trade.trade_date), df),
    pair: trade.pair,
    direction: trade.direction,
    entry: trade.entry_price,
    exit: trade.exit_price ?? null,
    pnl: trade.realized_pnl ?? trade.pnl ?? 0,
    result: trade.result || '',
    notes: (trade.notes || '').replace(/,/g, ';').replace(/\n/g, ' '), // Escape for CSV
  };
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Generate CSV content from trades
 */
export function generateCsvContent(
  trades: TradeEntry[],
  options: ExportOptions = {}
): string {
  const {
    includeHeader = true,
    dateFormat = TRADE_HISTORY_CONFIG.export.dateFormat,
    delimiter = TRADE_HISTORY_CONFIG.export.csvDelimiter,
  } = options;

  const lines: string[] = [];

  // Header row
  if (includeHeader) {
    lines.push(CSV_EXPORT_HEADERS.join(delimiter));
  }

  // Data rows
  trades.forEach(trade => {
    const row = formatTradeForExport(trade, dateFormat);
    lines.push([
      row.date,
      row.pair,
      row.direction,
      row.entry.toString(),
      row.exit?.toString() || '',
      row.pnl.toString(),
      row.result,
      row.notes,
    ].join(delimiter));
  });

  return lines.join('\n');
}

/**
 * Export trades to CSV and trigger download
 */
export function exportTradesCsv(
  trades: TradeEntry[],
  filename?: string,
  options: ExportOptions = {}
): void {
  const csvContent = generateCsvContent(trades, options);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  
  URL.revokeObjectURL(url);
}

// ============================================================================
// JSON EXPORT
// ============================================================================

/**
 * Generate JSON content from trades
 */
export function generateJsonContent(
  trades: TradeEntry[],
  options: ExportOptions = {}
): string {
  const { dateFormat = TRADE_HISTORY_CONFIG.export.dateFormat } = options;
  
  const exportData = trades.map(trade => formatTradeForExport(trade, dateFormat));
  return JSON.stringify(exportData, null, 2);
}

/**
 * Export trades to JSON and trigger download
 */
export function exportTradesJson(
  trades: TradeEntry[],
  filename?: string,
  options: ExportOptions = {}
): void {
  const jsonContent = generateJsonContent(trades, options);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `trade-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}
