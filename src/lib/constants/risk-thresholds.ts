/**
 * Risk Thresholds Constants
 * Centralized configuration for risk management thresholds
 * Used across trading gate, daily loss tracker, and risk profile components
 */

// Daily Loss Threshold Percentages
export const DAILY_LOSS_THRESHOLDS = {
  WARNING: 70,  // Show warning when 70% of limit used
  DANGER: 90,   // Show danger when 90% of limit used
  DISABLED: 100, // Disable trading when 100% reached
} as const;

// AI Quality Thresholds for trading gate
export const AI_QUALITY_THRESHOLDS = {
  WARNING_BELOW: 50, // Warn if avg quality < 50%
  BLOCK_BELOW: 30,   // Block trading if avg quality < 30%
  SAMPLE_COUNT: 3,   // Number of recent trades to evaluate
} as const;

// Correlation Thresholds (aligned with correlation-utils.ts)
export const CORRELATION_THRESHOLDS = {
  WARNING: 0.6,   // Show warning at 60% correlation
  HIGH: 0.75,     // High correlation threshold
  VERY_HIGH: 0.8, // Very high correlation (danger level)
  DEFAULT_FALLBACK: 0.3, // Default when pair not in map
} as const;

// UI Color Thresholds for correlation display
export const CORRELATION_COLOR_THRESHOLDS = {
  VERY_HIGH: 0.8,  // Red
  HIGH: 0.7,       // Orange
  MODERATE: 0.5,   // Yellow
  // Below 0.5 = Green (low)
} as const;

// Position Sizing Warnings
export const POSITION_SIZING_THRESHOLDS = {
  STOP_DISTANCE_WARNING: 10,     // Warn if stop > 10%
  CAPITAL_DEPLOYMENT_WARNING: 40, // Warn if > 40% of capital
  MAX_LEVERAGE_DEFAULT: 125,     // Default max leverage fallback
  LEVERAGE_SLIDER_MAX: 20,       // UI slider max
} as const;

// Default Risk Profile Values (aligned with types/risk.ts)
export const DEFAULT_RISK_VALUES = {
  RISK_PER_TRADE: 2.0,
  MAX_DAILY_LOSS: 5.0,
  MAX_WEEKLY_DRAWDOWN: 10.0,
  MAX_POSITION_SIZE: 40.0,
  MAX_CORRELATED_EXPOSURE: 0.75,
  MAX_CONCURRENT_POSITIONS: 3,
  FALLBACK_BALANCE: 10000,
} as const;

// Risk Slider Configuration
export const RISK_SLIDER_CONFIG = {
  MIN: 0.5,
  MAX: 5,
  STEP: 0.5,
} as const;

// Leverage Slider Configuration
export const LEVERAGE_SLIDER_CONFIG = {
  MIN: 1,
  MAX: 20,
  STEP: 1,
} as const;

// Quantity Formatting Thresholds
export const QUANTITY_FORMAT_THRESHOLDS = {
  LARGE_QUANTITY_MIN: 1,
  LARGE_DECIMALS: 4,
  SMALL_DECIMALS: 8,
} as const;

// Default Calculator Input Values (UI defaults)
export const CALCULATOR_INPUT_DEFAULTS = {
  ENTRY_PRICE: 50000,
  STOP_LOSS_PRICE: 49000,
  LEVERAGE: 1,
} as const;
