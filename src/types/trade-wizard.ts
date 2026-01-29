/**
 * Trade Entry Wizard Types - 5-Step Structure
 */
import type { PositionSizeResult } from "@/types/risk";
import type { TradingStrategyEnhanced, TimeframeType } from "@/types/strategy";

export type WizardStep = 
  | 'setup'         // Step 1: Pre-validation + Strategy + Basic Details
  | 'confluence'    // Step 2
  | 'sizing'        // Step 3 (includes Entry, SL, TP)
  | 'checklist'     // Step 4
  | 'confirmation'; // Step 5

export const WIZARD_STEPS: WizardStep[] = [
  'setup',
  'confluence',
  'sizing',
  'checklist',
  'confirmation',
];

export const STEP_LABELS: Record<WizardStep, string> = {
  'setup': 'Setup',
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

// Setup step only has pair, direction, timeframe
export interface TradeDetailsData {
  pair: string;
  direction: 'LONG' | 'SHORT';
  timeframe: TimeframeType;
}

// Sizing step has price levels
export interface TradePriceLevels {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
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
  
  // Step 1: Setup (Pre-validation + Strategy + Basic Details)
  preValidation: PreValidationResult | null;
  selectedStrategyId: string | null;
  strategyDetails: TradingStrategyEnhanced | null;
  tradeDetails: TradeDetailsData | null;
  
  // Step 2: Confluence validation
  confluences: ConfluenceData | null;
  
  // Step 3: Sizing & Levels
  priceLevels: TradePriceLevels | null;
  positionSizing: PositionSizeResult | null;
  
  // Step 4: Final checklist
  finalChecklist: FinalChecklistData | null;
  
  // Trading account
  tradingAccountId: string | null;
  accountBalance: number;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 'setup',
  completedSteps: [],
  preValidation: null,
  selectedStrategyId: null,
  strategyDetails: null,
  tradeDetails: null,
  confluences: null,
  priceLevels: null,
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
