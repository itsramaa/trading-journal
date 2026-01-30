
# AI System Gap Analysis & Implementation Plan

## 📊 Executive Summary

Berdasarkan analisis menyeluruh terhadap dokumentasi di `docs/ai/` dan implementasi saat ini, ditemukan **signifikan gap** antara spesifikasi dan implementasi. Sementara project sudah memiliki AI edge functions untuk trade workflow, **Market Insight page** masih menggunakan **MOCK DATA** dan belum terintegrasi dengan API eksternal atau AI analysis sesuai dokumentasi.

---

## 📋 Gap Analysis Matrix

### ✅ Already Implemented (Match)

| Component | Location | Status |
|-----------|----------|--------|
| AI Preflight Check | `supabase/functions/ai-preflight/` | ✅ Functional |
| AI Confluence Detection | `supabase/functions/confluence-detection/` | ✅ Functional |
| AI Trade Quality Scoring | `supabase/functions/trade-quality/` | ✅ Functional |
| AI Dashboard Insights | `supabase/functions/dashboard-insights/` | ✅ Functional |
| AI Post-Trade Analysis | `supabase/functions/post-trade-analysis/` | ✅ Functional |
| React Hooks for AI | `src/features/ai/` | ✅ Functional |

### ❌ Not Implemented (Mismatch)

| Component | Documentation | Current State | Priority |
|-----------|--------------|---------------|----------|
| **AI Market Sentiment** | Real-time analysis via Binance, CoinGecko, Alternative.me APIs | **MOCK DATA** in `MarketInsight.tsx` | 🔴 Critical |
| **AI Macro Analysis** | DXY, S&P 500, Treasury, VIX via Yahoo Finance/FRED | **MOCK DATA** hardcoded | 🔴 Critical |
| **Fear & Greed Index** | Live fetch from `alternative.me/fng/` | **MOCK DATA** (value: 62 hardcoded) | 🔴 Critical |
| **Whale Tracking** | Volume proxy + exchange flow analysis | **MOCK DATA** with fake wallet addresses | 🟡 Medium |
| **Key Signals (BTC/ETH/SOL)** | Technical analysis with MA, RSI, MACD | **MOCK DATA** static strings | 🔴 Critical |
| **AI Recommendation Engine** | Logic-based from Sentiment + Macro + F&G | **Static text** hardcoded | 🔴 Critical |
| **Trading Opportunities** | AI-ranked from pattern recognition | **MOCK DATA** static array | 🟡 Medium |
| **Volatility Assessment** | Real volatility calculation per asset | **MOCK DATA** static values | 🟡 Medium |
| **Economic Calendar Integration** | Trading Economics API | **Static warning** text only | 🟠 Low |

---

## 🔧 Technical Gap Details

### 1. Market Insight Edge Function (MISSING)

**Dokumentasi mengharuskan:**
- Fetch dari 5+ API gratis (Binance, CoinGecko, Alternative.me, Yahoo Finance, FRED)
- Calculate weighted sentiment score: `(Tech×0.30) + (OnChain×0.25) + (Social×0.25) + (Macro×0.20)`
- Calculate confidence dari agreement + distance + quality
- Generate AI summary text
- Update setiap 5-15 menit

**Current State:**
```typescript
// MarketInsight.tsx - Line 16-26
const MOCK_SENTIMENT = {
  overall: 'bullish' as 'bullish' | 'bearish' | 'neutral',
  confidence: 78,
  // ... semua data HARDCODED
};
```

### 2. Macro Analysis Data (MISSING)

**Dokumentasi mengharuskan:**
- DXY dari Yahoo Finance (real-time)
- S&P 500 dari Yahoo Finance (real-time)
- 10Y Treasury dari FRED API (hourly)
- VIX dari Yahoo Finance (real-time)
- Calculate macro sentiment: `(DXY×0.25) + (SPX×0.30) + (Treasury×0.25) + (VIX×0.20)`

**Current State:**
```typescript
// MarketInsight.tsx - Line 43-53
const MACRO_CONDITIONS = {
  overallSentiment: 'cautious' as 'bullish' | 'bearish' | 'cautious',
  correlations: [
    { name: 'DXY (Dollar Index)', value: 104.25, change: -0.15, ... }, // HARDCODED
  ],
  // ...
};
```

### 3. Whale Tracking (MISSING)

**Dokumentasi menyarankan:**
- Gunakan Volume Proxy dari Binance API (gratis)
- Gunakan Exchange Flow estimation
- Calculate whale signal: ACCUMULATION/DISTRIBUTION/NONE

**Current State:**
- Menggunakan fake wallet addresses
- Tidak ada real data integration

---

## 📁 Implementation Plan

### Phase 1: Create Market Insight Edge Function

**File baru:** `supabase/functions/market-insight/index.ts`

**Fungsi:**
1. Fetch Fear & Greed Index dari `https://api.alternative.me/fng/`
2. Fetch BTC/ETH/SOL OHLCV dari Binance API
3. Fetch Global Market Data dari CoinGecko
4. Calculate technical indicators (MA, RSI simplified)
5. Calculate sentiment scores dengan weighted average
6. Generate AI summary menggunakan Lovable AI
7. Return structured response

**API Calls (FREE, NO KEY NEEDED):**
```
- https://api.alternative.me/fng/
- https://api.binance.com/api/v3/klines
- https://api.coingecko.com/api/v3/global
- https://api.coingecko.com/api/v3/coins/bitcoin
```

### Phase 2: Create Macro Analysis Edge Function

**File baru:** `supabase/functions/macro-analysis/index.ts`

**Fungsi:**
1. Proxy fetch DXY, S&P 500, VIX (via yfinance atau alternative)
2. Fetch 10Y Treasury yield
3. Calculate macro sentiment score
4. Generate AI summary
5. Check economic calendar events

**Note:** Yahoo Finance tidak memiliki public API resmi. Alternatif:
- Gunakan CoinGecko global data untuk market cap trend
- Gunakan Binance funding rates sebagai proxy
- Atau gunakan AI untuk generate analysis berdasarkan known data

### Phase 3: Create React Hooks

**Files baru:**
```
src/features/market-insight/
├── useMarketSentiment.ts      # Hook untuk fetch sentiment data
├── useMacroAnalysis.ts        # Hook untuk fetch macro data
├── useFearGreedIndex.ts       # Hook khusus F&G
├── useWhaleTracking.ts        # Hook untuk whale proxy
└── types.ts                   # Type definitions
```

### Phase 4: Refactor MarketInsight Page

**Modify:** `src/pages/MarketInsight.tsx`

**Changes:**
1. Replace all `MOCK_*` constants dengan real hooks
2. Add loading states dan error handling
3. Add refresh functionality (saat ini disabled)
4. Implement auto-refresh setiap 5-15 menit
5. Add caching layer untuk menghindari excessive API calls

### Phase 5: Add Whale Tracking Logic

**Modify edge function untuk include:**
1. Volume spike detection dari Binance
2. Exchange flow estimation
3. Funding rate analysis
4. Generate whale signal: ACCUMULATION/DISTRIBUTION/NONE

---

## 📄 Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/market-insight/index.ts` | Main edge function untuk Market Insight |
| `supabase/functions/macro-analysis/index.ts` | Macro analysis edge function |
| `src/features/market-insight/useMarketSentiment.ts` | React hook untuk sentiment |
| `src/features/market-insight/useMacroAnalysis.ts` | React hook untuk macro |
| `src/features/market-insight/useFearGreedIndex.ts` | React hook untuk F&G |
| `src/features/market-insight/useWhaleTracking.ts` | React hook untuk whale |
| `src/features/market-insight/types.ts` | TypeScript types |

## 📄 Files to Modify

| File | Changes |
|------|---------|
| `src/pages/MarketInsight.tsx` | Remove MOCK data, integrate real hooks |
| `src/types/ai.ts` | Add Market Insight related types |
| `supabase/config.toml` | Add new edge functions |

---

## ⚠️ Technical Considerations

### API Rate Limits
- **Binance:** 1200 req/min (cukup)
- **CoinGecko:** 10-50 req/min (perlu caching)
- **Alternative.me:** Unlimited (sangat ringan)

### Caching Strategy
- Cache sentiment data selama 5 menit
- Cache macro data selama 1 jam
- Cache F&G index selama 1 jam (hanya update daily)

### Error Handling
- Fallback ke cached data jika API gagal
- Graceful degradation dengan partial data
- Clear error messages di UI

### CORS Considerations
- Semua external API calls HARUS melalui edge function (CORS)
- Tidak boleh call langsung dari browser

---

## 🎯 Prioritization

### Must Have (Phase 1-2)
1. Market Insight Edge Function
2. Fear & Greed Index integration
3. Real BTC/ETH/SOL signals

### Should Have (Phase 3-4)
1. Macro Analysis integration
2. Whale Tracking proxy
3. Auto-refresh mechanism

### Nice to Have (Phase 5)
1. Economic Calendar integration
2. Historical data charting
3. Alert system untuk extreme conditions

---

## 📝 Documentation Output

Setelah implementasi selesai, buat file:

**`docs/ai_plan.md`** berisi:
1. Gap analysis summary
2. Implementation checklist
3. API integration details
4. Testing procedures
5. Maintenance guidelines

---

## 🔄 Migration Path

```
Current State                    Target State
─────────────────────────────────────────────────────
MOCK_SENTIMENT (hardcoded)  →   useMarketSentiment() hook
MOCK_VOLATILITY (hardcoded) →   Real volatility calculation
MOCK_OPPORTUNITIES (hardcoded) → AI-generated opportunities
MACRO_CONDITIONS (hardcoded) →  useMacroAnalysis() hook
Fake whale addresses        →   Volume proxy analysis
Static F&G (62)            →   Live alternative.me API
```

---

## ✅ Success Criteria

1. Market Insight page menampilkan **real-time data** dari API
2. Fear & Greed Index ter-update dari alternative.me
3. AI Sentiment score dihitung dengan formula yang benar
4. Macro analysis menampilkan data terkini (atau estimate)
5. Whale tracking menunjukkan volume-based signals
6. Auto-refresh berfungsi setiap 5-15 menit
7. Proper error handling dan loading states
8. `docs/ai_plan.md` terdokumentasi lengkap
