

# Page Analysis: Risk Calculator (`/calculator`)

## Page Intent

**Primary Job-to-be-Done (JTBD):**
> "Sebagai trader, saya ingin menghitung ukuran posisi yang optimal berdasarkan parameter risiko saya sehingga saya dapat masuk trade dengan ukuran yang tepat tanpa overexposure."

**Secondary JTBD:**
- Mendapatkan rekomendasi stop-loss berbasis volatilitas
- Melihat context warnings sebelum sizing
- Memahami bagaimana risk adjustment bekerja

---

## Current Content Inventory

### Page Header
| Element | Status | Notes |
|---------|--------|-------|
| Title: "Risk Calculator" | ✅ OK | Icon + title sesuai standard |
| Description | ✅ OK | Jelas dan informatif |

### Top Section (Above Tabs) - 2 Column Grid
| Card | Component | Status | Notes |
|------|-----------|--------|-------|
| Market Score Widget | `MarketScoreWidget` (compact) | ✅ OK | Shows bias, score, high-impact event warning |
| Context Warnings | `ContextWarnings` | ✅ OK | Volatility, events, correlation warnings |

### Tab 1: Position Size Calculator
| Section | Status | Issues Found |
|---------|--------|--------------|
| Calculator Inputs | ✅ OK | 6 inputs: Balance, Risk%, Entry, Stop Loss, Direction, Leverage |
| Calculator Results | ✅ OK | Position size, value, risk amount, potential profit |
| Commission Rates | ⚠️ Minor | Uses local `selectedSymbol` instead of global MarketContext |
| Max Leverage Info | ✅ OK | Shows max leverage for notional |
| Quick Reference R | ✅ OK | 1R, 2R, 3R badges |
| Risk Adjustment Breakdown | ✅ OK | Full breakdown card at bottom |

### Tab 2: Volatility-Based Stop Loss
| Section | Status | Notes |
|---------|--------|-------|
| Volatility Stats | ✅ OK | Daily vol, ATR, annualized |
| Recommendation Message | ✅ OK | Context-aware |
| Stop Loss Suggestions | ✅ OK | Tight, 1x ATR, 1.5x ATR, 2x ATR |
| Apply buttons | ✅ OK | Arrows to apply SL to calculator |

---

## Issues Identified

### Issue 1: Symbol Selection Not Connected to MarketContext (MEDIUM)
**Current:** `selectedSymbol` is local state hardcoded to `"BTCUSDT"`
**Expected:** Should use `useMarketContext()` for global symbol selection
**Impact:** User changes symbol elsewhere, calculator doesn't reflect it

```typescript
// Current (PositionCalculator.tsx:29)
const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");

// Expected
const { selectedSymbol, setSelectedSymbol } = useMarketContext();
```

### Issue 2: No Symbol Selector UI (HIGH)
**Current:** User cannot change symbol on this page
**Expected:** Should have `TradingPairCombobox` to select symbol
**Impact:** User stuck with BTCUSDT, cannot calculate for other pairs

### Issue 3: Link to Risk Profile Settings Uses Query Param (LOW)
**Current:** `<Link to="/risk?tab=settings">Using your Risk Profile settings</Link>`
**Status:** This is OK - but should verify Risk page handles `?tab=settings` query param

### Issue 4: Responsive Layout on Tabs (MINOR)
**Current:** `<TabsList className="grid w-full grid-cols-2 max-w-md">`
**Status:** Good constraint on max-width, but tabs may be cramped on mobile

### Issue 5: Commission Rate Decimals (MINOR - Already Fixed)
**Current:** Uses `.toFixed(2)%` and `.toFixed(4)` for fees
**Status:** ✅ Already aligned with decimal standards from previous work

---

## Ordering & Hierarchy Analysis

### Current Flow
```
1. Page Header
2. [MarketScoreWidget] [ContextWarnings] ← 2-col grid
3. Tabs:
   ├─ Position Size Calculator
   │  ├─ Inputs (2-col grid)
   │  ├─ Separator
   │  ├─ Results (2x2 grid)
   │  ├─ Commission Rates
   │  ├─ Max Leverage Info
   │  └─ Quick Reference R
   └─ Volatility-Based Stop Loss
       ├─ Volatility Stats
       ├─ Recommendation
       └─ Stop Loss Suggestions
4. Risk Adjustment Breakdown (outside tabs, calculator tab only)
```

### Recommended Flow (Improved)
```
1. Page Header
2. [Symbol Selector] ← NEW: TradingPairCombobox
3. [MarketScoreWidget] [ContextWarnings] ← 2-col grid
4. Tabs:
   └─ (same structure)
5. Risk Adjustment Breakdown (same)
```

---

## Proposed Changes

### Phase 1: Add Symbol Selector (HIGH PRIORITY)

**Changes:**
1. Add `TradingPairCombobox` component below page header
2. Connect to `useMarketContext()` instead of local state
3. All child components will automatically use the selected symbol

```typescript
// In PositionCalculator.tsx
import { useMarketContext } from "@/contexts/MarketContext";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";

export default function PositionCalculator() {
  const { selectedSymbol, setSelectedSymbol } = useMarketContext();
  // ... rest of component uses this instead of local state
}
```

### Phase 2: Improve Mobile Layout (MEDIUM PRIORITY)

**Changes:**
1. Stack MarketScore and ContextWarnings on mobile (single column)
2. Improve tab responsiveness with shorter labels on mobile
3. Add breakpoint handling for calculator inputs grid

### Phase 3: UI Polish (LOW PRIORITY)

**Changes:**
1. Add tooltips on commission rate section explaining maker vs taker
2. Add loading skeleton for commission rates when loading
3. Improve empty state for leverage brackets

---

## Technical Implementation

### File Changes

| File | Changes |
|------|---------|
| `src/pages/PositionCalculator.tsx` | Replace local `selectedSymbol` with `useMarketContext()`, add symbol selector UI |
| `src/components/risk/PositionSizeCalculator.tsx` | Update to accept symbol as prop instead of local state (for standalone use) |

### Code Changes Summary

**PositionCalculator.tsx:**
```typescript
// Import additions
import { useMarketContext } from "@/contexts/MarketContext";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";
import { Label } from "@/components/ui/label";

// Replace local state
- const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
+ const { selectedSymbol, setSelectedSymbol } = useMarketContext();

// Add symbol selector below page header
<div className="space-y-2">
  <Label>Trading Pair</Label>
  <TradingPairCombobox 
    value={selectedSymbol}
    onValueChange={setSelectedSymbol}
    className="max-w-xs"
  />
</div>
```

---

## Success Criteria

| Criteria | Expected Behavior |
|----------|-------------------|
| Symbol Selection | User can change symbol, all widgets update |
| Context Sync | Symbol persists across page navigation |
| Volatility Data | Updates based on selected symbol |
| Commission Rates | Fetches rates for selected symbol |
| Context Warnings | Shows warnings for selected symbol |
| Risk Adjustment | Calculates based on selected symbol's data |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing calculator | Local state can be fallback if context fails |
| Loading states | Already handled in child components |
| Symbol not in trading_pairs | Combobox only shows available pairs |

---

## Files to Modify

1. `src/pages/PositionCalculator.tsx` - Main page with symbol selector
2. `src/components/risk/PositionSizeCalculator.tsx` - Update to accept symbol prop (optional refactor)

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Symbol Selector | Low | High |
| Phase 2: Mobile Layout | Low | Medium |
| Phase 3: UI Polish | Very Low | Low |

