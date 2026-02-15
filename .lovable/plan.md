
# Progressive Disclosure Overhaul: Trade Detail + Journal

Curate the UI to show 40% upfront, with the rest available on demand. Separate "cockpit" (live) from "forensic lab" (closed) mental models.

---

## Part A: Trade Detail Page -- State-Aware Layout

**File:** `src/pages/trading-journey/TradeDetail.tsx`

### A1. Live Position = Cockpit Mode

When `trade.status !== 'closed'` (active/open position), restructure the content grid:

**Key Metrics Strip** -- remove R-Multiple and Gross P&L for live trades. Replace with:
- Entry, Mark Price, Size, Leverage, Liq. Price, Unrealized P&L

**Main Grid (2-col only, no sidebar):**
1. **Risk Overview card** (NEW) -- combines Live Position Data + risk context:
   - Mark Price, Entry Price, Liq. Price
   - Distance to Liquidation (%) -- calculated as `|markPrice - liqPrice| / markPrice * 100`
   - Margin Type, Leverage
   - SL / TP (if enriched)
2. **Price & Position card** -- simplified: Entry, Size, Direction, Fees so far

**Below grid:**
- Enrichment CTA (if not enriched) -- keep as-is
- Strategy & Journal sections -- render inside a `Collapsible` labeled "Analysis & Journal" (collapsed by default for live)

**Hide entirely for live:**
- Timing section (no exit time yet)
- AI Post-Trade Analysis (not applicable to open trades)
- Result badge

### A2. Closed Trade = Forensic Lab Mode

When `trade.status === 'closed'`, keep current layout with these refinements:

**Key Metrics Strip:**
- Show R-Multiple ONLY when `r_multiple` has a value (not null/undefined). Remove the "-" placeholder.
- Rename "Gross P&L" to just show Net P&L in the strip (it's already in the header). Replace Gross slot with Hold Time if available, or MAE if available, or hide the slot.

**Metadata section** -- already collapsible (good). No change needed.

### A3. Conditional `hasContent` for R-Multiple

In the Key Metrics strip (lines 386-401), wrap R-Multiple in a conditional:
```typescript
{hasContent((trade as any).r_multiple) && (
  <KeyMetric label="R-Multiple" value={safeFixed((trade as any).r_multiple, 2)} />
)}
```

Use dynamic grid columns (`flex flex-wrap gap-6 justify-center` instead of fixed `grid-cols-6`) so hiding a metric doesn't leave a gap.

---

## Part B: Trading Journal Page -- Merge Summary Stats

**Files:** `src/pages/trading-journey/TradingJournal.tsx`, `src/components/journal/TradeSummaryStats.tsx`

### B1. Remove TradeSummaryStats (Top-Level Cards)

The 4-card summary (Open Positions, Unrealized P&L, Closed Trades, Realized P&L) at lines 361-369 overlaps with the Closed tab's `TradeHistoryStats` (Trades count, Gross P&L, Win Rate).

**Change:** Remove the `<TradeSummaryStats />` component call from TradingJournal. The Active tab already shows positions directly. The Closed tab already has its own stats bar. This eliminates the "two stats blocks" problem.

### B2. Move Position Count Into Tab Badges

Position counts are already shown in tab badges (Active badge shows count). Unrealized P&L for active positions will be visible in the Active tab's position table itself. No information is lost.

---

## Part C: Live Trade Detail -- Cockpit Metrics

### C1. New helper: `distanceToLiquidation`

Add to TradeDetail.tsx helpers:
```typescript
function distanceToLiquidation(markPrice: number | null, liqPrice: number | null): string | undefined {
  if (!markPrice || !liqPrice || liqPrice === 0) return undefined;
  const pct = Math.abs(markPrice - liqPrice) / markPrice * 100;
  return `${pct.toFixed(2)}%`;
}
```

### C2. Refactored Key Metrics Strip

For live positions, render:
```
Entry | Mark Price | Size | Leverage | Liq. Distance | Unrealized P&L
```

For closed trades, render (dynamic, only populated fields):
```
Entry | Exit | Size | Leverage | [R-Multiple if exists] | [Hold Time if exists] | Net P&L
```

Use `flex flex-wrap gap-6 justify-center` for adaptive layout.

---

## Part D: Journal Sections -- Progressive Disclosure for Live

**File:** `src/pages/trading-journey/TradeDetail.tsx`

For live/active trades, wrap Strategy and Journal sections in a single Collapsible:

```typescript
{(hasStrategyData || hasJournalData) && trade.status !== 'closed' && (
  <Collapsible>
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="w-full justify-between">
        <span>Analysis & Journal</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="grid gap-4 md:grid-cols-2 mt-2">
        {/* Strategy card */}
        {/* Journal card */}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

For closed trades, keep them visible in the sidebar as-is (forensic lab mode).

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/trading-journey/TradeDetail.tsx` | State-aware layout (cockpit vs forensic); dynamic key metrics strip; conditional R-Multiple; collapsible analysis for live; distance-to-liq helper |
| `src/pages/trading-journey/TradingJournal.tsx` | Remove `<TradeSummaryStats />` call to eliminate redundant top-level stats |

---

## What Changes

| Before | After |
|--------|-------|
| Live and closed trades show identical layout | Live = cockpit (risk-focused), Closed = forensic lab (analysis-focused) |
| R-Multiple shows "-" when no SL | R-Multiple hidden when no data |
| Two stats blocks on Journal page | One stats bar per tab context |
| Strategy/Emotion visible by default on live | Collapsed under "Analysis & Journal" for live |
| Fixed 6-column metrics strip | Flexible wrap -- only populated metrics shown |
| No liquidation distance metric | Distance to liq % calculated and shown for live |
| Timing section shown for live (empty) | Timing hidden for live trades |
| AI Post-Trade shown for live (empty) | AI Post-Trade hidden for live trades |
