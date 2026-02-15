

# Trade Detail Cockpit Refinements

Five targeted improvements to make the live cockpit more leverage-aware and the closed forensic view more outcome-focused.

---

## Changes

### 1. Leverage-Aware Liquidation Distance

**File:** `src/pages/trading-journey/TradeDetail.tsx`

Replace `distanceToLiquidation` with a dual-metric function:

```typescript
function liqDistanceMetrics(
  markPrice: number | null | undefined,
  liqPrice: number | null | undefined,
  leverage: number | null | undefined
) {
  if (!markPrice || !liqPrice || liqPrice === 0) return undefined;
  const pricePct = Math.abs(markPrice - liqPrice) / markPrice * 100;
  const equityPct = leverage ? pricePct * leverage : undefined;
  return { pricePct, equityPct };
}
```

In the Risk Overview card and the Key Metrics strip, show both:
- **Liq. Distance (Price)**: e.g. `3.21%`
- **Liq. Distance (Equity)**: e.g. `64.20%` (only when leverage is known)

The equity % tells traders how much of their margin is at risk -- the number they actually care about with leveraged positions.

### 2. Unrealized R in Live Cockpit

**File:** `src/pages/trading-journey/TradeDetail.tsx`

Add a helper:
```typescript
function unrealizedR(
  entry: number | null, mark: number | null, sl: number | null, direction: string
): string | undefined {
  if (!entry || !mark || !sl) return undefined;
  const risk = Math.abs(entry - sl);
  if (risk === 0) return undefined;
  const reward = direction === 'LONG' ? mark - entry : entry - mark;
  return (reward / risk).toFixed(2);
}
```

Show in the Key Metrics strip (after Liq. Distance, before Unrealized P&L) -- only when SL exists. Hidden otherwise (same pattern as R-Multiple for closed).

Also add to the Risk Overview card as a row: `Unrealized R: +1.24R`.

### 3. Closed Trade Strip: Outcome-Focused Curation

**File:** `src/pages/trading-journey/TradeDetail.tsx` (closed branch of metrics strip)

Reorder the closed trade strip to be outcome-first:

```
Net P&L | Result | R-Multiple* | Hold Time* | MAE* | Entry | Exit
```

- Net P&L and Result move to the front (what happened?)
- Entry/Exit move to the end (supporting detail)
- R-Multiple, Hold Time, MAE remain conditional (only if data exists)

Result badge uses `text-profit` for win, `text-loss` for loss, `text-muted-foreground` for breakeven.

### 4. Hide Emotion & Rule Compliance from Live Collapsible

**File:** `src/pages/trading-journey/TradeDetail.tsx` (lines 618-675)

In the live "Analysis & Journal" collapsible, exclude `emotional_state` and `rule_compliance` from the Journal card. These are reflective fields more appropriate for post-close analysis.

Keep: notes, lesson_learned, tags (these are operational -- traders do jot notes during positions).

Update `hasJournalData` check for live context so the collapsible only appears if there's operational data (notes/tags/lesson), not just emotion/compliance.

### 5. Closed Strip Result Badge

Add a `ResultBadge` inline in the strip:
```typescript
{trade.result && (
  <KeyMetric
    label="Result"
    value={trade.result.toUpperCase()}
    className={trade.result === 'win' ? 'text-profit' : trade.result === 'loss' ? 'text-loss' : 'text-muted-foreground'}
  />
)}
```

---

## Technical Details

### Equity Distance Formula

For cross-margin futures with leverage:
```
Price Distance = |markPrice - liqPrice| / markPrice * 100
Equity Distance = Price Distance * leverage
```

Example: Mark = $100, Liq = $97, Leverage = 20x
- Price: 3%
- Equity: 60% (3% price move wipes 60% of margin)

This is an approximation that holds well for isolated margin. For cross-margin, true equity impact depends on total wallet balance, but this gives traders the right mental model.

### Unrealized R Formula

```
risk = |entry - stopLoss|
reward = direction === 'LONG' ? (markPrice - entry) : (entry - markPrice)
unrealizedR = reward / risk
```

Negative R means price has moved against the position past entry. Only shown when SL is set via enrichment.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/trading-journey/TradeDetail.tsx` | Leverage-aware liq distance; Unrealized R metric; reordered closed strip; hide emotion/compliance from live; Result badge in strip |

---

## What Changes

| Before | After |
|--------|-------|
| Liq Distance = price % only | Price % + Equity % (leverage-aware) |
| No risk metric when SL is set on live | Unrealized R shown in strip + Risk Overview |
| Closed strip: Entry, Exit, Size, Leverage, ... | Closed strip: Net P&L, Result, R-Multiple, Hold Time, ... |
| Emotion & Rule Compliance in live collapsible | Hidden for live; only shown on closed trades |
| No Result badge in strip | Result (WIN/LOSS) with semantic colors in strip |

