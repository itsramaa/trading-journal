

# AI Insights Page - Functional Correctness Audit

## Audit Scope

Reviewed: page (`AIInsights.tsx`), components (`PredictiveInsights.tsx`, `SessionInsights.tsx`, `EmotionalPatternAnalysis.tsx`, `ContextualPerformance.tsx`, `ContextualOnboardingGuide.tsx`), hooks (`use-contextual-analytics.ts`, `use-mode-filtered-trades.ts`), utilities (`predictive-analytics.ts`, `session-utils.ts`), constants (`ai-analytics.ts`, `emotional-states.ts`), and cross-domain dependencies.

---

## Issues Found

### 1. Session Outlook Prediction Broken Due to Session Name Mismatch (Accuracy - HIGH)

**File:** `src/lib/predictive-analytics.ts` (lines 180-188)

The `getSessionOutlook` function determines the current session using hardcoded names (`'Asia'`, `'London'`, `'New York'`, `'Off-hours'`), then filters trades via:

```typescript
t.session?.toLowerCase().includes(currentSession.toLowerCase())
```

However, the database stores sessions as `'sydney'`, `'tokyo'`, `'london'`, `'new_york'`, `'other'`. The matching results:

- `'Asia'` -- `'sydney'.includes('asia')` = false, `'tokyo'.includes('asia')` = false -- **BROKEN**
- `'London'` -- `'london'.includes('london')` = true -- works
- `'New York'` -- `'new_york'.includes('new york')` = false (underscore vs space) -- **BROKEN**
- `'Off-hours'` -- `'other'.includes('off-hours')` = false -- **BROKEN**

3 out of 4 session lookups silently fail, returning `null` (no prediction shown). Only the London session ever produces a Session Outlook prediction.

**Fix:** Map UTC hours to database session values:

```typescript
let currentSession: string;
if (hour >= 20 || hour < 5) currentSession = 'sydney|tokyo';
else if (hour >= 7 && hour < 16) currentSession = 'london';
else if (hour >= 13 && hour < 22) currentSession = 'new_york';
else currentSession = 'other';

const sessionTrades = closed.filter(t => {
  const s = t.session?.toLowerCase() || '';
  return currentSession.split('|').some(cs => s === cs);
});
```

And update the description string to use user-friendly labels (e.g., `SESSION_LABELS`).

---

### 2. `insights` useMemo Missing `formatPnl` Dependency (Accuracy - MEDIUM)

**File:** `src/pages/AIInsights.tsx` (line 286)

The `insights` memo uses `formatPnl` inside its callback (lines 268, 269, 279, 280) but the dependency array is only `[stats]`:

```typescript
const insights = useMemo((): PerformanceInsight[] => {
  // ... uses formatPnl(stats.bestPair.pnl) and formatPnl(stats.worstPair.pnl) ...
}, [stats]); // Missing: formatPnl
```

If the user changes their display currency, the insight descriptions will show stale currency-formatted values until a full page remount. This violates the accuracy criterion.

**Fix:** Add `formatPnl` to the dependency array:

```typescript
}, [stats, formatPnl]);
```

---

### 3. Page Missing Top-Level ErrorBoundary (Comprehensiveness - MEDIUM)

**File:** `src/pages/AIInsights.tsx`

No ErrorBoundary wraps the page content. Complex sub-components (`PredictiveInsights`, `ContextualPerformance`, `EmotionalPatternAnalysis`, `SessionInsights`) each process raw trade data with math operations that can throw on unexpected shapes. A runtime error crashes the entire page. All other audited pages now have ErrorBoundaries.

**Fix:** Add ErrorBoundary with `retryKey` pattern:

```typescript
import { ErrorBoundary } from "@/components/ui/error-boundary";

const [retryKey, setRetryKey] = useState(0);

<ErrorBoundary title="AI Insights" onRetry={() => setRetryKey(k => k + 1)}>
  <div key={retryKey} className="space-y-6">
    {/* existing content */}
  </div>
</ErrorBoundary>
```

---

### 4. Dead Imports in AIInsights Page (Code Quality - LOW)

**File:** `src/pages/AIInsights.tsx` (lines 10-11, 23)

`Separator`, `Progress`, and `BarChart3` are imported but never used in this component. They add unnecessary bundle weight.

**Fix:** Remove `Separator`, `Progress`, and `BarChart3` from the import statements.

---

## Verified Correct (No Issues)

- **PnL calculation standard**: All computation paths use `realized_pnl ?? pnl ?? 0` fallback chain (AIInsights line 98, predictive-analytics line 38-39, contextual-analytics line 307, EmotionalPatternAnalysis line 77)
- **Profit factor formula**: `(avgWin * wins.length) / (avgLoss * losses.length)` -- mathematically correct (AIInsights line 106, contextual-analytics line 103)
- **Win rate calculation**: `(wins / total) * 100` -- correct everywhere
- **Time slot win rate**: Rolling average formula at lines 159-162 is mathematically verified correct (properly accounts for already-incremented trade count)
- **Streak calculation**: Sorted newest-first, breaks on first non-matching trade -- correct (AIInsights lines 111-125, predictive-analytics lines 57-64)
- **Streak probability**: Historical pattern matching algorithm is sound -- counts occurrences of N consecutive same-type results and measures continuation rate (predictive-analytics lines 70-99)
- **Day-of-week edge**: Compares today's historical win rate vs overall -- correct with proper `getDayLabel` usage
- **Pair momentum**: Last-N-trades approach with 60%/40% thresholds -- logically sound
- **Contextual analytics**: Pearson correlation is correctly implemented with denominator-zero guard and clamping to [-1, 1]
- **Fear/Greed zone boundaries**: Consistent between `FEAR_GREED_ZONES` constants and `getFearGreedZone` function
- **Volatility segmentation**: Correctly reads from `context.volatility.level` with 'medium' default
- **Event proximity**: `hasHighImpactToday` boolean correctly maps to `eventDay` vs `normalDay`
- **Session segmentation in contextual analytics**: Uses `getTradeSession()` helper (from session-utils) for ALL closed trades, not just those with context -- correct
- **Data quality gates**: `MIN_TRADES_FOR_INSIGHTS` (5), `MIN_TRADES_FOR_PATTERNS` (10), `MIN_TRADES_FOR_RANKING` (3) consistently enforced across all components
- **Empty states**: All four sub-components (PredictiveInsights, SessionInsights, EmotionalPatternAnalysis, ContextualPerformance) show meaningful empty states when data is insufficient
- **Loading states**: `MetricsGridSkeleton` + `ChartSkeleton` for main page; `Skeleton` elements in ContextualPerformance
- **URL tab persistence**: `useSearchParams` for tab state -- correct
- **Semantic colors**: `text-profit` / `text-loss` used consistently; `border-profit/30`, `bg-profit/5` for insight cards
- **ARIA**: PredictiveInsights has `role="region"` with `aria-label`; PredictionCard has `role="group"` with descriptive label; EmotionalPatternAnalysis has `role="region"` and grouped stats with `role="group"`
- **Centralized constants**: All thresholds sourced from `ai-analytics.ts` -- no hardcoded magic numbers
- **Emotional state matching**: Uses `EMOTIONAL_STATES.find(e => e.id === state)` for config lookup; properly filters unknown states
- **FOMO/Revenge warnings**: Specific checks for these high-risk emotional states with appropriate thresholds
- **Mode isolation**: `useModeFilteredTrades` used by all data-fetching paths -- trades are filtered by current mode (Paper/Live)
- **Currency formatting**: `useCurrencyConversion` used for all PnL display; `formatPnl` for directional formatting, `format` for absolute values
- **Export link**: Correctly routes to `/export?tab=analytics`

---

## Summary

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | `predictive-analytics.ts` lines 180-188 | Session name mismatch breaks 3/4 session outlook predictions | Accuracy | High |
| 2 | `AIInsights.tsx` line 286 | `formatPnl` missing from `insights` useMemo dependencies | Accuracy | Medium |
| 3 | `AIInsights.tsx` | Missing top-level ErrorBoundary | Comprehensiveness | Medium |
| 4 | `AIInsights.tsx` lines 10-11, 23 | Dead imports: `Separator`, `Progress`, `BarChart3` | Code Quality | Low |

Total: 2 files, 4 fixes.

## Technical Details

### Fix 1: Correct session name matching in predictive-analytics.ts

Replace lines 180-188 in `src/lib/predictive-analytics.ts` to map UTC hours to actual database session values (`sydney`, `tokyo`, `london`, `new_york`, `other`) and use exact equality matching instead of `.includes()`. Update the description string to use session display labels.

### Fix 2: Add formatPnl to insights dependency array

In `src/pages/AIInsights.tsx` line 286, change:
```typescript
}, [stats]);
```
To:
```typescript
}, [stats, formatPnl]);
```

### Fix 3: Add ErrorBoundary wrapper

Import `ErrorBoundary` and `useState`, wrap the page content div with the standard `retryKey` pattern.

### Fix 4: Remove dead imports

Remove `Separator`, `Progress`, and `BarChart3` from their respective import statements in `AIInsights.tsx`.

