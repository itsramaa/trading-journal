

# Phase 3: AI Edge Functions & Integration

## Overview

Mengimplementasikan AI Integration sesuai spesifikasi Markdown. Phase ini akan menambahkan 4 edge functions baru dan mengintegrasikan AI ke dalam wizard steps yang sudah ada, Dashboard, dan AI Chatbot yang enhanced.

---

## Current State Analysis

### Already Implemented:
1. **Edge Functions:**
   - `trading-analysis/` - General trading analysis (streaming)
   - `session-analysis/` - Session analysis
   - `check-permission/` - Permission checks

2. **AI Components:**
   - `AIChatbot.tsx` - Floating chatbot (working)
   - `TradingAIAnalysis.tsx` - Trading analysis widget (working)

3. **Wizard with AI Placeholders:**
   - `ConfluenceValidator.tsx` - "Coming in Phase 3" badge
   - `FinalChecklist.tsx` - "Coming in Phase 3" badge
   - `PositionSizingStep.tsx` - Manual calculator only
   - `StrategySelection.tsx` - "Coming in Phase 3" badge

### Missing (per Markdown spec):
1. AI Confluence Detection Edge Function
2. AI Position Sizing Engine Edge Function
3. AI Pre-Trade Validation Edge Function
4. AI Trade Quality Scoring Edge Function
5. Dashboard AI Insights Widget
6. AI integration in wizard steps
7. Post-trade AI analysis

---

## New Edge Functions

### 1. `confluence-detection/index.ts`

Analyzes trade setup and validates confluences.

**Input:**
```typescript
{
  pair: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: string;
  strategyRules: EntryRule[];
  userHistory: { pair: string; winRate: number; }[];
}
```

**Output:**
```typescript
{
  confluences_detected: number;
  confluences_required: number;
  details: Array<{
    type: string;
    detected: boolean;
    description: string;
    confidence: number;
  }>;
  overall_confidence: number;
  verdict: 'pass' | 'fail' | 'warning';
}
```

**AI Prompt Pattern:**
- Analyze each entry rule from strategy
- Simulate detection based on technical indicators
- Return structured JSON using tool_choice

---

### 2. `trade-quality/index.ts`

Calculates trade quality score and provides final recommendation.

**Input:**
```typescript
{
  tradeSetup: {
    pair: string;
    direction: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    rr: number;
  };
  confluenceData: AIConfluenceResult;
  positionSizing: PositionSizeResult;
  emotionalState: string;
  userStats: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    similarSetups: number;
  };
}
```

**Output:**
```typescript
{
  score: number; // 1-10
  confidence: number; // 0-100
  factors: Array<{ name: string; score: number; }>;
  recommendation: 'execute' | 'wait' | 'skip';
  reasoning: string;
}
```

---

### 3. `dashboard-insights/index.ts`

Generates AI insights for the Dashboard widget.

**Input:**
```typescript
{
  portfolioStatus: {
    totalBalance: number;
    deployedCapital: number;
    openPositions: number;
  };
  riskStatus: DailyRiskStatus;
  recentTrades: Array<{...}>;
  strategies: Array<{...}>;
}
```

**Output:**
```typescript
{
  summary: string;
  recommendations: string[];
  riskAlerts: string[];
  bestSetups: Array<{ pair: string; strategy: string; confidence: number; }>;
}
```

---

### 4. `post-trade-analysis/index.ts`

Analyzes closed trades and provides lessons learned.

**Input:**
```typescript
{
  trade: TradeEntry;
  strategy: TradingStrategy;
  similarTrades: TradeEntry[];
}
```

**Output:**
```typescript
{
  winFactors: string[];
  lossFactors: string[];
  lessons: string[];
  patternUpdate: {
    newWinRate: number;
    recommendation: string;
  };
}
```

---

## Component Updates

### 1. Dashboard: Add AI Insights Widget

**File:** `src/components/dashboard/AIInsightsWidget.tsx` (NEW)

```text
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI INSIGHTS                                    [Refresh] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Portfolio Summary                                        │
│ "Your portfolio is balanced with 8.5% deployment.          │
│  Current trend analysis shows strong BTC uptrend.          │
│  Recommend waiting for pullback before adding positions."  │
│                                                             │
│ 💡 Top Recommendation                                       │
│ "Based on your 76% win rate with SR setup on ETH,          │
│  maintain focus on ETH. ADA has 50% win rate - consider    │
│  avoiding or revising rules."                              │
│                                                             │
│ ⚠️ Risk Alert                                              │
│ "You have 3 correlated long positions (0.82 avg).          │
│  Consider diversifying or using SHORT hedge."              │
│                                                             │
│ [Ask AI] [More Details]                                    │
└─────────────────────────────────────────────────────────────┘
```

Features:
- Streaming AI response
- Refresh button to regenerate
- Links to AI Chatbot for follow-up
- Error handling for rate limits (402/429)

---

### 2. ConfluenceValidator: Add AI Detection

**Update:** `src/components/trade/entry/ConfluenceValidator.tsx`

Changes:
- Add "Detect with AI" button
- Call `confluence-detection` edge function
- Auto-check checkboxes based on AI detection
- Show AI confidence per confluence
- Display overall AI verdict

UI Addition:
```text
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Confluence Detection          [Detect with AI]        │
├─────────────────────────────────────────────────────────────┤
│ ✓ Price Action at Support         AI: 94% ✓                │
│ ✓ Volume Confirmation              AI: 89% ✓                │
│ ✓ Technical Indicators             AI: 91% ✓                │
│ ✓ Higher TF Confirmation           AI: 93% ✓                │
├─────────────────────────────────────────────────────────────┤
│ Overall AI Confidence: 91.75%                               │
│ Verdict: ✅ ALL CONFLUENCES CONFIRMED                       │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. FinalChecklist: Add AI Verdict

**Update:** `src/components/trade/entry/FinalChecklist.tsx`

Changes:
- Call `trade-quality` edge function when step loads
- Display AI quality score (1-10)
- Show AI confidence percentage
- Display recommendation (execute/wait/skip)
- Show key factors contributing to score

UI Addition:
```text
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI FINAL VERDICT                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ SETUP QUALITY: 9.2/10 (Excellent)                        │
│ ✅ CONFLUENCE CONFIRMATION: 4/4 (Perfect)                   │
│ ✅ POSITION SIZING: Optimal (40% deployment)                │
│ ✅ RISK MANAGEMENT: 2% risk, clean R:R                      │
│ ✅ EMOTIONAL STATE: Disciplined (not FOMO)                  │
│                                                             │
│ CONFIDENCE LEVEL: 92% 🟢                                    │
│                                                             │
│ RECOMMENDATION: ✅ EXECUTE TRADE                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. TradeConfirmation: Add AI Summary

**Update:** `src/components/trade/entry/TradeConfirmation.tsx`

Changes:
- Display AI quality score from previous step
- Show AI confidence in summary
- Add AI auto-monitoring description (placeholder text)
- Include AI-generated trade comment

---

### 5. StrategySelection: Add AI Recommendation

**Update:** `src/components/trade/entry/StrategySelection.tsx`

Changes:
- Calculate strategy performance from user history
- Show "Recommended by AI" badge on best strategy
- Display win rate per strategy
- Sort strategies by AI confidence

---

## New Hooks

### 1. `src/features/ai/useAIConfluenceDetection.ts`

```typescript
export function useAIConfluenceDetection() {
  const detectConfluences = async (params: DetectionParams): Promise<AIConfluenceResult> => {
    // Call confluence-detection edge function
    // Handle streaming response
    // Return structured result
  };
  
  return { detectConfluences, isLoading, error };
}
```

### 2. `src/features/ai/useAITradeQuality.ts`

```typescript
export function useAITradeQuality() {
  const getQualityScore = async (params: QualityParams): Promise<AITradeQualityScore> => {
    // Call trade-quality edge function
    // Handle streaming response
    // Return structured result
  };
  
  return { getQualityScore, isLoading, error };
}
```

### 3. `src/features/ai/useDashboardInsights.ts`

```typescript
export function useDashboardInsights() {
  const getInsights = async (): Promise<DashboardInsights> => {
    // Call dashboard-insights edge function
    // Handle streaming response
    // Return structured insights
  };
  
  return { insights, isLoading, error, refresh };
}
```

---

## Files to Create (8 files)

| File | Purpose |
|------|---------|
| `supabase/functions/confluence-detection/index.ts` | AI confluence detection |
| `supabase/functions/trade-quality/index.ts` | AI trade quality scoring |
| `supabase/functions/dashboard-insights/index.ts` | Dashboard AI insights |
| `supabase/functions/post-trade-analysis/index.ts` | Post-trade AI analysis |
| `src/features/ai/useAIConfluenceDetection.ts` | Confluence detection hook |
| `src/features/ai/useAITradeQuality.ts` | Trade quality hook |
| `src/features/ai/useDashboardInsights.ts` | Dashboard insights hook |
| `src/components/dashboard/AIInsightsWidget.tsx` | Dashboard AI widget |

## Files to Update (5 files)

| File | Changes |
|------|---------|
| `src/components/trade/entry/ConfluenceValidator.tsx` | Add AI detection |
| `src/components/trade/entry/FinalChecklist.tsx` | Add AI verdict |
| `src/components/trade/entry/TradeConfirmation.tsx` | Add AI summary |
| `src/components/trade/entry/StrategySelection.tsx` | Add AI recommendation |
| `src/pages/Dashboard.tsx` | Add AIInsightsWidget |
| `supabase/config.toml` | Add new functions |

---

## Implementation Order

1. **Create Edge Functions** (in parallel):
   - `confluence-detection/`
   - `trade-quality/`
   - `dashboard-insights/`
   - `post-trade-analysis/`

2. **Update config.toml** with new functions

3. **Create AI Hooks**:
   - `useAIConfluenceDetection.ts`
   - `useAITradeQuality.ts`
   - `useDashboardInsights.ts`

4. **Create Dashboard AI Widget**:
   - `AIInsightsWidget.tsx`
   - Integrate into `Dashboard.tsx`

5. **Update Wizard Steps**:
   - ConfluenceValidator with AI detection
   - FinalChecklist with AI verdict
   - TradeConfirmation with AI summary
   - StrategySelection with AI recommendations

6. **Test & Deploy**

---

## Technical Notes

### Edge Function Pattern

All AI edge functions will use:
- **Model:** `google/gemini-2.5-flash` (fast, good for structured output)
- **CORS:** Standard headers for browser access
- **Streaming:** For large responses only (dashboard insights)
- **Tool Calling:** For structured JSON output (confluence detection, quality scoring)
- **Error Handling:** 402/429 rate limit handling

### Error Handling

```typescript
if (response.status === 429) {
  return { error: "Rate limits exceeded, please try again later." };
}
if (response.status === 402) {
  return { error: "Payment required, please add funds." };
}
```

### AI Prompt Structure

Each edge function uses specific system prompts:
- Include user's historical data for personalization
- Request structured JSON output via tool_choice
- Keep responses concise and actionable
- Use Indonesian if user input is Indonesian

### Assumptions

1. AI confluence detection simulates chart analysis (no real chart image processing yet)
2. AI recommendations based on user's trade history patterns
3. Streaming used selectively (only for chat-style responses)
4. Tool calling used for structured outputs to prevent JSON parsing errors

### Risks

1. **AI Latency** - Edge functions add 1-3s latency
   - Mitigation: Loading states, parallel requests where possible

2. **Rate Limits** - User may hit limits during heavy usage
   - Mitigation: Clear error messages, retry UI, debouncing

3. **AI Hallucination** - AI may give incorrect analysis
   - Mitigation: Disclaim as "AI suggestion", let user confirm

---

## Success Criteria

- Dashboard shows AI insights widget with streaming text
- Confluence validation has "Detect with AI" button that works
- Final checklist shows AI quality score and verdict
- Trade confirmation displays AI confidence
- Strategy selection shows AI-recommended strategies
- All AI features handle errors gracefully (402/429)
- AI responses use Indonesian when appropriate

