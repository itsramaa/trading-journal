
# Plan: YouTube Import & Backtest Alignment with Enhanced Strategy Schema

## Audit Summary

### A. YouTube Import ↔ Strategy Fields Analysis

| Field | YouTube Import (extracts) | Strategy DB (saves to) | Status |
|-------|---------------------------|------------------------|--------|
| `strategyName` | ✓ Extracted | `name` | ✓ Aligned |
| `description` | ✓ Extracted | `description` | ✓ Aligned |
| `methodology` | ✓ Extracted | `methodology` | ✓ Aligned |
| `timeframeContext.primary` | ✓ Extracted | `timeframe` | ✓ Aligned |
| `timeframeContext.higherTF` | ✓ Extracted | `higher_timeframe` | ✓ Aligned |
| `timeframeContext.lowerTF` | ✓ Extracted | `lower_timeframe` | ✓ Aligned |
| `trading_style` | ✗ Not extracted (inferred) | `trading_style` | ⚠ Inferred only |
| `sessionPreference` | ✓ Extracted (Gemini) | `session_preference` | ⚠ Mapping exists but edge function doesn't return it |
| `difficultyLevel` | ✓ Extracted | `difficulty_level` | ✓ Aligned |
| `suitablePairs` | ✓ Extracted | `valid_pairs` | ✓ Aligned |
| `conceptsUsed` | ✓ Extracted | Stored in `tags` | ✓ Partial |
| `indicatorsUsed` | ✓ Extracted | Stored in `tags` | ✓ Partial |

### B. Issues Found

**Issue 1: `sessionPreference` Not Returned from Edge Function**
- Gemini unified extraction defines `sessionPreference` in schema (line 334)
- But the edge function response builder (lines 382-434) doesn't include it
- The `use-youtube-strategy-import.ts` has `mapSessionPreference()` but receives `undefined`

**Issue 2: `trading_style` Only Inferred, Not Extracted**
- YouTube import infers trading style from timeframe (scalping/day/swing/position)
- AI extraction schema in `gemini-unified-extract.ts` has `tradingStyle` field (line 293)
- But it's not mapped to the response

**Issue 3: Edge Function Missing Session Preference Passthrough**
- The unified extraction result has `strategy.sessionPreference` but it's not passed through to the final response

### C. Backtest ↔ Strategy Alignment Analysis

| Strategy Field | Backtest Uses | Status |
|----------------|---------------|--------|
| `timeframe` | ✓ For interval selection | ✓ Working |
| `higher_timeframe` | ✗ Not used | ⚠ Should use for bias |
| `lower_timeframe` | ✗ Not used | ⚠ Should use for entry |
| `session_preference` | ✗ Not used (has filter UI) | ⚠ Should auto-apply |
| `methodology` | ✗ Not used | Info only |
| `trading_style` | ✗ Not used | ⚠ Could affect holding |
| `exit_rules` | ✓ Used for TP/SL | ✓ Working |
| `entry_rules` | ✗ Simplified simulation | ⚠ Not rule-based |

**Key Backtest Gaps:**
1. Session filter in UI is manual, but strategy already has `session_preference` - should auto-populate
2. Multi-timeframe (HTF/LTF) not utilized in simulation
3. Trading style could influence position holding logic

---

## Implementation Plan

### Phase 1: Fix YouTube Import → Strategy Field Mapping

**File: `supabase/functions/youtube-strategy-import/index.ts`**

1. Add `sessionPreference` to the unified extraction response (line ~389-420):
```typescript
// In the unified extraction response builder
strategy: {
  // ... existing fields
  sessionPreference: unifiedStrategy.sessionPreference || null, // ADD THIS
  tradingStyle: unifiedStrategy.tradingStyle || null, // ADD THIS
}
```

2. Add `sessionPreference` to the fallback extraction response (line ~680-710):
```typescript
strategy: {
  // ... existing fields  
  sessionPreference: normalizedStrategy.metadata?.sessionPreference || null,
}
```

**File: `src/hooks/use-youtube-strategy-import.ts`**

3. Update `saveToLibrary` to use extracted `tradingStyle` if available:
```typescript
// Line 205 - enhance trading style mapping
trading_style: strategy.tradingStyle || inferTradingStyle(strategy.timeframeContext.primary),
```

---

### Phase 2: Backtest Auto-Apply Strategy Settings

**File: `src/components/strategy/BacktestRunner.tsx`**

1. Auto-populate session filter from selected strategy's `session_preference`:
```typescript
// After selectedStrategy is resolved (line ~122)
useEffect(() => {
  if (selectedStrategy?.session_preference?.length > 0 && 
      !selectedStrategy.session_preference.includes('all')) {
    setSessionFilter(selectedStrategy.session_preference[0] as BacktestSessionFilter);
  }
}, [selectedStrategy]);
```

2. Display strategy's Multi-Timeframe info in the Strategy Info alert (line ~408):
```typescript
<li>Timeframe: {selectedStrategy.higher_timeframe && `${selectedStrategy.higher_timeframe} → `}
  {selectedStrategy.timeframe || 'Not set'}
  {selectedStrategy.lower_timeframe && ` → ${selectedStrategy.lower_timeframe}`}
</li>
{selectedStrategy.session_preference && !selectedStrategy.session_preference.includes('all') && (
  <li>Sessions: {selectedStrategy.session_preference.join(', ')}</li>
)}
{selectedStrategy.methodology && (
  <li>Methodology: {selectedStrategy.methodology.toUpperCase()}</li>
)}
```

---

### Phase 3: Edge Function Backtest Enhancement

**File: `supabase/functions/backtest-strategy/index.ts`**

1. Pass session filter from strategy if available (line ~90-95):
```typescript
// After fetching strategy, use its session_preference
const strategySession = strategy.session_preference?.[0];
if (strategySession && strategySession !== 'all' && !config.sessionFilter) {
  config.sessionFilter = strategySession;
}
```

2. Log Multi-Timeframe context for transparency (add to assumptions):
```typescript
const assumptions = {
  // ... existing
  multiTimeframe: {
    higherTF: strategy.higher_timeframe || null,
    primaryTF: strategy.timeframe,
    lowerTF: strategy.lower_timeframe || null,
  },
  methodology: strategy.methodology || 'unknown',
  tradingStyle: strategy.trading_style || 'day_trading',
};
```

3. Add methodology info to backtest result response (line ~152-168):
```typescript
return new Response(
  JSON.stringify({
    // ... existing
    strategyMethodology: strategy.methodology,
    strategyTradingStyle: strategy.trading_style,
    strategySessionPreference: strategy.session_preference,
  }),
  // ...
);
```

---

### Phase 4: Update Backtest Types

**File: `src/types/backtest.ts`**

1. Extend `BacktestResult` interface to include strategy metadata:
```typescript
export interface BacktestResult {
  // ... existing fields
  
  // NEW: Strategy metadata for context
  strategyMethodology?: string;
  strategyTradingStyle?: string;
  strategySessionPreference?: string[];
}
```

2. Extend `BacktestAssumptions` to include MTFA:
```typescript
export interface BacktestAssumptions {
  // ... existing
  multiTimeframe?: {
    higherTF: string | null;
    primaryTF: string | null;
    lowerTF: string | null;
  };
  methodology?: string;
  tradingStyle?: string;
}
```

---

### Phase 5: Update BacktestResults UI

**File: `src/components/strategy/BacktestResults.tsx`**

Display strategy context in results:
```typescript
{result.strategyMethodology && (
  <Badge variant="outline">{result.strategyMethodology.toUpperCase()}</Badge>
)}
{result.assumptions?.multiTimeframe && (
  <span className="text-xs text-muted-foreground">
    MTFA: {result.assumptions.multiTimeframe.higherTF || '-'} → 
    {result.assumptions.multiTimeframe.primaryTF} → 
    {result.assumptions.multiTimeframe.lowerTF || '-'}
  </span>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/youtube-strategy-import/index.ts` | Add sessionPreference + tradingStyle to response |
| `src/hooks/use-youtube-strategy-import.ts` | Use extracted tradingStyle if available |
| `src/components/strategy/BacktestRunner.tsx` | Auto-populate session filter, show MTFA info |
| `supabase/functions/backtest-strategy/index.ts` | Apply strategy session, add MTFA to assumptions |
| `src/types/backtest.ts` | Extend BacktestResult + BacktestAssumptions |
| `src/components/strategy/BacktestResults.tsx` | Display strategy context |

---

## Implementation Order

```text
Step 1: Fix YouTube Import edge function (sessionPreference + tradingStyle)
        ↓
Step 2: Update frontend YouTube import hook
        ↓
Step 3: Extend backtest types
        ↓
Step 4: Update backtest edge function (MTFA, session, methodology)
        ↓
Step 5: Update BacktestRunner (auto-apply, display)
        ↓
Step 6: Update BacktestResults (display context)
```

---

## Benefits

1. **Full Field Alignment**: YouTube import saves all professional fields correctly
2. **Context-Aware Backtesting**: Session preference auto-applied from strategy
3. **Transparency**: MTFA and methodology visible in backtest results
4. **Professional UX**: Strategy context displayed throughout backtest workflow
