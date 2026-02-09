import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { 
  YouTubeStrategyImportV2, 
  YouTubeStrategyDataV2, 
  YouTubeImportProgress,
  StrategyValidationV2,
  StructuredEntryRule,
  StructuredExitRule,
} from "@/types/backtest";
import type { EntryRule, ExitRule } from "@/types/strategy";
import type { YouTubeImportDebugInfo } from "@/types/backtest";

interface ImportResultV2 {
  status: 'success' | 'warning' | 'blocked' | 'failed';
  reason?: string;
  strategy: YouTubeStrategyDataV2 | null;
  validation: StrategyValidationV2 | null;
  debug: YouTubeImportDebugInfo | null;
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
    mutationFn: async (input: { url?: string; transcript?: string }): Promise<ImportResultV2> => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!input.url && !input.transcript) throw new Error("URL or transcript required");

      // Stage 1: Fetching/Transcribing
      if (input.url) {
        setProgress({ stage: 'fetching', progress: 10, message: 'Fetching video transcript...', details: 'Extracting captions from YouTube' });
      } else {
        setProgress({ stage: 'transcribing', progress: 10, message: 'Processing transcript...', details: 'Analyzing provided text' });
      }

      // Small delay for UX
      await new Promise(r => setTimeout(r, 500));
      
      // Stage 2: Detecting methodology
      setProgress({ stage: 'detecting', progress: 30, message: 'Detecting trading methodology...', details: 'Classifying as SMC, ICT, Indicator-based, etc.' });

      const { data, error } = await supabase.functions.invoke('youtube-strategy-import', {
        body: input,
      });

      if (error) throw error;

      const result = data as ImportResultV2;

      // Handle different statuses
      if (result.status === 'failed') {
        setProgress({ 
          stage: 'error', 
          progress: 0, 
          message: result.reason || 'Import failed',
          details: 'Unable to extract strategy from the provided content'
        });
        throw new Error(result.reason || 'Import failed');
      }

      if (result.status === 'blocked') {
        setProgress({ 
          stage: 'blocked', 
          progress: 50, 
          message: result.reason || 'Strategy blocked',
          details: 'Strategy does not meet minimum requirements for saving'
        });
        // Don't throw - let user see the partial result
        return result;
      }

      // Stage 3: Extracting
      setProgress({ stage: 'extracting', progress: 60, message: 'Extracting strategy rules...', details: 'Parsing entry/exit conditions' });
      await new Promise(r => setTimeout(r, 300));

      // Stage 4: Validating
      setProgress({ stage: 'validating', progress: 80, message: 'Validating strategy...', details: 'Checking actionability requirements' });
      await new Promise(r => setTimeout(r, 300));

      // Stage 5: Complete or Warning
      if (result.status === 'warning') {
        setProgress({ 
          stage: 'warning', 
          progress: 100, 
          message: 'Strategy extracted with warnings',
          details: result.reason
        });
      } else {
        setProgress({ 
          stage: 'complete', 
          progress: 100, 
          message: 'Strategy extracted successfully!',
          details: `Confidence: ${result.strategy?.confidence}%`
        });
      }

      return result;
    },
    onError: (error) => {
      if (progress.stage !== 'error' && progress.stage !== 'blocked') {
        setProgress({ stage: 'error', progress: 0, message: error.message });
      }
      toast.error(`Import failed: ${error.message}`);
    },
  });

  const saveToLibrary = useMutation({
    mutationFn: async (strategy: YouTubeStrategyDataV2) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Convert V2 entry rules to database format
      const entryRules: EntryRule[] = strategy.entryRules.map((rule: StructuredEntryRule, idx: number) => ({
        id: rule.id || `yt_entry_${idx}`,
        type: mapRuleTypeToEntryType(rule.type),
        condition: `[${rule.type.toUpperCase()}] ${rule.concept}: ${rule.condition}`,
        is_mandatory: rule.is_mandatory,
      }));

      // Convert V2 exit rules to database format
      const exitRules: ExitRule[] = strategy.exitRules.map((rule: StructuredExitRule, idx: number) => ({
        id: rule.id || `yt_exit_${idx}`,
        type: rule.type as ExitRule['type'],
        value: rule.value || 0,
        unit: rule.unit || 'percent',
      }));

      // Ensure we have at least TP/SL from risk management if not in exitRules
      if (!exitRules.some(r => r.type === 'take_profit') && strategy.riskManagement?.riskRewardRatio) {
        exitRules.push({
          id: 'yt_tp',
          type: 'take_profit',
          value: strategy.riskManagement.riskRewardRatio * 1, // RR based on 1% SL
          unit: 'rr',
        });
      }
      if (!exitRules.some(r => r.type === 'stop_loss')) {
        exitRules.push({
          id: 'yt_sl',
          type: 'stop_loss',
          value: 1,
          unit: 'percent',
        });
      }

      const { data, error } = await supabase
        .from("trading_strategies")
        .insert([{
          user_id: user.id,
          name: strategy.strategyName,
          description: `${strategy.description}\n\nMethodology: ${strategy.methodology.toUpperCase()}\nConfidence: ${strategy.confidence}%`,
          timeframe: strategy.timeframeContext.primary,
          market_type: 'futures',
          entry_rules: JSON.parse(JSON.stringify(entryRules)),
          exit_rules: JSON.parse(JSON.stringify(exitRules)),
          valid_pairs: strategy.suitablePairs,
          min_confluences: Math.min(strategy.entryRules.filter(r => r.is_mandatory).length, 4),
          min_rr: strategy.riskManagement?.riskRewardRatio || 1.5,
          source: 'youtube',
          source_url: strategy.sourceUrl,
          validation_score: strategy.confidence,
          automation_score: strategy.automationScore,
          difficulty_level: strategy.difficultyLevel,
          tags: [
            strategy.methodology,
            ...strategy.conceptsUsed.slice(0, 3),
            ...strategy.indicatorsUsed.slice(0, 2),
          ].filter(Boolean),
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

/**
 * Map V2 rule types to database entry rule types
 */
function mapRuleTypeToEntryType(type: StructuredEntryRule['type']): EntryRule['type'] {
  switch (type) {
    case 'indicator':
      return 'indicator';
    case 'price_action':
    case 'structure':
      return 'price_action';
    case 'smc':
    case 'ict':
    case 'liquidity':
      return 'price_action'; // SMC/ICT mapped to price_action for now
    default:
      return 'indicator';
  }
}
