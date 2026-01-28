/**
 * Pre-Trade Validation Hook
 * Checks daily loss limits, position limits, and correlation before trade entry
 */
import { useMemo } from "react";
import { useRiskProfile, useDailyRiskStatus } from "@/hooks/use-risk-profile";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import type { ValidationResult, PreValidationResult } from "@/types/trade-wizard";

interface UsePreTradeValidationParams {
  accountBalance: number;
  newPair?: string;
}

export function usePreTradeValidation({ accountBalance, newPair }: UsePreTradeValidationParams) {
  const { data: riskProfile } = useRiskProfile();
  const { data: dailyStatus, riskProfile: riskProfileFromStatus } = useDailyRiskStatus();
  const { data: trades } = useTradeEntries();

  // Use riskProfile from either source
  const effectiveRiskProfile = riskProfile || riskProfileFromStatus;

  const openPositions = useMemo(() => 
    trades?.filter(t => t.status === 'open') || [], 
    [trades]
  );

  const checkDailyLossLimit = (): ValidationResult => {
    if (!dailyStatus || !effectiveRiskProfile) {
      return {
        passed: true,
        currentValue: 0,
        maxValue: 5,
        message: "Loading risk data...",
        status: 'pass',
      };
    }

    const lossUsedPercent = dailyStatus.loss_used_percent;
    const maxDailyLoss = effectiveRiskProfile.max_daily_loss_percent;
    const passed = lossUsedPercent < maxDailyLoss;
    
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (lossUsedPercent >= maxDailyLoss) {
      status = 'fail';
    } else if (lossUsedPercent >= maxDailyLoss * 0.7) {
      status = 'warning';
    }

    return {
      passed,
      currentValue: lossUsedPercent,
      maxValue: maxDailyLoss,
      message: passed 
        ? `Daily loss at ${lossUsedPercent.toFixed(1)}% (limit: ${maxDailyLoss}%)`
        : `Daily loss limit reached: ${lossUsedPercent.toFixed(1)}% >= ${maxDailyLoss}%`,
      status,
    };
  };

  const checkPositionLimit = (): ValidationResult => {
    if (!effectiveRiskProfile) {
      return {
        passed: true,
        currentValue: 0,
        maxValue: 3,
        message: "Loading risk profile...",
        status: 'pass',
      };
    }

    const currentPositions = openPositions.length;
    const maxPositions = effectiveRiskProfile.max_concurrent_positions;
    const passed = currentPositions < maxPositions;

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (currentPositions >= maxPositions) {
      status = 'fail';
    } else if (currentPositions >= maxPositions - 1) {
      status = 'warning';
    }

    return {
      passed,
      currentValue: currentPositions,
      maxValue: maxPositions,
      message: passed 
        ? `${currentPositions}/${maxPositions} positions open`
        : `Max positions reached: ${currentPositions}/${maxPositions}`,
      status,
    };
  };

  const checkCorrelation = (): ValidationResult => {
    if (!newPair) {
      return {
        passed: true,
        currentValue: 0,
        maxValue: 1,
        message: "Select a pair to check correlation",
        status: 'pass',
      };
    }

    // Simple correlation check - same pair in same direction
    const existingPairs = openPositions.map(p => p.pair.toUpperCase());
    const newPairNormalized = newPair.toUpperCase();
    
    // Check if already has position in same pair
    const hasSamePair = existingPairs.includes(newPairNormalized);
    
    // Check for correlated assets (BTC correlation group)
    const btcCorrelated = ['BTC', 'BTCUSDT', 'BTC/USDT', 'BTCPERP'];
    const ethCorrelated = ['ETH', 'ETHUSDT', 'ETH/USDT', 'ETHPERP'];
    
    const isBtcRelated = btcCorrelated.some(p => newPairNormalized.includes(p.replace('/', '')));
    const isEthRelated = ethCorrelated.some(p => newPairNormalized.includes(p.replace('/', '')));
    
    let correlatedCount = 0;
    existingPairs.forEach(pair => {
      if (isBtcRelated && btcCorrelated.some(p => pair.includes(p.replace('/', '')))) {
        correlatedCount++;
      }
      if (isEthRelated && ethCorrelated.some(p => pair.includes(p.replace('/', '')))) {
        correlatedCount++;
      }
    });

    const maxCorrelated = 2; // Allow max 2 correlated positions
    const passed = !hasSamePair && correlatedCount < maxCorrelated;
    
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (hasSamePair) {
      status = 'fail';
    } else if (correlatedCount >= maxCorrelated) {
      status = 'warning';
    }

    return {
      passed,
      currentValue: correlatedCount,
      maxValue: maxCorrelated,
      message: hasSamePair 
        ? `Already have position in ${newPair}`
        : correlatedCount > 0
          ? `${correlatedCount} correlated positions detected`
          : "No correlation issues",
      status,
    };
  };

  const runAllChecks = (): PreValidationResult => {
    const dailyLossCheck = checkDailyLossLimit();
    const positionLimitCheck = checkPositionLimit();
    const correlationCheck = checkCorrelation();

    const canProceed = dailyLossCheck.passed && positionLimitCheck.passed;
    
    let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
    if (!canProceed) {
      overallStatus = 'fail';
    } else if (
      dailyLossCheck.status === 'warning' ||
      positionLimitCheck.status === 'warning' ||
      correlationCheck.status === 'warning'
    ) {
      overallStatus = 'warning';
    }

    return {
      dailyLossCheck,
      positionLimitCheck,
      correlationCheck,
      canProceed,
      overallStatus,
    };
  };

  return {
    checkDailyLossLimit,
    checkPositionLimit,
    checkCorrelation,
    runAllChecks,
    openPositions,
    riskProfile: effectiveRiskProfile,
    dailyStatus,
    isLoading: !riskProfile,
  };
}
