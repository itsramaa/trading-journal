/**
 * Aggregation Validator
 * 
 * Validates aggregated trades before insertion to local DB.
 * Ensures data integrity and flags potential issues.
 * 
 * Validation Rules:
 * - Critical: Must pass to insert (entry_price > 0, etc.)
 * - Warning: Potential issues to review (zero commission, etc.)
 */

import type { AggregatedTrade, ValidationResult, ValidationError, ValidationWarning } from './types';

/**
 * Validate an aggregated trade before DB insertion
 */
export function validateAggregatedTrade(trade: AggregatedTrade): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // ===========================================================================
  // CRITICAL VALIDATIONS (must pass)
  // ===========================================================================
  
  // Entry price must be positive
  if (!trade.entry_price || trade.entry_price <= 0) {
    errors.push({
      field: 'entry_price',
      message: `Invalid entry price: ${trade.entry_price}`,
      severity: 'critical',
    });
  }
  
  // Exit price must be positive
  if (!trade.exit_price || trade.exit_price <= 0) {
    errors.push({
      field: 'exit_price',
      message: `Invalid exit price: ${trade.exit_price}`,
      severity: 'critical',
    });
  }
  
  // Quantity must be positive
  if (!trade.quantity || trade.quantity <= 0) {
    errors.push({
      field: 'quantity',
      message: `Invalid quantity: ${trade.quantity}`,
      severity: 'critical',
    });
  }
  
  // Entry datetime must exist
  if (!trade.entry_datetime || isNaN(trade.entry_datetime.getTime())) {
    errors.push({
      field: 'entry_datetime',
      message: 'Missing or invalid entry datetime',
      severity: 'critical',
    });
  }
  
  // Exit datetime must exist
  if (!trade.exit_datetime || isNaN(trade.exit_datetime.getTime())) {
    errors.push({
      field: 'exit_datetime',
      message: 'Missing or invalid exit datetime',
      severity: 'critical',
    });
  }
  
  // Direction must be valid
  if (!['LONG', 'SHORT'].includes(trade.direction)) {
    errors.push({
      field: 'direction',
      message: `Invalid direction: ${trade.direction}`,
      severity: 'critical',
    });
  }
  
  // Binance trade ID must exist
  if (!trade.binance_trade_id) {
    errors.push({
      field: 'binance_trade_id',
      message: 'Missing binance_trade_id',
      severity: 'critical',
    });
  }
  
  // ===========================================================================
  // WARNING VALIDATIONS (review recommended)
  // ===========================================================================
  
  // Zero commission is unusual
  if (trade.commission === 0) {
    warnings.push({
      field: 'commission',
      message: 'Zero commission - verify if this is correct',
      severity: 'warning',
    });
  }
  
  // Zero realized PnL with price difference
  if (trade.realized_pnl === 0 && trade.entry_price !== trade.exit_price) {
    warnings.push({
      field: 'realized_pnl',
      message: 'Zero PnL but entry/exit prices differ - verify',
      severity: 'warning',
    });
  }
  
  // Very short hold time (< 1 minute)
  if (trade.hold_time_minutes < 1) {
    warnings.push({
      field: 'hold_time_minutes',
      message: `Very short hold time: ${trade.hold_time_minutes} minutes`,
      severity: 'warning',
    });
  }
  
  // Very long hold time (> 30 days)
  if (trade.hold_time_minutes > 30 * 24 * 60) {
    warnings.push({
      field: 'hold_time_minutes',
      message: `Very long hold time: ${Math.round(trade.hold_time_minutes / (24 * 60))} days`,
      severity: 'warning',
    });
  }
  
  // Exit before entry (time travel)
  if (trade.exit_datetime && trade.entry_datetime && 
      trade.exit_datetime < trade.entry_datetime) {
    errors.push({
      field: 'exit_datetime',
      message: 'Exit datetime is before entry datetime',
      severity: 'critical',
    });
  }
  
  // ===========================================================================
  // CROSS-VALIDATION
  // ===========================================================================
  
  const crossValidation = calculateCrossValidation(trade);
  
  // P&L mismatch > 1% is a warning
  if (crossValidation.pnlDifferencePercent > 1) {
    warnings.push({
      field: 'realized_pnl',
      message: `Calculated PnL (${crossValidation.calculatedPnl.toFixed(4)}) differs from reported (${crossValidation.reportedPnl.toFixed(4)}) by ${crossValidation.pnlDifferencePercent.toFixed(2)}%`,
      severity: 'warning',
    });
  }
  
  // P&L mismatch > 10% is critical
  if (crossValidation.pnlDifferencePercent > 10) {
    errors.push({
      field: 'realized_pnl',
      message: `Large PnL discrepancy: calculated=${crossValidation.calculatedPnl.toFixed(4)}, reported=${crossValidation.reportedPnl.toFixed(4)} (${crossValidation.pnlDifferencePercent.toFixed(2)}% difference)`,
      severity: 'critical',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    crossValidation,
  };
}

/**
 * Calculate cross-validation metrics
 */
function calculateCrossValidation(trade: AggregatedTrade): {
  calculatedPnl: number;
  reportedPnl: number;
  pnlDifference: number;
  pnlDifferencePercent: number;
} {
  // Calculate PnL from price difference
  const priceDiff = trade.exit_price - trade.entry_price;
  const directionMultiplier = trade.direction === 'LONG' ? 1 : -1;
  const calculatedPnl = priceDiff * trade.quantity * directionMultiplier;
  
  const reportedPnl = trade.realized_pnl;
  const pnlDifference = Math.abs(calculatedPnl - reportedPnl);
  
  // Avoid division by zero
  const pnlDifferencePercent = reportedPnl !== 0 
    ? (pnlDifference / Math.abs(reportedPnl)) * 100 
    : calculatedPnl !== 0 
      ? 100 
      : 0;
  
  return {
    calculatedPnl,
    reportedPnl,
    pnlDifference,
    pnlDifferencePercent,
  };
}

/**
 * Validate multiple trades and return summary
 */
export function validateAllTrades(trades: AggregatedTrade[]): {
  valid: AggregatedTrade[];
  invalid: AggregatedTrade[];
  withWarnings: AggregatedTrade[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    withWarnings: number;
    errorBreakdown: Record<string, number>;
    warningBreakdown: Record<string, number>;
  };
} {
  const valid: AggregatedTrade[] = [];
  const invalid: AggregatedTrade[] = [];
  const withWarnings: AggregatedTrade[] = [];
  
  const errorBreakdown: Record<string, number> = {};
  const warningBreakdown: Record<string, number> = {};
  
  for (const trade of trades) {
    const validation = trade._validation;
    
    if (validation.isValid) {
      valid.push(trade);
      if (validation.warnings.length > 0) {
        withWarnings.push(trade);
      }
    } else {
      invalid.push(trade);
    }
    
    // Count errors
    for (const error of validation.errors) {
      errorBreakdown[error.field] = (errorBreakdown[error.field] || 0) + 1;
    }
    
    // Count warnings
    for (const warning of validation.warnings) {
      warningBreakdown[warning.field] = (warningBreakdown[warning.field] || 0) + 1;
    }
  }
  
  return {
    valid,
    invalid,
    withWarnings,
    summary: {
      total: trades.length,
      valid: valid.length,
      invalid: invalid.length,
      withWarnings: withWarnings.length,
      errorBreakdown,
      warningBreakdown,
    },
  };
}
