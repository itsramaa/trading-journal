

# Move Market Sessions to Dashboard & Refocus Calendar Page

## Summary

Memindahkan widget Market Sessions (Sydney, Tokyo, London, NY) dari halaman Calendar ke Dashboard, dan mengubah fokus halaman Calendar menjadi "Calendar & Market Sentiment" dengan AI market analysis.

---

## Current State

**MarketCalendar.tsx (Current):**
- Market Sessions widget (Sydney, Tokyo, London, NY dengan timing)
- Economic Calendar (upcoming events)
- AI Market Sentiment placeholder

**Dashboard.tsx (Current):**
- System Status Indicator
- Accounts Summary
- Quick Actions
- Active Positions + Today Performance
- Risk Summary + AI Insights
- Trading Stats + Recent Trades

---

## Changes to Make

### Part 1: Create Market Sessions Widget Component

Extract the market sessions logic into a reusable component for Dashboard.

**File:** `src/components/dashboard/MarketSessionsWidget.tsx` (NEW)

```text
Market Sessions Widget (Compact for Dashboard)
├─ Current Time: 14:32 UTC
├─ Active: London, New York (session overlap - high volume)
└─ Sessions Grid (4 cards):
   ├─ Sydney: CLOSED (21:00-06:00 UTC)
   ├─ Tokyo: CLOSED (23:00-08:00 UTC)
   ├─ London: OPEN 🟢 72% complete
   └─ New York: OPEN 🟢 35% complete
```

Features:
- Compact display untuk dashboard
- Live session status with progress
- Session overlap indicator
- Auto-refresh setiap menit

### Part 2: Update Dashboard

Add Market Sessions widget to Dashboard.

**File:** `src/pages/Dashboard.tsx`

Changes:
- Import MarketSessionsWidget
- Add section after Quick Actions atau sebelum Active Positions
- Layout: Full width card with 4-column grid

```text
Dashboard Layout (Updated):
├─ System Status Indicator
├─ Page Header
├─ Accounts Summary
├─ Quick Actions
├─ 🆕 Market Sessions Widget  ← NEW LOCATION
├─ Active Positions + Today Performance
├─ Risk Summary + AI Insights
└─ Trading Stats + Recent Trades
```

### Part 3: Refocus Calendar Page

Remove market sessions from Calendar page and enhance with AI Market Sentiment.

**File:** `src/pages/MarketCalendar.tsx`

Changes:
- Remove MARKET_SESSIONS constant and related functions
- Remove Market Sessions Card component
- Update page title to "Calendar & Market Sentiment"
- Enhance AI Market Sentiment section (remove "Coming Soon")
- Add AI Volatility Assessment widget
- Add AI Trading Opportunity widget (rankings)
- Keep Economic Calendar

```text
Calendar & Market Sentiment (New Layout):
├─ Page Header: "Calendar & Market Sentiment"
├─ AI Market Sentiment Card (Enhanced)
│   ├─ Overall sentiment: BULLISH/BEARISH/NEUTRAL
│   ├─ Key signals (BTC trend, ETH momentum, etc.)
│   ├─ Fear & Greed Index
│   └─ Recommendation
├─ AI Volatility Assessment Card
│   ├─ BTC Volatility status
│   ├─ ETH Volatility status
│   └─ Overall assessment
├─ Economic Calendar Card (keep existing)
└─ AI Trading Opportunities Card
    ├─ Ranked opportunities (ETH, BTC, etc.)
    └─ Confidence scores
```

### Part 4: Update Sidebar Label (Optional)

**File:** `src/components/layout/AppSidebar.tsx`

Verify label matches: "Calendar & Market" (current) is fine, but can be updated to match the page title if needed.

---

## Files Summary

### New Files (1)

| File | Purpose |
|------|---------|
| `src/components/dashboard/MarketSessionsWidget.tsx` | Compact market sessions display for Dashboard |

### Files to Modify (2)

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add MarketSessionsWidget after Quick Actions |
| `src/pages/MarketCalendar.tsx` | Remove sessions, add AI Market Sentiment & Volatility widgets |

---

## Implementation Details

### MarketSessionsWidget.tsx

Extracted from MarketCalendar.tsx, mengandung:
- MARKET_SESSIONS constant
- isSessionActive() function  
- getSessionProgress() function
- formatTime() function
- Compact card layout (tidak full-page)
- Session overlap info

### Dashboard Integration

```typescript
// After Quick Actions section
<section className="space-y-4">
  <div className="flex items-center gap-2">
    <Globe className="h-5 w-5 text-primary" />
    <h2 className="text-lg font-semibold">Market Sessions</h2>
  </div>
  <MarketSessionsWidget />
</section>
```

### MarketCalendar.tsx Restructure

```text
New structure:
1. AI Market Sentiment Card
   - Uses existing AI infrastructure
   - Displays overall sentiment
   - Shows key market signals
   
2. AI Volatility Card
   - BTC/ETH volatility status
   - Trading condition assessment
   
3. Economic Calendar Card
   - Keep existing implementation
   
4. AI Opportunities Card (Optional)
   - Top ranked pairs with confidence
   - Links to Trade Entry
```

---

## Technical Notes

### Market Session Logic (Moved to Widget)

```typescript
const MARKET_SESSIONS = [
  { name: 'Sydney', openHour: 21, closeHour: 6, ... },
  { name: 'Tokyo', openHour: 23, closeHour: 8, ... },
  { name: 'London', openHour: 7, closeHour: 16, ... },
  { name: 'New York', openHour: 12, closeHour: 21, ... },
];
```

### AI Sentiment (Mock/Placeholder for now)

```typescript
const MOCK_SENTIMENT = {
  overall: 'bullish',
  confidence: 78,
  signals: [
    { asset: 'BTC', trend: 'Strong uptrend, above all MA' },
    { asset: 'ETH', trend: 'Outperforming, strong momentum' },
  ],
  fearGreed: { value: 42, label: 'Neutral' },
  recommendation: 'Bias towards longs',
};
```

---

## Success Criteria

After implementation:
- Dashboard shows Market Sessions widget with live status
- Session overlap periods highlighted on Dashboard
- Calendar page focuses on AI Market Sentiment
- Calendar page shows Economic Calendar and AI analysis
- No duplicate market session displays
- Navigation still works correctly

---

## Assumptions

1. AI Market Sentiment will use mock data for now (can be connected to edge function later)
2. Market Sessions widget is compact and fits Dashboard layout
3. Economic Calendar remains on Calendar & Market page
4. Session overlap info moves to Dashboard widget

