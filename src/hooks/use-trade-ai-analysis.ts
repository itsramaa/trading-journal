/**
 * useTradeAIAnalysis - Hook to request AI analysis for a trade
 * Uses Lovable AI Gateway via post-trade-analysis edge function
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TradeEntry } from "@/hooks/use-trade-entries";
import { useLanguage } from "@/hooks/use-language";

export interface AITradeAnalysis {
  winFactors: string[];
  lossFactors: string[];
  lessons: string[];
  improvements: string[];
  patternUpdate: {
    newWinRate: number;
    recommendation: string;
    confidenceChange: "increase" | "decrease" | "maintain";
  };
  overallAssessment: string;
}

interface UseTradeAIAnalysisReturn {
  analysis: AITradeAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
  requestAnalysis: (trade: TradeEntry, strategyName?: string) => Promise<AITradeAnalysis | null>;
  clearAnalysis: () => void;
}

export function useTradeAIAnalysis(): UseTradeAIAnalysisReturn {
  const [analysis, setAnalysis] = useState<AITradeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { language } = useLanguage();

  const requestAnalysis = async (
    trade: TradeEntry,
    strategyName?: string
  ): Promise<AITradeAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "post-trade-analysis",
        {
          body: {
            trade: {
              id: trade.id,
              pair: trade.pair,
              direction: trade.direction,
              entryPrice: trade.entry_price,
              exitPrice: trade.exit_price || 0,
              stopLoss: trade.stop_loss || 0,
              takeProfit: trade.take_profit || 0,
              pnl: trade.realized_pnl || trade.pnl || 0,
              result: (trade.realized_pnl || 0) >= 0 ? "win" : "loss",
              notes: trade.notes || "",
              emotionalState: trade.emotional_state || "calm",
              confluenceScore: trade.confluence_score || 0,
            },
            strategy: strategyName
              ? { name: strategyName, minConfluences: 3, minRR: 1.5 }
              : null,
            language: language,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to analyze trade");
      }

      if (!data?.success || !data?.data) {
        throw new Error(data?.error || "Invalid response from AI");
      }

      const analysisResult = data.data as AITradeAnalysis;
      setAnalysis(analysisResult);

      toast({
        title: "Analysis Complete",
        description: "AI analysis has been generated for this trade.",
      });

      return analysisResult;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to analyze trade";
      setError(errorMessage);

      // Handle specific error types
      if (errorMessage.includes("Rate limit") || errorMessage.includes("429")) {
        toast({
          title: "Rate Limited",
          description: "Please wait a moment before requesting another analysis.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Payment") || errorMessage.includes("402")) {
        toast({
          title: "Credits Required",
          description: "Please add credits to continue using AI analysis.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }

      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    setError(null);
  };

  return {
    analysis,
    isAnalyzing,
    error,
    requestAnalysis,
    clearAnalysis,
  };
}
