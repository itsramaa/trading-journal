
# AI Floating Chatbot Enhancement Plan

## Current State Summary

### What AI Chatbot CAN Do Now
- Analyze trade history statistics (win rate, metrics, profit factor)
- Recommend which strategies are working best
- Identify winning vs losing patterns
- Breakdown LONG vs SHORT performance
- Basic coaching questions via Quick Actions

### What AI Chatbot CANNOT Do (Missing Integrations)
| Feature | Has Edge Function | Integrated to Chatbot |
|---------|:----------------:|:--------------------:|
| Market Sentiment (Fear & Greed, Whale) | ✅ `market-insight` | ❌ |
| Macro Analysis (DXY, Funding Rates) | ✅ `macro-analysis` | ❌ |
| Crypto + Macro Alignment | ✅ `useCombinedAnalysis` | ❌ |
| Confluence Detection for Trade Setup | ✅ `confluence-detection` | ❌ |
| Trade Quality Score | ✅ `trade-quality` | ❌ |
| Win Prediction (AI Preflight) | ✅ `ai-preflight` | ❌ |
| Post-Trade Analysis | ✅ `post-trade-analysis` | ❌ |
| Dashboard Insights | ✅ `dashboard-insights` | ❌ |
| Economic Calendar Impact | ✅ `economic-calendar` | ❌ |
| Backtest Strategy Analysis | ✅ `backtest-strategy` | ❌ |

---

## Enhancement Architecture

### Option A: Multi-Mode AI Assistant (Recommended)
Expand chatbot to support multiple AI modes that user can switch between:

```text
AI_MODES = {
  trading:    { endpoint: 'trading-analysis',     icon: BarChart3 },
  market:     { endpoint: 'market-insight',       icon: Globe },
  setup:      { endpoint: 'confluence-detection', icon: Target },
  macro:      { endpoint: 'macro-analysis',       icon: TrendingUp },
  calendar:   { endpoint: 'economic-calendar',    icon: Calendar },
}
```

**Pros**: Clean separation, user controls context
**Cons**: User must manually switch modes

### Option B: Unified Smart Assistant (More Complex)
Single AI that routes questions to appropriate backend:

```text
User: "What's the fear & greed index?"
     ↓
  Router AI (LLM) → Calls market-insight
     ↓
  Returns formatted answer
```

**Pros**: Natural UX, single interface
**Cons**: Requires routing logic, more expensive (2 LLM calls)

### Option C: Context-Aware Hybrid (Best Balance)
Keep trading mode as default, but add:
1. Smart context injection (market data in system prompt)
2. Quick Actions for market/macro queries
3. On-demand data fetching for specific questions

---

## Proposed Implementation: Option A + C Hybrid

### Phase 1: Enhanced Context (Quick Win)
Inject current market data into `trading-analysis` system prompt:

```typescript
// In AIChatbot.tsx - getTradingContext()
const getEnhancedContext = async () => {
  const [tradingContext, marketData, macroData] = await Promise.all([
    getTradingContext(),
    fetchMarketSentiment(),  // Already have this hook
    fetchMacroAnalysis(),    // Already have this hook
  ]);
  
  return {
    ...tradingContext,
    marketSentiment: {
      fearGreed: marketData.sentiment.fearGreed,
      recommendation: marketData.sentiment.recommendation,
      btcTrend: marketData.sentiment.signals.find(s => s.asset === 'BTC'),
    },
    macroContext: {
      overallSentiment: macroData.macro.overallSentiment,
      btcDominance: macroData.macro.dominance.btc,
    },
  };
};
```

**Changes:**
- `trading-analysis` edge function: Update system prompt to include market context
- `AIChatbot.tsx`: Fetch market data alongside trade data

### Phase 2: Add Market Mode
Add second AI mode for market-focused questions:

```typescript
const AI_MODES = {
  trading: {
    label: 'Trading Analyst',
    icon: BarChart3,
    description: 'Analisis pattern & performa trading',
    endpoint: 'trading-analysis',
    suggestions: ['Analisis performa saya', 'Strategi terbaik?', 'Kelemahan trading saya?'],
  },
  market: {
    label: 'Market Analyst',
    icon: Globe,
    description: 'Market sentiment & opportunities',
    endpoint: 'market-analysis',  // NEW edge function
    suggestions: ['Kondisi market sekarang?', 'Fear & Greed?', 'Whale activity?'],
  },
};
```

**New Edge Function:** `market-analysis`
- Fetches `market-insight` + `macro-analysis` data
- Uses LLM to answer market questions with that context
- Streaming response

### Phase 3: Add Trade Setup Mode
Enable chatbot to analyze trade setups:

```typescript
setup: {
  label: 'Setup Validator',
  icon: Target,
  description: 'Validate trade confluences',
  endpoint: 'confluence-chat',  // NEW edge function
  suggestions: ['Apakah setup ini valid?', 'Berapa quality score?'],
}
```

**How it works:**
1. User describes setup: "BTCUSDT long at 95000, SL 94000, TP 98000"
2. AI parses setup details
3. Calls `confluence-detection` internally
4. Returns formatted confluence analysis

### Phase 4: Unified Quick Actions
Expand Quick Actions panel to cover all AI capabilities:

```typescript
const QUICK_ACTIONS = [
  // Existing - Analisis
  { label: 'Analisis Performa', prompt: '...', category: 'Analisis', mode: 'trading' },
  { label: 'Win Rate & Metrics', prompt: '...', category: 'Analisis', mode: 'trading' },
  
  // New - Market
  { label: 'Kondisi Market', prompt: 'Bagaimana kondisi market saat ini?', category: 'Market', mode: 'market' },
  { label: 'Fear & Greed', prompt: 'Berapa nilai Fear & Greed index dan apa artinya?', category: 'Market', mode: 'market' },
  { label: 'Whale Activity', prompt: 'Adakah whale activity yang perlu diperhatikan?', category: 'Market', mode: 'market' },
  
  // New - Setup
  { label: 'Validate Setup', prompt: 'Validate setup saya...', category: 'Setup', mode: 'setup' },
  { label: 'Quality Score', prompt: 'Berapa quality score untuk trade ini?', category: 'Setup', mode: 'setup' },
  
  // New - Calendar
  { label: 'Event Hari Ini', prompt: 'Adakah economic event penting hari ini?', category: 'Calendar', mode: 'market' },
];
```

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/market-analysis/index.ts` | Market-focused chat endpoint |
| `supabase/functions/confluence-chat/index.ts` | Setup validation chat endpoint |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/chat/AIChatbot.tsx` | Add multi-mode, enhanced context |
| `src/components/chat/QuickActionsPanel.tsx` | Expand actions, add mode filter |
| `supabase/functions/trading-analysis/index.ts` | Add market context to prompt |
| `supabase/config.toml` | Add new functions |

### New Edge Function: `market-analysis`

```typescript
// Combines market-insight + macro-analysis + LLM for chat
serve(async (req) => {
  const { question } = await req.json();
  
  // Fetch all market data
  const [sentimentRes, macroRes] = await Promise.all([
    fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/market-insight'),
    fetch(Deno.env.get('SUPABASE_URL') + '/functions/v1/macro-analysis'),
  ]);
  
  const sentimentData = await sentimentRes.json();
  const macroData = await macroRes.json();
  
  // Build rich context for LLM
  const systemPrompt = `You are a market analyst for crypto trading.
  
CURRENT MARKET DATA:
- Fear & Greed: ${sentimentData.sentiment.fearGreed.value} (${sentimentData.sentiment.fearGreed.label})
- Overall: ${sentimentData.sentiment.overall}
- Recommendation: ${sentimentData.sentiment.recommendation}

WHALE ACTIVITY:
${sentimentData.whaleActivity.map(w => `- ${w.asset}: ${w.signal} (${w.confidence}%)`).join('\n')}

OPPORTUNITIES:
${sentimentData.opportunities.slice(0,5).map(o => `- ${o.pair}: ${o.direction} (${o.confidence}%)`).join('\n')}

MACRO:
- BTC Dominance: ${macroData.macro.dominance.btc}%
- Funding Rates: ${macroData.macro.funding}
- Sentiment: ${macroData.macro.overallSentiment}

Answer questions about market conditions using this data.`;

  // Stream LLM response
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      stream: true,
    }),
  });
  
  return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
});
```

---

## Implementation Phases

### Phase 1: Quick Win - Context Enhancement (1-2 hours)
1. Update `trading-analysis` to include market context in system prompt
2. Fetch market data in AIChatbot before sending
3. No UI changes needed

### Phase 2: Multi-Mode UI (2-3 hours)
1. Add mode selector in header (tabs or dropdown)
2. Create `market-analysis` edge function
3. Update QuickActionsPanel with mode filtering
4. Add mode-specific suggestions

### Phase 3: Setup Validator Mode (2-3 hours)
1. Create `confluence-chat` edge function
2. Add setup mode with specialized UI
3. Parse trade parameters from natural language
4. Return formatted confluence analysis

### Phase 4: Full Integration (3-4 hours)
1. Add Economic Calendar mode
2. Integrate Post-Trade Analysis
3. Add "Ask about this trade" from Trade History
4. Cross-mode context sharing

---

## Expected Outcome

After implementation, AI Chatbot will be able to:

1. **Analisis Trading** (existing) - Win rate, patterns, strategy recommendations
2. **Market Analysis** (new) - Fear & Greed, whale activity, opportunities
3. **Setup Validation** (new) - Confluence detection, quality score
4. **Economic Impact** (new) - Calendar events, crypto impact prediction
5. **Post-Trade Learning** (new) - Analyze closed trades for lessons

### Sample Interactions:

**Market Mode:**
> User: "Bagaimana kondisi market sekarang?"
> AI: "Fear & Greed Index saat ini 72 (Greed). BTC menunjukkan akumulasi whale dengan volume naik 35%. Rekomendasi: Market favor LONG dengan tight stops. Perhatikan level resistance di 97.5K."

**Setup Mode:**
> User: "Validate setup ETHUSDT long entry 3200, SL 3150, TP 3350"
> AI: "✅ Setup Valid (7/10 Quality Score)
> - R:R Ratio: 1:3 ✓
> - Above MA50 ✓  
> - RSI 55 (neutral) ⚠️
> - Whale: Accumulation ✓
> Recommendation: Proceed with 75% normal size"

---

## Priority Recommendation

**Start with Phase 1** (Context Enhancement) karena:
- Effort kecil, impact besar
- Tidak perlu UI changes
- Langsung membuat chatbot lebih informatif

Kemudian lanjut ke **Phase 2** (Multi-Mode) yang memberikan user flexibility untuk memilih konteks percakapan.
