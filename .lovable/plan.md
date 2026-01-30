

# Plan: Implementasi Backtesting & YouTube Strategy Import

## Overview

Implementasi fitur lengkap dari `docs/strategy/BACKTESTING_YOUTUBE_STRATEGY_GUIDE.md` pada halaman Strategies, mencakup:

1. **YouTube Strategy Importer** - Import strategy dari video YouTube menggunakan AI Gemini
2. **Backtesting Engine** - Jalankan backtest pada historical data
3. **Strategy Library Enhancement** - Filter, validasi, dan perbandingan strategies

---

## Arsitektur Implementasi

```text
┌───────────────────────────────────────────────────────────────────────┐
│                          STRATEGY MANAGEMENT                          │
├───────────────────────────────────────────────────────────────────────┤
│  Tabs:                                                                │
│  [Library] [YouTube Import] [Backtest]                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  TAB 1: Library (existing + enhanced)                                 │
│  ├─ Strategy Cards dengan validation status                          │
│  ├─ Filter by: type, timeframe, difficulty, validation               │
│  └─ Quick action: Edit, Delete, Backtest                              │
│                                                                       │
│  TAB 2: YouTube Import (NEW)                                          │
│  ├─ URL Input                                                         │
│  ├─ Progress indicator (4 stages)                                     │
│  ├─ Extracted Strategy Preview                                        │
│  ├─ Validation Status                                                 │
│  └─ Save to Library                                                   │
│                                                                       │
│  TAB 3: Backtest (NEW)                                                │
│  ├─ Strategy selector                                                 │
│  ├─ Configuration (period, pair, capital)                             │
│  ├─ Run Backtest                                                      │
│  ├─ Results: Metrics Dashboard                                        │
│  └─ Equity Curve Chart                                                │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. Edge Function: `supabase/functions/youtube-strategy-import/index.ts`

**Purpose:** Handle YouTube video transcription dan strategy extraction via Gemini AI

**Flow:**
1. Receive YouTube URL
2. Extract video info (title, description)
3. Download audio dan transcribe via Gemini
4. Parse transcript untuk extract strategy rules
5. Validate dan classify strategy
6. Return structured strategy data

**Key Features:**
- Streaming progress updates
- Error handling
- Validation scoring
- Automation scoring

### 2. Edge Function: `supabase/functions/backtest-strategy/index.ts`

**Purpose:** Run backtesting simulation pada historical data

**Input:**
- Strategy ID atau rules
- Pair (e.g., BTCUSDT)
- Time period (start/end date)
- Initial capital
- Commission rate

**Output:**
- Metrics: win rate, sharpe ratio, max drawdown, profit factor
- Trade list dengan P&L per trade
- Equity curve data points

### 3. Types: `src/types/backtest.ts`

```text
- BacktestConfig: period, pair, capital, commission
- BacktestTrade: entry/exit price, P&L, type
- BacktestMetrics: all calculated metrics
- BacktestResult: trades, metrics, equity_curve
- YouTubeStrategyImport: extracted strategy from video
- StrategyValidation: is_valid, missing_elements, score
- StrategyClassification: type, difficulty, risk_level, automation_score
```

### 4. Hooks: `src/hooks/use-youtube-strategy-import.ts`

```text
- useYouTubeStrategyImport() - mutation untuk import
  - loading states
  - progress tracking
  - error handling
```

### 5. Hooks: `src/hooks/use-backtest.ts`

```text
- useRunBacktest() - mutation untuk run backtest
- useBacktestHistory() - query backtest results history
```

### 6. Components: `src/components/strategy/YouTubeStrategyImporter.tsx`

**UI Elements:**
- URL input field
- Import button
- Progress bar dengan 4 stages:
  1. Downloading video (0-25%)
  2. Transcribing audio (25-50%)
  3. Extracting strategy (50-75%)
  4. Validating (75-100%)
- Extracted Strategy Preview Card:
  - Strategy name
  - Type, Timeframe, Difficulty badges
  - Entry conditions list
  - Exit conditions (TP/SL)
  - Indicators used
- Validation Status:
  - Valid: Green checkmark + "Ready for Backtesting"
  - Invalid: Red X + missing elements list
- Classification Info:
  - Risk level
  - Automation score gauge
  - Suitable pairs
- Action buttons:
  - Save to Library
  - Edit before saving
  - Start Backtest (if valid)

### 7. Components: `src/components/strategy/BacktestRunner.tsx`

**UI Elements:**
- Strategy selector (dropdown dari library)
- Configuration panel:
  - Trading pair (from database)
  - Period selector (date range)
  - Initial capital input
  - Commission rate input (default 0.04%)
- Run Backtest button
- Loading state dengan progress

### 8. Components: `src/components/strategy/BacktestResults.tsx`

**UI Elements:**
- Metrics Dashboard (4 cards):
  - Total Return (%)
  - Win Rate (%)
  - Max Drawdown (%)
  - Sharpe Ratio
- Detailed Metrics Section:
  - Total Trades
  - Winning/Losing trades
  - Avg Win / Avg Loss
  - Profit Factor
  - Consecutive wins/losses
  - Risk-Reward ratio
- Equity Curve Chart (Recharts):
  - Line chart dengan balance over time
  - Drawdown overlay
- Trade List Table:
  - Entry/Exit time
  - Entry/Exit price
  - Direction (Long/Short)
  - P&L ($)
  - P&L (%)
  - Exit type (TP/SL)

### 9. Components: `src/components/strategy/StrategyValidationBadge.tsx`

**Purpose:** Reusable badge showing validation status

**Display:**
- Valid: `✅ Valid` (green)
- Incomplete: `⚠️ Incomplete (x missing)` (yellow)
- Invalid: `❌ Invalid` (red)

---

## Modifikasi Files Existing

### 1. `src/pages/trading-journey/StrategyManagement.tsx`

**Changes:**
- Add top-level Tabs: `[Library] [YouTube Import] [Backtest]`
- Move existing content ke TabsContent "library"
- Add new TabsContent for "import" dan "backtest"
- Add validation status ke strategy cards
- Add "Run Backtest" action di strategy dropdown

### 2. `src/types/strategy.ts`

**Additions:**
- Add `source` field (manual | youtube)
- Add `source_url` field (untuk youtube videos)
- Add `validation_score` field
- Add `automation_score` field
- Add `difficulty_level` type

### 3. `src/hooks/use-trading-strategies.ts`

**Additions:**
- Add `CreateStrategyFromYouTube` mutation
- Add filtering support by validation status

---

## Database Changes (Migration)

**Table: `trading_strategies`**

Add columns:
```text
- source: TEXT DEFAULT 'manual' -- 'manual' | 'youtube'
- source_url: TEXT NULL -- YouTube URL jika imported
- validation_score: INTEGER DEFAULT 100 -- 0-100
- automation_score: INTEGER DEFAULT 0 -- 0-100
- difficulty_level: TEXT NULL -- 'beginner' | 'intermediate' | 'advanced'
```

**Table: `backtest_results` (NEW)**
```text
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES auth.users
- strategy_id: UUID REFERENCES trading_strategies
- pair: TEXT NOT NULL
- period_start: TIMESTAMPTZ
- period_end: TIMESTAMPTZ
- initial_capital: DECIMAL
- final_capital: DECIMAL
- metrics: JSONB -- all calculated metrics
- trades: JSONB -- trade list
- equity_curve: JSONB -- equity data points
- created_at: TIMESTAMPTZ
```

---

## Edge Function Details

### `youtube-strategy-import/index.ts`

**Approach:**
Karena kita tidak bisa download audio di edge function, kita akan:
1. Accept YouTube URL
2. Gunakan YouTube API atau scraping untuk get transcript (jika available)
3. Alternatively: User paste transcript manually
4. Parse dengan Gemini untuk extract strategy

**Gemini Prompt Structure:**
```text
Analyze this video content about trading strategy:

TITLE: {video_title}
CONTENT: {transcript_or_description}

Extract trading strategy dengan format JSON:
{
  strategy_name, type, timeframe, 
  entry_conditions[], exit_conditions{},
  indicators_used[], position_sizing,
  difficulty_level, confidence_score,
  is_valid_tradeable, missing_elements[]
}
```

### `backtest-strategy/index.ts`

**Approach:**
1. Fetch historical OHLCV data dari Binance API
2. Loop through candles
3. Apply entry/exit rules
4. Track P&L dan balance
5. Calculate all metrics
6. Return results

**Note:** Backtesting logic akan simplified untuk MVP - focusing pada TP/SL percentage-based exits.

---

## Implementation Order

1. **Phase 1: Types & Database**
   - Create `src/types/backtest.ts`
   - Update `src/types/strategy.ts`
   - Database migration

2. **Phase 2: Edge Functions**
   - Create `youtube-strategy-import` edge function
   - Create `backtest-strategy` edge function

3. **Phase 3: Hooks**
   - Create `use-youtube-strategy-import.ts`
   - Create `use-backtest.ts`

4. **Phase 4: Components**
   - Create `YouTubeStrategyImporter.tsx`
   - Create `BacktestRunner.tsx`
   - Create `BacktestResults.tsx`
   - Create `StrategyValidationBadge.tsx`

5. **Phase 5: Page Integration**
   - Update `StrategyManagement.tsx` dengan tabs
   - Add validation badges ke strategy cards

---

## UI/UX Considerations

### YouTube Import Tab:
- Clear progress feedback
- Error recovery: allow manual editing
- Preview before save
- Confidence score indicator

### Backtest Tab:
- Realistic defaults (2% risk, 0.04% commission)
- Clear metric definitions (tooltips)
- Mobile-responsive results
- Export results option (future)

### Strategy Cards Enhancement:
- Source indicator (manual vs YouTube icon)
- Validation status badge
- Quick backtest button

---

## Technical Notes

1. **Binance Historical Data:**
   - Edge function fetch klines dari Binance API
   - Rate limiting: max 1000 candles per request
   - Pagination untuk long periods

2. **Backtest Accuracy:**
   - Include slippage simulation (configurable)
   - Commission deduction per trade
   - Next-candle execution (avoid look-ahead bias)

3. **AI Model:**
   - Menggunakan `google/gemini-2.5-flash` (supported Lovable AI)
   - No additional API key required

4. **Limitations:**
   - YouTube transcript extraction mungkin tidak available untuk semua videos
   - Fallback: manual transcript paste

---

## Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Types | 1 | 1 |
| Hooks | 2 | 1 |
| Components | 4 | 0 |
| Pages | 0 | 1 |
| Edge Functions | 2 | 0 |
| Database | 1 migration | 0 |
| **Total** | **10 files** | **3 files** |

