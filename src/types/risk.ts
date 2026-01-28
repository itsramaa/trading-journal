/**
 * Risk Management Types - Per Trading Journey Markdown spec
 */

export interface RiskProfile {
  id: string;
  user_id: string;
  risk_per_trade_percent: number;
  max_daily_loss_percent: number;
  max_weekly_drawdown_percent: number;
  max_position_size_percent: number;
  max_correlated_exposure: number;
  max_concurrent_positions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyRiskSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  starting_balance: number;
  current_pnl: number;
  loss_limit_used_percent: number;
  positions_open: number;
  capital_deployed_percent: number;
  trading_allowed: boolean;
  created_at: string;
}

export interface DailyRiskStatus {
  date: string;
  starting_balance: number;
  current_pnl: number;
  loss_limit: number;
  loss_used_percent: number;
  remaining_budget: number;
  trading_allowed: boolean;
  status: 'ok' | 'warning' | 'disabled';
}

export interface PositionSizeInput {
  account_balance: number;
  risk_percent: number;
  entry_price: number;
  stop_loss_price: number;
  leverage?: number;
}

export interface PositionSizeResult {
  position_size: number;
  position_value: number;
  risk_amount: number;
  capital_deployment_percent: number;
  is_valid: boolean;
  warnings: string[];
  stop_distance_percent: number;
  potential_loss: number;
  potential_profit_1r: number;
  potential_profit_2r: number;
  potential_profit_3r: number;
}

export interface RiskCheckResult {
  can_trade: boolean;
  checks: RiskCheckItem[];
  overall_status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface RiskCheckItem {
  name: string;
  passed: boolean;
  current_value: number;
  max_value: number;
  message: string;
}

// Default risk profile values per Markdown spec
export const DEFAULT_RISK_PROFILE: Omit<RiskProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  risk_per_trade_percent: 2.0,
  max_daily_loss_percent: 5.0,
  max_weekly_drawdown_percent: 10.0,
  max_position_size_percent: 40.0,
  max_correlated_exposure: 0.75,
  max_concurrent_positions: 3,
  is_active: true,
};

// Risk status thresholds
export const RISK_THRESHOLDS = {
  warning_percent: 70, // Show warning when 70% of limit used
  danger_percent: 90,  // Show danger when 90% of limit used
};
