

# Unified Layout Skeleton: Same Structure, Different Content

Replace the current `isLive ? (cockpit JSX) : (forensic JSX)` branching with a single 5-layer skeleton that both modes share. Each layer adapts its content based on trade state, but the page structure stays consistent.

---

## Architecture

The page body (below header + strip) becomes a single flow of layers:

```text
TradeDetail
  +-- Header (shared)
  +-- Key Metrics Strip (shared container, content varies)
  +-- Enrichment CTA (shared, same tone)
  +-- Layer 1: Primary Outcome
  +-- Layer 2: Risk & Execution
  +-- Layer 3: Timing (closed only, hidden for live)
  +-- Layer 4: Reflection (collapsible for live, visible for closed)
  +-- Layer 5: Full-Width (Screenshots, AI Analysis, Metadata)
```

No more `isLive ? <TwoColGrid> : <ThreeColGrid>`. One grid, same card slots.

---

## Changes

### 1. Unified Content Grid (replaces lines 506-675)

Replace the entire `isLive ? (...) : (...)` block with a single 2-column grid containing 4 cards that adapt internally:

```text
+-------------------------------+-------------------------------+
| Primary Outcome               | Risk & Execution              |
| (Card 1)                      | (Card 2)                      |
+-------------------------------+-------------------------------+
| Timing (Card 3, closed only)  | Strategy & Journal (Card 4)   |
+-------------------------------+-------------------------------+
```

**Card 1 -- Primary Outcome** (icon: Activity)

| Field | Live | Closed |
|-------|------|--------|
| Unrealized P&L | shown (large) | hidden |
| Net P&L | hidden | shown (large) |
| Gross P&L | hidden | shown (secondary) |
| Result badge | hidden | shown |
| Fees breakdown | shown | shown |
| MAE | hidden | shown if exists |

**Card 2 -- Risk & Execution** (icon: Shield)

| Field | Live | Closed |
|-------|------|--------|
| Mark Price | shown | hidden |
| Entry Price | shown | shown |
| Exit Price | hidden | shown |
| Liq. Price | shown | hidden |
| Liq. Distance (Price/Equity) | shown | hidden |
| Unrealized R | shown if SL | hidden |
| R-Multiple | hidden | shown if exists |
| Stop Loss / Take Profit | shown if enriched | shown |
| Margin Type | shown | shown if exists |
| Leverage | shown | shown |
| Size | shown | shown |
| Direction | shown | shown |

**Card 3 -- Timing** (icon: Clock)
- Only renders when `hasTimingData` is true (same as current).
- For live: hidden (no exit time).
- For closed: Trade Date, Session, Entry/Exit Time, Hold Time.

**Card 4 -- Strategy & Journal** (icon: Target/MessageSquare)
- For live: rendered inside a `Collapsible` (collapsed by default). Excludes emotion and rule compliance.
- For closed: rendered directly (visible). Full journal including emotion, rule compliance.
- When no data exists: hidden entirely (no empty card).

### 2. Consistent Metric Strip Labels

Normalize naming so the strip feels like the same instrument panel:

| Live Label | Closed Label | Rationale |
|------------|-------------|-----------|
| Unrealized P&L | Net P&L | Primary outcome metric |
| Mark Price | Exit | Current vs final price |
| Liq. Distance | R-Multiple | Primary risk metric |
| Unrealized R | Hold Time | Secondary context metric |

The strip always has 5-7 items. Both modes start with the primary outcome and end with contextual detail.

### 3. Enrichment CTA -- Consistent Tone

Update the CTA copy to be state-neutral:
- "Add journal notes, strategies, and analysis to strengthen your trading record."
- Same wording whether live or closed. No "missing requirement" framing.

### 4. Remove Duplicate Code

Currently Strategy and Journal cards are duplicated: once in the closed 3-col grid (lines 610-673), once in the live collapsible (lines 688-731). Refactor into shared render functions:

```typescript
function renderStrategyCard(trade, hasStrategyData) { ... }
function renderJournalCard(trade, isLive, ruleCompliance) { ... }
```

Both modes call the same functions. The `isLive` flag controls whether emotion/compliance rows appear.

---

## Technical Details

### Shared Grid Structure

```typescript
<div className="grid gap-4 md:grid-cols-2">
  {/* Card 1: Primary Outcome -- always present */}
  <SectionCard title={isLive ? "Live P&L" : "Performance"} icon={Activity}>
    {isLive ? (
      <LiveOutcomeContent ... />
    ) : (
      <ClosedOutcomeContent ... />
    )}
  </SectionCard>

  {/* Card 2: Risk & Execution -- always present */}
  <SectionCard title="Risk & Execution" icon={Shield}>
    {/* Shared fields + conditional rows */}
  </SectionCard>

  {/* Card 3: Timing -- closed only */}
  {!isLive && hasTimingData && (
    <SectionCard title="Timing" icon={Clock}>...</SectionCard>
  )}

  {/* Card 4: Strategy & Journal */}
  {isLive ? (
    /* Collapsible wrapper */
    (hasStrategyData || hasLiveJournalData) && <CollapsibleAnalysis ... />
  ) : (
    /* Direct render */
    (hasStrategyData || hasJournalData) && <DirectAnalysis ... />
  )}
</div>
```

The key difference from current: one `<div className="grid">` instead of two entirely different JSX trees. The branching happens inside each card, not at the grid level.

### Extracted Render Helpers

```typescript
function renderStrategyContent(trade: any) {
  // Shared strategy card body (strategies list, entry signal, market condition, etc.)
}

function renderJournalContent(trade: any, isLive: boolean, ruleCompliance: Record<string, boolean> | null) {
  // Notes, lesson_learned, tags always shown
  // emotion, rule_compliance only when !isLive
}
```

This eliminates ~60 lines of duplicated JSX.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/trading-journey/TradeDetail.tsx` | Unified grid skeleton; extracted render helpers; consistent strip labels; state-neutral CTA copy |

---

## What Changes

| Before | After |
|--------|-------|
| Two completely different grid layouts (2-col vs 3-col) | Single 2-col grid, content varies per card |
| Strategy/Journal JSX duplicated twice | Shared render functions, DRY |
| Strip labels feel like different pages | Consistent instrument panel with contextual labels |
| Enrichment CTA tone differs per mode | Same neutral tone for both |
| Layout shift when switching between live/closed trades | Same skeleton, smooth cognitive transition |

