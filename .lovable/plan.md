
# Implementation Plan: Performance Page Consolidation

## Overview

Menambahkan menu **Performance** ke sidebar (di bawah "Strategy & Rules") dan membuat Performance page yang solid dengan konsolidasi semua fitur performance-related dari seluruh aplikasi.

---

## Ringkasan Perubahan

| File | Action | Deskripsi |
|------|--------|-----------|
| `src/components/layout/AppSidebar.tsx` | Edit | Tambah menu "Performance" dengan icon `LineChart` |
| `src/App.tsx` | Edit | Update route `/performance` (pindah dari `/analytics`) |
| `src/pages/Performance.tsx` | Create | Buat page baru yang solid (memindahkan dari `trading-journey/`) |
| `src/pages/trading-journey/Performance.tsx` | Delete | Hapus file lama (dipindah ke root) |
| `src/pages/Dashboard.tsx` | Edit | Update link Analytics dari `/trading-journey/performance` ke `/performance` |

---

## Arsitektur Performance Page (Consolidated)

### Tab Structure (5 Tabs)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Performance Analytics                                                        │
│ Deep dive into your trading performance metrics                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Overview] [Daily P&L] [Strategies] [Heatmap] [AI Insights]               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tab Content Area                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: Overview (Enhanced)
**Konsolidasi dari:** Dashboard Portfolio Performance + Existing Performance.tsx

**Metrics Grid (8 cards):**
- Win Rate + Progress bar
- Profit Factor
- Expectancy (per trade avg)
- Max Drawdown
- Sharpe Ratio
- Avg R:R
- Total Trades
- Total P&L

**Charts:**
- Equity Curve (existing)
- Drawdown Chart (existing)

### Tab 2: Daily P&L (NEW)
**Konsolidasi dari:** TodayPerformance.tsx data + Binance income data

**Content:**
- Daily P&L Summary (Gross/Net breakdown)
- Fee Analysis (Commission, Funding, Rebates)
- Symbol Breakdown table (from `binanceStats.bySymbol`)
- 7-Day P&L Chart (baru - agregasi daily)
- Best/Worst Trades per day

```typescript
// Proposed structure for Daily P&L data
interface DailyPnLData {
  date: string;
  grossPnl: number;
  netPnl: number;
  trades: number;
  winRate: number;
  fees: {
    commission: number;
    funding: number;
    rebates: number;
  };
  topSymbol: { pair: string; pnl: number };
}
```

### Tab 3: Strategies (Existing, Enhanced)
**Konsolidasi dari:** Performance.tsx Strategies tab + StrategyManagement performance data

**Content:**
- Strategy Performance Table (existing)
- Strategy Comparison Bar Chart (existing)
- AI Quality Score per strategy (dari `use-strategy-performance.ts`)
- Strategy Win/Loss streak per strategy (baru)

### Tab 4: Heatmap (Existing)
**Content:**
- TradingHeatmap component (existing)
- Time Analysis summary (best trading hours/days)

### Tab 5: AI Insights (Existing, Enhanced)
**Konsolidasi dari:** AIPatternInsights + CryptoRanking

**Content:**
- AI Pattern Insights (winning/losing patterns)
- Pair Performance Ranking (keep/reduce/avoid recommendations)
- Trade Distribution by pair (pie chart - baru)

---

## Phase 1: Sidebar & Routing Updates

### 1.1 Update AppSidebar

**File:** `src/components/layout/AppSidebar.tsx`

**Changes:**
- Tambah `LineChart` import dari lucide-react
- Sisipkan menu item baru setelah "Strategy & Rules"

**New Navigation Order:**
```typescript
const navigationItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Market Insight", url: "/market", icon: TrendingUp },
  { title: "Risk Management", url: "/risk", icon: Shield },
  { title: "Trade Quality", url: "/ai", icon: Target },
  { title: "Trade Management", url: "/trading", icon: Notebook },
  { title: "Strategy & Rules", url: "/strategies", icon: Lightbulb },
  { title: "Performance", url: "/performance", icon: LineChart }, // NEW
  { title: "Settings", url: "/settings", icon: Settings },
];
```

### 1.2 Update Routes

**File:** `src/App.tsx`

**Changes:**
- Ubah route `/analytics` → `/performance`
- Ubah import path dari `./pages/trading-journey/Performance` → `./pages/Performance`

---

## Phase 2: Create Consolidated Performance Page

### 2.1 Create New Performance Page

**File:** `src/pages/Performance.tsx` (baru, di root pages)

**Structure:**

```typescript
// Key imports
import { useBinanceDailyPnl } from "@/hooks/use-binance-daily-pnl";
import { TradingHeatmap } from "@/components/analytics/TradingHeatmap";
import { DrawdownChart } from "@/components/analytics/DrawdownChart";
import { AIPatternInsights } from "@/components/analytics/AIPatternInsights";
import { CryptoRanking } from "@/components/analytics/CryptoRanking";
import { useStrategyPerformance } from "@/hooks/use-strategy-performance";

export default function Performance() {
  // 5 tabs: overview, daily, strategies, heatmap, ai-insights
  
  // Hooks
  const binanceStats = useBinanceDailyPnl();
  const strategyPerformance = useStrategyPerformance();
  
  return (
    <DashboardLayout>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily P&L</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>
        
        {/* Tab contents */}
      </Tabs>
    </DashboardLayout>
  );
}
```

### 2.2 New: Daily P&L Tab Component

**Location:** Inline in Performance.tsx atau extract ke `src/components/performance/DailyPnLTab.tsx`

**Features:**
- Use `useBinanceDailyPnl()` for 24H stats
- Symbol breakdown table dari `bySymbol`
- Fee breakdown cards
- 7-day mini chart (menggunakan data dari `useBinanceAllIncome` dengan range 7 hari)

---

## Phase 3: Update Dashboard Links

### 3.1 Fix Analytics Quick Action

**File:** `src/pages/Dashboard.tsx`

**Changes:**
- Line 156: Update link dari `/trading-journey/performance` ke `/performance`

```typescript
// Before
<Link to="/trading-journey/performance">

// After
<Link to="/performance">
```

---

## Phase 4: Cleanup

### 4.1 Delete Old Performance File

**File:** `src/pages/trading-journey/Performance.tsx`

**Action:** Delete (konten sudah dipindah ke `src/pages/Performance.tsx`)

---

## Technical Implementation Details

### File Structure After Refactor

```text
src/
├── pages/
│   ├── Performance.tsx          # NEW (consolidated)
│   ├── Dashboard.tsx            # Updated links
│   └── trading-journey/
│       ├── TradingJournal.tsx
│       └── StrategyManagement.tsx
├── components/
│   ├── analytics/               # Existing, reused
│   │   ├── AIPatternInsights.tsx
│   │   ├── CryptoRanking.tsx
│   │   ├── DrawdownChart.tsx
│   │   └── TradingHeatmap.tsx
│   └── performance/             # NEW (optional, for extraction)
│       └── DailyPnLTab.tsx
└── hooks/
    ├── use-binance-daily-pnl.ts  # Existing, reused
    └── use-strategy-performance.ts
```

### New Hook: Extended Daily P&L (Optional Enhancement)

```typescript
// Extend useBinanceDailyPnl to support multi-day range
export function useBinanceWeeklyPnl() {
  const { data: allIncomeData } = useBinanceAllIncome(7, 1000); // 7 days
  
  // Group by day and calculate daily aggregates
  const dailyData = useMemo(() => {
    // ... aggregate logic per day
  }, [allIncomeData]);
  
  return dailyData;
}
```

---

## UI/UX Improvements

### Consistent Patterns
- Semua tabs gunakan pattern icon + hidden label pada mobile
- Loading state menggunakan `MetricsGridSkeleton`
- Empty state menggunakan `EmptyState` component
- InfoTooltips pada metric yang kompleks

### Responsive Design
- Grid 4 cols pada desktop → 2 cols pada tablet → 1 col pada mobile
- Charts height 300px dengan ResponsiveContainer
- Tab labels hidden pada mobile (icon only)

---

## Expected Outcomes

### Consolidation Benefits
- **Single Source of Truth:** Semua analytics di satu tempat
- **Reduced Navigation:** User tidak perlu cari-cari fitur performance
- **Binance Integration:** Daily P&L tab memanfaatkan real-time data

### Information Architecture
- **Before:** Performance scattered (Dashboard 7-day, Today Performance, Performance page)
- **After:** Unified Performance hub dengan 5 focused tabs

### Code Cleanup
- Remove 1 file (`trading-journey/Performance.tsx`)
- Centralize all performance logic
- Reuse existing analytics components

---

## Implementation Order

1. **Update** `AppSidebar.tsx` - Add Performance menu item
2. **Update** `App.tsx` - Change route to `/performance` 
3. **Create** `src/pages/Performance.tsx` - New consolidated page with 5 tabs
4. **Update** `Dashboard.tsx` - Fix Analytics quick action link
5. **Delete** `src/pages/trading-journey/Performance.tsx` - Remove old file
6. **Test** - Verify navigation, tabs, and data display

---

## Not Changed (By Design)

| Item | Reason |
|------|--------|
| Dashboard 7-Day Stats & Portfolio Performance | Serves as quick summary; detailed version in Performance page |
| TodayPerformance component | Used as quick widget in Dashboard |
| Analytics components (`analytics/`) | Reused as-is, no need to move |
