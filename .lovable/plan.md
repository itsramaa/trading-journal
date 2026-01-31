# Page Structure Evaluation - Implementation Status

## ✅ PHASE 1 COMPLETED

### Implementation Summary (Phase 1)

| Page | Status | Changes Made |
|------|--------|--------------|
| Dashboard | ✅ Done | Removed 7-Day Stats, Analytics Summary, Strategy Clone Stats, Today Performance, Market Sessions |
| Trading Journal | ✅ Done | Removed Portfolio Performance cards (Win Rate, PF, Expectancy) |
| Performance | ✅ Done | Added SevenDayStatsCard component at top of Overview tab |

### Files Modified
- `src/pages/Dashboard.tsx` - Streamlined widget layout
- `src/pages/trading-journey/TradingJournal.tsx` - Removed analytics metrics
- `src/pages/Performance.tsx` - Added 7-Day Stats import
- `src/components/analytics/SevenDayStatsCard.tsx` - NEW component
- `src/pages/trading-journey/StrategyManagement.tsx` - Added StrategyCloneStatsWidget

---

## ✅ PHASE 2 PARTIALLY COMPLETED

### Strategy Page - Clone Stats Widget ✅
- Added `StrategyCloneStatsWidget` import
- Positioned at top of Library tab (before StrategyStats)

### Remaining Phase 2 Tasks
- [ ] AI Insights - Remove duplicate Quick Stats
- [ ] Risk Management - Collapse correlation matrix by default

## Phase 3: LOW PRIORITY
- [ ] Trade History - Add saved filters
- [ ] Accounts - Add risk settings link

---

# Original Audit Document

## Executive Summary

Dokumen ini adalah **audit sistematis** terhadap struktur konten dan urutan card/section di setiap page berdasarkan tiga kriteria prioritas:
1. **Entry Point & User Frequency** - Seberapa sering page diakses
2. **Domain Criticality** - Kebenaran data dan dampak finansial
3. **Dependency Chain** - Page yang menjadi fondasi bagi page lain

---

## Part 1: Domain Hierarchy Analysis

### Dependency Matrix (dari docs/ARCHITECTURE.md)

```text
ENTRY FREQUENCY (estimated)
┌────────────────────────────────────────────────────┐
│ DASHBOARD ──── HIGH ──── Entry point utama         │
│ JOURNAL ────── HIGH ──── Core daily workflow       │
│ ACCOUNTS ───── MEDIUM ── Balance check             │
│ RISK ───────── MEDIUM ── Pre-trade validation      │
│ ANALYTICS ──── MEDIUM ── Weekly/Monthly review     │
│ MARKET ─────── MEDIUM ── Context check             │
│ STRATEGY ───── LOW ───── Setup phase               │
│ SETTINGS ───── LOW ───── One-time config           │
└────────────────────────────────────────────────────┘

DEPENDENCY CHAIN (Data Flow)
┌────────────────────────────────────────────────────┐
│ ACCOUNTS (Foundation) ─→ Balance, Capital          │
│     ↓                                              │
│ JOURNAL (Core) ────────→ Trade Entries             │
│     ↓                                              │
│ ANALYTICS ─────────────→ Performance Metrics       │
│     ↓                                              │
│ DASHBOARD (Aggregation) ─→ Unified View            │
└────────────────────────────────────────────────────┘
```

---

## Part 2: Page-by-Page Evaluation

### PAGE 1: Dashboard (`/`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Memberikan snapshot cepat kondisi trading hari ini: capital, P&L, posisi aktif, risk status |
| **Primary Question** | "Bagaimana kondisi trading saya sekarang dan apakah aman untuk trade?" |
| **Secondary Intent** | Quick navigation ke task berikutnya (entry trade, check history, risk settings) |
| **Domain Role** | Aggregation layer - konsumsi data dari SEMUA domain lain |

**✅ Intent Clear** - Dashboard sudah tepat sebagai hub overview.

#### Step 2 - Content Inventory

| Section | Purpose | Data Source | Domain |
|---------|---------|-------------|--------|
| 1. Portfolio Overview Card | Total Capital, Today P&L, Weekly P&L, Win Rate | Binance + trade_entries | ACCOUNTS + ANALYTICS |
| 2. 7-Day Stats (4 cards) | Streak, Trades count, Best/Worst day | trade_entries | ANALYTICS |
| 3. Smart Quick Actions | Context-aware CTAs (New Trade, Check Risk) | Multiple hooks | PLATFORM |
| 4. Dashboard Analytics Summary | Sparkline, metrics summary | trade_entries | ANALYTICS |
| 5. Market Score Widget | Trading bias, F&G, event warnings | Market APIs | MARKET |
| 6. Strategy Clone Stats | Clone notification counts | strategies | STRATEGY |
| 7. System Status Indicator | Binance connection, API health | Connection status | PLATFORM |
| 8. Market Sessions Widget | Active trading sessions | Time-based | MARKET |
| 9. Active Positions Card | Open Binance positions | Binance API | JOURNAL |
| 10. Pro Tip | Keyboard shortcuts hint | Static | PLATFORM |
| 11. Today Performance | Today's trades breakdown | Binance + trades | JOURNAL |
| 12. Risk & AI Insights section | Risk Summary + ADL + AI Insights | Risk + AI | RISK + AI |
| 13. Trading Journey CTA | Empty state for new users | Conditional | ONBOARDING |

#### Step 3 - Ordering & Hierarchy Analysis

**Current Order:**
```text
1. Header
2. Portfolio Overview     ✅ Correct - most critical info first
3. 7-Day Stats           ⚠️ Question: Belongs here or Analytics?
4. Smart Quick Actions   ✅ Correct - action-oriented after context
5. Analytics Summary     ⚠️ Redundant with Portfolio Overview?
6. Market Score Widget   ✅ Correct - decision-making context
7. Strategy Clone Stats  ❌ Problem - Very niche, rarely needed
8. System Status         ✅ Correct - system health
9. Market Sessions       ⚠️ Question: Critical enough for Dashboard?
10. Active Positions     ✅ Correct - need to see open trades
11. Pro Tip              ✅ Correct - unobtrusive helper
12. Today Performance    ⚠️ Overlap with Portfolio Overview?
13. Risk & AI Insights   ✅ Correct - safety last check
```

#### Step 4 - Placement Decision Framework

| Widget | Current | Decision | Reasoning |
|--------|---------|----------|-----------|
| Portfolio Overview | Dashboard | **KEEP** | Critical - primary question answer |
| 7-Day Stats | Dashboard | **MOVE to Analytics** | Supporting detail, not daily-critical |
| Smart Quick Actions | Dashboard | **KEEP** | Action enabler |
| Analytics Summary | Dashboard | **REMOVE or MERGE** | Redundant with Portfolio Overview |
| Market Score Widget | Dashboard | **KEEP** | Decision-critical context |
| Strategy Clone Stats | Dashboard | **MOVE to Strategy page** | Niche, low daily value |
| System Status | Dashboard | **KEEP but MINIMIZE** | Important but not primary |
| Market Sessions | Dashboard | **CONDITIONAL** | Show only if positions open |
| Active Positions | Dashboard | **KEEP** | Critical for active traders |
| Today Performance | Dashboard | **MERGE with Portfolio Overview** | Overlapping information |
| Risk & AI Insights | Dashboard | **KEEP** | Safety checkpoint |

#### Step 5 - Recommendations

**Dashboard Restructure:**

```text
PROPOSED ORDER:
┌─────────────────────────────────────────────────────┐
│ 1. Portfolio Overview Card (Enhanced)               │
│    - Merge "Today Performance" metrics here         │
│    - Total Capital | Today Net P&L | Win Rate       │
├─────────────────────────────────────────────────────┤
│ 2. Smart Quick Actions                              │
│    - Context-aware, risk-gated                      │
├─────────────────────────────────────────────────────┤
│ 3. Active Positions (IF ANY)                        │
│    - Binance positions grid                         │
├─────────────────────────────────────────────────────┤
│ 4. Market Score Widget                              │
│    - Trading bias for the day                       │
├─────────────────────────────────────────────────────┤
│ 5. Risk Summary + ADL Risk (Grid)                   │
│    - Daily loss tracker compact                     │
├─────────────────────────────────────────────────────┤
│ 6. System Status (Compact bar)                      │
│    - Binance connected indicator                    │
├─────────────────────────────────────────────────────┤
│ 7. AI Insights Widget                               │
│    - Pattern alerts, recommendations                │
└─────────────────────────────────────────────────────┘

REMOVED FROM DASHBOARD:
- 7-Day Stats → Analytics domain (/performance)
- Analytics Summary → Merged into Portfolio Overview
- Strategy Clone Stats → Strategy domain (/strategies)
- Market Sessions → Conditional or removed
- Pro Tip → Keep but make dismissible
- Today Performance → Merged into Portfolio Overview
```

---

### PAGE 2: Trading Journal (`/trading`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Manage active/pending trades, entry new trades |
| **Primary Question** | "Apa posisi saya yang sedang berjalan dan bagaimana meng-enrich data?" |
| **Secondary Intent** | Track P&L dari posisi open |
| **Domain Role** | Core operational page - trade lifecycle hub |

**✅ Intent Clear**

#### Step 2 - Content Inventory

| Section | Purpose | Data Source |
|---------|---------|-------------|
| 1. Header + New Trade Button | Page title, primary CTA | - |
| 2. Pro Tip | Journal best practices | Static |
| 3. Portfolio Performance (3 cards) | Win Rate, Profit Factor, Expectancy | trade_entries |
| 4. Trade Entry Wizard (Dialog) | Multi-step trade creation | Multiple |
| 5. P&L Summary Stats | Open vs Closed positions summary | Binance + trades |
| 6. Trade Management Card | Tabs: Pending / Active positions table | Binance + trades |

#### Step 3 - Ordering & Hierarchy Analysis

**Current Order Assessment:**
```text
1. Header + CTA            ✅ Correct
2. Pro Tip                 ⚠️ Position after header good, but clutters
3. Portfolio Performance   ❌ Problem - This is ANALYTICS, not JOURNAL
4. P&L Summary Stats       ✅ Correct - operational context
5. Trade Management        ✅ Correct - core functionality
```

#### Step 4 - Placement Decision Framework

| Widget | Decision | Reasoning |
|--------|----------|-----------|
| Portfolio Performance (Win Rate, PF, Expectancy) | **MOVE to Performance page** | Analytics metrics, not operational |
| P&L Summary Stats | **KEEP** | Operational context for trading decisions |
| Trade Management Tabs | **KEEP** | Core functionality |

#### Step 5 - Recommendations

```text
PROPOSED ORDER:
┌─────────────────────────────────────────────────────┐
│ 1. Header + "New Trade" Button                      │
├─────────────────────────────────────────────────────┤
│ 2. P&L Summary Stats (3 cards - Open/Closed/Binance)│
│    - Open Positions count + Unrealized P&L          │
│    - Closed Today count + Realized P&L              │
├─────────────────────────────────────────────────────┤
│ 3. Trade Management Card                            │
│    - Tabs: Pending | Active                         │
│    - Unified table with actions                     │
├─────────────────────────────────────────────────────┤
│ 4. Pro Tip (Collapsible/Dismissible)                │
└─────────────────────────────────────────────────────┘

REMOVED:
- Portfolio Performance (Win Rate, PF, Expectancy) → /performance
```

---

### PAGE 3: Accounts (`/accounts`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | View wallet balance, manage paper accounts |
| **Primary Question** | "Berapa modal saya saat ini dan bagaimana statusnya?" |
| **Domain Role** | Foundation - capital source of truth |

**✅ Intent Clear**

#### Step 2 - Content Inventory

| Section | Purpose | Data Source |
|---------|---------|-------------|
| 1. Overview Cards (3) | Total Accounts, Balance, Active Positions | Binance API |
| 2. Tabs: Accounts / Transactions / Financial | Segmented views | Multiple |
| 3. Binance Futures Section | Live wallet details (3 cards) | Binance API |
| 4. Paper Trading Section | List of paper accounts | Local DB |

#### Step 3 - Analysis

**Current Structure Assessment:**
```text
1. Overview Cards         ✅ Correct - summary first
2. Binance Section        ✅ Correct - primary account
3. Paper Trading Section  ✅ Correct - secondary accounts
4. Tabs (Transactions/Financial) ✅ Correct - supporting data in tabs
```

**✅ WELL STRUCTURED** - Accounts page sudah mengikuti prinsip yang benar.

#### Step 5 - Minor Recommendations

- Consider moving "Financial Summary" tab content to a collapsible section within Accounts tab for discoverability
- Add quick link to "Risk Settings" since balance impacts daily loss limits

---

### PAGE 4: Risk Management (`/risk`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Configure risk limits, monitor daily loss |
| **Primary Question** | "Berapa loss saya hari ini vs limit, dan apakah saya boleh trade?" |
| **Domain Role** | Guardian - trading gate enforcement |

**✅ Intent Clear**

#### Step 2 - Content Inventory

**Tab: Overview**
| Section | Purpose |
|---------|---------|
| Quick Tip | Daily loss explanation |
| Daily Loss Tracker | Real-time loss monitoring |
| Risk Profile Summary | Current settings |
| Risk Alerts | Recent events |
| Correlation Matrix | Position correlation |

**Tab: Settings**
| Section | Purpose |
|---------|---------|
| Risk Settings Form | Configure limits |

**Tab: History**
| Section | Purpose |
|---------|---------|
| Risk Event Log | Historical alerts |

#### Step 3 - Analysis

**Current Tab Structure Assessment:**
```text
Overview Tab:
1. Quick Tip             ✅ Context helper
2. Daily Loss Tracker    ✅ Most critical - correct position
3. Risk Profile + Alerts ✅ Supporting context
4. Correlation Matrix    ⚠️ Question: Is this critical enough?

Settings Tab:           ✅ Correct separation
History Tab:            ✅ Correct separation
```

#### Step 5 - Recommendations

```text
PROPOSED ORDER (Overview Tab):
┌─────────────────────────────────────────────────────┐
│ 1. Daily Loss Tracker (PROMINENT)                   │
│    - Visual gauge: 0% → 70% → 100%                  │
│    - Clear "STOP TRADING" at 100%                   │
├─────────────────────────────────────────────────────┤
│ 2. Risk Profile Summary + Quick Edit Link           │
├─────────────────────────────────────────────────────┤
│ 3. Risk Alerts (Recent 3)                           │
├─────────────────────────────────────────────────────┤
│ 4. Correlation Matrix (Collapsible - ADVANCED)      │
│    - Default collapsed, label "Advanced Analysis"   │
└─────────────────────────────────────────────────────┘
```

**Reasoning:** Correlation Matrix adalah fitur advanced yang tidak semua trader paham. Menyembunyikannya secara default mengurangi cognitive load.

---

### PAGE 5: Performance (`/performance`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Deep-dive into trading performance metrics |
| **Primary Question** | "Seberapa baik performa trading saya selama periode tertentu?" |
| **Domain Role** | Analytics - post-hoc analysis |

**✅ Intent Clear**

#### Step 2 - Content Inventory

| Section | Purpose |
|---------|---------|
| 1. Filters (Date, Strategy, Event Days) | Scope selection |
| 2. Key Metrics (4 cards) | Win Rate, PF, Expectancy, Max DD |
| 3. Additional Metrics (4 cards) | Sharpe, Avg RR, Total Trades, Total P&L |
| 4. Equity Curve with Events | Chart with annotations |
| 5. Drawdown Chart | Visual drawdown tracking |
| 6. Trading Heatmap | Hour/Day performance grid |
| 7. Contextual Charts (F&G, Volatility, Event) | Context-based performance |
| 8. Combined Contextual Score | Unified context indicator |

**Tab: Strategies**
| Section | Purpose |
|---------|---------|
| Strategy Performance Cards | Per-strategy metrics |

#### Step 3 - Analysis

**Issue Identified:**
```text
❌ TOO MUCH INFORMATION - 8+ distinct visualizations on one tab
❌ Context switching between metrics and charts is jarring
❌ Contextual charts (F&G, Volatility) overlap with AI Insights page
```

#### Step 5 - Recommendations

**Option A: Tab Restructure**
```text
TAB 1: Overview
- Key Metrics (4 cards)
- Equity Curve (primary chart)
- Drawdown Chart

TAB 2: Detailed Analysis
- Additional Metrics
- Trading Heatmap
- Contextual Score

TAB 3: Strategies (existing)
```

**Option B: Move Contextual Analysis**
```text
- Move F&G Zone Chart, Volatility Chart, Event Day Comparison
  → AI Insights page (where contextual analysis belongs)
- Keep Performance focused on CORE metrics only
```

**Recommended: Option B** - Cleaner separation of concerns.

---

### PAGE 6: Trade History (`/history`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Review and enrich closed trades |
| **Primary Question** | "Apa trade yang sudah saya close dan bagaimana meng-enrich untuk journaling?" |
| **Domain Role** | Journal - historical review and enrichment |

**✅ Intent Clear**

#### Step 2 - Content Inventory

| Section | Purpose |
|---------|---------|
| 1. Header + Stats (Trades/P&L/Win Rate) | Quick summary |
| 2. Comprehensive Filters | Date, Result, Direction, Strategy, Pairs |
| 3. Tabs: All / Binance / Paper / Import | Source segmentation |
| 4. Trade Cards List | Detailed trade entries |

#### Step 3 - Analysis

```text
✅ Header stats provide quick context
✅ Filters are comprehensive but may be overwhelming
✅ Tabs logically segment data sources
```

#### Step 5 - Recommendations

- Consider adding "Saved Filters" functionality for frequent filter combinations
- Add "Sort by Date" as default (currently sort by AI is optional)

**✅ WELL STRUCTURED** - Trade History sudah mengikuti prinsip yang benar.

---

### PAGE 7: Daily P&L (`/daily-pnl`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Granular P&L breakdown per day/symbol |
| **Primary Question** | "Berapa P&L detail saya hari ini/minggu ini per simbol?" |

**✅ Intent Clear**

#### Step 2 - Content Inventory

| Section | Purpose |
|---------|---------|
| 1. Today's P&L Summary | Real-time today stats |
| 2. Week Comparison (4 cards) | This week vs last week |
| 3. Best/Worst Trade (2 cards) | Extremes this week |
| 4. 7-Day Trend Chart | Daily P&L bars |
| 5. Symbol Breakdown | Per-symbol performance |

#### Step 3 - Analysis

```text
✅ Progressive disclosure: Today → Week → Detail
✅ Logical flow from summary to breakdown
```

**✅ WELL STRUCTURED**

---

### PAGE 8: AI Insights (`/ai-insights`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | AI-detected patterns and actionable recommendations |
| **Primary Question** | "Apa yang AI temukan tentang pola trading saya?" |

#### Step 2 - Content Inventory

**Tab: Pattern Analysis**
| Section | Purpose |
|---------|---------|
| Quick Stats (4 cards) | P&L, Win Rate, PF, Streak |
| Pattern Analysis | AI-detected patterns |
| Action Items | Prioritized recommendations |
| Pair Performance Rankings | Asset rankings |
| Emotional Pattern Analysis | Psychology patterns |

**Tab: Contextual Performance**
| Section | Purpose |
|---------|---------|
| Contextual charts | F&G, Volatility, Event impact |

#### Step 3 - Analysis

```text
❌ OVERLAP: Quick Stats (4 cards) duplicate Performance page
❌ OVERLAP: Contextual Performance tab duplicates Performance page charts
```

#### Step 5 - Recommendations

```text
PROPOSED RESTRUCTURE:
┌─────────────────────────────────────────────────────┐
│ AI Insights - Focus on AI-GENERATED content only    │
├─────────────────────────────────────────────────────┤
│ 1. Action Items (TOP PRIORITY)                      │
│    - "Stop trading X pair"                          │
│    - "Review entry criteria"                        │
├─────────────────────────────────────────────────────┤
│ 2. Pattern Analysis                                 │
│    - AI-detected insights                           │
├─────────────────────────────────────────────────────┤
│ 3. Pair Rankings                                    │
│    - Best/Worst performing pairs                    │
├─────────────────────────────────────────────────────┤
│ 4. Emotional/Psychological Patterns                 │
│    - Behavioral insights                            │
├─────────────────────────────────────────────────────┤
│ 5. Contextual Performance                           │
│    - Market condition impact analysis               │
└─────────────────────────────────────────────────────┘

REMOVED:
- Quick Stats (4 cards) → Already in /performance
```

---

### PAGE 9: Market Data (`/market-data`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Real-time market data and opportunities |
| **Primary Question** | "Apa kondisi pasar saat ini dan peluang apa yang ada?" |

#### Step 2 - Content Inventory

| Section | Purpose |
|---------|---------|
| 1. Market Sentiment Widget | Symbol sentiment with selector |
| 2. Volatility Meter + Whale Tracking | Grid of 2 widgets |
| 3. Trading Opportunities | Asset opportunities list |
| 4. Data Quality Footer | Data freshness indicator |

#### Step 3 - Analysis

```text
✅ Logical grouping: Sentiment → Volatility/Whale → Opportunities
✅ Good progressive disclosure
```

**✅ WELL STRUCTURED**

---

### PAGE 10: Strategy Management (`/strategies`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Create and manage trading strategies |
| **Primary Question** | "Apa strategi saya dan bagaimana performanya?" |

#### Step 2 - Content Inventory

**Tab: Library**
| Section | Purpose |
|---------|---------|
| Strategy Stats (summary cards) | Overview metrics |
| Strategy Cards Grid | Strategy list with actions |

**Tab: Leaderboard**
| Section | Purpose |
|---------|---------|
| Public strategy rankings | Community strategies |

**Tab: Import**
| Section | Purpose |
|---------|---------|
| YouTube importer | AI strategy extraction |

#### Step 3 - Analysis

```text
✅ Good tab separation
⚠️ Strategy Clone Stats should be HERE, not Dashboard
```

#### Step 5 - Recommendations

- Move "Strategy Clone Stats" widget from Dashboard to this page
- Add "Market Fit" indicator on strategy cards (from useStrategyContext)

---

### PAGE 11: Risk Calculator (`/calculator`)

#### Step 1 - Page Intent Validation

| Aspect | Analysis |
|--------|----------|
| **Primary Intent** | Calculate position size before entering trade |
| **Primary Question** | "Berapa position size yang optimal untuk setup ini?" |

#### Step 2 - Content Inventory

| Section | Purpose |
|---------|---------|
| 1. Market Score Widget (compact) | Trading bias context |
| 2. Context Warnings | Event/Volatility alerts |
| 3. Tabs: Calculator / Volatility SL | Calculation options |
| 4. Calculator Inputs | Entry, SL, Risk % |
| 5. Calculator Results | Position size output |
| 6. Commission Rates | Real-time fees |
| 7. Risk Adjustment Breakdown | Multiplier visualization |

#### Step 3 - Analysis

```text
✅ Market context before calculation (good UX)
✅ Tab separation for SL suggestions
✅ Good progressive disclosure
```

**✅ WELL STRUCTURED**

---

## Part 3: Cross-Page Redundancy Analysis

### Identified Redundancies

| Content | Appears In | Primary Location | Should Remove From |
|---------|------------|------------------|-------------------|
| Win Rate, PF, Expectancy cards | Dashboard, Journal, Performance, AI Insights | Performance | Dashboard, Journal, AI Insights |
| 7-Day Stats | Dashboard | Analytics domain | Dashboard |
| Strategy Clone Stats | Dashboard | Strategy | Dashboard |
| Contextual Charts (F&G, Vol) | Performance, AI Insights | AI Insights | Performance |
| Today P&L details | Dashboard, Daily P&L | Daily P&L | Dashboard (keep summary only) |

---

## Part 4: Priority Implementation Order

Based on Domain Criticality and User Frequency:

```text
PHASE 1 - HIGH PRIORITY (Dependency Chain)
┌────────────────────────────────────────────────────┐
│ 1. Dashboard - Remove redundancies, streamline     │
│ 2. Trading Journal - Remove analytics metrics      │
│ 3. Performance - Consolidate contextual charts     │
└────────────────────────────────────────────────────┘

PHASE 2 - MEDIUM PRIORITY (Optimization)
┌────────────────────────────────────────────────────┐
│ 4. AI Insights - Remove duplicate stats            │
│ 5. Risk Management - Collapse correlation matrix   │
│ 6. Strategy - Add clone stats from Dashboard       │
└────────────────────────────────────────────────────┘

PHASE 3 - LOW PRIORITY (Polish)
┌────────────────────────────────────────────────────┐
│ 7. Trade History - Add saved filters               │
│ 8. Market Data - No changes needed                 │
│ 9. Accounts - Minor enhancement                    │
└────────────────────────────────────────────────────┘
```

---

## Part 5: Summary Decision Matrix

| Page | Status | Changes Required |
|------|--------|------------------|
| Dashboard | ⚠️ Needs Work | Remove 7-Day Stats, Analytics Summary, Strategy Clone Stats, merge Today Performance |
| Trading Journal | ⚠️ Needs Work | Remove Portfolio Performance cards |
| Accounts | ✅ Good | Minor: Add risk settings link |
| Risk Management | ⚠️ Minor | Collapse correlation matrix by default |
| Performance | ⚠️ Needs Work | Move contextual charts to AI Insights |
| Trade History | ✅ Good | Optional: Add saved filters |
| Daily P&L | ✅ Good | No changes |
| AI Insights | ⚠️ Needs Work | Remove duplicate quick stats |
| Market Data | ✅ Good | No changes |
| Market Insight | ✅ Good | No changes |
| Strategy | ⚠️ Minor | Add clone stats widget |
| Risk Calculator | ✅ Good | No changes |

---

## Technical Notes

- Semua rekomendasi bersifat **additive** (menambah) atau **subtractive** (menghapus), bukan restructuring fundamental
- Perubahan fokus pada **content relocation**, bukan perubahan arsitektur
- Prioritas utama: mengurangi redundansi dan meningkatkan progressive disclosure

