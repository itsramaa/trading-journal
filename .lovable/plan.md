
# Phase 2: Trade Entry Wizard Implementation

## Overview
Mengimplementasikan 7-step guided trade entry flow sesuai spesifikasi Markdown. Wizard ini akan menggantikan single-form dialog yang ada di `TradingJournal.tsx` dengan flow yang lebih terstruktur dan terintegrasi dengan AI.

---

## Current State Analysis

### What Exists:
1. **TradingJournal.tsx** (958 lines) - Single dialog form untuk trade entry
2. **PositionSizeCalculator.tsx** - Calculator standalone di Risk Management page
3. **Risk Profile System** - Hooks dan types sudah ready
4. **Strategy System** - Enhanced dengan entry/exit rules, min_confluences, min_rr

### What's Missing (per Markdown spec):
1. Multi-step wizard component
2. Pre-entry validation checks
3. Confluence validation checklist
4. AI integration at each step
5. Final checklist dan emotional state tracking
6. Confirmation screen dengan trade summary

---

## Implementation Plan

### 1. New Directory Structure

```text
src/
├── components/
│   └── trade/
│       ├── entry/
│       │   ├── TradeEntryWizard.tsx       # Main wizard container
│       │   ├── WizardProgress.tsx         # Step progress indicator
│       │   ├── PreEntryValidation.tsx     # Step 1: System checks
│       │   ├── StrategySelection.tsx      # Step 2: Strategy picker
│       │   ├── TradeDetails.tsx           # Step 3: Pair, direction, price
│       │   ├── ConfluenceValidator.tsx    # Step 4: Confluence checklist
│       │   ├── PositionSizing.tsx         # Step 5: Size calculator
│       │   ├── FinalChecklist.tsx         # Step 6: Final validation
│       │   └── TradeConfirmation.tsx      # Step 7: Review & execute
│       └── management/
│           └── OpenPositionsTable.tsx     # Enhanced open positions view
├── features/
│   └── trade/
│       ├── useTradeEntryWizard.ts         # Wizard state machine
│       └── usePreTradeValidation.ts       # Pre-entry validation logic
└── types/
    └── trade-wizard.ts                    # Wizard-specific types
```

### 2. New Type Definitions

**File: `src/types/trade-wizard.ts`**
```typescript
export type WizardStep = 
  | 'pre-validation'    // Step 1
  | 'strategy'          // Step 2
  | 'details'           // Step 3
  | 'confluence'        // Step 4
  | 'sizing'            // Step 5
  | 'checklist'         // Step 6
  | 'confirmation';     // Step 7

export interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  
  // Step 1: Pre-validation results
  preValidation: {
    dailyLossCheck: ValidationResult;
    positionSizeCheck: ValidationResult;
    correlationCheck: ValidationResult;
    canProceed: boolean;
  } | null;
  
  // Step 2: Strategy selection
  selectedStrategyId: string | null;
  strategyDetails: TradingStrategyEnhanced | null;
  
  // Step 3: Trade details
  tradeDetails: {
    pair: string;
    direction: 'LONG' | 'SHORT';
    timeframe: TimeframeType;
    entryPrice: number;
    currentPrice: number;
  } | null;
  
  // Step 4: Confluence validation
  confluences: {
    checkedItems: string[];
    totalRequired: number;
    passed: boolean;
    aiConfidence: number;
  } | null;
  
  // Step 5: Position sizing
  positionSizing: PositionSizeResult | null;
  
  // Step 6: Final checklist
  finalChecklist: {
    emotionalState: 'calm' | 'anxious' | 'fomo';
    confidenceLevel: number;
    followingRules: boolean;
    tradeComment: string;
  } | null;
}

export interface ValidationResult {
  passed: boolean;
  currentValue: number;
  maxValue: number;
  message: string;
}
```

### 3. Core Components

#### A. TradeEntryWizard.tsx (Main Container)
- State machine menggunakan Zustand atau useReducer
- Manages step navigation (next/back)
- Collects all data dan submits trade
- Renders appropriate step component

#### B. WizardProgress.tsx (Progress Indicator)
```text
┌─────────────────────────────────────────────────────────────┐
│  ● Pre-Check  → ● Strategy → ● Details → ● Confluence      │
│                                                              │
│  → ○ Sizing   → ○ Checklist → ○ Execute                    │
└─────────────────────────────────────────────────────────────┘
```
- Shows all 7 steps dengan visual progress
- Completed steps marked with checkmark
- Current step highlighted
- Future steps dimmed

#### C. Step 1: PreEntryValidation.tsx
- Auto-runs pada wizard open
- Checks:
  1. Daily loss limit (from useDailyRiskStatus)
  2. Position size limit (max concurrent positions)
  3. Correlation check (existing positions)
- Visual status per check (pass/fail/warning)
- Must all pass to proceed

#### D. Step 2: StrategySelection.tsx
- Dropdown of user's active strategies
- Shows strategy details when selected:
  - Min confluences required
  - Min R:R
  - Valid pairs
  - Entry/exit rules
- AI recommendation placeholder (for Phase 3)

#### E. Step 3: TradeDetails.tsx
- Pair input dengan validation against strategy's valid_pairs
- Direction toggle (Long/Short)
- Timeframe selector (validated against strategy)
- Entry price input
- Current price display (simulated)

#### F. Step 4: ConfluenceValidator.tsx
- Dynamic checklist based on strategy.entry_rules
- Each rule shown as checkbox
- Mandatory rules marked with *
- Counter: "X/Y confluences met"
- Must meet min_confluences to proceed
- AI detection placeholder (for Phase 3)

#### G. Step 5: PositionSizing.tsx
- Embedded version of PositionSizeCalculator
- Pre-filled dengan account balance dan risk profile
- Auto-calculates based on entry/SL prices
- Shows capital deployment %
- Warning if exceeds limits

#### H. Step 6: FinalChecklist.tsx
- Summary of all validation checks
- Emotional state selector dropdown
- Confidence level slider (1-10)
- "Following rules?" checkbox
- Auto-generated trade comment
- AI final verdict placeholder

#### I. Step 7: TradeConfirmation.tsx
- Full trade summary:
  - Pair, Direction, Entry, SL, TP
  - Position size, Risk amount
  - R:R ratio, Capital deployment
- Strategy name dan confluence count
- Execute button
- Cancel button

### 4. Hook: useTradeEntryWizard.ts

```typescript
interface UseTradeEntryWizard {
  // State
  state: WizardState;
  currentStep: WizardStep;
  
  // Navigation
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: boolean;
  canGoBack: boolean;
  
  // Data setters
  setPreValidation: (data: PreValidationResult) => void;
  setStrategy: (strategyId: string) => void;
  setTradeDetails: (details: TradeDetails) => void;
  setConfluences: (data: ConfluenceData) => void;
  setPositionSizing: (result: PositionSizeResult) => void;
  setFinalChecklist: (data: FinalChecklistData) => void;
  
  // Actions
  reset: () => void;
  submitTrade: () => Promise<void>;
  isSubmitting: boolean;
}
```

### 5. Hook: usePreTradeValidation.ts

```typescript
interface PreTradeValidation {
  checkDailyLossLimit: () => ValidationResult;
  checkPositionLimit: () => ValidationResult;
  checkCorrelation: (newPair: string) => ValidationResult;
  runAllChecks: (pair: string) => PreValidationResult;
}
```

### 6. Integration with TradingJournal.tsx

**Changes:**
1. Replace Dialog content dengan `<TradeEntryWizard />`
2. Keep existing trade list dan open positions display
3. Pass account balance ke wizard
4. Update form submission ke use wizard's submitTrade

### 7. Database Updates

**trade_entries table (already updated in Phase 1):**
- `confluence_score` - Number of confluences met
- `confluences_met` - JSONB array of checked confluences
- `ai_quality_score` - Placeholder for AI score
- `ai_confidence` - Placeholder for AI confidence
- `emotional_state` - User's emotional state
- `pre_trade_validation` - JSONB with all validation results

---

## UI Flow Visualization

```text
┌────────────────────────────────────────────────────────────────┐
│                    TRADE ENTRY WIZARD                          │
├────────────────────────────────────────────────────────────────┤
│  [●] Pre-Check → [●] Strategy → [●] Details → [○] Confluence  │
│  → [○] Sizing  → [○] Checklist → [○] Execute                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  STEP 1: PRE-ENTRY VALIDATION                                 │
│  ─────────────────────────────────────────────                 │
│                                                                │
│  ✓ Daily Loss Limit Check                                     │
│    ├─ Daily limit: 5% = $5,000                                │
│    ├─ Loss today: -2.1% = -$2,100                             │
│    └─ STATUS: PASS - Can trade                                │
│                                                                │
│  ✓ Position Size Check                                        │
│    ├─ Current positions: 2                                    │
│    ├─ Max positions: 3                                        │
│    └─ STATUS: PASS - Within limits                            │
│                                                                │
│  ✓ Correlation Check                                          │
│    ├─ Existing: BTC (LONG), ETH (LONG)                        │
│    └─ STATUS: PASS                                            │
│                                                                │
│  ═══════════════════════════════════════════════              │
│  ALL CHECKS PASSED - Ready to proceed                         │
│  ═══════════════════════════════════════════════              │
│                                                                │
│                              [Cancel]  [Next: Select Strategy] │
└────────────────────────────────────────────────────────────────┘
```

---

## Files to Create (8 files)

| File | Purpose |
|------|---------|
| `src/types/trade-wizard.ts` | Wizard type definitions |
| `src/features/trade/useTradeEntryWizard.ts` | Wizard state machine hook |
| `src/features/trade/usePreTradeValidation.ts` | Pre-validation logic hook |
| `src/components/trade/entry/TradeEntryWizard.tsx` | Main wizard container |
| `src/components/trade/entry/WizardProgress.tsx` | Step progress indicator |
| `src/components/trade/entry/PreEntryValidation.tsx` | Step 1 component |
| `src/components/trade/entry/StrategySelection.tsx` | Step 2 component |
| `src/components/trade/entry/TradeDetails.tsx` | Step 3 component |
| `src/components/trade/entry/ConfluenceValidator.tsx` | Step 4 component |
| `src/components/trade/entry/PositionSizingStep.tsx` | Step 5 component |
| `src/components/trade/entry/FinalChecklist.tsx` | Step 6 component |
| `src/components/trade/entry/TradeConfirmation.tsx` | Step 7 component |

## Files to Modify (2 files)

| File | Changes |
|------|---------|
| `src/pages/trading-journey/TradingJournal.tsx` | Replace dialog with wizard |
| `src/hooks/use-trade-entries.ts` | Add fields for wizard data |

---

## Implementation Order

1. **Create types** (`trade-wizard.ts`)
2. **Create hooks** (`useTradeEntryWizard.ts`, `usePreTradeValidation.ts`)
3. **Create progress component** (`WizardProgress.tsx`)
4. **Create step components** (Steps 1-7)
5. **Create main wizard** (`TradeEntryWizard.tsx`)
6. **Integrate into TradingJournal.tsx**
7. **Update trade submission** dengan new fields

---

## Technical Notes

### State Management
- Use Zustand store for wizard state (persists across step navigation)
- Each step validates before allowing next
- Data flows: step component → wizard store → submission

### Validation
- Step 1 validates on mount (auto-check)
- Steps 2-6 validate on "Next" click
- Step 7 validates entire trade before submit

### AI Placeholders
- Step 2: "AI will recommend strategies" - placeholder text
- Step 4: "AI confluence detection" - checkbox list (manual first)
- Step 6: "AI final verdict" - placeholder badge
- Full AI integration in Phase 3

### Assumptions
1. Current price for pairs is simulated (no real API)
2. Correlation check uses simple pair matching (not real correlation data)
3. AI features are placeholder UI until Phase 3

### Risks
1. Complex state management - mitigated dengan Zustand
2. Form validation across steps - mitigated dengan Zod per step
3. Data persistence if user navigates away - consider localStorage backup

---

## Success Criteria

- User dapat complete 7-step trade entry flow
- All validations run before trade submission
- Confluence checklist works dengan strategy rules
- Position sizing integrated dari PositionSizeCalculator
- Trade saved dengan all new fields populated
- Emotional state dan confidence level captured
