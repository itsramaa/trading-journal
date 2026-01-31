/**
 * AI Settings Enforcement Hook
 * Enforces user's AI settings preferences across all AI feature calls
 */

import { useUserSettings } from '@/hooks/use-user-settings';

export interface AISettings {
  confluence_detection: boolean;
  quality_scoring: boolean;
  pattern_recognition: boolean;
  daily_suggestions: boolean;
  risk_monitoring: boolean;
  post_trade_analysis: boolean;
  confidence_threshold: number;
  suggestion_style: 'conservative' | 'balanced' | 'aggressive';
  learn_from_wins: boolean;
  learn_from_losses: boolean;
}

export type AIFeatureKey = keyof Pick<AISettings, 
  | 'confluence_detection' 
  | 'quality_scoring' 
  | 'pattern_recognition' 
  | 'daily_suggestions' 
  | 'risk_monitoring' 
  | 'post_trade_analysis'
>;

const defaultSettings: AISettings = {
  confluence_detection: true,
  quality_scoring: true,
  pattern_recognition: true,
  daily_suggestions: true,
  risk_monitoring: true,
  post_trade_analysis: true,
  confidence_threshold: 75,
  suggestion_style: 'balanced',
  learn_from_wins: true,
  learn_from_losses: true,
};

export function useAISettingsEnforcement() {
  const { data: userSettings, isLoading } = useUserSettings();

  // Get merged settings with defaults
  const getAISettings = (): AISettings => {
    if (!userSettings?.ai_settings) return defaultSettings;
    return { ...defaultSettings, ...(userSettings.ai_settings as unknown as Partial<AISettings>) };
  };

  /**
   * Check if a specific AI feature should run
   * Returns false if user has disabled the feature
   */
  const shouldRunAIFeature = (feature: AIFeatureKey): boolean => {
    if (isLoading) return true; // Allow while loading
    const settings = getAISettings();
    return settings[feature] !== false;
  };

  /**
   * Filter items by confidence threshold
   * Only returns items that meet user's confidence requirement
   */
  const filterByConfidence = <T extends { confidence: number }>(items: T[]): T[] => {
    const settings = getAISettings();
    const threshold = settings.confidence_threshold ?? 75;
    return items.filter(item => item.confidence >= threshold);
  };

  /**
   * Check if an item meets the confidence threshold
   */
  const meetsConfidenceThreshold = (confidence: number): boolean => {
    const settings = getAISettings();
    const threshold = settings.confidence_threshold ?? 75;
    return confidence >= threshold;
  };

  /**
   * Get the user's preferred suggestion style
   */
  const getSuggestionStyle = (): 'conservative' | 'balanced' | 'aggressive' => {
    const settings = getAISettings();
    return settings.suggestion_style ?? 'balanced';
  };

  /**
   * Get confidence threshold value
   */
  const getConfidenceThreshold = (): number => {
    const settings = getAISettings();
    return settings.confidence_threshold ?? 75;
  };

  /**
   * Check learning preferences
   */
  const getLearningPreferences = () => {
    const settings = getAISettings();
    return {
      learnFromWins: settings.learn_from_wins ?? true,
      learnFromLosses: settings.learn_from_losses ?? true,
    };
  };

  /**
   * Get all current AI settings
   */
  const getAllSettings = (): AISettings => getAISettings();

  /**
   * Get disabled features list (for display/debugging)
   */
  const getDisabledFeatures = (): AIFeatureKey[] => {
    const settings = getAISettings();
    const features: AIFeatureKey[] = [
      'confluence_detection',
      'quality_scoring',
      'pattern_recognition',
      'daily_suggestions',
      'risk_monitoring',
      'post_trade_analysis',
    ];
    return features.filter(f => !settings[f]);
  };

  return {
    shouldRunAIFeature,
    filterByConfidence,
    meetsConfidenceThreshold,
    getSuggestionStyle,
    getConfidenceThreshold,
    getLearningPreferences,
    getAllSettings,
    getDisabledFeatures,
    isLoading,
  };
}

/**
 * Standalone function for use in non-hook contexts (edge functions, etc.)
 * Pass the ai_settings object directly
 */
export function checkAIFeatureEnabled(
  aiSettings: Partial<AISettings> | null | undefined,
  feature: AIFeatureKey
): boolean {
  if (!aiSettings) return true;
  const merged = { ...defaultSettings, ...aiSettings };
  return merged[feature] !== false;
}

export function filterItemsByConfidence<T extends { confidence: number }>(
  aiSettings: Partial<AISettings> | null | undefined,
  items: T[]
): T[] {
  const threshold = aiSettings?.confidence_threshold ?? 75;
  return items.filter(item => item.confidence >= threshold);
}
