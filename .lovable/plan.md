
# Page Analysis: Performance Overview (`/performance`)

## Page Intent

**Primary Job-to-be-Done (JTBD):**
> "Sebagai trader, saya ingin melihat analisis mendalam tentang performa trading saya secara keseluruhan sehingga saya dapat mengidentifikasi kekuatan, kelemahan, dan area yang perlu diperbaiki."

**Secondary JTBD:**
- Membandingkan performa antar strategi
- Melihat equity curve dengan anotasi event makro
- Menganalisis performa berdasarkan konteks pasar (Fear/Greed, Volatility, Event Days)
- Export laporan performa ke CSV/PDF

---

## Current Content Inventory

### Page Header
| Element | Status | Notes |
|---------|--------|-------|
| Title: "Performance Analytics" | ✅ OK | Icon + title sesuai standard |
| Description | ✅ OK | "Deep dive into your trading performance metrics" |
| Export Buttons | ✅ OK | CSV + PDF export buttons di header |

### Filters Card
| Element | Status | Notes |
|---------|--------|-------|
| DateRangeFilter | ✅ OK | Date picker untuk filter periode |
| Strategy Filter | ✅ OK | Badge-based multi-select untuk strategy |
| Event Days Toggle | ✅ OK | Switch untuk filter hanya event days |

### Tabs Structure
| Tab | Content | Status |
|-----|---------|--------|
| **Overview** | Key metrics, equity curve, contextual charts | ✅ Comprehensive |
| **Strategies** | Strategy performance breakdown | ✅ OK |

---

## Overview Tab Content Analysis

### Section 1: 7-Day Stats Card (`SevenDayStatsCard`)
| Card | Metric | Status |
|------|--------|--------|
| Current Streak | Win/Loss streak count | ✅ OK |
| Trades (7D) | Trade count in 7 days | ✅ OK |
| Best Day | Best P&L day | ✅ OK - uses `formatCurrency()` |
| Worst Day | Worst P&L day | ✅ OK - uses `formatCurrency()` |

### Section 2: Key Metrics (4-Column Grid)
| Card | Metric | Status | Decimal Issue |
|------|--------|--------|---------------|
| Win Rate | `stats.winRate.toFixed(1)%` | ⚠️ Minor | Should use `formatWinRate()` |
| Profit Factor | `stats.profitFactor.toFixed(2)` | ✅ OK | Handles Infinity case |
| Expectancy | `formatCurrency(stats.expectancy)` | ✅ OK | Local formatter |
| Max Drawdown | `stats.maxDrawdownPercent.toFixed(1)%` | ⚠️ Minor | Should use `formatPercentUnsigned()` |

### Section 3: Additional Metrics (4-Column Grid)
| Card | Metric | Status | Decimal Issue |
|------|--------|--------|---------------|
| Sharpe Ratio | `stats.sharpeRatio.toFixed(2)` | ✅ OK | 2 decimals appropriate |
| Avg R:R | `stats.avgRR.toFixed(2):1` | ✅ OK | Should use `formatRatio()` |
| Total Trades | `stats.totalTrades` | ✅ OK | Integer |
| Total P&L | `formatCurrency(stats.totalPnl)` | ✅ OK | With Binance breakdown |

### Section 4: Equity Curve (`EquityCurveWithEvents`)
| Feature | Status | Notes |
|---------|--------|-------|
| Area chart | ✅ OK | Cumulative P&L |
| Event annotations | ✅ OK | Diamond markers for FOMC/CPI/NFP |
| Custom tooltip | ✅ OK | Shows P&L + event info |
| Event legend | ✅ OK | Lists event days |

### Section 5: Contextual Charts (2-Column Grid)
| Component | Purpose | Status |
|-----------|---------|--------|
| `CombinedContextualScore` | Unified context score | ✅ OK |
| `TradingHeatmapChart` | Time-based win rate | ✅ OK |

### Section 6: Event & Fear/Greed Charts (2-Column Grid)
| Component | Purpose | Status |
|-----------|---------|--------|
| `EventDayComparison` | Event days vs normal days | ✅ OK |
| `FearGreedZoneChart` | Performance by F/G zone | ✅ OK |

### Section 7: Volatility Chart
| Component | Purpose | Status |
|-----------|---------|--------|
| `VolatilityLevelChart` | Performance by vol level | ✅ OK |

### Section 8: Drawdown Chart
| Component | Purpose | Status |
|-----------|---------|--------|
| `DrawdownChart` | Equity drawdown over time | ✅ OK - uses `.toFixed(2)%` |

---

## Strategies Tab Content Analysis

### Strategy Performance Table
| Column | Status | Decimal Issue |
|--------|--------|---------------|
| Win Rate | `sp.winRate.toFixed(1)%` | ⚠️ Should use `formatWinRate()` |
| Avg R:R | `sp.avgRR.toFixed(2):1` | ⚠️ Should use `formatRatio()` |
| Avg P&L | `formatCurrency(sp.avgPnl)` | ✅ OK |
| Contribution | `sp.contribution.toFixed(1)%` | ⚠️ Should use `formatWinRate()` |
| Total P&L | `formatCurrency(sp.totalPnl)` | ✅ OK |

### Strategy Comparison Chart
| Feature | Status |
|---------|--------|
| Horizontal bar chart | ✅ OK |
| P&L by strategy | ✅ OK |
| Color coding | ✅ OK (profit/loss) |

---

## Issues Identified

### Issue 1: Local `formatCurrency` Function (MEDIUM)
**Current:** Page defines its own `formatCurrency` function
```typescript
const formatCurrency = (v: number) => {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
};
```
**Expected:** Should use centralized `formatCurrency` or `formatCompactCurrency` from `@/lib/formatters`
**Impact:** Inconsistent formatting with rest of app

### Issue 2: Inconsistent Percent Formatting (LOW)
**Current:** Uses `.toFixed(1)%` directly
```typescript
<div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
```
**Expected:** Should use `formatWinRate()` from formatters
**Impact:** Minor inconsistency

### Issue 3: Ratio Formatting (LOW)
**Current:** Uses `.toFixed(2):1` directly
**Expected:** Should use `formatRatio()` from formatters

### Issue 4: Export Not Using Centralized Formatters (MEDIUM)
**Current:** Export functions use inline `.toFixed()` calls
**Expected:** Should leverage `formatCurrency`, `formatPercent` etc.
**Impact:** Export data may have different precision than UI

### Issue 5: No Link to Related Pages (LOW)
**Current:** Page is standalone
**Suggestion:** Add quick links to Daily P&L, Heatmap, AI Insights

---

## Ordering & Hierarchy Analysis

### Current Flow (Overview Tab)
```
1. 7-Day Stats (4 cards)
2. Key Metrics (4 cards: Win Rate, PF, Expectancy, DD)
3. Additional Metrics (4 cards: Sharpe, R:R, Trades, P&L)
4. Equity Curve with Events
5. [CombinedContextualScore] [TradingHeatmapChart]
6. [EventDayComparison] [FearGreedZoneChart]
7. VolatilityLevelChart
8. DrawdownChart
```

### Evaluation
| Aspect | Status | Notes |
|--------|--------|-------|
| Information priority | ✅ Good | Key metrics at top |
| Visual hierarchy | ✅ Good | Progressively detailed |
| Chart grouping | ✅ Good | Related charts together |
| Cognitive load | ⚠️ Heavy | 8 sections may be overwhelming |

### Recommended Flow (No Change Needed)
The current flow is logical and follows a good pattern:
1. Recent snapshot (7-day)
2. Core metrics (what matters most)
3. Extended metrics (deeper analysis)
4. Equity visualization
5. Contextual analysis (drilling down)
6. Risk visualization (drawdown)

---

## Proposed Changes

### Phase 1: Use Centralized Formatters (HIGH PRIORITY)

**File:** `src/pages/Performance.tsx`

**Changes:**
1. Remove local `formatCurrency` function
2. Import and use centralized formatters
3. Replace inline `.toFixed()` calls

```typescript
// Remove local formatter
- const formatCurrency = (v: number) => {
-   if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
-   return `$${v.toFixed(0)}`;
- };

// Import centralized formatters
import { 
  formatCurrency, 
  formatCompactCurrency, 
  formatWinRate, 
  formatRatio, 
  formatPercentUnsigned 
} from "@/lib/formatters";

// Win Rate card
- <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
+ <div className="text-2xl font-bold">{formatWinRate(stats.winRate)}</div>

// Max Drawdown card
- <div className="text-2xl font-bold text-destructive">{stats.maxDrawdownPercent.toFixed(1)}%</div>
+ <div className="text-2xl font-bold text-destructive">{formatPercentUnsigned(stats.maxDrawdownPercent)}</div>

// Avg R:R card
- <div className="text-xl font-bold">{stats.avgRR.toFixed(2)}:1</div>
+ <div className="text-xl font-bold">{formatRatio(stats.avgRR)}</div>

// Strategy Performance section
- <div className="font-medium">{sp.winRate.toFixed(1)}%</div>
+ <div className="font-medium">{formatWinRate(sp.winRate)}</div>

- <div className="font-medium">{sp.avgRR.toFixed(2)}:1</div>
+ <div className="font-medium">{formatRatio(sp.avgRR)}</div>

- <div className="font-medium">{sp.contribution.toFixed(1)}%</div>
+ <div className="font-medium">{formatWinRate(sp.contribution)}</div>
```

### Phase 2: Fix Equity Curve Formatter (MEDIUM PRIORITY)

**File:** `src/pages/Performance.tsx`

**Changes:**
Use `formatCompactCurrency` for chart axis formatter (keeps K/M suffix behavior):
```typescript
// For the equity curve
<EquityCurveWithEvents 
  equityData={equityData} 
  formatCurrency={formatCompactCurrency} // Use compact version
/>
```

Or create a chart-specific formatter:
```typescript
const chartFormatCurrency = (v: number) => formatCompactCurrency(v, 'USD');
```

### Phase 3: Update DrawdownChart (LOW PRIORITY)

**File:** `src/components/analytics/DrawdownChart.tsx`

**Changes:**
```typescript
import { formatPercentUnsigned } from "@/lib/formatters";

// Replace
- <p className="text-xl font-bold text-loss">-{maxDrawdown.toFixed(2)}%</p>
+ <p className="text-xl font-bold text-loss">-{formatPercentUnsigned(maxDrawdown)}</p>
```

---

## Technical Implementation

### Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `src/pages/Performance.tsx` | High | Replace local formatCurrency, use centralized formatters |
| `src/components/analytics/DrawdownChart.tsx` | Low | Use formatPercentUnsigned |

### Code Changes Summary

**Performance.tsx:**
1. Remove local `formatCurrency` function (lines 114-117)
2. Import centralized formatters
3. Update Win Rate card (line 330)
4. Update Max Drawdown card (line 371)
5. Update Sharpe Ratio card (line 386)
6. Update Avg R:R card (line 395)
7. Update Strategy Performance section (lines 518, 522, 534)
8. Update Equity Curve prop (line 440)

---

## Success Criteria

| Criteria | Expected Behavior |
|----------|-------------------|
| Win Rate | Displays as `65.5%` (1 decimal via formatWinRate) |
| Drawdown | Displays as `12.50%` (2 decimals via formatPercentUnsigned) |
| Avg R:R | Displays as `2.50:1` (via formatRatio) |
| Equity Chart | Uses formatCompactCurrency for K/M notation |
| Strategy metrics | All use centralized formatters |
| Consistency | All metrics match formatting in other pages |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Chart axis formatting breaks | Test compact currency formatter with small/large values |
| Export precision changes | Keep export functions separate if needed |
| Visual differences | Minor - standardization is the goal |

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Centralized Formatters | Low | High |
| Phase 2: Chart Formatter | Very Low | Medium |
| Phase 3: DrawdownChart | Very Low | Low |

---

## File Impact Summary

| File | Changes |
|------|---------|
| `src/pages/Performance.tsx` | ~15 line changes |
| `src/components/analytics/DrawdownChart.tsx` | ~2 line changes |

**Total Estimated Changes:** ~17 lines
