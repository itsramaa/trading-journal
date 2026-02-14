

# Market Data Page - Comprehensive Audit

## Overall Assessment

The Market Data page is architecturally sound with good modular design, ErrorBoundary wrappers on 3/4 widgets, centralized config constants, and proper auth-gated edge functions. However, there are several issues that need to be addressed across the judging criteria.

---

## Issues Found

### 1. Hardcoded Colors Violate Semantic Financial Color Standard (Clarity/Code Quality)

**Files affected:**
- `src/components/market/MarketSentimentWidget.tsx` (lines 129, 131, 317, 319, 326, 328, 369)
- `src/lib/constants/sentiment-thresholds.ts` (lines 132-134, 140-143)
- `src/components/market/MarketContextBadge.tsx` (lines 36-41, 46-48, 55-59)

The project standard requires `text-profit` / `text-loss` and `bg-profit` / `bg-loss` semantic tokens for all financial indicators. The MarketSentimentWidget bull/bear bar uses hardcoded `text-green-500` / `text-red-500` and `bg-green-500` / `bg-red-500`. The utility functions `getSentimentColorClass()` and `getSentimentBgClass()` also return hardcoded color classes.

**Fix:**
- Replace `text-green-500` with `text-profit` and `text-red-500` with `text-loss` in the bull/bear bar section
- Replace `bg-green-500` with `bg-profit` and `bg-red-500` with `bg-loss` for bar fills
- Update `getSentimentColorClass()` to return `text-profit` / `text-loss` / `text-warning`
- Update `getSentimentBgClass()` to return `bg-profit/10` / `bg-loss/10` / `bg-warning/10`
- Update funding rate color in raw data section (line 369)

Note: `MarketContextBadge.tsx` uses a multi-level color scale (red/orange/yellow/green/emerald for Fear/Greed 0-100), which is informational rather than financial P&L, so those are acceptable as-is.

---

### 2. MarketSentimentWidget Missing ErrorBoundary Wrapper (Comprehensiveness/Code Quality)

**File:** `src/components/market/MarketSentimentWidget.tsx`

VolatilityMeterWidget, WhaleTrackingWidget, and TradingOpportunitiesWidget are all wrapped with `ErrorBoundary`. MarketSentimentWidget is the only widget without one, creating an inconsistency where a runtime error in the sentiment gauge could crash the entire page.

**Fix:** Add an ErrorBoundary wrapper with key-based retry, matching the pattern used in VolatilityMeterWidget.

---

### 3. WhaleTrackingWidget and TradingOpportunitiesWidget Use Array Index as Key (Code Quality)

**Files:**
- `src/components/market/WhaleTrackingWidget.tsx` (line 95: `key={idx}`)
- `src/components/market/TradingOpportunitiesWidget.tsx` (line 88: `key={idx}`)

Using array index as React key can cause incorrect reconciliation if the list order changes between renders. Both lists have a natural unique identifier: `whale.asset` for whale data and `opp.pair` for opportunities.

**Fix:**
- WhaleTrackingWidget: `key={whale.asset}` (but assets could repeat, so use `key={\`${whale.asset}-${whale.signal}\`}`)
- TradingOpportunitiesWidget: `key={opp.pair}`

---

### 4. `getFactorBadge` in MarketSentimentWidget Uses Hardcoded Colors (Clarity)

**File:** `src/components/market/MarketSentimentWidget.tsx` (lines 129-131)

The factor badges use `border-green-500/50 text-green-500` and `border-red-500/50 text-red-500` instead of semantic tokens.

**Fix:** Replace with `border-profit/50 text-profit` and `border-loss/50 text-loss`.

---

### 5. Missing ARIA Label on Whale and Opportunities Cards (Comprehensiveness)

**Files:**
- `src/components/market/WhaleTrackingWidget.tsx` - Card at line 65 has no `role="region"` or `aria-label`
- `src/components/market/TradingOpportunitiesWidget.tsx` - Card at line 57 has no `role="region"` or `aria-label`

VolatilityMeterWidget and MarketSentimentWidget both have proper ARIA attributes. These two are missing them.

**Fix:** Add `role="region" aria-label="Whale Tracking"` and `role="region" aria-label="Trading Opportunities"` to the respective Card components (both the content and error variants).

---

### 6. Duplicate Import Lines in MarketData.tsx (Code Quality)

**File:** `src/pages/MarketData.tsx` (lines 7-8)

```typescript
import { MarketSentimentWidget, WhaleTrackingWidget, TradingOpportunitiesWidget } from "@/components/market";
import { VolatilityMeterWidget } from "@/components/market";
```

Two separate import statements from the same module.

**Fix:** Consolidate into a single import statement.

---

## Summary Table

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | MarketSentimentWidget.tsx, sentiment-thresholds.ts | Hardcoded `green-500`/`red-500` instead of `text-profit`/`text-loss` | Clarity, Code Quality | Medium |
| 2 | MarketSentimentWidget.tsx | Missing ErrorBoundary wrapper | Comprehensiveness, Code Quality | Medium |
| 3 | WhaleTrackingWidget.tsx, TradingOpportunitiesWidget.tsx | Array index as React key | Code Quality | Low |
| 4 | MarketSentimentWidget.tsx | Factor badges use hardcoded colors | Clarity | Low |
| 5 | WhaleTrackingWidget.tsx, TradingOpportunitiesWidget.tsx | Missing ARIA `role="region"` and `aria-label` | Comprehensiveness | Low |
| 6 | MarketData.tsx | Duplicate import from same module | Code Quality | Low |

## Verified Correct (No Issues)

- Edge function `market-insight` has proper auth check (JWT validation)
- Edge function has input validation with regex and slice limit
- Symbol validation via `filterValidSymbols()` before edge function call
- MarketContext provides cross-page symbol persistence with localStorage
- VolatilityMeterWidget correctly wrapped with ErrorBoundary + key-based retry
- WhaleTrackingWidget and TradingOpportunitiesWidget wrapped with ErrorBoundary
- Centralized config constants (market-config.ts, sentiment-thresholds.ts, volatility-config.ts)
- Loading skeletons present in all widgets
- Empty states present in all widgets
- Error states with retry in all widgets
- `normalizeError()` utility for consistent error handling
- `useMemo` for derived data (whaleData, opportunitiesData, symbolsToFetch)
- Data quality and last updated footer
- Responsive grid layout (`md:grid-cols-2`, `lg:grid-cols-3`)
- CryptoIcon integration in VolatilityMeter
- Security: edge function validates auth token before processing

Total: 6 files modified, 6 issues addressed.

