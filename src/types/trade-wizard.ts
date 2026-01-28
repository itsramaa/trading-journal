/**
 * Trade Entry Wizard Types - Per Trading Journey Markdown spec
 */
import type { PositionSizeResult } from "@/types/risk";
import type { TradingStrategyEnhanced, TimeframeType } from "@/types/strategy";

export type WizardStep = 
  | 'pre-validation'    // Step 1
  | 'strategy'          // Step 2
  | 'details'           // Step 3
  | 'confluence'        // Step 4
  | 'sizing'            // Step 5
  | 'checklist'         // Step 6
  | 'confirmation';     // Step 7

export const WIZARD_STEPS: WizardStep[] = [
  'pre-validation',
  'strategy',
  'details',
  'confluence',
  'sizing',
  'checklist',
  'confirmation',
];

export const STEP_LABELS: Record<WizardStep, string> = {
  'pre-validation': 'Pre-Check',
  'strategy': 'Strategy',
  'details': 'Details',
  'confluence': 'Confluence',
  'sizing': 'Sizing',
  'checklist': 'Checklist',
  'confirmation': 'Execute',
};

export interface ValidationResult {
  passed: boolean;
  currentValue: number;
  maxValue: number;
  message: string;
  status: 'pass' | 'warning' | 'fail';
}

export interface PreValidationResult {
  dailyLossCheck: ValidationResult;
  positionLimitCheck: ValidationResult;
  correlationCheck: ValidationResult;
  canProceed: boolean;
  overallStatus: 'pass' | 'warning' | 'fail';
}

export interface TradeDetailsData {
  pair: string;
  direction: 'LONG' | 'SHORT';
  timeframe: TimeframeType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
}

export interface ConfluenceData {
  checkedItems: string[];
  totalRequired: number;
  passed: boolean;
  aiConfidence: number;
}

export interface FinalChecklistData {
  emotionalState: 'calm' | 'anxious' | 'fomo' | 'confident' | 'fearful';
  confidenceLevel: number;
  followingRules: boolean;
  tradeComment: string;
  aiQualityScore?: number;
  aiConfidence?: number;
}

export interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  
  // Step 1: Pre-validation results
  preValidation: PreValidationResult | null;
  
  // Step 2: Strategy selection
  selectedStrategyId: string | null;
  strategyDetails: TradingStrategyEnhanced | null;
  
  // Step 3: Trade details
  tradeDetails: TradeDetailsData | null;
  
  // Step 4: Confluence validation
  confluences: ConfluenceData | null;
  
  // Step 5: Position sizing
  positionSizing: PositionSizeResult | null;
  
  // Step 6: Final checklist
  finalChecklist: FinalChecklistData | null;
  
  // Trading account
  tradingAccountId: string | null;
  accountBalance: number;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 'pre-validation',
  completedSteps: [],
  preValidation: null,
  selectedStrategyId: null,
  strategyDetails: null,
  tradeDetails: null,
  confluences: null,
  positionSizing: null,
  finalChecklist: null,
  tradingAccountId: null,
  accountBalance: 0,
};

export const EMOTIONAL_STATES = [
  { value: 'calm', label: 'Calm & Focused', emoji: '😌' },
  { value: 'confident', label: 'Confident', emoji: '💪' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'fomo', label: 'FOMO', emoji: '🔥' },
  { value: 'fearful', label: 'Fearful', emoji: '😨' },
] as const;
