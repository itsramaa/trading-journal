/**
 * Post-Trade Analysis Hook
 * Calls AI to analyze completed trades and learn patterns
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";

export interface PostTradeAnalysisResult {
  winFactors: string[];
  lossFactors: string[];
  lessons: string[];
  improvements: string[];
  patternUpdate: {
    newWinRate: number;
    recommendation: string;
    confidenceChange: 'increase' | 'decrease' | 'maintain';
  };
  overallAssessment: string;
}

interface TradeForAnalysis {
  id: string;
  pair: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  result: string;
  notes: string;
  emotionalState: string;
  confluenceScore: number;
}

interface StrategyForAnalysis {
  name: string;
  minConfluences: number;
  minRR: number;
}

interface SimilarTrade {
  pair: string;
  direction: string;
  result: string;
  pnl: number;
  confluenceScore: number;
}

export function usePostTradeAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PostTradeAnalysisResult | null>(null);
  const { language } = useLanguage();

  const analyzeAndSave = async (
    trade: TradeForAnalysis,
    strategy?: StrategyForAnalysis,
    similarTrades?: SimilarTrade[]
  ): Promise<PostTradeAnalysisResult | null> => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('post-trade-analysis', {
        body: {
          trade,
          strategy,
          similarTrades,
          language,
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.data) {
        throw new Error(data?.error || 'Failed to get analysis');
      }

      const result = data.data as PostTradeAnalysisResult;
      setAnalysisResult(result);

      // Save analysis to trade_entries (cast to Json compatible type)
      const { error: updateError } = await supabase
        .from('trade_entries')
        .update({
          post_trade_analysis: JSON.parse(JSON.stringify(result)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', trade.id);

      if (updateError) {
        console.error('Failed to save analysis:', updateError);
        // Don't throw - analysis was still successful
      }

      return result;
    } catch (error) {
      console.error('Post-trade analysis error:', error);
      toast.error('Failed to analyze trade');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeClosedTrade = async (tradeId: string): Promise<PostTradeAnalysisResult | null> => {
    setIsAnalyzing(true);
    try {
      // Fetch the trade details
      const { data: trade, error: tradeError } = await supabase
        .from('trade_entries')
        .select('*')
        .eq('id', tradeId)
        .single();

      if (tradeError || !trade) throw new Error('Trade not found');

      // Fetch strategy if linked
      const { data: strategyLinks } = await supabase
        .from('trade_entry_strategies')
        .select('trading_strategies(*)')
        .eq('trade_entry_id', tradeId)
        .limit(1);

      const strategy = strategyLinks?.[0]?.trading_strategies as any;

      // Fetch similar trades (same pair, last 20)
      const { data: similarTrades } = await supabase
        .from('trade_entries')
        .select('pair, direction, result, pnl, confluence_score')
        .eq('user_id', trade.user_id)
        .eq('pair', trade.pair)
        .eq('status', 'closed')
        .neq('id', tradeId)
        .order('trade_date', { ascending: false })
        .limit(20);

      const tradeForAnalysis: TradeForAnalysis = {
        id: trade.id,
        pair: trade.pair,
        direction: trade.direction,
        entryPrice: trade.entry_price,
        exitPrice: trade.exit_price || trade.entry_price,
        stopLoss: trade.stop_loss || 0,
        takeProfit: trade.take_profit || 0,
        pnl: trade.pnl || 0,
        result: trade.result || 'unknown',
        notes: trade.notes || '',
        emotionalState: trade.emotional_state || 'neutral',
        confluenceScore: trade.confluence_score || 0,
      };

      const strategyForAnalysis: StrategyForAnalysis | undefined = strategy ? {
        name: strategy.name,
        minConfluences: strategy.min_confluences || 4,
        minRR: strategy.min_rr || 1.5,
      } : undefined;

      const similarForAnalysis: SimilarTrade[] = (similarTrades || []).map(t => ({
        pair: t.pair,
        direction: t.direction,
        result: t.result || 'unknown',
        pnl: t.pnl || 0,
        confluenceScore: t.confluence_score || 0,
      }));

      return await analyzeAndSave(tradeForAnalysis, strategyForAnalysis, similarForAnalysis);
    } catch (error) {
      console.error('Post-trade analysis error:', error);
      toast.error('Failed to analyze trade');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeClosedTrade,
    analyzeAndSave,
    isAnalyzing,
    analysisResult,
    clearResult: () => setAnalysisResult(null),
  };
}
