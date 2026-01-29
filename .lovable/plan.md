
# Plan: Restructure Trade Entry Wizard

## Overview

Merestrukturisasi Trade Entry Wizard dari **7 steps** menjadi **5 steps** yang lebih streamlined:

| Current (7 Steps) | New (5 Steps) |
|-------------------|---------------|
| 1. Pre-Check | 1. **Setup** (Pre-Check + Strategy + Pair/Direction) |
| 2. Strategy | ↑ Combined |
| 3. Details (Pair, Direction, Entry, SL, TP) | ↑ Combined (only Pair, Direction, Timeframe) |
| 4. Confluence | 2. **Confluence** |
| 5. Sizing | 3. **Sizing & Levels** (+ Entry, SL, TP moved here) |
| 6. Checklist | 4. **Final Checklist** (reordered) |
| 7. Execute | 5. **Execute** |

---

## Change 1: Consolidate Steps 1-3 into "Setup"

### New Step Flow

```text
Step 1: SETUP
├── Trading Account Selection
├── Pre-validation Checks (Daily Loss, Position Limit, Correlation)
├── AI Pre-flight (optional)
├── Strategy Selection (with AI recommendations)
└── Basic Trade Info:
    ├── Trading Pair (Combobox)
    ├── Direction (LONG/SHORT)
    └── Timeframe

Step 2: CONFLUENCE
└── (No changes, same as current)

Step 3: SIZING & LEVELS
├── Entry Price *         ← MOVED from Details
├── Stop Loss *           ← MOVED from Details
├── Take Profit *         ← MOVED from Details
├── R:R Calculation
├── Risk % Slider
├── Leverage Input
└── Position Size Results

Step 4: FINAL CHECKLIST
├── How are you feeling right now?  ← REORDERED (first)
├── Trade Confidence Level          ← REORDERED (second)
├── AI Final Verdict               ← REORDERED (third)
├── Trade Comment
└── Confirm following rules

Step 5: EXECUTE
└── (No changes, same as current)
```

---

## File Changes

### 1. `src/types/trade-wizard.ts`

Update wizard steps from 7 to 5:

```typescript
export type WizardStep = 
  | 'setup'         // Combined: Pre-validation + Strategy + Basic Details
  | 'confluence'    // Step 2
  | 'sizing'        // Step 3 (now includes Entry, SL, TP)
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

// Update TradeDetailsData - remove Entry/SL/TP (moved to sizing)
export interface TradeDetailsData {
  pair: string;
  direction: 'LONG' | 'SHORT';
  timeframe: TimeframeType;
}

// New interface for sizing step
export interface TradeSizingData {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskPercent: number;
  leverage: number;
}
```

### 2. `src/features/trade/useTradeEntryWizard.ts`

Update STEPS_ORDER:

```typescript
const STEPS_ORDER: WizardStep[] = [
  'setup',
  'confluence',
  'sizing',
  'checklist',
  'confirmation',
];
```

Add new setter for sizing data with prices.

### 3. Create `src/components/trade/entry/SetupStep.tsx` (NEW)

**Combined component** containing:
- Trading Account Selection (from PreEntryValidation)
- Pre-validation checks (from PreEntryValidation)
- AI Pre-flight option (from PreEntryValidation)
- Strategy Selection dropdown (from StrategySelection)
- Pair selection (Combobox)
- Direction buttons (LONG/SHORT)
- Timeframe dropdown

Layout structure:
```text
┌─────────────────────────────────────────────┐
│ SETUP                                        │
├─────────────────────────────────────────────┤
│ 1. Trading Account: [Select v]              │
│                                              │
│ ─── Pre-validation ────────────────────────│
│ ✓ Daily Loss: OK                            │
│ ✓ Position Limit: OK                        │
│ ✓ Correlation: OK                           │
│ [Run AI Pre-flight]                         │
│                                              │
│ ─── Strategy ──────────────────────────────│
│ AI Recommended: [Strategy Name] 85% match   │
│ Select Strategy: [Dropdown v]               │
│                                              │
│ ─── Trade Setup ───────────────────────────│
│ Pair: [Searchable Combobox]                 │
│ Direction: [LONG] [SHORT]                   │
│ Timeframe: [Select v]                       │
└─────────────────────────────────────────────┘
```

### 4. Update `src/components/trade/entry/PositionSizingStep.tsx`

Add Entry, SL, TP inputs at the top:

```text
┌─────────────────────────────────────────────┐
│ SIZING & LEVELS                              │
├─────────────────────────────────────────────┤
│ ─── Price Levels ──────────────────────────│
│ Entry Price: [________]                      │
│ Stop Loss: [________] (red)                  │
│ Take Profit: [________] (green)              │
│                                              │
│ R:R Ratio: 1:2.5 ✓                          │
│                                              │
│ ─── Position Sizing ───────────────────────│
│ Account Balance: $10,000                    │
│ Risk %: [Slider 2%]                         │
│ Leverage: [1x]                              │
│                                              │
│ ─── Results ───────────────────────────────│
│ Position Size: 0.05 BTC                     │
│ Risk Amount: $200                           │
│ Potential Outcomes: -$200 / +$200 / +$400   │
└─────────────────────────────────────────────┘
```

### 5. Update `src/components/trade/entry/FinalChecklist.tsx`

Reorder sections:

**Before (current order):**
1. AI Final Verdict
2. Emotional State (How are you feeling)
3. Confidence Level
4. Following Rules
5. Trade Comment

**After (new order):**
1. **Emotional State** (How are you feeling right now?) ← FIRST
2. **Confidence Level** (Trade Confidence Level) ← SECOND
3. **AI Final Verdict** ← THIRD
4. Following Rules checkbox
5. Trade Comment

### 6. Delete Old Components

- Delete `src/components/trade/entry/PreEntryValidation.tsx`
- Delete `src/components/trade/entry/StrategySelection.tsx`
- Delete `src/components/trade/entry/TradeDetails.tsx`

### 7. Update `src/components/trade/entry/TradeEntryWizard.tsx`

Update renderStep() switch:

```typescript
const renderStep = () => {
  switch (currentStep) {
    case 'setup':
      return <SetupStep onNext={nextStep} onCancel={handleCancel} />;
    case 'confluence':
      return <ConfluenceValidator onNext={nextStep} onBack={prevStep} />;
    case 'sizing':
      return <PositionSizingStep onNext={nextStep} onBack={prevStep} />;
    case 'checklist':
      return <FinalChecklist onNext={nextStep} onBack={prevStep} />;
    case 'confirmation':
      return <TradeConfirmation onExecute={handleComplete} onBack={prevStep} onCancel={handleCancel} />;
    default:
      return null;
  }
};
```

---

## Visual Comparison

### Before (7 Steps)
```text
[Pre-Check] → [Strategy] → [Details] → [Confluence] → [Sizing] → [Checklist] → [Execute]
     1            2            3            4            5           6            7
```

### After (5 Steps)
```text
[Setup] → [Confluence] → [Sizing] → [Checklist] → [Execute]
   1           2            3           4            5
```

---

## FinalChecklist Section Order

### Current Order (FinalChecklist.tsx lines 166-389):
```text
1. AI Final Verdict section (lines 166-256)
2. Emotional State (lines 258-285)
3. Confidence Level (lines 287-310)
4. Following Rules (lines 312-331)
5. Trade Comment (lines 333-353)
6. Summary (lines 355-378)
```

### New Order:
```text
1. Emotional State - "How are you feeling right now?"
2. Confidence Level - "Trade Confidence Level"
3. AI Final Verdict - AI quality assessment
4. Following Rules checkbox
5. Trade Comment
6. Summary
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/types/trade-wizard.ts` | UPDATE - Reduce to 5 steps, update types |
| `src/features/trade/useTradeEntryWizard.ts` | UPDATE - New step order |
| `src/components/trade/entry/SetupStep.tsx` | CREATE - Combined setup step |
| `src/components/trade/entry/PositionSizingStep.tsx` | UPDATE - Add Entry/SL/TP inputs |
| `src/components/trade/entry/FinalChecklist.tsx` | UPDATE - Reorder sections |
| `src/components/trade/entry/TradeEntryWizard.tsx` | UPDATE - New step rendering |
| `src/components/trade/entry/WizardProgress.tsx` | No changes (uses WIZARD_STEPS dynamically) |
| `src/components/trade/entry/PreEntryValidation.tsx` | DELETE |
| `src/components/trade/entry/StrategySelection.tsx` | DELETE |
| `src/components/trade/entry/TradeDetails.tsx` | DELETE |

---

## Technical Notes

### SetupStep Component Structure

The new SetupStep will combine logic from 3 components:
- Account selection & pre-validation from PreEntryValidation
- Strategy selection with AI from StrategySelection  
- Pair/Direction/Timeframe from TradeDetails

Layout will use collapsible sections or accordion for space efficiency.

### PositionSizingStep Changes

Price inputs (Entry, SL, TP) akan di-add di bagian atas, sebelum position sizing calculator. R:R ratio akan dihitung real-time berdasarkan input prices.

### Data Flow

```text
SetupStep sets:
├── tradingAccountId, accountBalance
├── preValidation
├── selectedStrategyId, strategyDetails
└── tradeDetails (pair, direction, timeframe only)

PositionSizingStep sets:
├── tradeDetails.entryPrice, stopLoss, takeProfit (update)
└── positionSizing (calculated)

FinalChecklist sets:
└── finalChecklist (emotional, confidence, AI verdict)
```
