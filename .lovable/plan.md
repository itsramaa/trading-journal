
# Plan: Unified PnL Formatting & Session Analytics

## Overview

Implementasi **formatPnl()** utility dan **Session Analytics** system yang konsisten untuk seluruh aplikasi. Menyelesaikan inkonsistensi format angka finansial dan session tagging.

---

## Part 1: formatPnl() Utility Function

### 1.1 Create formatPnl() in lib/formatters.ts

**Lokasi:** `src/lib/formatters.ts`

Tambahkan fungsi baru:

```typescript
/**
 * Format PnL value with proper sign prefix
 * STANDARD: +$x for profit, -$x for loss
 * Used for all profit/loss displays across the application
 */
export function formatPnl(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  const sign = value >= 0 ? '+' : '';
  const formatted = formatCurrency(Math.abs(value), currency);
  // Insert sign before currency symbol
  // e.g., formatCurrency returns "$100" -> "+$100" or "-$100"
  return value >= 0 
    ? formatted.replace(/^([^\d-]+)/, `${sign}$1`)
    : formatted.replace(/^([^\d-]+)/, '-$1');
}

/**
 * Format PnL for compact display (K/M/B)
 */
export function formatCompactPnl(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  const sign = value >= 0 ? '+' : '';
  const formatted = formatCompactCurrency(Math.abs(value), currency);
  return value >= 0 
    ? formatted.replace(/^([^\d-]+)/, `${sign}$1`)
    : formatted.replace(/^([^\d-]+)/, '-$1');
}
```

### 1.2 Files to Update (PnL Formatting)

| File | Current Pattern | Fix |
|------|-----------------|-----|
| `TradeSummaryStats.tsx` | `formatCurrency(value)` tanpa sign | Use `formatPnl()` |
| `TradeGalleryCard.tsx` | `{pnl >= 0 ? '+' : ''}formatCurrency()` | Use `formatPnl()` |
| `TradeHistoryCard.tsx` | Manual sign | Use `formatPnl()` |
| `TradeHistoryInfiniteScroll.tsx` | Manual sign | Use `formatPnl()` |
| `BinanceTradeHistory.tsx` | Manual sign | Use `formatPnl()` |
| `BinanceIncomeHistory.tsx` | Manual sign | Use `formatPnl()` |
| `TodayPerformance.tsx` | Manual sign | Use `formatPnl()` |
| `PortfolioOverviewCard.tsx` | Manual sign | Use `formatPnl()` |
| `DashboardAnalyticsSummary.tsx` | `formatCurrency()` tanpa sign | Use `formatPnl()` |
| `SevenDayStatsCard.tsx` | Manual sign | Use `formatPnl()` |
| `Performance.tsx` | Manual sign via chartFormatCurrency | Create `chartFormatPnl()` |
| `DailyPnL.tsx` | `formatCurrency()` tanpa sign | Use `formatPnl()` |
| `TradingHeatmap.tsx` | `formatCurrency()` tanpa sign | Use `formatPnl()` |
| `CryptoRanking.tsx` | Manual sign | Use `formatPnl()` |
| `VolatilityLevelChart.tsx` | `formatCurrency()` tanpa sign | Use `formatPnl()` |
| `TradingHeatmapChart.tsx` | `formatCurrency()` tanpa sign | Use `formatPnl()` |
| `EmotionalPatternAnalysis.tsx` | Mixed | Use `formatPnl()` |
| `DailyLossTracker.tsx` | Manual sign | Use `formatPnl()` |
| `SystemStatusIndicator.tsx` | Manual sign | Use `formatPnl()` |
| `AIInsights.tsx` | `formatCurrency()` tanpa sign | Use `formatPnl()` |
| `AccountDetail.tsx` | Manual sign | Use `formatPnl()` |

**Total: ~20 files require updates**

---

## Part 2: Session Utilities & Types

### 2.1 Create Session Utility

**File baru:** `src/lib/session-utils.ts`

```typescript
/**
 * Trading Session Utilities
 * Converts between UTC and user timezone for session calculation
 * 
 * Sessions are defined in UTC and converted to user's local time:
 * - Asia: 20:00-05:00 UTC (Sydney/Tokyo overlap)
 * - London: 08:00-17:00 UTC
 * - New York: 13:00-22:00 UTC
 */

export type TradingSession = 'asia' | 'london' | 'newyork' | 'off-hours';

// Session definitions in UTC hours
export const SESSION_UTC = {
  asia: { start: 20, end: 5 },      // Crosses midnight
  london: { start: 8, end: 17 },
  newyork: { start: 13, end: 22 },
} as const;

export const SESSION_LABELS: Record<TradingSession, string> = {
  asia: 'Asia',
  london: 'London',
  newyork: 'New York',
  'off-hours': 'Off Hours',
};

/**
 * Get user's timezone offset in hours from UTC
 */
export function getUserTimezoneOffset(): number {
  return new Date().getTimezoneOffset() / -60;
}

/**
 * Determine which trading session a given datetime falls into
 * Uses the UTC hour of the provided date
 */
export function getSessionForTime(date: Date | string): TradingSession {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utcHour = d.getUTCHours();
  
  // Check Asia (spans midnight: 20:00-05:00 UTC)
  if (utcHour >= SESSION_UTC.asia.start || utcHour < SESSION_UTC.asia.end) {
    return 'asia';
  }
  
  // Check London (08:00-17:00 UTC)
  if (utcHour >= SESSION_UTC.london.start && utcHour < SESSION_UTC.london.end) {
    return 'london';
  }
  
  // Check New York (13:00-22:00 UTC)
  if (utcHour >= SESSION_UTC.newyork.start && utcHour < SESSION_UTC.newyork.end) {
    return 'newyork';
  }
  
  return 'off-hours';
}

/**
 * Check if two sessions overlap at current time
 */
export function getActiveOverlaps(date: Date = new Date()): string | null {
  const utcHour = date.getUTCHours();
  
  // London/NY overlap: 13:00-17:00 UTC
  if (utcHour >= 13 && utcHour < 17) {
    return 'London + NY';
  }
  
  // Asia/London overlap: 08:00-09:00 UTC (brief)
  if (utcHour >= 8 && utcHour < 9) {
    return 'Asia + London';
  }
  
  return null;
}

/**
 * Format session time range in user's local time
 */
export function formatSessionTimeLocal(session: TradingSession): string {
  if (session === 'off-hours') return 'Variable';
  
  const { start, end } = SESSION_UTC[session];
  const offset = getUserTimezoneOffset();
  
  const localStart = (start + offset + 24) % 24;
  const localEnd = (end + offset + 24) % 24;
  
  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;
  return `${formatHour(localStart)}-${formatHour(localEnd)}`;
}
```

### 2.2 Update Types

**File:** `src/types/market-context.ts`

Tambahkan session type:

```typescript
import type { TradingSession } from '@/lib/session-utils';

// Add to UnifiedMarketContext
export interface UnifiedMarketContext {
  // ... existing fields
  
  // Session context (new)
  session?: {
    current: TradingSession;
    overlap: string | null;
  };
}
```

---

## Part 3: Session Tagging pada Trade

### 3.1 Auto-tag Session saat Capture Market Context

**File:** `src/hooks/use-capture-market-context.ts`

Modifikasi untuk include session:

```typescript
import { getSessionForTime, getActiveOverlaps } from '@/lib/session-utils';

// Inside capture function
const session = getSessionForTime(new Date());
const overlap = getActiveOverlaps();

context.session = {
  current: session,
  overlap,
};
```

### 3.2 Utility untuk Get Session dari Trade

**File:** `src/lib/session-utils.ts` (tambahan)

```typescript
/**
 * Get session from trade entry
 * Uses market_context if available, otherwise calculates from trade_date
 */
export function getTradeSession(trade: {
  trade_date: string;
  entry_datetime?: string | null;
  market_context?: { session?: { current: TradingSession } } | null;
}): TradingSession {
  // Prefer stored session from market_context
  if (trade.market_context?.session?.current) {
    return trade.market_context.session.current;
  }
  
  // Calculate from datetime
  const datetime = trade.entry_datetime || trade.trade_date;
  return getSessionForTime(datetime);
}
```

---

## Part 4: Session Analytics Integration

### 4.1 Add Session Segmentation to useContextualAnalytics

**File:** `src/hooks/use-contextual-analytics.ts`

Tambahkan:

```typescript
import { getTradeSession, TradingSession, SESSION_LABELS } from '@/lib/session-utils';

// Add to ContextualAnalyticsResult
export interface ContextualAnalyticsResult {
  // ... existing fields
  
  // Session Performance (new)
  bySession: Record<TradingSession, PerformanceMetrics>;
}

// Inside useMemo calculation
const sessionBuckets: Record<TradingSession, Array<{ pnl: number; result: string }>> = {
  asia: [],
  london: [],
  newyork: [],
  'off-hours': [],
};

tradesWithContext.forEach(trade => {
  const session = getTradeSession(trade);
  const tradeData = { pnl, result };
  sessionBuckets[session].push(tradeData);
});

// Calculate metrics
const sessionMetrics: Record<TradingSession, PerformanceMetrics> = {
  asia: calculateMetrics(sessionBuckets.asia),
  london: calculateMetrics(sessionBuckets.london),
  newyork: calculateMetrics(sessionBuckets.newyork),
  'off-hours': calculateMetrics(sessionBuckets['off-hours']),
};

return {
  // ... existing
  bySession: sessionMetrics,
};
```

### 4.2 Create SessionPerformanceChart Component

**File baru:** `src/components/analytics/SessionPerformanceChart.tsx`

Komponen yang menampilkan:
- Win rate per session (bar chart)
- P&L per session
- Trade count per session
- Best/worst session badges
- Session time ranges dalam LOCAL timezone

### 4.3 Add to Performance Page

**File:** `src/pages/Performance.tsx`

Di section "Contextual Analysis", tambahkan:

```tsx
{/* Session Performance */}
{contextualData?.bySession && (
  <SessionPerformanceChart bySession={contextualData.bySession} />
)}
```

---

## Part 5: Fix Hardcoded Sessions

### 5.1 Update TradingHeatmap.tsx

**File:** `src/pages/TradingHeatmap.tsx`

Perubahan:
- Import `getTradeSession` dan `SESSION_LABELS`
- Replace hardcoded `hour < 8` logic dengan `getTradeSession(trade)`
- Show session times in LOCAL timezone di badge

```typescript
// Before (WRONG - uses local hour)
const hour = new Date(trade.trade_date).getHours();
const session = hour < 8 ? 'asia' : hour < 16 ? 'london' : 'ny';

// After (CORRECT - uses UTC-based session)
import { getTradeSession, formatSessionTimeLocal } from '@/lib/session-utils';
const session = getTradeSession(trade);
```

### 5.2 Update TradingHeatmapChart.tsx

**File:** `src/components/analytics/TradingHeatmapChart.tsx`

Same pattern - replace hardcoded session detection dengan `getTradeSession()`.

---

## Part 6: Trade Display with Session Context

### 6.1 Add Session Badge to Trade Cards

**File:** `src/components/journal/TradeGalleryCard.tsx`

Tambahkan session badge:

```tsx
import { getTradeSession, SESSION_LABELS } from '@/lib/session-utils';

const session = getTradeSession(trade);

// In badges section
<Badge variant="secondary" className="text-xs px-1.5 py-0">
  {SESSION_LABELS[session]}
</Badge>
```

### 6.2 Add Session to Trade History Infinite Scroll

**File:** `src/components/journal/TradeHistoryInfiniteScroll.tsx`

Add session display in trade row.

---

## Implementation Order

```text
Phase 1: Formatters (Foundation)
├── 1.1 Create formatPnl() in lib/formatters.ts
├── 1.2 Create lib/session-utils.ts
└── 1.3 Update types/market-context.ts

Phase 2: PnL Formatting Updates (~20 files)
├── Dashboard components
├── Analytics components
├── Journal components
├── Trading components
└── Risk components

Phase 3: Session Integration
├── 3.1 Update use-capture-market-context.ts
├── 3.2 Update use-contextual-analytics.ts
└── 3.3 Create SessionPerformanceChart.tsx

Phase 4: Fix Existing Session Logic
├── 4.1 TradingHeatmap.tsx
├── 4.2 TradingHeatmapChart.tsx
└── 4.3 MarketSessionsWidget.tsx (verify only)

Phase 5: Session in UI
├── 5.1 TradeGalleryCard.tsx
├── 5.2 TradeHistoryInfiniteScroll.tsx
└── 5.3 Performance.tsx
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/session-utils.ts` | Session detection & formatting utilities |
| `src/components/analytics/SessionPerformanceChart.tsx` | Session analytics visualization |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/formatters.ts` | Add `formatPnl()` and `formatCompactPnl()` |
| `src/types/market-context.ts` | Add session to UnifiedMarketContext |
| `src/hooks/use-contextual-analytics.ts` | Add bySession segmentation |
| `src/hooks/use-capture-market-context.ts` | Auto-tag session |
| `src/pages/Performance.tsx` | Add SessionPerformanceChart |
| `src/pages/TradingHeatmap.tsx` | Use UTC-based session logic |
| `src/components/analytics/TradingHeatmapChart.tsx` | Use UTC-based session logic |
| Plus ~20 files for PnL formatting updates |

---

## Outcome

Setelah implementasi:

1. **PnL Format Konsisten**: Semua angka finansial menggunakan `+$x` / `-$x` format
2. **Session Berbasis Timezone**: Session detection berdasarkan UTC, display dalam local time
3. **Session Analytics**: Performance breakdown per session di halaman Performance
4. **Trade Context**: Setiap trade menampilkan session badge
5. **No Hardcoded Times**: Semua session logic menggunakan centralized utility
