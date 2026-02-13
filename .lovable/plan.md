
# Enhance SyncRangeSelector — Tiered Warnings & Visual Polish

## Overview
Improve the Sync Range Selector with tiered warnings based on selected range size, rate limit awareness, and better visual hierarchy. Currently only "All Time" shows a warning — larger ranges like 1 year and 2 years also deserve caution notices.

## Changes

### File: `src/components/trading/SyncRangeSelector.tsx`

**1. Add tiered warning system**
- Small ranges (30, 90 days): No warning
- Medium ranges (180 days): Info-level hint — "May hit rate limits if you have many active symbols"
- Large ranges (365, 730 days): Warning-level alert — "Large range. Binance API rate limits may cause pauses. Checkpoint resume will handle interruptions automatically."
- All Time (`max`): Destructive alert (existing) — keep current warning text

**2. Add `recommended` flag to options**
- Mark 90 days with a subtle "Recommended" badge next to the label
- Remove "(Recommended)" from the description string — use a proper `Badge` component instead

**3. Add rate limit context to large-range warnings**
- Mention that Binance imposes 1200 weight/min rate limits
- Mention checkpoint resume handles interruptions automatically
- Mention that the process continues in background

**4. Visual improvement — card-style radio items**
- Wrap each option in a bordered container with `rounded-md border p-2` styling
- Highlight selected option with `border-primary bg-primary/5`
- Makes the selector more tactile and visually clear

### Updated Option Config

```typescript
const SYNC_OPTIONS = [
  { value: 30,    label: "30 days",   est: "~1-2 min",   tier: 'safe' },
  { value: 90,    label: "90 days",   est: "~3-5 min",   tier: 'safe',    recommended: true },
  { value: 180,   label: "6 months",  est: "~5-10 min",  tier: 'caution' },
  { value: 365,   label: "1 year",    est: "~10-20 min", tier: 'warning' },
  { value: 730,   label: "2 years",   est: "~20-40 min", tier: 'warning' },
  { value: 'max', label: "All Time",  est: "1+ hours",   tier: 'danger' },
];
```

### Warning Messages by Tier

| Tier | Variant | Message |
|------|---------|---------|
| `safe` | None | No warning |
| `caution` | Default (muted) | "May take longer if you have many active trading pairs." |
| `warning` | Warning | "Large sync range. Binance rate limits (1200 weight/min) may cause automatic pauses. Checkpoint resume handles interruptions." |
| `danger` | Destructive | Current "All Time" warning (keep as-is, already good) |

## Files Modified

| File | Change |
|------|--------|
| `src/components/trading/SyncRangeSelector.tsx` | Tiered warnings, card-style radio items, recommended badge |

## Technical Notes
- No store or logic changes — purely UI enhancement
- Warning tier is derived from the selected option's `tier` field, not from the `SyncRangeDays` value directly
- Card-style items use conditional `border-primary` based on `selectedRange === option.value`
