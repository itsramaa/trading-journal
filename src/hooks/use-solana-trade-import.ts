/**
 * Hook: Solana Trade Import
 * Manages the flow of fetching, parsing, and importing
 * Solana DEX trades into the trading journal
 */
import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/use-auth';
import { useTradeMode } from '@/hooks/use-trade-mode';
import { supabase } from '@/integrations/supabase/client';
import { parseSolanaWalletTrades, type ParsedSolanaTrade, type SolanaParserResult } from '@/services/solana-trade-parser';
import { toast } from 'sonner';
import { invalidateTradeQueries } from '@/lib/query-invalidation';
import { useQueryClient } from '@tanstack/react-query';

export type ImportStatus = 'idle' | 'fetching' | 'parsed' | 'importing' | 'done' | 'error';

export interface UsesolanaTradeImportReturn {
  status: ImportStatus;
  result: SolanaParserResult | null;
  selectedTrades: Set<string>;
  fetchTrades: (limit?: number) => Promise<void>;
  importSelected: () => Promise<void>;
  toggleTrade: (signature: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  reset: () => void;
  importedCount: number;
  tradeMode: string;
}

export function useSolanaTradeImport(): UsesolanaTradeImportReturn {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { user } = useAuth();
  const { tradeMode } = useTradeMode();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<SolanaParserResult | null>(null);
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [importedCount, setImportedCount] = useState(0);

  const fetchTrades = useCallback(async (limit = 50) => {
    if (!publicKey || !connection) {
      toast.error('Please connect your Solana wallet first');
      return;
    }

    setStatus('fetching');
    try {
      const parseResult = await parseSolanaWalletTrades(
        connection,
        publicKey,
        { limit }
      );

      setResult(parseResult);
      // Auto-select all parsed trades
      setSelectedTrades(new Set(parseResult.trades.map(t => t.signature)));
      setStatus('parsed');

      if (parseResult.trades.length === 0) {
        toast.info(`Scanned ${parseResult.totalTransactions} transactions — no DEX trades found`);
      } else {
        toast.success(`Found ${parseResult.trades.length} trades from ${parseResult.totalTransactions} transactions`);
      }

      if (parseResult.errors.length > 0) {
        console.warn('Parse errors:', parseResult.errors);
      }
    } catch (err) {
      setStatus('error');
      toast.error('Failed to fetch wallet transactions');
      console.error(err);
    }
  }, [publicKey, connection]);

  const toggleTrade = useCallback((signature: string) => {
    setSelectedTrades(prev => {
      const next = new Set(prev);
      if (next.has(signature)) {
        next.delete(signature);
      } else {
        next.add(signature);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (result) {
      setSelectedTrades(new Set(result.trades.map(t => t.signature)));
    }
  }, [result]);

  const deselectAll = useCallback(() => {
    setSelectedTrades(new Set());
  }, []);

  const importSelected = useCallback(async () => {
    if (!user || !result) return;

    const tradesToImport = result.trades.filter(t => selectedTrades.has(t.signature));
    if (tradesToImport.length === 0) {
      toast.warning('No trades selected for import');
      return;
    }

    setStatus('importing');
    let imported = 0;

    try {
      // Check for duplicates by signature
      const { data: existing } = await supabase
        .from('trade_entries')
        .select('binance_trade_id')
        .eq('user_id', user.id)
        .eq('source', 'solana')
        .in('binance_trade_id', tradesToImport.map(t => t.signature));

      const existingSignatures = new Set(existing?.map(e => e.binance_trade_id) || []);

      // Filter out duplicates
      const newTrades = tradesToImport.filter(t => !existingSignatures.has(t.signature));

      if (newTrades.length === 0) {
        toast.info('All selected trades have already been imported');
        setStatus('done');
        return;
      }

      // Batch insert
      const entries = newTrades.map((trade) => mapToTradeEntry(trade, user.id, tradeMode));
      
      const { error } = await supabase
        .from('trade_entries')
        .insert(entries);

      if (error) throw error;

      imported = newTrades.length;
      setImportedCount(imported);
      setStatus('done');
      
      // Invalidate all trade queries
      invalidateTradeQueries(queryClient);

      toast.success(`Successfully imported ${imported} trades from Solana`);
    } catch (err) {
      setStatus('error');
      toast.error(`Import failed: ${err}`);
      console.error(err);
    }
  }, [user, result, selectedTrades, queryClient, tradeMode]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setSelectedTrades(new Set());
    setImportedCount(0);
  }, []);

  return {
    status,
    result,
    selectedTrades,
    fetchTrades,
    importSelected,
    toggleTrade,
    selectAll,
    deselectAll,
    reset,
    importedCount,
    tradeMode,
  };
}

/**
 * Map parsed Solana trade to trade_entries insert format
 */
function mapToTradeEntry(trade: ParsedSolanaTrade, userId: string, tradeMode: string) {
  const tradeDate = new Date(trade.blockTime * 1000).toISOString();
  
  return {
    user_id: userId,
    pair: trade.pair,
    direction: trade.direction === 'LONG' ? 'LONG' : trade.direction === 'SHORT' ? 'SHORT' : 'LONG',
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    quantity: trade.quantity,
    pnl: trade.pnl,
    realized_pnl: trade.pnl,
    fees: trade.fees,
    status: trade.status,
    trade_date: tradeDate,
    entry_datetime: tradeDate,
    exit_datetime: trade.status === 'closed' ? tradeDate : null,
    source: 'solana',
    result: trade.pnl > 0 ? 'win' : trade.pnl < 0 ? 'loss' : 'breakeven',
    trade_mode: tradeMode,
    trade_state: trade.status === 'closed' ? 'closed' : 'active',
    trade_style: 'short_trade',
    binance_trade_id: trade.signature, // Reusing field to store Solana signature for dedup
    notes: `Imported from ${trade.programName} on Solana\nTx: ${trade.signature}`,
  };
}
