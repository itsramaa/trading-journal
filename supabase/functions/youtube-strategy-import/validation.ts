/**
 * Multi-step Validation Logic for YouTube Strategy Import
 * Enhanced to support new extraction schema with sourceQuote and extractionConfidence
 */

export interface StructuredEntryRule {
  id: string;
  type: 'smc' | 'ict' | 'indicator' | 'price_action' | 'liquidity' | 'structure' | 'time' | 'confluence';
  concept: string;
  condition: string;
  parameters?: Record<string, unknown>;
  sourceQuote?: string;
  timeframe?: string;
  is_mandatory: boolean;
}

export interface StructuredExitRule {
  id: string;
  type: 'take_profit' | 'stop_loss' | 'trailing_stop' | 'time_based' | 'fixed_target' | 'risk_reward' | 'structure' | 'indicator' | 'trailing';
  value?: number | null;
  unit?: 'percent' | 'atr' | 'rr' | 'pips' | null;
  description?: string;
  parameters?: Record<string, unknown>;
  sourceQuote?: string;
  concept?: string;
}

export interface RiskManagement {
  stopLoss?: {
    type?: string;
    value?: string | number | null;
    placement?: string;
    sourceQuote?: string;
  } | null;
  positionSizing?: {
    method?: string;
    value?: string | number | null;
    sourceQuote?: string;
  } | null;
  riskRewardRatio?: string | number | null;
  // Legacy fields for backward compatibility
  stopLossLogic?: string | null;
}

export interface ExtractionConfidence {
  overall: number;
  entryClarity: number;
  exitClarity: number;
  riskClarity: number;
}

export interface ExtractedStrategy {
  strategyName: string;
  description: string;
  methodology: string;
  
  // New metadata structure
  metadata?: {
    methodology?: string;
    timeframes?: string[];
    instruments?: string[];
    sessionPreference?: string | null;
  };
  
  conceptsUsed: string[];
  indicatorsUsed: string[];
  patternsUsed: string[];
  
  entryRules: StructuredEntryRule[];
  exitRules: StructuredExitRule[];
  
  riskManagement: RiskManagement;
  
  timeframeContext: {
    primary: string;
    higherTF?: string | null;
    lowerTF?: string | null;
  };
  
  suitablePairs: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  riskLevel: 'low' | 'medium' | 'high';
  
  // New fields from enhanced extraction
  additionalFilters?: string[];
  notes?: string[];
  extractionConfidence?: ExtractionConfidence;
}

export interface ActionabilityResult {
  isActionable: boolean;
  hasEntry: boolean;
  hasExit: boolean;
  hasRiskManagement: boolean;
  warnings: string[];
  missingElements: string[];
  score: number;
}

/**
 * Validate that extracted strategy is actionable
 * Must have: entry rules, exit rules, risk management
 */
export function validateActionability(strategy: ExtractedStrategy): ActionabilityResult {
  const warnings: string[] = [];
  const missingElements: string[] = [];

  // Check entry rules
  const hasEntry = strategy.entryRules && strategy.entryRules.length > 0;
  if (!hasEntry) {
    missingElements.push('Entry rules/conditions');
  } else {
    // Validate entry rules structure
    const validEntryRules = strategy.entryRules.filter(rule => 
      rule.type && rule.condition && rule.condition.length > 10
    );
    if (validEntryRules.length === 0) {
      warnings.push('Entry rules exist but lack specific conditions');
    }
    if (validEntryRules.length < 2) {
      warnings.push('Strategy has less than 2 entry conditions (low confluence)');
    }
    
    // Check for source quotes (new quality indicator)
    const rulesWithQuotes = strategy.entryRules.filter(r => r.sourceQuote && r.sourceQuote.length > 0);
    if (rulesWithQuotes.length === 0 && strategy.entryRules.length > 0) {
      warnings.push('Entry rules lack source quotes (lower confidence)');
    }
  }

  // Check exit rules
  const hasTakeProfit = strategy.exitRules?.some(r => 
    r.type === 'take_profit' || r.type === 'fixed_target' || r.type === 'risk_reward'
  );
  const hasStopLoss = strategy.exitRules?.some(r => r.type === 'stop_loss');
  const hasExit = hasTakeProfit || hasStopLoss || (strategy.exitRules && strategy.exitRules.length > 0);
  
  if (!hasTakeProfit && !strategy.exitRules?.some(r => r.type === 'fixed_target' || r.type === 'risk_reward')) {
    missingElements.push('Take profit level');
  }
  if (!hasStopLoss && !strategy.riskManagement?.stopLoss) {
    missingElements.push('Stop loss level');
  }

  // Check risk management (support both new and legacy structure)
  const rm = strategy.riskManagement || {};
  const hasRR = rm.riskRewardRatio && 
    (typeof rm.riskRewardRatio === 'number' ? rm.riskRewardRatio > 0 : rm.riskRewardRatio.length > 0);
  const hasSLObj = rm.stopLoss && (rm.stopLoss.type || rm.stopLoss.placement);
  const hasSLLogic = rm.stopLossLogic && rm.stopLossLogic.length > 5;
  const hasPositionSizing = rm.positionSizing && (rm.positionSizing.method || rm.positionSizing.value);
  const hasRiskManagement = hasRR || hasSLObj || hasSLLogic || hasPositionSizing;

  if (!hasRiskManagement) {
    missingElements.push('Risk management rules');
  }

  // Additional validation warnings
  const primaryTF = strategy.timeframeContext?.primary || 
    (strategy.metadata?.timeframes && strategy.metadata.timeframes[0]);
  if (!primaryTF) {
    warnings.push('No primary timeframe specified');
  }

  if (strategy.suitablePairs?.length === 0 && 
      (!strategy.metadata?.instruments || strategy.metadata.instruments.length === 0)) {
    warnings.push('No suitable trading pairs specified');
  }

  // Methodology-specific validation
  if (strategy.methodology === 'smc' || strategy.methodology === 'ict') {
    if (strategy.indicatorsUsed?.length > 0) {
      if (strategy.conceptsUsed?.length === 0) {
        warnings.push('SMC/ICT strategy detected but no SMC concepts found');
      }
    }
    if (strategy.conceptsUsed?.length === 0) {
      missingElements.push('SMC/ICT concepts (Order Block, FVG, BOS, etc.)');
    }
  }

  if (strategy.methodology === 'indicator_based') {
    if (strategy.indicatorsUsed?.length === 0) {
      missingElements.push('Indicator specifications');
    }
  }

  // Add notes as warnings if present
  if (strategy.notes && strategy.notes.length > 0) {
    strategy.notes.forEach(note => {
      if (!warnings.includes(note)) {
        warnings.push(`Note: ${note}`);
      }
    });
  }

  // Calculate score
  let score = 100;
  score -= missingElements.length * 20;
  score -= warnings.length * 5;
  
  // Use extraction confidence if available
  if (strategy.extractionConfidence) {
    const ec = strategy.extractionConfidence;
    const avgClarity = (ec.entryClarity + ec.exitClarity + ec.riskClarity) / 3;
    // Blend with calculated score
    score = Math.round(score * 0.6 + avgClarity * 0.4);
  }
  
  score = Math.max(0, Math.min(100, score));

  const isActionable = hasEntry && hasExit && missingElements.length <= 1;

  return {
    isActionable,
    hasEntry,
    hasExit,
    hasRiskManagement,
    warnings,
    missingElements,
    score,
  };
}

/**
 * Calculate final confidence score based on multiple factors
 */
export function calculateFinalConfidence(
  methodologyConfidence: number,
  actionabilityScore: number,
  transcriptWordCount: number,
  isAutoGeneratedCaptions: boolean,
  extractionConfidence?: ExtractionConfidence
): number {
  let confidence = methodologyConfidence * 0.4 + actionabilityScore * 0.4;
  
  // Incorporate extraction confidence if available
  if (extractionConfidence) {
    confidence = confidence * 0.7 + extractionConfidence.overall * 0.3;
  }
  
  // Bonus for longer transcripts (more context)
  if (transcriptWordCount > 1000) {
    confidence += 15;
  } else if (transcriptWordCount > 500) {
    confidence += 10;
  }

  // Penalty for auto-generated captions (less accurate)
  if (isAutoGeneratedCaptions) {
    confidence -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

/**
 * Determine import status based on confidence and validation
 */
export type ImportStatus = 'success' | 'warning' | 'blocked' | 'failed';

export function determineImportStatus(
  confidence: number,
  actionability: ActionabilityResult
): ImportStatus {
  // Failed: actionability failed completely
  if (!actionability.hasEntry && !actionability.hasExit) {
    return 'failed';
  }

  // Blocked: not actionable
  if (!actionability.isActionable) {
    return 'blocked';
  }

  // Success or Warning based on confidence
  if (confidence >= 80) {
    return 'success';
  } else if (confidence >= 60) {
    return 'warning';
  } else {
    return 'blocked';
  }
}

/**
 * Generate human-readable reason for status
 */
export function generateStatusReason(
  status: ImportStatus,
  actionability: ActionabilityResult,
  confidence: number
): string {
  switch (status) {
    case 'failed':
      return `Strategy extraction failed. Missing: ${actionability.missingElements.join(', ')}`;
    
    case 'blocked':
      if (!actionability.isActionable) {
        return `Strategy is not actionable. Missing: ${actionability.missingElements.join(', ')}`;
      }
      return `Confidence too low (${confidence}%). Manual review required.`;
    
    case 'warning':
      return `Strategy extracted with ${confidence}% confidence. Review before using.`;
    
    case 'success':
      return `Strategy extracted successfully with ${confidence}% confidence.`;
    
    default:
      return 'Unknown status';
  }
}

/**
 * Add IDs to entry/exit rules if missing and normalize structure
 */
export function normalizeRules(strategy: ExtractedStrategy): ExtractedStrategy {
  const normalizedEntry = (strategy.entryRules || []).map((rule, idx) => ({
    ...rule,
    id: rule.id || `entry_${idx}`,
    is_mandatory: rule.is_mandatory ?? idx < 2, // First 2 are mandatory by default
  }));

  const normalizedExit = (strategy.exitRules || []).map((rule, idx) => ({
    ...rule,
    id: rule.id || `exit_${idx}`,
  }));

  // Normalize methodology from metadata if present
  const methodology = strategy.methodology || strategy.metadata?.methodology || 'unknown';
  
  // Merge timeframes from metadata
  let timeframeContext = strategy.timeframeContext || { primary: '1h' };
  if (strategy.metadata?.timeframes && strategy.metadata.timeframes.length > 0) {
    timeframeContext = {
      primary: timeframeContext.primary || strategy.metadata.timeframes[0],
      higherTF: timeframeContext.higherTF,
      lowerTF: timeframeContext.lowerTF,
    };
  }

  // Merge suitable pairs from metadata
  let suitablePairs = strategy.suitablePairs || [];
  if (strategy.metadata?.instruments && strategy.metadata.instruments.length > 0) {
    suitablePairs = [...new Set([...suitablePairs, ...strategy.metadata.instruments])];
  }

  return {
    ...strategy,
    methodology,
    entryRules: normalizedEntry,
    exitRules: normalizedExit,
    timeframeContext,
    suitablePairs,
  };
}
