/**
 * Position Sizing Calculator - Per Trading Journey Markdown spec
 */
import type { PositionSizeInput, PositionSizeResult, RiskProfile } from "@/types/risk";

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const { account_balance, risk_percent, entry_price, stop_loss_price, leverage = 1 } = input;

  // Calculate stop distance
  const stopDistance = Math.abs(entry_price - stop_loss_price);
  const stopDistancePercent = (stopDistance / entry_price) * 100;

  // Calculate risk amount
  const riskAmount = account_balance * (risk_percent / 100);

  // Calculate position size (quantity)
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;

  // Calculate position value
  const positionValue = positionSize * entry_price;

  // Calculate capital deployment percentage
  const capitalDeploymentPercent = (positionValue / (account_balance * leverage)) * 100;

  // Calculate potential outcomes
  const potentialLoss = riskAmount;
  const potentialProfit1R = riskAmount;
  const potentialProfit2R = riskAmount * 2;
  const potentialProfit3R = riskAmount * 3;

  // Validate
  const warnings: string[] = [];
  let isValid = true;

  if (stopDistancePercent > 10) {
    warnings.push("Stop loss is very far (>10%). Consider tighter stop or smaller position.");
  }

  if (capitalDeploymentPercent > 40) {
    warnings.push("Position size exceeds 40% of capital. Consider reducing.");
    isValid = false;
  }

  if (positionSize <= 0) {
    warnings.push("Invalid position size. Check entry and stop loss prices.");
    isValid = false;
  }

  if (riskAmount <= 0) {
    warnings.push("Risk amount must be positive. Check account balance and risk percent.");
    isValid = false;
  }

  return {
    position_size: positionSize,
    position_value: positionValue,
    risk_amount: riskAmount,
    capital_deployment_percent: capitalDeploymentPercent,
    is_valid: isValid,
    warnings,
    stop_distance_percent: stopDistancePercent,
    potential_loss: potentialLoss,
    potential_profit_1r: potentialProfit1R,
    potential_profit_2r: potentialProfit2R,
    potential_profit_3r: potentialProfit3R,
  };
}

export function validateRiskLimits(
  positionResult: PositionSizeResult,
  riskProfile: RiskProfile,
  currentOpenPositions: number,
  currentDailyLoss: number,
  startingBalance: number
): { canTrade: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let canTrade = true;

  // Check position size limit
  if (positionResult.capital_deployment_percent > riskProfile.max_position_size_percent) {
    warnings.push(
      `Position size (${positionResult.capital_deployment_percent.toFixed(1)}%) exceeds limit (${riskProfile.max_position_size_percent}%)`
    );
    canTrade = false;
  }

  // Check concurrent positions
  if (currentOpenPositions >= riskProfile.max_concurrent_positions) {
    warnings.push(
      `Maximum concurrent positions (${riskProfile.max_concurrent_positions}) reached`
    );
    canTrade = false;
  }

  // Check daily loss limit
  const dailyLossLimit = startingBalance * (riskProfile.max_daily_loss_percent / 100);
  const projectedLoss = Math.abs(currentDailyLoss) + positionResult.risk_amount;
  if (projectedLoss > dailyLossLimit) {
    warnings.push(
      `Trade would exceed daily loss limit. Remaining budget: $${(dailyLossLimit - Math.abs(currentDailyLoss)).toFixed(2)}`
    );
    canTrade = false;
  }

  return { canTrade, warnings };
}

/**
 * Calculate optimal position size for a given R:R ratio
 */
export function calculateOptimalPositionForRR(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  targetRR: number,
  direction: 'long' | 'short'
): { stopLoss: number; takeProfit: number; positionSize: number } {
  const riskAmount = accountBalance * (riskPercent / 100);
  
  // For a given R:R, calculate stop and TP distances
  // Assuming we want a fixed stop distance of 2% for calculation
  const stopDistancePercent = 2;
  const stopDistance = entryPrice * (stopDistancePercent / 100);
  const tpDistance = stopDistance * targetRR;
  
  const positionSize = riskAmount / stopDistance;
  
  if (direction === 'long') {
    return {
      stopLoss: entryPrice - stopDistance,
      takeProfit: entryPrice + tpDistance,
      positionSize,
    };
  } else {
    return {
      stopLoss: entryPrice + stopDistance,
      takeProfit: entryPrice - tpDistance,
      positionSize,
    };
  }
}
