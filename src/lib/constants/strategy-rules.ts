/**
 * Strategy Rules Configuration Constants
 * Centralized entry/exit rule types, indicators, and units
 */
import type { EntryRuleType, ExitRuleType, ExitRuleUnit } from "@/types/strategy";
import { TrendingUp, BarChart3, LineChart, Clock, Link, MessageSquare, Target, ShieldAlert, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// =============================================================================
// ENTRY RULE TYPES
// =============================================================================

export interface EntryRuleTypeConfig {
  value: EntryRuleType;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const ENTRY_RULE_TYPES: EntryRuleTypeConfig[] = [
  { value: 'price_action', label: 'Price Action', icon: TrendingUp, description: 'Support/Resistance, candlestick patterns' },
  { value: 'volume', label: 'Volume', icon: BarChart3, description: 'Volume confirmation signals' },
  { value: 'indicator', label: 'Indicator', icon: LineChart, description: 'RSI, MACD, EMA, etc.' },
  { value: 'higher_tf', label: 'Higher Timeframe', icon: Clock, description: 'HTF trend alignment' },
  { value: 'on_chain', label: 'On-Chain', icon: Link, description: 'Whale movements, funding rates' },
  { value: 'sentiment', label: 'Sentiment', icon: MessageSquare, description: 'Market sentiment, news' },
];

// Helper to get entry rule type config
export function getEntryRuleTypeConfig(type: EntryRuleType): EntryRuleTypeConfig | undefined {
  return ENTRY_RULE_TYPES.find(r => r.value === type);
}

// =============================================================================
// EXIT RULE TYPES
// =============================================================================

export interface ExitRuleTypeConfig {
  value: ExitRuleType;
  label: string;
  icon: LucideIcon;
  description: string;
  defaultValue: number;
  defaultUnit: ExitRuleUnit;
}

export const EXIT_RULE_TYPES: ExitRuleTypeConfig[] = [
  { value: 'take_profit', label: 'Take Profit', icon: Target, description: 'Target price/ratio to exit with profit', defaultValue: 2, defaultUnit: 'rr' },
  { value: 'stop_loss', label: 'Stop Loss', icon: ShieldAlert, description: 'Maximum loss threshold', defaultValue: 1, defaultUnit: 'rr' },
  { value: 'trailing_stop', label: 'Trailing Stop', icon: TrendingDown, description: 'Dynamic stop that follows price', defaultValue: 1.5, defaultUnit: 'percent' },
  { value: 'time_based', label: 'Time-Based', icon: Clock, description: 'Exit after specific duration', defaultValue: 24, defaultUnit: 'percent' },
];

// Helper to get exit rule type config
export function getExitRuleTypeConfig(type: ExitRuleType): ExitRuleTypeConfig | undefined {
  return EXIT_RULE_TYPES.find(r => r.value === type);
}

// Exit rule color classes (using design tokens)
export const EXIT_RULE_COLOR_CLASSES: Record<ExitRuleType, string> = {
  take_profit: 'text-profit border-profit/30 bg-profit-muted',
  stop_loss: 'text-loss border-loss/30 bg-loss-muted',
  trailing_stop: 'text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/5',
  time_based: 'text-[hsl(var(--chart-6))] border-[hsl(var(--chart-6))]/30 bg-[hsl(var(--chart-6))]/5',
};

// =============================================================================
// UNIT OPTIONS
// =============================================================================

export interface UnitConfig {
  value: ExitRuleUnit;
  label: string;
}

export const UNIT_OPTIONS: UnitConfig[] = [
  { value: 'percent', label: '%' },
  { value: 'rr', label: 'R:R' },
  { value: 'atr', label: 'ATR' },
  { value: 'pips', label: 'Pips' },
];

// Helper to get unit label
export function getUnitLabel(unit: ExitRuleUnit): string {
  return UNIT_OPTIONS.find(u => u.value === unit)?.label || unit;
}

// =============================================================================
// INDICATOR OPTIONS
// =============================================================================

export const INDICATOR_OPTIONS = [
  'RSI', 
  'MACD', 
  'EMA', 
  'SMA', 
  'Bollinger Bands', 
  'Stochastic', 
  'ATR', 
  'Volume Profile', 
  'VWAP', 
  'Ichimoku', 
  'Fibonacci'
] as const;

export type IndicatorType = typeof INDICATOR_OPTIONS[number];

// =============================================================================
// RULE BUILDER CONFIG
// =============================================================================

export const RULE_BUILDER_CONFIG = {
  // Default mandatory threshold for entry rules
  DEFAULT_MANDATORY_THRESHOLD: 2,
  // Default indicator when creating new indicator rule
  DEFAULT_INDICATOR: 'RSI',
} as const;
