import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { YouTubeStrategyImport, YouTubeImportProgress, StrategyValidation } from "@/types/backtest";
import type { EntryRule, ExitRule } from "@/types/strategy";

interface ImportResult {
  strategy: YouTubeStrategyImport;
  validation: StrategyValidation;
}

export function useYouTubeStrategyImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<YouTubeImportProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });

  const importMutation = useMutation({
    mutationFn: async (input: { url?: string; transcript?: string }): Promise<ImportResult> => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!input.url && !input.transcript) throw new Error("URL or transcript required");

      // Stage 1: Fetching
      setProgress({ stage: 'fetching', progress: 10, message: 'Fetching video info...' });
      
      // Stage 2: Processing with AI
      setProgress({ stage: 'extracting', progress: 40, message: 'Extracting strategy with AI...' });

      const { data, error } = await supabase.functions.invoke('youtube-strategy-import', {
        body: input,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Stage 3: Validating
      setProgress({ stage: 'validating', progress: 80, message: 'Validating strategy...' });

      // Stage 4: Complete
      setProgress({ stage: 'complete', progress: 100, message: 'Strategy extracted successfully!' });

      return data as ImportResult;
    },
    onError: (error) => {
      setProgress({ stage: 'error', progress: 0, message: error.message });
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const saveToLibrary = useMutation({
    mutationFn: async (strategy: YouTubeStrategyImport) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Convert to entry/exit rules format
      const entryRules: EntryRule[] = strategy.entryConditions.map((condition, idx) => ({
        id: `yt_entry_${idx}`,
        type: 'indicator' as const,
        condition,
        is_mandatory: idx < 2, // First 2 are mandatory
      }));

      const exitRules: ExitRule[] = [
        {
          id: 'yt_tp',
          type: 'take_profit' as const,
          value: strategy.exitConditions.takeProfit,
          unit: strategy.exitConditions.takeProfitUnit,
        },
        {
          id: 'yt_sl',
          type: 'stop_loss' as const,
          value: strategy.exitConditions.stopLoss,
          unit: strategy.exitConditions.stopLossUnit,
        },
      ];

      if (strategy.exitConditions.trailingStop) {
        exitRules.push({
          id: 'yt_trailing',
          type: 'trailing_stop' as const,
          value: strategy.exitConditions.trailingStop,
          unit: 'percent',
        });
      }

      const { data, error } = await supabase
        .from("trading_strategies")
        .insert([{
          user_id: user.id,
          name: strategy.strategyName,
          description: strategy.description,
          timeframe: strategy.timeframe,
          market_type: 'futures',
          entry_rules: JSON.parse(JSON.stringify(entryRules)),
          exit_rules: JSON.parse(JSON.stringify(exitRules)),
          valid_pairs: strategy.suitablePairs,
          min_confluences: Math.min(strategy.entryConditions.length, 4),
          min_rr: 1.5,
          source: 'youtube',
          source_url: strategy.sourceUrl,
          validation_score: strategy.confidenceScore,
          automation_score: strategy.automationScore,
          difficulty_level: strategy.difficultyLevel,
          tags: strategy.indicatorsUsed.slice(0, 5),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-strategies"] });
      toast.success("Strategy saved to library!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const resetProgress = () => {
    setProgress({ stage: 'idle', progress: 0, message: '' });
  };

  return {
    importStrategy: importMutation.mutateAsync,
    saveToLibrary: saveToLibrary.mutateAsync,
    isImporting: importMutation.isPending,
    isSaving: saveToLibrary.isPending,
    progress,
    resetProgress,
  };
}
