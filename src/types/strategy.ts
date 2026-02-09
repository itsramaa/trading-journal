/**
 * Strategy Types - Enhanced per Trading Journey Markdown spec
 * Includes Multi-Timeframe Analysis (MTFA) and Professional Trading Fields
 */

export type TimeframeType = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
export type MarketType = 'spot' | 'futures';
export type StrategyStatus = 'active' | 'paused' | 'killed';

// NEW: Trading Methodology Types
export type TradingMethodology = 
  | 'indicator_based'
  | 'price_action' 
  | 'smc'
  | 'ict'
  | 'wyckoff'
  | 'elliott_wave'
  | 'hybrid';

export type TradingStyle = 
  | 'scalping' 
  | 'day_trading' 
  | 'swing' 
  | 'position';

export type TradingSession = 
  | 'all' 
  | 'asian' 
  | 'london' 
  | 'ny';

export type DifficultyLevel = 
  | 'beginner' 
  | 'intermediate' 
  | 'advanced';

export type EntryRuleType = 
  | 'price_action' 
  | 'volume' 
  | 'indicator' 
  | 'higher_tf' 
  | 'on_chain' 
  | 'sentiment';

export type ExitRuleType = 
  | 'take_profit' 
  | 'stop_loss' 
  | 'trailing_stop' 
  | 'time_based';

export type ExitRuleUnit = 'percent' | 'atr' | 'rr' | 'pips';

export interface EntryRule {
  id: string;
  type: EntryRuleType;
  indicator?: string;
  condition: string;
  value?: string;
  is_mandatory: boolean;
}

export interface ExitRule {
  id: string;
  type: ExitRuleType;
  value: number;
  unit: ExitRuleUnit;
}

export interface TradingStrategyEnhanced {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  // Primary timeframe for trade management
  timeframe: TimeframeType | null;
  // Multi-Timeframe Analysis (MTFA)
  higher_timeframe: TimeframeType | null;
  lower_timeframe: TimeframeType | null;
  market_type: MarketType;
  entry_rules: EntryRule[];
  exit_rules: ExitRule[];
  valid_pairs: string[];
  min_confluences: number;
  min_rr: number;
  version: number;
  status: StrategyStatus;
  tags: string[] | null;
  color: string | null;
  is_active: boolean;
  // NEW: Professional trading fields
  methodology: TradingMethodology;
  trading_style: TradingStyle;
  session_preference: TradingSession[];
  difficulty_level: DifficultyLevel | null;
  // YouTube import fields
  validation_score: number | null;
  automation_score: number | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

// Default entry rules template per Markdown spec
export const DEFAULT_ENTRY_RULES: EntryRule[] = [
  {
    id: 'price_action_sr',
    type: 'price_action',
    condition: 'Price action at key S/R level',
    is_mandatory: true,
  },
  {
    id: 'volume_confirmation',
    type: 'volume',
    condition: 'Volume confirmation (above average)',
    is_mandatory: true,
  },
  {
    id: 'indicator_confirmation',
    type: 'indicator',
    indicator: 'RSI/MACD',
    condition: 'Technical indicator alignment',
    is_mandatory: true,
  },
  {
    id: 'higher_tf',
    type: 'higher_tf',
    condition: 'Higher timeframe trend alignment',
    is_mandatory: true,
  },
  {
    id: 'on_chain',
    type: 'on_chain',
    condition: 'On-chain metrics support',
    is_mandatory: false,
  },
  {
    id: 'sentiment',
    type: 'sentiment',
    condition: 'Market sentiment alignment',
    is_mandatory: false,
  },
];

// Default exit rules template
export const DEFAULT_EXIT_RULES: ExitRule[] = [
  {
    id: 'take_profit',
    type: 'take_profit',
    value: 2,
    unit: 'rr',
  },
  {
    id: 'stop_loss',
    type: 'stop_loss',
    value: 1,
    unit: 'rr',
  },
];

// Timeframe options for form
export const TIMEFRAME_OPTIONS: { value: TimeframeType; label: string }[] = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
];

/**
 * @deprecated Use useBaseAssets() hook instead for dynamic pairs from database
 * This is kept as fallback when database pairs are not yet synced
 */
export const COMMON_PAIRS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
  'LINK', 'UNI', 'ATOM', 'LTC', 'FIL', 'APT', 'ARB', 'OP', 'NEAR', 'INJ'
];
