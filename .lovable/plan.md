
# Audit Report: Market Data Page & Economic Calendar Page

## Executive Summary

Audit dilakukan terhadap **Market Data Page** (`/market-data`) dan **Economic Calendar Page** (`/economic-calendar`) beserta seluruh komponen, hook, dan service terkait. Temuan menunjukkan beberapa kategori hardcode yang mempengaruhi akurasi data, konsistensi UI, dan skalabilitas sistem.

---

## STEP 1 — HARDCODE DETECTION

### 1.1 Market Data Page (`src/pages/MarketData.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 17 | `TOP_5_SYMBOLS` | Data | `['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT']` |
| Line 21 | `selectedPair` default | UI State | `'BTCUSDT'` |
| Line 45 | `slice(0, 6)` whale limit | Logic | 6 items max |
| Line 51 | `slice(0, 6)` opportunities limit | Logic | 6 items max |
| Line 123 | Sources text | UI | `'Sources: Binance, CoinGecko, Alternative.me'` |

### 1.2 MarketSentimentWidget (`src/components/market/MarketSentimentWidget.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 52-57 | `DEFAULT_QUICK_SYMBOLS` | Data | 4 symbols fixed |
| Line 59-64 | `PERIODS` | Data | `['5m', '15m', '1h', '4h']` |
| Line 67 | `defaultSymbol` | UI | `'BTCUSDT'` |
| Line 73 | `period` default | Logic | `'1h'` |
| Line 97-106 | Sentiment color thresholds | Logic | `60`, `40` |
| Line 371-398 | Top Trader ratio thresholds | Logic | `1.2`, `0.8`, `1.5`, `0.7`, `1.1`, `0.9`, `0.001` |

### 1.3 WhaleTrackingWidget (`src/components/market/WhaleTrackingWidget.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 37 | `isSelectedInTop5` default | Logic | `true` |
| Line 72 | Badge text | UI | `'Top 5'` |
| Line 82 | Skeleton count | UI | `5` items |

### 1.4 TradingOpportunitiesWidget (`src/components/market/TradingOpportunitiesWidget.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 29 | `isSelectedInTop5` default | Logic | `true` |
| Line 64 | Badge text | UI | `'Top 5'` |
| Line 74 | Skeleton count | UI | `5` items |

### 1.5 VolatilityMeterWidget (`src/components/dashboard/VolatilityMeterWidget.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 16 | `DEFAULT_WATCHLIST` | Data | 5 symbols fixed |
| Line 50 | `max` volatility | Logic | `150` |
| Line 54-58 | Color thresholds | Logic | `30`, `60`, `80` percentages |
| Line 85-88 | Market condition thresholds | Logic | `30`, `60`, `100` |
| Line 205-222 | Legend percentages | UI | `<30%`, `30-60%`, `60-100%`, `>100%` |

### 1.6 Market Insight Edge Function (`supabase/functions/market-insight/index.ts`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 279 | Default symbols | Data | `['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT']` |
| Line 290 | Max symbols limit | Logic | `10` |
| Line 9-10 | RSI period | Logic | `14` |
| Line 117-118 | MA periods | Logic | `50`, `200` |
| Line 143-160 | Momentum thresholds | Logic | `5`, `-5` change percent |
| Line 169 | Min klines check | Logic | `48` |
| Line 183-197 | Volume/price thresholds | Logic | `30`, `2`, `-2`, `50` |
| Line 325 | Volatility thresholds | Logic | `4`, `2` |
| Line 367-371 | Score weights | Logic | `0.30`, `0.25`, `0.25`, `0.20` |
| Line 373-375 | Sentiment thresholds | Logic | `0.60`, `0.45` |

### 1.7 Economic Calendar Page (`src/pages/EconomicCalendar.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| (Minimal) | Page title & description | UI | English strings |

### 1.8 CalendarTab (`src/components/market-insight/CalendarTab.tsx`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 42-43 | Date comparison | Logic | `Today`, `Tomorrow` |
| Line 105 | Risk level comparison | Logic | `'VERY_HIGH'`, `'HIGH'` strings |
| Line 113-115 | Position adjustment text | UI | `'reduce_50%'`, `'reduce_30%'` |
| Line 247-249 | Importance dot colors | UI | `high`=red, `medium`=secondary, `low`=green |
| Line 313 | Disclaimer text | UI | English string |

### 1.9 Economic Calendar Edge Function (`supabase/functions/economic-calendar/index.ts`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 31-35 | Importance mapping | Logic | `>=3`=high, `2`=medium, else=low |
| Line 52-59 | Risk adjustment thresholds | Logic | `>=2` high impact = VERY_HIGH, `1` = HIGH |
| Line 211-219 | Country/event filter | Logic | `'United States'`, `'fed'`, `'fomc'`, `'powell'` |
| Line 219 | Min importance | Logic | `>=2` |
| Line 243 | Max events | Logic | `15` |

### 1.10 useEconomicEvents Hook (`src/hooks/use-economic-events.ts`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 28-44 | `HIGH_IMPACT_PATTERNS` | Data | 14 keyword patterns |
| Line 48-49 | Date range defaults | Logic | `subDays(90)`, `addDays(30)` |
| Line 148-154 | Event label priority | Logic | `'FOMC'`, `'CPI'`, `'NFP'`, `'GDP'`, `'PCE'` |

### 1.11 useBinanceMarketSentiment Hook (`src/features/binance/useBinanceMarketData.ts`)

| Lokasi | Hardcode | Jenis | Nilai |
|--------|----------|-------|-------|
| Line 371-398 | All threshold values | Logic | `1.2`, `0.8`, `1.5`, `0.7`, `1.1`, `0.9`, `0.001` |
| Line 400-402 | Sentiment classification | Logic | `>60`=bullish, `<40`=bearish |

---

## STEP 2 — HARDCODE IMPACT ANALYSIS

### 2.1 Symbol List Hardcode (`TOP_5_SYMBOLS`, `DEFAULT_WATCHLIST`)

**Dampak ke Akurasi:**
- Jika market berubah (e.g., SOL diganti asset baru yang lebih populer), data yang ditampilkan tidak relevan
- User tidak bisa menyesuaikan watchlist sesuai portofolio mereka

**Dampak ke Trust:**
- User dengan portofolio berbeda merasa app tidak personal
- Data tidak mencerminkan aset yang user perdagangkan

**Dampak ke Konsistensi:**
- `TOP_5_SYMBOLS` didefinisikan di 3 tempat berbeda (page, widget, edge function) → risiko mismatch

**Risiko Jangka Panjang:**
- Menambah exchange lain memerlukan update di banyak tempat
- Tidak bisa support user preference per account

---

### 2.2 Sentiment Threshold Hardcode (`60/40`, `1.2/0.8`, etc.)

**Dampak ke Akurasi:**
- Threshold `bullishScore > 60` tidak berdasarkan statistical significance
- Dalam kondisi market tertentu, `60` bisa terlalu sensitif atau terlalu konservatif
- Top trader ratio `1.2` mungkin tidak optimal untuk semua pair

**Dampak ke Trust:**
- User tidak tahu kenapa sentiment berubah dari "neutral" ke "bullish"
- Tidak ada penjelasan metodologi di UI

**Risiko Jangka Panjang:**
- Jika ingin A/B test threshold berbeda → hardcode di banyak tempat
- Tidak bisa per-symbol tuning (BTC vs altcoin behavior berbeda)

---

### 2.3 Display Limit Hardcode (`slice(0, 6)`)

**Dampak ke Akurasi:**
- Data ke-7 dan seterusnya tidak ditampilkan meski relevan
- Opportunity bagus bisa terlewat

**Dampak ke Konsistensi:**
- Skeleton loading menampilkan 5 item, tapi data real 6 item → visual mismatch

**Risiko Jangka Panjang:**
- Tidak bisa responsive (mobile = 4, desktop = 8)
- User tidak bisa expand/collapse

---

### 2.4 Economic Event Filter Hardcode

**Dampak ke Akurasi:**
- Filter `'United States'` mengabaikan event penting dari EU, China, Japan
- Crypto market global, tapi calendar hanya US-centric
- `HIGH_IMPACT_PATTERNS` keyword-based → bisa miss event baru atau typo berbeda

**Dampak ke Trust:**
- User di timezone Asia tidak melihat event lokal
- Incomplete picture of macro landscape

**Risiko Jangka Panjang:**
- Menambah region baru = edit edge function + frontend
- Tidak bisa user-configurable

---

### 2.5 Volatility Threshold Hardcode (`30%`, `60%`, `100%`)

**Dampak ke Akurasi:**
- Threshold statis tidak memperhitungkan regime volatility saat ini
- Dalam bull market, 60% bisa "normal"; dalam bear market, bisa "extreme"

**Dampak ke Konsistensi:**
- Threshold di widget berbeda dengan threshold di edge function
- Widget: `30/60/100`, Edge: `4/2` (percentage berbeda)

**Risiko Jangka Panjang:**
- Tidak adaptive terhadap market conditions
- Sulit untuk backtest dan validasi

---

### 2.6 Score Weight Hardcode (`0.30/0.25/0.25/0.20`)

**Dampak ke Akurasi:**
- Weighting tidak berdasarkan historical validation
- Technical vs on-chain importance bisa berubah per market cycle

**Risiko Jangka Panjang:**
- Tidak bisa ML-tuned
- Tidak transparan ke user

---

## STEP 3 — RESPONSIBILITY & STRUCTURE AUDIT

### 3.1 Single Responsibility Violations

| File | Violation | Severity |
|------|-----------|----------|
| `MarketData.tsx` | Page melakukan data slicing (`slice(0,6)`) - seharusnya di hook/service | Medium |
| `MarketSentimentWidget.tsx` | Komponen berisi business logic sentiment calculation | High |
| `useBinanceMarketSentiment` | Hook melakukan sentiment scoring AND data fetching | Medium |
| `market-insight/index.ts` (edge) | Edge function melakukan fetch, calculation, scoring, formatting semua sekaligus (400+ lines) | High |
| `CalendarTab.tsx` | Date formatting logic inline di component | Low |

### 3.2 DRY Violations

| Pattern | Locations | Issue |
|---------|-----------|-------|
| `TOP_5_SYMBOLS` / `DEFAULT_WATCHLIST` | `MarketData.tsx`, `VolatilityMeterWidget.tsx`, edge function | Duplicate symbol lists |
| Sentiment thresholds | `useBinanceMarketSentiment`, `MarketSentimentWidget` | Threshold logic duplicated |
| Skeleton count | `WhaleTrackingWidget`, `TradingOpportunitiesWidget` | Hardcoded `5` in both |
| "Top 5" badge text | Multiple widgets | Same string repeated |
| Color mapping functions | `getSentimentColor`, `getVolatilityColor` | Similar patterns, not unified |

### 3.3 Data Aggregation di Component

| Component | Issue |
|-----------|-------|
| `MarketData.tsx` | Line 43-51: `useMemo` untuk slicing whale/opportunities data |
| `MarketSentimentWidget.tsx` | Line 96-106: Color calculation di component |
| `VolatilityMeterWidget.tsx` | Line 79-81: Average calculation di component |

---

## STEP 4 — REFACTOR DIRECTION (HIGH-LEVEL)

### 4.1 Extract Constants ke Dedicated Files

```text
src/lib/constants/
├── market-config.ts         # Symbol lists, display limits
├── sentiment-thresholds.ts  # All scoring thresholds
├── volatility-config.ts     # Volatility level definitions
└── economic-calendar.ts     # Event patterns, filters
```

**Prinsip:**
- Single source of truth untuk setiap domain
- Shared antara frontend dan edge function (via import atau duplicated constants file di Deno)

### 4.2 Extract Scoring Logic ke Service/Utils

**Seharusnya Pindah:**
- Sentiment calculation → `src/services/sentiment-scorer.ts`
- Volatility risk assessment → `src/services/volatility-assessor.ts`
- Event impact prediction → `src/services/event-analyzer.ts`

**Benefit:**
- Testable secara unit
- Reusable di multiple components
- Tidak perlu refetch jika hanya threshold berubah

### 4.3 Separate Data Fetching dari Scoring

**Current:**
```text
useBinanceMarketSentiment → fetch + calculate score (coupled)
```

**Ideal:**
```text
useBinanceMarketRawData → fetch only
useSentimentScore(rawData) → calculate score (pure function)
```

### 4.4 Component Simplification

**MarketSentimentWidget seharusnya:**
- Terima `sentimentData` sebagai prop ATAU gunakan hook yang sudah processed
- Tidak melakukan color/threshold logic
- Fokus pada rendering

**MarketData.tsx seharusnya:**
- Orchestration only
- Tidak slice data - hook harus return limited data

### 4.5 Edge Function Decomposition

**Current:** 1 monolithic function 420 lines

**Ideal:**
```text
supabase/functions/market-insight/
├── index.ts              # Router/orchestrator only
├── fetchers.ts           # API call functions
├── calculators.ts        # RSI, MA, volatility calc
├── scorers.ts            # Sentiment scoring
└── formatters.ts         # Response formatting
```

### 4.6 Economic Calendar Regionalization

**Seharusnya:**
- User preference untuk regions (stored di DB/localStorage)
- Edge function accept `regions` parameter
- Frontend pass user preference

### 4.7 Data Flow Ideal

```text
[Edge Function]
    ↓ (raw API data)
[Service Layer] ← Constants
    ↓ (scored/processed data)
[Custom Hook]
    ↓ (UI-ready data with limits applied)
[Component] ← Pure rendering only
```

---

## STEP 5 — RISK LEVEL ASSESSMENT

### Market Data Page: **MEDIUM-HIGH**

**Alasan:**
- Multiple hardcoded thresholds mempengaruhi sentiment accuracy
- Symbol list hardcode membatasi personalization
- Scoring logic di edge function sulit di-tune tanpa redeploy
- Tapi: Data masih dari real source (Binance), bukan dummy

### Economic Calendar Page: **MEDIUM**

**Alasan:**
- US-centric filter bisa miss important events
- Keyword-based high-impact detection fragile
- Tapi: Core data dari Trading Economics API tetap accurate
- AI prediction layer menambah value

---

## Summary Table

| Category | Count | Severity |
|----------|-------|----------|
| Static Symbol Lists | 3 locations | Medium |
| Threshold Hardcodes | 15+ values | High |
| Display Limits | 4 locations | Low |
| Business Logic in UI | 3 components | Medium |
| DRY Violations | 5 patterns | Medium |
| Edge Function Monolith | 1 (420 lines) | High |

---

## Recommended Priority

1. **Immediate**: Extract `TOP_5_SYMBOLS` dan sentiment thresholds ke constants file
2. **Short-term**: Separate scoring logic dari data fetching hooks
3. **Medium-term**: Decompose edge function, add user-configurable watchlist
4. **Long-term**: Per-symbol threshold tuning, regional calendar support
