/**
 * Trade Entries Service
 * 
 * Interface + Supabase implementation for trade CRUD and stats.
 * To swap backend: implement ITradeService with your API client.
 */

import type { ApiResponse } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TradeEntry {
  id: string;
  userId: string;
  tradingAccountId: string | null;
  pair: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number;
  pnl: number | null;
  fees: number | null;
  confluenceScore: number | null;
  tradeDate: string;
  result: string | null;
  status: 'open' | 'closed';
  realizedPnl: number | null;
  source: string | null;
  tradeMode: string | null;
  notes: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTradeInput {
  pair: string;
  direction: string;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number;
  pnl?: number;
  fees?: number;
  tradeDate?: string;
  result?: string;
  notes?: string;
  tags?: string[];
  strategyIds?: string[];
  status?: 'open' | 'closed';
  source?: string;
  tradingAccountId?: string;
}

export interface UpdateTradeInput extends Partial<CreateTradeInput> {
  id: string;
}

export interface ClosePositionInput {
  id: string;
  exitPrice: number;
  pnl: number;
  fees?: number;
  notes?: string;
}

export interface TradeStats {
  totalTrades: number;
  totalPnlGross: number;
  totalPnlNet: number;
  totalFees: number;
  totalCommission: number;
  totalFundingFees: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  avgPnlPerTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export interface TradeStatsFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
  pairs?: string[];
  direction?: string;
  strategyIds?: string[];
  session?: string;
  tradeMode?: string;
  accountId?: string;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface ITradeService {
  getAll(userId: string): Promise<ApiResponse<TradeEntry[]>>;
  create(userId: string, input: CreateTradeInput): Promise<ApiResponse<TradeEntry>>;
  update(userId: string, input: UpdateTradeInput): Promise<ApiResponse<TradeEntry>>;
  delete(tradeId: string): Promise<ApiResponse<boolean>>;
  closePosition(input: ClosePositionInput): Promise<ApiResponse<TradeEntry>>;
  getStats(userId: string, filters: TradeStatsFilters): Promise<ApiResponse<TradeStats>>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';

export class SupabaseTradeService implements ITradeService {
  async getAll(userId: string): Promise<ApiResponse<TradeEntry[]>> {
    const { data, error } = await supabase
      .from('trade_entries')
      .select('*')
      .eq('user_id', userId)
      .order('trade_date', { ascending: false });

    if (error) return { data: null, error: error.message };

    return {
      data: (data || []).map(this.mapTradeRow),
      error: null,
    };
  }

  async create(userId: string, input: CreateTradeInput): Promise<ApiResponse<TradeEntry>> {
    const { strategyIds, ...rest } = input;

    const result = input.result ?? (input.pnl !== undefined
      ? (input.pnl > 0 ? 'win' : input.pnl < 0 ? 'loss' : 'breakeven')
      : null);

    const status = input.exitPrice ? 'closed' : (input.status || 'open');

    const { data, error } = await supabase
      .from('trade_entries')
      .insert({
        user_id: userId,
        trading_account_id: rest.tradingAccountId || null,
        pair: rest.pair,
        direction: rest.direction,
        entry_price: rest.entryPrice,
        exit_price: rest.exitPrice || null,
        stop_loss: rest.stopLoss || null,
        take_profit: rest.takeProfit || null,
        quantity: rest.quantity || 1,
        pnl: rest.pnl || 0,
        fees: rest.fees || 0,
        trade_date: rest.tradeDate || new Date().toISOString(),
        result,
        notes: rest.notes || null,
        tags: rest.tags || [],
        status,
        realized_pnl: status === 'closed' ? (rest.pnl || 0) : 0,
        source: rest.source || 'manual',
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Insert strategy links
    if (strategyIds?.length && data) {
      await supabase.from('trade_entry_strategies').insert(
        strategyIds.map(sid => ({
          trade_entry_id: data.id,
          strategy_id: sid,
          user_id: userId,
        }))
      );
    }

    return { data: this.mapTradeRow(data), error: null };
  }

  async update(userId: string, input: UpdateTradeInput): Promise<ApiResponse<TradeEntry>> {
    const { id, strategyIds, ...updates } = input;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.pair !== undefined) dbUpdates.pair = updates.pair;
    if (updates.direction !== undefined) dbUpdates.direction = updates.direction;
    if (updates.entryPrice !== undefined) dbUpdates.entry_price = updates.entryPrice;
    if (updates.exitPrice !== undefined) dbUpdates.exit_price = updates.exitPrice;
    if (updates.stopLoss !== undefined) dbUpdates.stop_loss = updates.stopLoss;
    if (updates.takeProfit !== undefined) dbUpdates.take_profit = updates.takeProfit;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.pnl !== undefined) dbUpdates.pnl = updates.pnl;
    if (updates.fees !== undefined) dbUpdates.fees = updates.fees;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.result !== undefined) dbUpdates.result = updates.result;

    const { data, error } = await supabase
      .from('trade_entries')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Update strategy links if provided
    if (strategyIds !== undefined) {
      await supabase.from('trade_entry_strategies').delete().eq('trade_entry_id', id);
      if (strategyIds.length > 0) {
        await supabase.from('trade_entry_strategies').insert(
          strategyIds.map(sid => ({ trade_entry_id: id, strategy_id: sid, user_id: userId }))
        );
      }
    }

    return { data: this.mapTradeRow(data), error: null };
  }

  async delete(tradeId: string): Promise<ApiResponse<boolean>> {
    const { error } = await supabase.from('trade_entries').delete().eq('id', tradeId);
    if (error) return { data: null, error: error.message };
    return { data: true, error: null };
  }

  async closePosition(input: ClosePositionInput): Promise<ApiResponse<TradeEntry>> {
    const result = input.pnl > 0 ? 'win' : input.pnl < 0 ? 'loss' : 'breakeven';

    const { data, error } = await supabase
      .from('trade_entries')
      .update({
        exit_price: input.exitPrice,
        pnl: input.pnl,
        realized_pnl: input.pnl,
        fees: input.fees || 0,
        status: 'closed',
        result,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: this.mapTradeRow(data), error: null };
  }

  async getStats(userId: string, filters: TradeStatsFilters): Promise<ApiResponse<TradeStats>> {
    const { data, error } = await supabase.rpc('get_trade_stats', {
      p_user_id: userId,
      p_status: filters.status === 'all' ? null : (filters.status || 'closed'),
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
      p_source: filters.source || null,
      p_pairs: filters.pairs?.length ? filters.pairs : null,
      p_directions: filters.direction ? [filters.direction] : null,
      p_strategy_ids: filters.strategyIds?.length ? filters.strategyIds : null,
      p_sessions: filters.session && filters.session !== 'all' ? [filters.session] : null,
      p_trade_mode: filters.tradeMode || null,
      p_account_id: filters.accountId || null,
    });

    if (error) return { data: null, error: error.message };

    if (!data || data.length === 0) {
      return { data: this.emptyStats(), error: null };
    }

    const row = data[0];
    return {
      data: {
        totalTrades: Number(row.total_trades) || 0,
        totalPnlGross: Number(row.total_pnl_gross) || 0,
        totalPnlNet: Number(row.total_pnl_net) || 0,
        totalFees: Number(row.total_fees) || 0,
        totalCommission: Number(row.total_commission) || 0,
        totalFundingFees: Number(row.total_funding_fees) || 0,
        winCount: Number(row.win_count) || 0,
        lossCount: Number(row.loss_count) || 0,
        breakevenCount: Number(row.breakeven_count) || 0,
        winRate: Number(row.win_rate) || 0,
        avgPnlPerTrade: Number(row.avg_pnl_per_trade) || 0,
        avgWin: Number(row.avg_win) || 0,
        avgLoss: Number(row.avg_loss) || 0,
        profitFactor: Number(row.profit_factor) || 0,
      },
      error: null,
    };
  }

  private mapTradeRow(row: any): TradeEntry {
    return {
      id: row.id,
      userId: row.user_id,
      tradingAccountId: row.trading_account_id,
      pair: row.pair,
      direction: row.direction,
      entryPrice: row.entry_price,
      exitPrice: row.exit_price,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      quantity: row.quantity,
      pnl: row.pnl,
      fees: row.fees,
      confluenceScore: row.confluence_score,
      tradeDate: row.trade_date,
      result: row.result,
      status: row.status,
      realizedPnl: row.realized_pnl,
      source: row.source,
      tradeMode: row.trade_mode,
      notes: row.notes,
      tags: row.tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private emptyStats(): TradeStats {
    return {
      totalTrades: 0, totalPnlGross: 0, totalPnlNet: 0,
      totalFees: 0, totalCommission: 0, totalFundingFees: 0,
      winCount: 0, lossCount: 0, breakevenCount: 0,
      winRate: 0, avgPnlPerTrade: 0, avgWin: 0, avgLoss: 0, profitFactor: 0,
    };
  }
}
