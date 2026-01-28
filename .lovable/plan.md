

# Plan: Reorganisasi Navbar dan Dashboard

## Objective

1. Mengubah urutan navigation sidebar sesuai spesifikasi baru
2. Memisahkan "Calendar & Market" menjadi 2 page terpisah: "Calendar" dan "Market Insight"
3. Mengubah urutan section di Dashboard dan menghapus Total Balance dari Accounts

---

## 1. Perubahan Navigation Sidebar

### Urutan Lama → Baru

| # | Lama | Baru |
|---|------|------|
| 1 | Dashboard | Dashboard |
| 2 | Trade Management | Accounts |
| 3 | Strategy & Rules | Calendar |
| 4 | Analytics | Market Insight |
| 5 | Risk Management | Risk Management |
| 6 | Calendar & Market | Trade Management |
| 7 | Accounts | Strategy & Rules |
| 8 | Trade Quality | Trade Quality |
| 9 | Settings | Settings |

**Catatan:** Analytics dihapus dari navbar utama (tetap accessible via route /analytics)

### File: `src/components/layout/AppSidebar.tsx`

```typescript
const navigationItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Market Insight", url: "/market", icon: TrendingUp },
  { title: "Risk Management", url: "/risk", icon: Shield },
  { title: "Trade Management", url: "/trading", icon: Notebook },
  { title: "Strategy & Rules", url: "/strategies", icon: Lightbulb },
  { title: "Trade Quality", url: "/ai", icon: Target },
  { title: "Settings", url: "/settings", icon: Settings },
];
```

---

## 2. Split Calendar & Market menjadi 2 Pages

### Page 1: Calendar (`/calendar`)

**File baru:** `src/pages/Calendar.tsx`

Konten:
- Page header: "Calendar"
- Economic Calendar (upcoming events)
- Fokus pada jadwal event ekonomi

### Page 2: Market Insight (`/market`)

**File:** `src/pages/MarketCalendar.tsx` → Rename ke `src/pages/MarketInsight.tsx`

Konten:
- AI Market Sentiment
- Volatility Assessment
- Trading Opportunities
- Whale Tracking

### Router Updates: `src/App.tsx`

```typescript
// Calendar (baru)
<Route path="/calendar" element={
  <ProtectedRoute>
    <Calendar />
  </ProtectedRoute>
} />

// Market Insight (rename dari MarketCalendar)
<Route path="/market" element={
  <ProtectedRoute>
    <MarketInsight />
  </ProtectedRoute>
} />
```

---

## 3. Reorganisasi Dashboard

### Urutan Baru

| # | Section | Keterangan |
|---|---------|------------|
| 1 | Pro Tip | QuickTip component (onboarding) |
| 2 | Quick Actions | 4 buttons: Log Trade, New Session, Risk Check, Analytics |
| 3 | System Status | ALL SYSTEMS NORMAL indicator |
| 4 | Market Sessions | MarketSessionsWidget |
| 5 | Accounts | Account cards (TANPA Total Balance) |
| 6 | Today Activity | TodayPerformance + ActivePositionsTable |
| 7 | Risk & AI Insights | RiskSummaryCard + AIInsightsWidget |
| 8 | Trading Journey | CTA untuk new users / 7-Day Stats + Portfolio Performance |

### Perubahan di Dashboard.tsx

1. **Pindahkan SystemStatusIndicator** dari header ke section tersendiri
2. **Hilangkan Total Balance card** dari section Accounts
3. **Reorder sections** sesuai urutan baru
4. **Pro Tip** ditambahkan di paling atas

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Reorder nav items, add TrendingUp icon |
| `src/pages/Calendar.tsx` | **CREATE** - Economic calendar only |
| `src/pages/MarketInsight.tsx` | **CREATE** - AI market features (dari MarketCalendar) |
| `src/pages/MarketCalendar.tsx` | **DELETE** - diganti MarketInsight |
| `src/App.tsx` | Update routes (add /calendar, update imports) |
| `src/pages/Dashboard.tsx` | Reorder sections, remove Total Balance |

---

## Technical Details

### Calendar.tsx Structure

```text
Calendar Page
├── Page Header
│   ├── Title: "Economic Calendar"
│   └── Description: Track upcoming economic events
├── Economic Calendar Card
│   └── Upcoming events list (from UPCOMING_EVENTS)
└── Footer disclaimer
```

### MarketInsight.tsx Structure

```text
Market Insight Page
├── Page Header
│   ├── Title: "Market Insight"
│   └── Description: AI-powered market analysis
├── AI Market Sentiment Card
├── Grid: Volatility + Opportunities
├── Whale Tracking Card
└── Footer disclaimer
```

### Dashboard Section Order (Final)

```text
Dashboard
├── Page Header (title only, no status)
├── Pro Tip (QuickTip)
├── Quick Actions (4 buttons)
├── System Status (full-width card)
├── Market Sessions
├── Accounts (cards only, NO Total Balance)
├── Today's Activity
├── Risk & AI Insights
└── Trading Journey (7-Day Stats + Portfolio Performance / CTA)
```

---

## Summary

| Change | Files Affected |
|--------|----------------|
| Navbar reorder | AppSidebar.tsx |
| Split Calendar/Market | Calendar.tsx (new), MarketInsight.tsx (new), MarketCalendar.tsx (delete) |
| Route updates | App.tsx |
| Dashboard reorder | Dashboard.tsx |
| Remove Total Balance | Dashboard.tsx |

