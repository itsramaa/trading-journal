

# Implementation Plan: Visual Hierarchy Testing & Analytics/Heatmap Gap Analysis

## Executive Summary

Berdasarkan end-to-end cross-check audit menggunakan **Visual Hierarchy Testing** dan **Analytics/Heatmap** analysis, ditemukan 14 gap yang perlu diperbaiki untuk meningkatkan konsistensi, usability, dan data-driven decision making.

---

## Audit Methodology

### Visual Hierarchy Testing

**F-Pattern Scan Analysis:**
- Verified top-left placement for primary info (title, key metrics)
- Checked right-side placement for actions
- Evaluated content flow from most to least important

**Z-Pattern for CTAs:**
- Analyzed call-to-action button placement
- Checked visual weight and contrast

**Squint Test:**
- Evaluated visual weight distribution
- Identified elements that blend vs stand out

### Analytics/Heatmap Testing

**Event Tracking Coverage:**
- `trackEvent()` function exists but NOT USED anywhere
- Missing tracking for critical user journeys
- No data being collected for feature validation

**Heatmap Component:**
- TradingHeatmap only used in Performance page
- Good implementation but limited scope

---

## Gap Analysis Summary

| Category | Gap | Priority | Impact |
|----------|-----|----------|--------|
| Analytics | `trackEvent()` not implemented anywhere | HIGH | No usage data |
| Visual Hierarchy | Inconsistent page header icons | MEDIUM | Visual inconsistency |
| Visual Hierarchy | Settings page missing header icon | LOW | Style gap |
| Visual Hierarchy | Risk page missing QuickTip | MEDIUM | Onboarding gap |
| Analytics | Missing wizard completion tracking | HIGH | Cannot measure wizard efficacy |
| Analytics | Missing AI feature interaction tracking | HIGH | Cannot validate AI value |
| Visual Hierarchy | Accounts page uses text-3xl (inconsistent) | LOW | Size inconsistency |
| Analytics | Missing page view tracking | MEDIUM | No navigation patterns |
| Visual Hierarchy | TradingHeatmap summary card missing | MEDIUM | Actionable insights gap |
| Visual Hierarchy | Performance export buttons position | LOW | Minor UX polish |
| Analytics | Missing position size calculator usage | MEDIUM | Cannot track tool adoption |
| Analytics | Missing trade filter interaction | LOW | Cannot optimize filters |
| Visual Hierarchy | MarketInsight CombinedAnalysis card prominence | LOW | Good, minor enhancement |
| Analytics | No session start/end tracking | MEDIUM | Cannot measure engagement |

---

## Phase 1: Implement Analytics Event Tracking (HIGH Priority)

### 1.1 Core User Journey Tracking

**Problem:** `trackEvent()` and `ANALYTICS_EVENTS` are defined but NEVER used anywhere in the codebase.

**Files to modify:**
- `src/components/trade/entry/TradeEntryWizard.tsx`
- `src/pages/AIAssistant.tsx`
- `src/components/risk/PositionSizeCalculator.tsx`
- `src/pages/Performance.tsx`
- `src/pages/Dashboard.tsx`
- `src/App.tsx`

**Implementation:**

**TradeEntryWizard.tsx** - Track wizard lifecycle:
```typescript
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// On wizard mount (inside useEffect)
useEffect(() => {
  trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_START, { step: currentStep });
  return () => {
    // Track abandonment if not completed
  };
}, []);

// On complete
const handleComplete = useCallback(async () => {
  trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_COMPLETE, {
    stepsCompleted: completedSteps.length,
    duration: Date.now() - startTime,
  });
  reset();
  onComplete();
}, [reset, onComplete, completedSteps, startTime]);
```

**AIAssistant.tsx** - Track AI quality checks:
```typescript
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// After quality check result
if (qualityResult) {
  trackEvent(ANALYTICS_EVENTS.AI_INSIGHT_VIEW, {
    score: qualityResult.score,
    recommendation: qualityResult.recommendation,
    pair: checkerPair,
  });
}
```

**PositionSizeCalculator.tsx** - Track calculator usage:
```typescript
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// On calculate button click
const handleCalculate = () => {
  trackEvent(ANALYTICS_EVENTS.POSITION_SIZE_CALCULATE, {
    accountBalance,
    riskPercent,
    resultPositionSize,
  });
  // ... existing logic
};
```

### 1.2 Add Page View Tracking

**File:** `src/App.tsx`

**Implementation:**
```typescript
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// Inside App component, after routes are defined
function PageViewTracker() {
  const location = useLocation();
  
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
      path: location.pathname,
      timestamp: Date.now(),
    });
  }, [location.pathname]);
  
  return null;
}

// Add <PageViewTracker /> inside Router
```

### 1.3 Add Session Tracking

**File:** `src/App.tsx`

**Implementation:**
```typescript
useEffect(() => {
  trackEvent(ANALYTICS_EVENTS.SESSION_START, {
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  });
  
  const handleBeforeUnload = () => {
    trackEvent(ANALYTICS_EVENTS.SESSION_END, {
      timestamp: Date.now(),
      duration: Date.now() - sessionStartTime,
    });
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

---

## Phase 2: Visual Hierarchy Consistency (MEDIUM Priority)

### 2.1 Standardize Page Header Format

**Pattern to follow (per Dashboard.tsx):**
```typescript
<div>
  <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
    <Icon className="h-6 w-6 text-primary" />
    Page Title
  </h1>
  <p className="text-muted-foreground">Description text</p>
</div>
```

**Files with inconsistencies:**

| File | Current | Should Be |
|------|---------|-----------|
| `Settings.tsx` | No icon | Add Settings icon |
| `Accounts.tsx` | `text-3xl` | Change to `text-2xl` |
| `Performance.tsx` | `text-3xl` | Change to `text-2xl` |

**Settings.tsx fix:**
```typescript
<div>
  <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
    <Settings className="h-6 w-6 text-primary" />
    Settings
  </h1>
  <p className="text-muted-foreground">Manage your account preferences.</p>
</div>
```

### 2.2 Add Missing QuickTip to Risk Management

**File:** `src/pages/RiskManagement.tsx`

**Problem:** Only Overview tab has QuickTip, other tabs lack onboarding context.

**Implementation:** Already has QuickTip - verified OK.

### 2.3 Add Section Icons to AccountDetail

**File:** `src/pages/AccountDetail.tsx`

**Problem:** Stats section lacks consistent icon+title pattern.

**Before:** Cards without section header

**After:**
```typescript
<section className="space-y-4">
  <div className="flex items-center gap-2">
    <BarChart3 className="h-5 w-5 text-primary" />
    <h2 className="text-lg font-semibold">Account Statistics</h2>
  </div>
  {/* Stats cards grid */}
</section>
```

---

## Phase 3: Enhanced Trading Heatmap (MEDIUM Priority)

### 3.1 Add Actionable Summary Card to Heatmap Tab

**File:** `src/pages/Performance.tsx` (Heatmap tab)

**Problem:** Heatmap shows data but lacks actionable insights summary.

**Implementation:**

Add summary card above TradingHeatmap:
```typescript
<TabsContent value="heatmap" className="space-y-6">
  {/* NEW: Best/Worst Time Summary */}
  <div className="grid gap-4 md:grid-cols-3">
    <Card className="bg-profit/5 border-profit/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          <Trophy className="h-4 w-4 text-profit" />
          Best Trading Time
          <InfoTooltip content="Time slot with highest win rate based on your trade history." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold text-profit">
          {bestTimeSlot?.day} {bestTimeSlot?.hour}:00
        </div>
        <p className="text-xs text-muted-foreground">
          {bestTimeSlot?.winRate.toFixed(0)}% win rate ({bestTimeSlot?.trades} trades)
        </p>
      </CardContent>
    </Card>
    
    <Card className="bg-loss/5 border-loss/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          <AlertTriangle className="h-4 w-4 text-loss" />
          Avoid Trading
          <InfoTooltip content="Time slot with lowest win rate. Consider avoiding trades during this time." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold text-loss">
          {worstTimeSlot?.day} {worstTimeSlot?.hour}:00
        </div>
        <p className="text-xs text-muted-foreground">
          {worstTimeSlot?.winRate.toFixed(0)}% win rate ({worstTimeSlot?.trades} trades)
        </p>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Most Active</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">
          {mostActiveSlot?.day}s
        </div>
        <p className="text-xs text-muted-foreground">
          {mostActiveSlot?.trades} total trades
        </p>
      </CardContent>
    </Card>
  </div>
  
  <TradingHeatmap />
</TabsContent>
```

**Calculate best/worst time logic:**
```typescript
const heatmapInsights = useMemo(() => {
  const trades = filteredTrades.filter(t => t.status === 'closed');
  if (trades.length === 0) return null;
  
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const grid: Map<string, { day: string; hour: number; trades: number; wins: number }> = new Map();
  
  trades.forEach((trade) => {
    const d = new Date(trade.trade_date);
    const day = DAYS[d.getDay()];
    const hour = Math.floor(d.getHours() / 4) * 4;
    const key = `${day}-${hour}`;
    const existing = grid.get(key) || { day, hour, trades: 0, wins: 0 };
    existing.trades++;
    if ((trade.realized_pnl || trade.pnl || 0) > 0) existing.wins++;
    grid.set(key, existing);
  });
  
  const slots = Array.from(grid.values())
    .map(s => ({ ...s, winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0 }))
    .filter(s => s.trades >= 3); // Minimum sample size
  
  if (slots.length === 0) return null;
  
  const sorted = [...slots].sort((a, b) => b.winRate - a.winRate);
  const byVolume = [...slots].sort((a, b) => b.trades - a.trades);
  
  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    mostActive: byVolume[0],
  };
}, [filteredTrades]);
```

---

## Phase 4: Minor Polish Items (LOW Priority)

### 4.1 Fix Performance Page Header Size

**File:** `src/pages/Performance.tsx`

**Change:**
```typescript
// Before
<h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>

// After
<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
  <BarChart3 className="h-6 w-6 text-primary" />
  Performance Analytics
</h1>
```

### 4.2 Fix Accounts Page Header Size

**File:** `src/pages/Accounts.tsx`

**Change:**
```typescript
// Before
<h1 className="text-3xl font-bold tracking-tight">Trading Accounts</h1>

// After
<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
  <CandlestickChart className="h-6 w-6 text-primary" />
  Trading Accounts
</h1>
```

---

## Technical Implementation Details

### Files Modified (8 files)

| File | Changes | Lines |
|------|---------|-------|
| `src/App.tsx` | Add PageViewTracker, session tracking | +30 |
| `src/components/trade/entry/TradeEntryWizard.tsx` | Add wizard tracking | +15 |
| `src/pages/AIAssistant.tsx` | Add AI insight tracking | +10 |
| `src/components/risk/PositionSizeCalculator.tsx` | Add calculator tracking | +8 |
| `src/pages/Performance.tsx` | Add heatmap insights, fix header | +60 |
| `src/pages/Accounts.tsx` | Fix header size/icon | +2 |
| `src/pages/Settings.tsx` | Add header icon | +3 |

### New Imports Required

**App.tsx:**
```typescript
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
```

**Performance.tsx:**
```typescript
import { Trophy } from "lucide-react";
```

---

## Expected Outcomes

### Analytics Benefits
- **Before:** 0 events being tracked, no usage data
- **After:** Full user journey visibility with 5+ critical events

### Visual Hierarchy Benefits
- **Before:** Inconsistent header sizes (2xl vs 3xl), missing icons
- **After:** Unified `text-2xl` + icon pattern across all pages

### Heatmap Benefits
- **Before:** Raw data only, no actionable summary
- **After:** Clear "Best Time to Trade" and "Avoid Trading" insights

---

## Verification Checklist

After implementation:

1. Open browser DevTools > Application > Local Storage
2. Check for `usage_events` key populating with events
3. Navigate through pages and verify PAGE_VIEW events
4. Complete Trade Entry Wizard and verify WIZARD_COMPLETE event
5. Use Position Size Calculator and verify tracking
6. Visually scan all page headers for consistent icon + 2xl pattern
7. Check Performance > Heatmap tab for new summary cards

---

## Not Changed (By Design)

| Item | Reason |
|------|--------|
| Dashboard layout | Already follows F-pattern with proper hierarchy |
| Calendar page header | Already has proper icon + 2xl pattern |
| RiskManagement header | Already correct |
| MarketInsight combined card | Good prominence, no change needed |
| TradingHeatmap component | Good implementation, only adding wrapper insights |

