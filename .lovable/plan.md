

# Sidebar Navigation Restructure: Flow-Driven Information Architecture

Reorganize the sidebar from generic groupings to a trader's mental model, reducing cognitive load and aligning with the natural workflow: Research, Trade, Analyze, Strategy.

---

## Current vs Proposed Structure

```text
CURRENT (15 items, 4 groups)          PROPOSED (15 items, 5 groups)
================================      ================================
Dashboard                             Dashboard
Accounts
                                      Research
Market                                  Economic Calendar
  Economic Calendar                     Top Movers
  Top Movers                            Flow & Liquidity
  Flow & Liquidity                      Market Bias
  Market Bias
                                      Trade
Journal                                 Journal
  Trading Journal                       Import & Sync
  Import & Sync                         Risk Calculator

Analytics                             Analyze
  Risk Overview                         Performance
  Performance                           Risk Analytics
  Daily P&L                             Daily P&L
  Heatmap                               Heatmap
  AI Insights                           AI Insights

Tools                                 Strategy
  Risk Calculator                       My Strategies
  My Strategies                         Backtest
  Backtest
  Bulk Export                         Accounts  (bottom standalone)
                                      Settings  (bottom standalone)
Settings                              Bulk Export (inside Accounts tooltip or standalone)
```

---

## Changes

### 1. Rename and Regroup Navigation Array

**File:** `src/components/layout/AppSidebar.tsx`

Replace the `navigationGroups` constant with the new structure:

| Group | Label | Items | Rationale |
|-------|-------|-------|-----------|
| Research | "Research" | Calendar, Top Movers, Flow & Liquidity, Market Bias | Pre-trade analysis tools -- "Market" was too generic |
| Trade | "Trade" | Trading Journal, Import & Sync, Risk Calculator | Input workflow -- Journal + calculator are both trade-time tools |
| Analyze | "Analyze" | Performance, Risk Analytics, Daily P&L, Heatmap, AI Insights | Output analysis -- all performance review in one group |
| Strategy | "Strategy" | My Strategies, Backtest | Growth engine -- will expand with optimization tools |

Key item moves:
- **Risk Calculator**: from Tools to Trade (used during position sizing, not after)
- **Risk Overview**: renamed to "Risk Analytics", stays in Analyze
- **Bulk Export**: moves to a standalone item near Accounts/Settings at bottom
- **Accounts**: moves from top standalone to bottom standalone (alongside Settings and Export)
- **Settings**: stays standalone at bottom

### 2. Move Accounts & Export to Bottom Section

**File:** `src/components/layout/AppSidebar.tsx`

Currently Dashboard and Accounts are both standalone at top. Accounts is not a frequent-access item during trading flow.

Move Accounts and Bulk Export to the bottom section alongside Settings:

```text
[Bottom standalone items]
  Accounts       G A
  Bulk Export     G W
  Settings       G ,
```

This keeps Dashboard as the only top standalone item, reducing initial visual weight.

### 3. Default Collapse State

**File:** `src/components/layout/AppSidebar.tsx`

Set `defaultOpen` per group based on frequency:
- Research: `true` (checked before trading)
- Trade: `true` (primary workflow)
- Analyze: `true` (post-trade review)
- Strategy: `false` (used less frequently, reduces initial item count from 15 to 13 visible)

### 4. Update Memory Documentation

The memory `ui/professional-dashboard-design-system` references the old groupings (Portfolio, Journal, Analytics, Tools / Market). This will need updating after implementation to reflect the new Research, Trade, Analyze, Strategy taxonomy.

---

## Technical Details

### Navigation Array Change

```typescript
const navigationGroups = [
  {
    title: "Research",
    items: [
      { title: "Economic Calendar", url: "/calendar", icon: Calendar },
      { title: "Top Movers", url: "/top-movers", icon: Flame },
      { title: "Flow & Liquidity", url: "/market-data", icon: BarChart3 },
      { title: "Market Bias", url: "/market", icon: TrendingUp },
    ],
  },
  {
    title: "Trade",
    items: [
      { title: "Trading Journal", url: "/trading", icon: Notebook },
      { title: "Import & Sync", url: "/import", icon: Download },
      { title: "Risk Calculator", url: "/calculator", icon: Calculator },
    ],
  },
  {
    title: "Analyze",
    items: [
      { title: "Performance", url: "/performance", icon: LineChart },
      { title: "Risk Analytics", url: "/risk", icon: Shield },
      { title: "Daily P&L", url: "/daily-pnl", icon: DollarSign },
      { title: "Heatmap", url: "/heatmap", icon: Grid3X3 },
      { title: "AI Insights", url: "/ai-insights", icon: Brain },
    ],
  },
  {
    title: "Strategy",
    items: [
      { title: "My Strategies", url: "/strategies", icon: Lightbulb },
      { title: "Backtest", url: "/backtest", icon: Play },
    ],
  },
];
```

### Bottom Standalone Section

Move Accounts from the top `SidebarMenu` block to the bottom block alongside Settings and add Bulk Export:

```typescript
{/* Bottom standalone: Accounts, Export, Settings */}
<SidebarMenu className="px-2">
  <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={...} className="group/nav-item">
      <Link to="/accounts">Accounts</Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
  <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={...} className="group/nav-item">
      <Link to="/export">Bulk Export</Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
  <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={...} className="group/nav-item">
      <Link to="/settings">Settings</Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
</SidebarMenu>
```

### No Route Changes

All URLs (`/trading`, `/risk`, `/calendar`, etc.) remain identical. This is purely a sidebar presentation change. No changes to `App.tsx` routing.

### localStorage Migration

The `NavGroup` component uses group titles as localStorage keys for collapse state. Changing group titles (Market to Research, Tools to Strategy, etc.) means old persisted states won't match. This is harmless -- groups will fall back to `defaultOpen` on first load with new titles.

---

## Files Modified

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | New navigation groups; move Accounts/Export to bottom; Strategy defaults collapsed |

## What Does NOT Change

- All route URLs (no App.tsx changes)
- NavGroup component logic
- Keyboard shortcuts
- Collapsed/icon mode behavior
- Mobile sidebar behavior
- Footer (Wallet + NavUser)
