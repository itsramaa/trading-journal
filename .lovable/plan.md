
# Economic Calendar API Implementation Plan

## Executive Summary

Berdasarkan dokumentasi `ECONOMIC_CALENDAR_API_FREE.md`, akan diimplementasikan integrasi dengan **Trading Economics API** (BEST FREE OPTION) untuk menggantikan mock data di `Calendar.tsx`. API ini gratis, tanpa API key, dan real-time.

---

## Current State vs Target

| Aspect | Current | Target |
|--------|---------|--------|
| Calendar Data | MOCK_DATA hardcoded | Real-time Trading Economics API |
| Events Source | Static array 6 items | Live API dengan filter high-impact |
| AI Predictions | Static text | AI-generated predictions per event |
| Refresh | Fake delay | Real API call |

---

## Implementation Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Calendar Page                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  useEconomicCalendar()  │  ← NEW React Hook
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  economic-calendar      │  ← NEW Edge Function
              │  Edge Function          │
              └────────────┬────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌───────────────┐
   │Trading Econ  │ │Lovable AI    │ │Filter & Sort  │
   │API (FREE)    │ │(Predictions) │ │Logic          │
   └──────────────┘ └──────────────┘ └───────────────┘
```

---

## Files to Create

### 1. Edge Function: `supabase/functions/economic-calendar/index.ts`

**Purpose:** Fetch data dari Trading Economics API dan generate AI predictions

**API Call:**
```
GET https://api.tradingeconomics.com/calendar?c=ALL
```

**Features:**
- Fetch semua events dari Trading Economics
- Filter high-impact events saja
- Get US-focused events (most impactful untuk crypto)
- Generate AI predictions untuk setiap event menggunakan Lovable AI (Gemini)
- Format response untuk frontend consumption

**Response Structure:**
```typescript
{
  events: [
    {
      date: "2026-01-30T14:30:00Z",
      event: "Core CPI m/m",
      country: "United States",
      importance: "high",
      forecast: "0.3%",
      previous: "0.2%",
      actual: "0.4%" | null,
      aiPrediction: "AI-generated prediction...",
      cryptoImpact: "bullish" | "bearish" | "neutral"
    }
  ],
  todayHighlight: { ... },  // Most important event today
  impactSummary: {
    hasHighImpact: true,
    eventCount: 5,
    riskLevel: "HIGH" | "MODERATE" | "LOW",
    positionAdjustment: "reduce_30%" | "normal" | "reduce_50%"
  },
  lastUpdated: "2026-01-30T10:00:00Z"
}
```

---

### 2. React Hook: `src/features/calendar/useEconomicCalendar.ts`

**Purpose:** Fetch dan cache economic calendar data

**Features:**
- TanStack Query integration
- 15-minute cache (events don't change frequently)
- Auto-refresh
- Error handling

---

### 3. Type Definitions: `src/features/calendar/types.ts`

**Purpose:** TypeScript interfaces untuk Economic Calendar

**Types:**
- `EconomicEvent`
- `EconomicCalendarResponse`
- `TodayHighlight`
- `ImpactSummary`

---

### 4. Feature Index: `src/features/calendar/index.ts`

**Purpose:** Export all calendar feature modules

---

## Files to Modify

### 1. `src/pages/Calendar.tsx`

**Changes:**
- Remove `UPCOMING_EVENTS` mock data
- Remove `UPCOMING_NEWS_PREDICTIONS` mock data
- Import `useEconomicCalendar` hook
- Display real events dengan loading states
- Display AI predictions dari edge function
- Update Today's Key Release section dengan real data
- Add proper error handling

---

### 2. `supabase/config.toml`

**Add:**
```toml
[functions.economic-calendar]
verify_jwt = false
```

---

### 3. `docs/ai_plan.md`

**Update:** Add Economic Calendar implementation status

---

### 4. Copy documentation file

**Action:** Copy `user-uploads://ECONOMIC_CALENDAR_API_FREE.md` → `docs/ECONOMIC_CALENDAR_API_FREE.md`

---

## Edge Function Logic Detail

### Trading Economics API Integration

```typescript
// 1. Fetch all events
const response = await fetch('https://api.tradingeconomics.com/calendar?c=ALL');
const allEvents = await response.json();

// 2. Filter high-impact only
const highImpact = allEvents.filter(e => e.importance === 'high');

// 3. Filter US events (most impactful for crypto)
const usEvents = highImpact.filter(e => 
  e.country === 'United States' || 
  e.event.includes('Fed') ||
  e.event.includes('FOMC')
);

// 4. Get today's events
const today = new Date().toISOString().split('T')[0];
const todayEvents = usEvents.filter(e => e.date.startsWith(today));

// 5. Get this week's events
const weekEvents = usEvents.filter(e => isThisWeek(e.date));
```

### AI Prediction Generation

```typescript
// Use Lovable AI (Gemini) untuk generate predictions
const prompt = `Analyze this economic event for crypto impact:
Event: ${event.event}
Country: ${event.country}
Forecast: ${event.forecast}
Previous: ${event.previous}

Provide:
1. Brief prediction (1-2 sentences)
2. Crypto impact: bullish/bearish/neutral
3. Reasoning`;

const aiResponse = await generateAI(prompt);
```

---

## Risk Adjustment Logic (Per Documentation)

```typescript
function calculateRiskAdjustment(events: EconomicEvent[]): ImpactSummary {
  const highImpactCount = events.filter(e => e.importance === 'high').length;
  
  if (highImpactCount >= 2) {
    return {
      hasHighImpact: true,
      eventCount: highImpactCount,
      riskLevel: 'VERY_HIGH',
      positionAdjustment: 'reduce_50%'
    };
  } else if (highImpactCount === 1) {
    return {
      hasHighImpact: true,
      eventCount: highImpactCount,
      riskLevel: 'HIGH',
      positionAdjustment: 'reduce_30%'
    };
  }
  
  return {
    hasHighImpact: false,
    eventCount: 0,
    riskLevel: 'LOW',
    positionAdjustment: 'normal'
  };
}
```

---

## Calendar Page New Structure

```text
Calendar.tsx
├── Page Header (unchanged)
│
├── Impact Alert Banner (NEW)
│   └── Show if high-impact event today with position adjustment advice
│
├── Today's Key Release Card (UPDATED)
│   ├── Real event data from API
│   ├── Forecast vs Previous
│   ├── AI Prediction (from edge function)
│   └── Crypto Impact Badges (bullish/bearish)
│
├── Upcoming Events List (UPDATED)
│   ├── Real events from Trading Economics
│   ├── Filter by importance
│   └── Country & time info
│
├── AI Economic News Analysis (UPDATED)
│   ├── AI predictions per event
│   └── Crypto impact analysis
│
└── Footer Disclaimer (unchanged)
```

---

## API Rate Limiting & Caching Strategy

| Aspect | Value | Rationale |
|--------|-------|-----------|
| Cache Time | 15 minutes | Events don't change frequently |
| Refetch Interval | 30 minutes | Reduce API calls |
| Error Retry | 2 attempts | Handle temporary failures |
| Fallback | Show cached data | Graceful degradation |

---

## Important Considerations

### Trading Economics API Notes
- **Free & No Key**: Documented as unlimited requests without API key
- **Response Format**: JSON array of events
- **Reliability**: Most reliable free option per documentation
- **Scraping-based**: Unofficial API, may occasionally fail

### AI Predictions
- Generated via Lovable AI (Gemini 2.5 Flash)
- Focused on crypto market impact
- Actionable recommendations

### Error Handling
- If Trading Economics fails → show cached data or friendly error
- If AI generation fails → show event without prediction
- Rate limit hit → use cached data

---

## Implementation Order

1. **Copy documentation file** to `docs/`
2. **Create types** (`src/features/calendar/types.ts`)
3. **Create edge function** (`supabase/functions/economic-calendar/index.ts`)
4. **Register edge function** in `supabase/config.toml`
5. **Create React hook** (`src/features/calendar/useEconomicCalendar.ts`)
6. **Create feature index** (`src/features/calendar/index.ts`)
7. **Update Calendar.tsx** dengan real data integration
8. **Update documentation** (`docs/ai_plan.md`)
9. **Deploy & test** edge function

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| Real events display | ✅ From Trading Economics API |
| AI predictions work | ✅ Generated per event |
| Today's highlight accurate | ✅ Real-time data |
| Loading states | ✅ Skeleton UI |
| Error handling | ✅ Graceful fallback |
| Position adjustment advice | ✅ Based on event count |
| Documentation complete | ✅ In docs/ folder |
