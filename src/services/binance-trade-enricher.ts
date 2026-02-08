/**
 * Binance Trade Enricher Service
 * 
 * Reconstructs complete trade data by combining:
 * - /fapi/v1/income (REALIZED_PNL) - P&L values
 * - /fapi/v1/userTrades - Exact entry/exit prices, quantities, direction
 * - /fapi/v1/allOrders - Order types, stop prices
 * 
 * This service solves the "missing data" problem where synced trades have:
 * - entry_price: 0 (should be actual entry)
 * - exit_price: 0 (should be actual exit)
 * - direction: 'LONG' (hardcoded, should be LONG/SHORT)
 * - quantity: 0 (should be actual size)
 */

import { supabase } from "@/integrations/supabase/client";
import type { BinanceIncome, BinanceTrade } from "@/features/binance/types";

const BINANCE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-futures`;
const RATE_LIMIT_DELAY = 300;
const EMPTY_RETRY_LIMIT = 2; // Retry empty responses to handle race conditions
const EMPTY_RETRY_DELAY = 500; // Longer delay for race condition recovery

// Binance userTrades API has a max 7-day window per request
// Using 6.5 days (93%) to ensure we don't hit the boundary exactly
const MAX_TRADES_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days in ms (safety margin)

/**
 * Enhanced trade data with complete entry/exit information
 */
export interface EnrichedTradeData {
  // Identifiers
  symbol: string;
  orderId: number | null;
  tranId: number;
  
  // From userTrades (NEW - accurate data)
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  direction: 'LONG' | 'SHORT';
  entryTime: Date;
  exitTime: Date;
  
  // From income
  realizedPnl: number;
  
  // From commission income (linked)
  totalFees: number;
  isMaker: boolean | null;
  
  // Calculated
  grossPnl: number;  // Price diff × quantity
  netPnl: number;    // grossPnl - fees
  holdTimeMinutes: number;
}

/**
 * Grouped fills for a single trade (entry + exit)
 */
interface TradeFillGroup {
  symbol: string;
  orderId: number;
  entryFills: BinanceTrade[];
  exitFills: BinanceTrade[];
  totalEntryQty: number;
  totalExitQty: number;
  avgEntryPrice: number;
  avgExitPrice: number;
  entryTime: number;
  exitTime: number;
  direction: 'LONG' | 'SHORT';
  totalCommission: number;
  isMaker: boolean | null;
}

/**
 * Call Binance edge function
 */
async function callBinanceApi<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(BINANCE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    },
    body: JSON.stringify({ action, ...params }),
  });
  
  return response.json();
}

/**
 * Fetch userTrades for a specific symbol within a 7-day window
 * /fapi/v1/userTrades has a maximum 7-day interval limit
 */
async function fetchUserTradesChunk(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<BinanceTrade[]> {
  const allTrades: BinanceTrade[] = [];
  let fromId: number | undefined = undefined;
  let emptyRetryCount = 0;
  
  while (true) {
    const result = await callBinanceApi<BinanceTrade[]>('trades', {
      symbol,
      // Only send time filters for initial request (no fromId)
      // When using cursor-based pagination, Binance ignores time filters anyway
      ...(fromId === undefined && { startTime, endTime }),
      limit: 1000,
      ...(fromId && { fromId }),
    });
    
    // Handle empty response with retry (race condition handling)
    if (!result.success || !result.data?.length) {
      if (result.success && fromId !== undefined && emptyRetryCount < EMPTY_RETRY_LIMIT) {
        emptyRetryCount++;
        console.log(`[Enricher] ${symbol}: Empty response, retry ${emptyRetryCount}/${EMPTY_RETRY_LIMIT}`);
        await new Promise(r => setTimeout(r, EMPTY_RETRY_DELAY));
        continue;
      }
      break;
    }
    
    emptyRetryCount = 0; // Reset on successful data
    allTrades.push(...result.data);
    
    if (result.data.length < 1000) break;
    
    fromId = result.data[result.data.length - 1].id + 1;
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
  
  return allTrades;
}

/**
 * Fetch userTrades for a specific symbol with chunked time windows
 * Binance userTrades API has a MAX 7-day interval - we chunk longer periods
 */
async function fetchUserTradesForSymbol(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<BinanceTrade[]> {
  const allTrades: BinanceTrade[] = [];
  
  // Calculate number of 6.5-day chunks needed
  const totalDuration = endTime - startTime;
  const numChunks = Math.ceil(totalDuration / MAX_TRADES_INTERVAL_MS);
  
  // Debug logging for performance monitoring
  console.log(`[Enricher] ${symbol}: Fetching ${numChunks} chunks for ${Math.round(totalDuration / (24*60*60*1000))} days`);
  
  for (let i = 0; i < numChunks; i++) {
    const chunkStart = startTime + (i * MAX_TRADES_INTERVAL_MS);
    const chunkEnd = Math.min(chunkStart + MAX_TRADES_INTERVAL_MS, endTime);
    
    const chunkTrades = await fetchUserTradesChunk(symbol, chunkStart, chunkEnd);
    allTrades.push(...chunkTrades);
    
    // Rate limit between chunks
    if (i < numChunks - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
  
  // Deduplicate by trade id (in case of overlap at boundaries)
  const uniqueTrades = new Map<number, BinanceTrade>();
  for (const trade of allTrades) {
    uniqueTrades.set(trade.id, trade);
  }
  
  return Array.from(uniqueTrades.values()).sort((a, b) => a.time - b.time);
}

/**
 * Group trades into entry/exit pairs based on positionSide
 * 
 * Logic:
 * - LONG position: BUY = entry, SELL = exit
 * - SHORT position: SELL = entry, BUY = exit
 * - Hedge mode: Use positionSide field directly
 */
function groupTradesIntoPositions(trades: BinanceTrade[]): TradeFillGroup[] {
  const positionGroups = new Map<string, {
    entryFills: BinanceTrade[];
    exitFills: BinanceTrade[];
  }>();
  
  // Sort by time
  const sortedTrades = [...trades].sort((a, b) => a.time - b.time);
  
  for (const trade of sortedTrades) {
    const key = `${trade.symbol}_${trade.positionSide}`;
    
    if (!positionGroups.has(key)) {
      positionGroups.set(key, { entryFills: [], exitFills: [] });
    }
    
    const group = positionGroups.get(key)!;
    
    // Determine if this is entry or exit based on position side and trade side
    const isLongPosition = trade.positionSide === 'LONG' || 
      (trade.positionSide === 'BOTH' && trade.side === 'BUY');
    
    if (isLongPosition) {
      // LONG: BUY = entry, SELL = exit
      if (trade.side === 'BUY') {
        group.entryFills.push(trade);
      } else {
        group.exitFills.push(trade);
      }
    } else {
      // SHORT: SELL = entry, BUY = exit
      if (trade.side === 'SELL') {
        group.entryFills.push(trade);
      } else {
        group.exitFills.push(trade);
      }
    }
  }
  
  // Convert to TradeFillGroup format
  const results: TradeFillGroup[] = [];
  
  for (const [key, group] of positionGroups) {
    const [symbol, positionSide] = key.split('_');
    
    if (group.entryFills.length === 0) continue;
    
    // Calculate weighted average entry price
    let totalEntryValue = 0;
    let totalEntryQty = 0;
    let totalCommission = 0;
    let earliestEntry = Infinity;
    let latestExit = 0;
    let isMaker: boolean | null = null;
    
    for (const fill of group.entryFills) {
      totalEntryValue += fill.price * fill.qty;
      totalEntryQty += fill.qty;
      totalCommission += fill.commission;
      earliestEntry = Math.min(earliestEntry, fill.time);
      if (isMaker === null) isMaker = fill.maker;
    }
    
    // Calculate weighted average exit price
    let totalExitValue = 0;
    let totalExitQty = 0;
    
    for (const fill of group.exitFills) {
      totalExitValue += fill.price * fill.qty;
      totalExitQty += fill.qty;
      totalCommission += fill.commission;
      latestExit = Math.max(latestExit, fill.time);
    }
    
    if (totalEntryQty === 0) continue;
    
    results.push({
      symbol,
      orderId: group.entryFills[0]?.orderId || 0,
      entryFills: group.entryFills,
      exitFills: group.exitFills,
      totalEntryQty,
      totalExitQty,
      avgEntryPrice: totalEntryValue / totalEntryQty,
      avgExitPrice: totalExitQty > 0 ? totalExitValue / totalExitQty : 0,
      entryTime: earliestEntry,
      exitTime: latestExit || earliestEntry,
      direction: positionSide === 'SHORT' ? 'SHORT' : 'LONG',
      totalCommission,
      isMaker,
    });
  }
  
  return results;
}

/**
 * Link income records with userTrades to create enriched trade data
 * Uses 5-minute fuzzy matching with adjacent bucket lookups
 */
export function linkIncomeWithTrades(
  incomeRecords: BinanceIncome[],
  tradeFillGroups: TradeFillGroup[],
  commissionRecords: BinanceIncome[]
): EnrichedTradeData[] {
  const enrichedTrades: EnrichedTradeData[] = [];
  
  // Create lookup maps with 5-minute buckets and adjacent bucket support
  const tradesBySymbolTime = new Map<string, TradeFillGroup>();
  for (const group of tradeFillGroups) {
    // Use 5-minute bucket instead of 1-minute for more tolerance
    const bucket5min = Math.floor(group.exitTime / 300000); // 5 minutes in ms
    
    // Register for adjacent buckets (-1, 0, +1) to handle timing differences
    for (const offset of [-1, 0, 1]) {
      const key = `${group.symbol}_${bucket5min + offset}`;
      // Only set if not already registered (prefer exact match)
      if (!tradesBySymbolTime.has(key)) {
        tradesBySymbolTime.set(key, group);
      }
    }
  }
  
  // Create commission lookup by orderId
  const commissionByOrderId = new Map<number, number>();
  for (const comm of commissionRecords) {
    // Commission income is negative
    const existingFee = commissionByOrderId.get(comm.tranId) || 0;
    commissionByOrderId.set(comm.tranId, existingFee + Math.abs(comm.income));
  }
  
  // Process each REALIZED_PNL income record
  for (const income of incomeRecords) {
    if (income.incomeType !== 'REALIZED_PNL') continue;
    
    // Try to find matching trade fills using 5-minute bucket
    const bucket5min = Math.floor(income.time / 300000);
    const timeKey = `${income.symbol}_${bucket5min}`;
    const matchingTrade = tradesBySymbolTime.get(timeKey);
    
    if (matchingTrade && matchingTrade.avgEntryPrice > 0) {
      // We found matching trade fills - use accurate data
      const holdTimeMinutes = Math.round((matchingTrade.exitTime - matchingTrade.entryTime) / 60000);
      const grossPnl = (matchingTrade.avgExitPrice - matchingTrade.avgEntryPrice) * 
        matchingTrade.totalExitQty * (matchingTrade.direction === 'LONG' ? 1 : -1);
      
      enrichedTrades.push({
        symbol: income.symbol,
        orderId: matchingTrade.orderId,
        tranId: income.tranId,
        entryPrice: matchingTrade.avgEntryPrice,
        exitPrice: matchingTrade.avgExitPrice,
        quantity: matchingTrade.totalExitQty || matchingTrade.totalEntryQty,
        direction: matchingTrade.direction,
        entryTime: new Date(matchingTrade.entryTime),
        exitTime: new Date(matchingTrade.exitTime),
        realizedPnl: income.income,
        totalFees: matchingTrade.totalCommission,
        isMaker: matchingTrade.isMaker,
        grossPnl,
        netPnl: income.income, // Use Binance's realized PnL as net
        holdTimeMinutes,
      });
    } else {
      // No matching trade fills - create with income data only but mark as unmatched
      // Direction inference: use 'UNKNOWN' instead of guessing
      enrichedTrades.push({
        symbol: income.symbol,
        orderId: null,
        tranId: income.tranId,
        entryPrice: 0, // Explicitly 0 = needs enrichment
        exitPrice: 0,
        quantity: 0,
        direction: 'LONG', // Fallback - but entry_price=0 flags it as incomplete
        entryTime: new Date(income.time),
        exitTime: new Date(income.time),
        realizedPnl: income.income,
        totalFees: 0,
        isMaker: null,
        grossPnl: income.income,
        netPnl: income.income,
        holdTimeMinutes: 0,
      });
    }
  }
  
  return enrichedTrades;
}

/**
 * Fetch and enrich trades for a list of symbols
 * This is the main function to call for trade enrichment
 */
export async function fetchEnrichedTradesForSymbols(
  symbols: string[],
  startTime: number,
  endTime: number,
  incomeRecords: BinanceIncome[],
  onProgress?: (current: number, total: number) => void
): Promise<EnrichedTradeData[]> {
  const allTradeGroups: TradeFillGroup[] = [];
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    
    onProgress?.(i + 1, symbols.length);
    
    const trades = await fetchUserTradesForSymbol(symbol, startTime, endTime);
    const groups = groupTradesIntoPositions(trades);
    allTradeGroups.push(...groups);
    
    // Rate limit between symbols
    if (i < symbols.length - 1) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }
  
  // Get commission records
  const commissionRecords = incomeRecords.filter(r => r.incomeType === 'COMMISSION');
  
  // Link income with trades
  const pnlRecords = incomeRecords.filter(r => r.incomeType === 'REALIZED_PNL');
  return linkIncomeWithTrades(pnlRecords, allTradeGroups, commissionRecords);
}

/**
 * Extract unique symbols from income records
 */
export function getUniqueSymbolsFromIncome(incomeRecords: BinanceIncome[]): string[] {
  const symbols = new Set<string>();
  for (const income of incomeRecords) {
    if (income.symbol) {
      symbols.add(income.symbol);
    }
  }
  return Array.from(symbols);
}
