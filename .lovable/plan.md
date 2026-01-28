

# Sidebar Refactor Plan - Align with Markdown Specification

## Gap Analysis

### Markdown Specification (Single Source of Truth)
```text
DASHBOARD
TRADE MANAGEMENT
STRATEGY & RULES
ANALYTICS
RISK MANAGEMENT
CALENDAR & MARKET
AI ASSISTANT
SETTINGS
```

### Current Implementation
```text
General:
  - Dashboard
  - Accounts

Trading Journey (collapsible):
  - Summary
  - Journal
  - Sessions
  - Analytics
  - Strategies
  - AI Insights

Risk Management:
  - Risk Dashboard
```

### Key Differences

| Markdown Spec | Current | Action Required |
|---------------|---------|-----------------|
| DASHBOARD | Dashboard (/) | Keep, update icon |
| TRADE MANAGEMENT | Trading Summary + Journal | Merge into single menu |
| STRATEGY & RULES | Strategies | Rename menu |
| ANALYTICS | Analytics + Sessions | Keep Analytics, Sessions as sub-item |
| RISK MANAGEMENT | Risk Dashboard | Already exists |
| CALENDAR & MARKET | Missing | Create placeholder page |
| AI ASSISTANT | AI Insights (sub-menu) | Promote to main menu |
| SETTINGS | Settings (exists but not in sidebar) | Add to sidebar |
| Accounts | Exists in sidebar | Keep (important for trading accounts) |

---

## Proposed New Navigation Structure

```text
DASHBOARD (/)
  - Portfolio overview, today's performance, AI insights widget

TRADE MANAGEMENT (/trading)
  - Trade entry wizard (Journal functionality)
  - Open positions
  - Trade history

STRATEGY & RULES (/trading/strategies)
  - Strategy management
  - Entry/exit rules

ANALYTICS (/trading/analytics)
  - Performance metrics
  - Sessions (as tab or sub-route)
  - Charts & statistics

RISK MANAGEMENT (/risk)
  - Risk dashboard
  - Position calculator
  - Daily loss tracking

CALENDAR & MARKET (/market) [NEW - Placeholder]
  - Economic calendar (placeholder)
  - Market analysis (placeholder)

ACCOUNTS (/accounts)
  - Trading accounts management

AI ASSISTANT (/ai) [NEW - Dedicated Page]
  - Full AI chatbot interface
  - Trade analysis history

SETTINGS (/settings)
  - User preferences
  - Risk profile settings
```

---

## Implementation Details

### 1. Update AppSidebar.tsx Navigation Structure

**From:**
```typescript
const navigationGroups: NavGroup[] = [
  {
    label: "General",
    key: "general",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Accounts", url: "/accounts", icon: Building2 },
    ],
  },
  {
    label: "Trading Journey",
    key: "trading",
    collapsible: true,
    items: [...],
  },
  {
    label: "Risk Management",
    key: "risk",
    items: [...],
  },
];
```

**To (Flat structure per Markdown):**
```typescript
const navigationItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Trade Management", url: "/trading", icon: Notebook },
  { title: "Strategy & Rules", url: "/trading/strategies", icon: Lightbulb },
  { title: "Analytics", url: "/trading/analytics", icon: BarChart3 },
  { title: "Risk Management", url: "/risk", icon: Shield },
  { title: "Calendar & Market", url: "/market", icon: Calendar },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "AI Assistant", url: "/ai", icon: Bot },
  { title: "Settings", url: "/settings", icon: Settings },
];
```

### 2. Route Updates Required

| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard.tsx | Exists |
| `/trading` | TradingJournal.tsx (rename from TradingSummary) | Merge |
| `/trading/strategies` | StrategyManagement.tsx | Exists |
| `/trading/analytics` | Performance.tsx (add sessions tab) | Rename route |
| `/trading/sessions/:id` | SessionDetail.tsx | Keep for detail |
| `/risk` | RiskManagement.tsx | Exists |
| `/market` | MarketCalendar.tsx | NEW placeholder |
| `/accounts` | Accounts.tsx | Exists |
| `/ai` | AIAssistant.tsx | NEW page (full AI interface) |
| `/settings` | Settings.tsx | Exists |

### 3. Files to Create

| File | Purpose |
|------|---------|
| `src/pages/MarketCalendar.tsx` | Placeholder for Calendar & Market |
| `src/pages/AIAssistant.tsx` | Full-page AI assistant interface |

### 4. Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Restructure navigation to flat 9-item menu |
| `src/App.tsx` | Add new routes (/market, /ai), update /trading/analytics |
| `src/pages/trading-journey/Performance.tsx` | Add Sessions as tab (merge functionality) |

### 5. Files to Consider Removing (Consolidation)

| File | Reason |
|------|--------|
| `src/pages/trading-journey/TradingSummary.tsx` | Merge into TradingJournal or Dashboard |
| `src/pages/trading-journey/Insights.tsx` | Move to AI Assistant page |

---

## Visual Comparison

### Current Sidebar
```text
┌────────────────────────┐
│ Trading Journey        │
├────────────────────────┤
│ General                │
│   Dashboard            │
│   Accounts             │
├────────────────────────┤
│ Trading Journey ▼      │
│   Summary              │
│   Journal              │
│   Sessions             │
│   Analytics            │
│   Strategies           │
│   AI Insights          │
├────────────────────────┤
│ Risk Management        │
│   Risk Dashboard       │
└────────────────────────┘
```

### Proposed Sidebar (Per Markdown)
```text
┌────────────────────────┐
│ Trading Journey        │
├────────────────────────┤
│ Dashboard              │
│ Trade Management       │
│ Strategy & Rules       │
│ Analytics              │
│ Risk Management        │
│ Calendar & Market      │
│ Accounts               │
│ AI Assistant           │
│ Settings               │
└────────────────────────┘
```

---

## Technical Notes

### Icon Mapping
- Dashboard: `LayoutDashboard`
- Trade Management: `Notebook` or `ClipboardList`
- Strategy & Rules: `Lightbulb` or `Target`
- Analytics: `BarChart3` or `TrendingUp`
- Risk Management: `Shield` or `AlertTriangle`
- Calendar & Market: `Calendar`
- Accounts: `Building2` or `Wallet`
- AI Assistant: `Bot` or `Brain`
- Settings: `Settings`

### Assumptions
1. "Calendar & Market" will be a placeholder page initially (marked "Coming Soon")
2. AI Assistant page will contain the existing AIChatbot component in a full-page layout
3. Sessions functionality will be merged as a tab in Analytics rather than separate menu

### Trade-offs
1. **Flat vs Grouped**: Markdown spec shows flat menu, current implementation has groups. Following Markdown means removing collapsible groups.
2. **Fewer clicks vs Organization**: Flat menu = 1 click to any page, but loses visual grouping.
3. **Sessions consolidation**: Merging Sessions into Analytics reduces menu items but may require UI adjustments.

---

## Implementation Order

1. Create placeholder pages (MarketCalendar.tsx, AIAssistant.tsx)
2. Update App.tsx with new routes
3. Refactor AppSidebar.tsx to flat navigation structure
4. Update Performance.tsx to include Sessions tab
5. Test all navigation links
6. Remove unused pages/routes

