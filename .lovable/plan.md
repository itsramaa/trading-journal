
# Implementation Plan: Coming Soon Exchange UI + Component Migration to Generic Hooks

## Summary

This plan addresses two tasks:
1. **Add Coming Soon UI cards for Bybit and OKX** in Settings Exchange tab
2. **Migrate existing components** to use the new generic `usePositions` hook

---

## Part 1: Coming Soon Exchange Cards

### Current State

The Settings Exchange tab only shows `BinanceApiSettings` component:

```tsx
<TabsContent value="exchange" className="space-y-4">
  <BinanceApiSettings />
</TabsContent>
```

### Target State (per MULTI_EXCHANGE_ARCHITECTURE.md mockup)

```text
┌────────────────────────────────────────────────────┐
│ Settings > Exchange                                 │
├────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐       │
│  │ 🟡 Binance Futures           Connected  │       │
│  │ API Key: abc1****xyz9                   │       │
│  │ [Test Connection] [Remove]              │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │ 🟠 Bybit Futures            Coming Soon │       │
│  │ Connect your Bybit account when ready   │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │ ⚪ OKX Futures              Coming Soon │       │
│  │ Connect your OKX account when ready     │       │
│  └─────────────────────────────────────────┘       │
└────────────────────────────────────────────────────┘
```

### Implementation

**New File: `src/components/settings/ExchangeCard.tsx`**

A reusable card component for exchanges:

```typescript
interface ExchangeCardProps {
  exchange: ExchangeType;
  status: 'connected' | 'not_configured' | 'coming_soon';
  children?: React.ReactNode;
}

function ExchangeCard({ exchange, status, children }: ExchangeCardProps) {
  const meta = EXCHANGE_REGISTRY[exchange];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>{meta.icon}</span>
            {meta.name}
          </CardTitle>
          <Badge variant={status === 'coming_soon' ? 'secondary' : ...}>
            {status === 'coming_soon' ? 'Coming Soon' : ...}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {status === 'coming_soon' ? (
          <p className="text-muted-foreground">
            Connect your {meta.name} account when this exchange becomes available.
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
```

**Modify: `src/pages/Settings.tsx`**

Update the exchange tab content:

```tsx
<TabsContent value="exchange" className="space-y-4">
  {/* Active Exchange: Binance */}
  <BinanceApiSettings />
  
  {/* Coming Soon: Bybit */}
  <ComingSoonExchangeCard exchange="bybit" />
  
  {/* Coming Soon: OKX */}
  <ComingSoonExchangeCard exchange="okx" />
</TabsContent>
```

**New File: `src/components/settings/ComingSoonExchangeCard.tsx`**

Simpler dedicated component for coming soon exchanges:

```typescript
export function ComingSoonExchangeCard({ exchange }: { exchange: ExchangeType }) {
  const meta = EXCHANGE_REGISTRY[exchange];
  
  return (
    <Card className="border-dashed opacity-75">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <span>{meta.icon}</span>
            {meta.name}
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
        <CardDescription>
          Connect your {meta.name} account when this exchange becomes available.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
```

---

## Part 2: Migrate Components to Generic usePositions Hook

### Component Analysis

Found 10 components using `useBinancePositions`:

| Component | Location | Current Usage | Migration Strategy |
|-----------|----------|---------------|-------------------|
| TradingJournal | pages/trading-journey | Uses with AllPositionsTable | Keep raw Binance for AllPositionsTable (needs BinancePosition) |
| Dashboard | pages | Display position count | Migrate to `usePositions` |
| Accounts | pages | Display balance & positions | Keep raw for now (complex integration) |
| ADLRiskWidget | dashboard | ADL quantile needs BinancePosition | Keep raw (needs exchange-specific data) |
| MarginHistoryTab | risk | Symbol filter from positions | Migrate to `usePositions` |
| RiskSummaryCard | risk | Correlation check | Migrate to `usePositions` |
| AIInsightsWidget | dashboard | Context for AI | Keep raw (uses multiple Binance data) |

### Migration Priority

**High Priority (Simple, standalone usage):**
1. `Dashboard.tsx` - Just counts positions
2. `MarginHistoryTab.tsx` - Extracts symbols only
3. `RiskSummaryCard.tsx` - Uses for correlation

**Low Priority (Complex integrations, keep raw for now):**
1. `TradingJournal.tsx` - Uses with AllPositionsTable that needs BinancePosition
2. `Accounts.tsx` - Complex integration with balance
3. `ADLRiskWidget.tsx` - Needs ADL quantile with raw position data
4. `AIInsightsWidget.tsx` - Uses multiple Binance sources

### Implementation Details

**Dashboard.tsx Migration:**

Before:
```typescript
import { useBinancePositions } from "@/features/binance";
const { data: positions } = useBinancePositions();
const positionCount = positions?.filter(p => p.positionAmt !== 0).length || 0;
```

After:
```typescript
import { usePositions } from "@/hooks/use-positions";
const { positions } = usePositions();
// positions are already filtered to non-zero by mapper
const positionCount = positions.length;
```

**MarginHistoryTab.tsx Migration:**

Before:
```typescript
import { useBinancePositions } from "@/features/binance";
const { data: positions } = useBinancePositions();
const activeSymbols = positions?.filter(p => p.positionAmt !== 0).map(p => p.symbol) || [];
```

After:
```typescript
import { usePositions } from "@/hooks/use-positions";
const { positions, isLoading } = usePositions();
const activeSymbols = positions.map(p => p.symbol);
```

**RiskSummaryCard.tsx Migration:**

Before:
```typescript
import { useBinancePositions } from "@/features/binance";
const { data: positions = [] } = useBinancePositions();
// Uses extractSymbols which works with any array with .symbol
```

After:
```typescript
import { usePositions } from "@/hooks/use-positions";
const { positions } = usePositions();
// extractSymbols still works - same interface
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/settings/ComingSoonExchangeCard.tsx` | Coming Soon exchange card component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add Coming Soon cards for Bybit/OKX |
| `src/pages/Dashboard.tsx` | Migrate from `useBinancePositions` to `usePositions` |
| `src/components/risk/MarginHistoryTab.tsx` | Migrate to `usePositions` |
| `src/components/risk/RiskSummaryCard.tsx` | Migrate to `usePositions` |

---

## Implementation Order

```text
Phase 1: Settings UI (15 min)
├── Create ComingSoonExchangeCard component
└── Update Settings.tsx to include Coming Soon cards

Phase 2: Component Migration (30 min)
├── Migrate Dashboard.tsx to usePositions
├── Migrate MarginHistoryTab.tsx to usePositions  
└── Migrate RiskSummaryCard.tsx to usePositions
```

---

## Technical Notes

### Why Keep Some Components Using useBinancePositions

1. **AllPositionsTable (TradingJournal)**: Needs raw `BinancePosition` type for the `originalData` field in UnifiedPosition
2. **ADLRiskWidget**: Requires ADL quantile data which is exchange-specific
3. **Accounts.tsx**: Deep integration with balance, positions, and refresh logic

These components are **acceptable technical debt** per the architecture principle:
> "Binance-prefixed hooks are acceptable; add new hooks alongside"

### Benefits of Migration

1. **Simpler consumption**: No need to filter `.positionAmt !== 0`
2. **Type-safe**: Uses `ExchangePosition` with `side: 'LONG' | 'SHORT'`
3. **Future-ready**: When Bybit is added, just change exchange param

---

## Validation Checklist

- [ ] Coming Soon cards display correctly in Settings > Exchange
- [ ] Binance card still fully functional
- [ ] Dashboard position count works correctly
- [ ] MarginHistoryTab symbol filter works
- [ ] RiskSummaryCard correlation check works
- [ ] No console errors or type mismatches
