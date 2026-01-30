

# Plan: Reorganize Market Domain Navigation

## Current State

### Sidebar Market Group Order (Current)
1. AI Analysis (`/market`)
2. Economic Calendar (`/calendar`)
3. Market Data (`/market-data`)

### Issues
1. **Market Sentiment Widget salah tempat** - Widget berada di halaman Strategy, seharusnya di Market Data
2. **Urutan navigasi tidak logis** - Market Data (raw data) seharusnya pertama, baru Calendar, lalu AI Analysis (yang membutuhkan data)

---

## Changes Required

### 1. Update Sidebar Navigation Order

**File:** `src/components/layout/AppSidebar.tsx`

Ubah urutan items di Market group:
```text
Before:
1. AI Analysis → /market
2. Economic Calendar → /calendar  
3. Market Data → /market-data

After:
1. Market Data → /market-data
2. Economic Calendar → /calendar
3. AI Analysis → /market
```

### 2. Update Breadcrumb Domain Path

**File:** `src/components/layout/DashboardLayout.tsx`

Update `routeHierarchy` agar `domainPath` mengarah ke `/market-data` sebagai primary entry point Market domain:

```typescript
// Market domain - Market Data is now primary
"/market-data": { title: "Market Data", domain: "Market", domainPath: "/market-data" },
"/calendar": { title: "Economic Calendar", domain: "Market", domainPath: "/market-data" },
"/market": { title: "AI Analysis", domain: "Market", domainPath: "/market-data" },
```

### 3. Move Market Sentiment Widget to Market Data Page

**File:** `src/pages/MarketData.tsx`

Add `MarketSentimentWidget` sebagai bagian dari Market Data page:
- Positioned at the top after page header
- Full width layout dengan symbol selector enabled

### 4. Remove Market Sentiment Widget from Strategy Page

**File:** `src/pages/trading-journey/StrategyManagement.tsx`

Remove widget dari Strategy Management page:
- Hapus import `MarketSentimentWidget`
- Ubah layout grid kembali ke single column untuk `StrategyStats`

---

## Technical Implementation

### Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/AppSidebar.tsx` | Reorder Market group items |
| `src/components/layout/DashboardLayout.tsx` | Update route hierarchy domain paths |
| `src/pages/MarketData.tsx` | Add MarketSentimentWidget |
| `src/pages/trading-journey/StrategyManagement.tsx` | Remove MarketSentimentWidget |

### Code Changes

**AppSidebar.tsx - Market Group Reorder:**
```typescript
{
  title: "Market",
  items: [
    { title: "Market Data", url: "/market-data", icon: BarChart3 },
    { title: "Economic Calendar", url: "/calendar", icon: Calendar },
    { title: "AI Analysis", url: "/market", icon: TrendingUp },
  ],
},
```

**MarketData.tsx - Add Sentiment Widget:**
```tsx
import { MarketSentimentWidget } from "@/components/market";

// In render:
<div className="space-y-6">
  {/* Header */}
  
  {/* Market Sentiment Widget - Full width at top */}
  <MarketSentimentWidget 
    defaultSymbol="BTCUSDT" 
    showSymbolSelector={true}
  />

  {/* Existing MarketDataTab content */}
  <MarketDataTab ... />
</div>
```

**StrategyManagement.tsx - Remove Sentiment Widget:**
```tsx
// Remove import:
// import { MarketSentimentWidget } from "@/components/market";

// Change grid layout from:
<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
  <StrategyStats strategies={strategies} />
  <MarketSentimentWidget ... />
</div>

// To:
<StrategyStats strategies={strategies} />
```

---

## Visual Result

### New Sidebar Order
```text
MARKET
├── Market Data        ← Primary (raw market data + sentiment)
├── Economic Calendar  ← Context (upcoming events)
└── AI Analysis        ← Intelligence (AI-driven insights)
```

### Market Data Page Layout
```text
┌────────────────────────────────────────┐
│ [BarChart3] Market Data          [Refresh]
│ Volatility analysis, trading opportunities...
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │     MARKET SENTIMENT WIDGET     │  │
│  │  [BTCUSDT ▼]   Bullish: 65%     │  │
│  │  Pro Traders / Retail / OI...   │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │       EXISTING MARKET DATA      │  │
│  │   (Volatility, Opportunities)   │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## Benefits

1. **Logical Flow**: Data → Context → Intelligence
2. **Domain Cohesion**: Sentiment widget belongs with market data, not strategy
3. **Consistent Navigation**: Market Data as primary entry untuk domain Market

