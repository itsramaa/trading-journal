# User Scenarios — Trading Journal & Trade History

> **Version:** 1.0  
> **Last Updated:** 2026-02-10  
> **Status:** Official Documentation  
> **Scope:** Trading Journal (`/trading-journey/journal`) & Trade History (`/trade-history`)

---

## Table of Contents

1. [Trading Journal Scenarios (TJ-01 ~ TJ-12)](#1-trading-journal-scenarios)
2. [Trade History Scenarios (TH-01 ~ TH-12)](#2-trade-history-scenarios)
3. [Cross-Module Scenarios (CM-01 ~ CM-03)](#3-cross-module-scenarios)
4. [Component Map](#4-component-map)
5. [Glossary](#5-glossary)

---

## 1. Trading Journal Scenarios

### TJ-01: Create Trade via Full Wizard

**Precondition:** User logged in, trading gate status ≠ `disabled`

**Steps:**
1. Click **"New Trade"** button di Trading Journal header
2. Dialog opens dengan `TradeEntryWizard`
3. **Step 1 (Setup):** Select pair, direction, entry price, quantity, trading account
4. **Step 2 (Confluence):** Checklist confluence items dari strategy yang dipilih; AI confidence score dihitung
5. **Step 3 (Position Sizing):** Auto-calculate position size berdasarkan risk profile; set SL/TP
6. **Step 4 (Final Checklist):** Review seluruh parameter, emotional state, trade comment; AI quality score generated
7. **Step 5 (Confirmation):** Final review dan submit

**Expected Result:**
- Row baru di `trade_entries` dengan `status='open'`, `source='manual'`
- Jika strategy dipilih → row di `trade_entry_strategies`
- Query `trade-entries` di-invalidate → Active tab refresh
- Wizard dialog closes
- Toast: "Trade executed successfully!"

**Data Flow:** `DB Write` → `Cache Invalidation (trade-entries, unified-portfolio)`

**Components:** `TradeEntryWizard`, `SetupStep`, `ConfluenceValidator`, `PositionSizingStep`, `FinalChecklist`, `TradeConfirmation`

**Hooks:** `useTradeEntryWizard`, `useTradingGate`, `useTradeEntries`, `useRiskProfile`

---

### TJ-02: Create Trade via Express Wizard

**Precondition:** User logged in, trading gate status ≠ `disabled`

**Steps:**
1. Click **"New Trade"** → pilih mode **Express**
2. **Step 1 (Setup):** Select pair, direction, entry price, quantity (simplified)
3. **Step 2 (Price Levels):** Set entry, SL, TP → auto position sizing
4. **Step 3 (Confirm):** Quick review dan submit

**Expected Result:**
- Sama dengan TJ-01, tanpa confluence check dan detailed checklist
- `confluence_score` = 0, `emotional_state` = null

**Data Flow:** `DB Write` → `Cache Invalidation`

**Components:** `TradeEntryWizard` (express mode steps only)

**Hooks:** `useTradeEntryWizard` (mode='express'), `useTradeEntries`

---

### TJ-03: AI Pre-Flight Gate — SKIP Verdict

**Precondition:** User logged in, ≥20 historical trades, AI Pre-flight enabled

**Steps:**
1. Click **"New Trade"** → Full Mode
2. Pada Step 1 (Setup), setelah pair & direction dipilih, AI Pre-flight Check berjalan
3. Sistem menganalisis: Data Sufficiency, Edge Validation (EV/R), Context Similarity, Stability, Bias Detection
4. Verdict = **SKIP** (edge negatif atau insufficient data)

**Expected Result:**
- Banner warning merah ditampilkan: "AI recommends skipping this trade"
- Tombol **"Next"** di-disable (blocked)
- User dapat bypass dengan mekanisme manual (checkbox/confirmation)
- Jika bypass → trade tetap bisa dibuat, tapi `pre_trade_validation.verdict = 'SKIP'` tercatat

**Data Flow:** `Edge Function Call (ai-preflight)` → `DB Read (historical trades)` → `UI State Update`

**Components:** `PreFlightCheck`, `SetupStep`

**Hooks:** `useTradeEntryWizard`, `useTradingGate`

---

### TJ-04: AI Pre-Flight Gate — PROCEED / CAUTION

**Precondition:** User logged in, ≥20 historical trades

**Steps:**
1. Click **"New Trade"** → Full Mode
2. AI Pre-flight menganalisis pair + direction
3. Verdict = **PROCEED** (positive edge) atau **CAUTION** (marginal edge)

**Expected Result:**
- **PROCEED:** Green indicator, confidence score displayed, "Next" enabled
- **CAUTION:** Yellow warning, risk factors listed, "Next" enabled dengan warning
- `pre_trade_validation` object disimpan di state wizard
- Confidence score di-cap pada 80%

**Data Flow:** `Edge Function Call` → `UI State Update`

**Components:** `PreFlightCheck`, `SetupStep`

**Hooks:** `useTradeEntryWizard`, `useTradingGate`

---

### TJ-05: View Active Positions

**Precondition:** User logged in, ≥1 open trade (paper atau Binance)

**Steps:**
1. Navigate ke Trading Journal
2. Default tab = **"Active"**
3. Tabel menampilkan unified positions (Paper + Binance)

**Expected Result:**
- Kolom: Symbol, Direction, Entry Price, Current Price, Unrealized P&L, Source badge (Paper/Binance)
- Paper trades: dari `trade_entries` WHERE `status='open'`
- Binance trades: dari Binance API (real-time positions)
- Masing-masing row memiliki action buttons: Close, Edit, Enrich

**Data Flow:** `DB Read (trade_entries)` + `API Read (Binance positions)` → `Unified Merge`

**Components:** `AllPositionsTable`, `UnifiedPositionRow`

**Hooks:** `useTradeEntries`, `useBinancePositions`, `useUnifiedPortfolio`

---

### TJ-06: View Pending Orders

**Precondition:** User logged in, Binance API connected

**Steps:**
1. Navigate ke Trading Journal
2. Click tab **"Pending"**
3. Tabel menampilkan Binance open orders + local paper drafts

**Expected Result:**
- Binance open orders: LIMIT, STOP_MARKET, TAKE_PROFIT_MARKET
- Setiap order menampilkan: Symbol, Type, Side, Price, Quantity, Time
- Action button: **Cancel Order** (untuk Binance orders)
- Tab badge menampilkan total count (Binance orders + paper drafts)

**Data Flow:** `API Read (Binance open orders)` → `UI Render`

**Components:** `BinanceOpenOrdersTable`, `PendingOrderRow`

**Hooks:** `useBinanceOpenOrders`

---

### TJ-07: Close Position (Manual)

**Precondition:** User logged in, ≥1 open paper trade

**Steps:**
1. Pada Active tab, click **"Close"** button di row trade
2. Dialog muncul: input Exit Price, Exit Fee (optional)
3. P&L auto-calculated: `(exitPrice - entryPrice) × quantity × direction_multiplier - fees`
4. Click **"Confirm Close"**

**Expected Result:**
- `trade_entries` di-update: `status='closed'`, `exit_price`, `pnl`, `realized_pnl`, `result` (win/loss/breakeven)
- `exit_datetime` di-set ke current timestamp
- `hold_time_minutes` dihitung dari `entry_datetime`
- Post-trade AI analysis di-trigger secara async (background)
- Query invalidation: `trade-entries`, `unified-portfolio`, `contextual-analytics`
- Trade berpindah dari Active tab ke Trade History
- Toast: "Position closed successfully"

**Data Flow:** `DB Write` → `Cache Invalidation (cascading)` → `Background Edge Function (post-trade-analysis)`

**Components:** `CloseTradeDialog`, `AllPositionsTable`

**Hooks:** `useTradeEntries`, `useClosePosition`, `useQueryInvalidation`

---

### TJ-08: Edit Position (SL/TP/Notes)

**Precondition:** User logged in, ≥1 open paper trade

**Steps:**
1. Pada Active tab, click **"Edit"** button di row trade
2. Dialog muncul dengan form: Stop Loss, Take Profit, Notes, Tags
3. Modify nilai yang diinginkan
4. Click **"Save"**

**Expected Result:**
- `trade_entries` di-update dengan field yang diubah
- `updated_at` timestamp diperbarui
- Query `trade-entries` di-invalidate
- Dialog closes
- Toast: "Trade updated"

**Data Flow:** `DB Write` → `Cache Invalidation`

**Components:** `EditTradeDialog`

**Hooks:** `useTradeEntries`

---

### TJ-09: Delete Trade Entry

**Precondition:** User logged in, ≥1 paper trade (open atau closed)

**Steps:**
1. Click **"Delete"** pada trade row (Active tab atau via context menu)
2. Confirmation dialog muncul: "Are you sure? This trade will be soft-deleted."
3. Click **"Confirm Delete"**

**Expected Result:**
- `trade_entries.deleted_at` di-set ke current timestamp (soft delete)
- Trade hilang dari semua view (RLS policy: `WHERE deleted_at IS NULL`)
- Trade dapat di-recover dari **Settings > Deleted Trades** panel
- Query invalidation: `trade-entries`, `unified-portfolio`
- Toast: "Trade deleted"

**Data Flow:** `DB Write (soft delete)` → `Cache Invalidation`

**Components:** `DeleteConfirmDialog`, `AllPositionsTable`

**Hooks:** `useTradeEntries`, `useDeleteTrade`

---

### TJ-10: Enrich Trade via Drawer

**Precondition:** User logged in, ≥1 trade (paper atau Binance position)

**Steps:**
1. Click **"Enrich"** / **"Journal"** button pada trade row
2. `TradeEnrichmentDrawer` slide-in dari kanan
3. User mengisi:
   - **Strategies Used:** Toggle badge dari daftar `trading_strategies`
   - **Screenshots:** Upload chart screenshots via `ScreenshotUploader`
   - **Chart Timeframe:** Select dari dropdown (1m, 5m, 15m, 1h, 4h, 1d, 1w)
   - **Emotional State:** Select dari EMOTIONAL_STATES (Confident, Fearful, Greedy, dll.)
   - **Trade Notes:** Free-text textarea
   - **Custom Tags:** Comma-separated tags
   - **AI Analysis:** Optional — click "Request AI Analysis" untuk generate
4. Click **"Save"**

**Expected Result:**
- Paper trade: `trade_entries` di-update (notes, emotional_state, chart_timeframe, tags, screenshots)
- Strategy link: `trade_entry_strategies` di-upsert (delete old + insert new)
- Binance position: data disimpan ke `trade_entries` dengan referensi Binance trade ID
- Drawer closes
- Toast: "Enrichment saved"
- `onSaved` callback triggered → parent component refresh

**Data Flow:** `DB Write (trade_entries + trade_entry_strategies)` → `Storage Upload (screenshots)` → `Cache Invalidation`

**Components:** `TradeEnrichmentDrawer`, `ScreenshotUploader`, `AIAnalysisDisplay`

**Hooks:** `useTradeEnrichment`, `useTradeAIAnalysis`, `useTradingStrategies`

---

### TJ-11: Post-Trade AI Analysis (Auto)

**Precondition:** Trade baru saja di-close (TJ-07), AI settings enabled

**Steps:**
1. Setelah close position berhasil
2. System auto-triggers background edge function `post-trade-analysis`
3. AI menganalisis: win/loss factors, lessons, improvements, pattern recognition
4. Hasil disimpan ke `trade_entries.post_trade_analysis`

**Expected Result:**
- `post_trade_analysis` JSON populated dengan: `overallAssessment`, `winFactors`, `lossFactors`, `lessons`, `improvements`, `patternUpdate`
- `ai_analysis_generated_at` timestamp di-set
- Jika user membuka TradeEnrichmentDrawer setelahnya → AI Analysis section menampilkan hasil
- Proses berjalan async — tidak memblokir UI

**Data Flow:** `Edge Function (post-trade-analysis)` → `DB Write` → `Background process`

**Components:** (Background — no direct UI interaction)

**Hooks:** `useTradeAIAnalysis`

---

### TJ-12: Cancel Binance Open Order

**Precondition:** User logged in, Binance API connected, ≥1 open order

**Steps:**
1. Navigate ke Trading Journal → tab **"Pending"**
2. Identify order yang ingin di-cancel
3. Click **"Cancel"** button pada order row
4. Confirmation dialog muncul
5. Click **"Confirm Cancel"**

**Expected Result:**
- API call ke Binance: cancel order
- Order hilang dari Pending tab
- Binance open orders di-refresh
- Tab badge count berkurang
- Toast: "Order cancelled successfully"

**Data Flow:** `API Write (Binance cancel order)` → `API Read (refresh open orders)` → `UI Update`

**Components:** `BinanceOpenOrdersTable`, `CancelOrderDialog`

**Hooks:** `useBinanceOpenOrders`, `useCancelOrder`

---

## 2. Trade History Scenarios

### TH-01: Browse Closed Trades (Infinite Scroll)

**Precondition:** User logged in, ≥1 closed trade

**Steps:**
1. Navigate ke **Trade History** (`/trade-history`)
2. Default view menampilkan semua closed trades
3. Scroll ke bawah → infinite scroll loads halaman berikutnya (50 trades/page)
4. Toggle antara **List** dan **Gallery** view

**Expected Result:**
- Stats header: Total Trades, Win Rate, Total P&L (gross & net), Profit Factor — dihitung via RPC `get_trade_stats`
- Trade cards/rows menampilkan: Pair, Direction, Entry/Exit Price, P&L, Result badge, Source badge, Date
- "Load More" indicator muncul saat ada data tambahan
- Gallery view menampilkan card-based layout dengan screenshot preview (jika ada)

**Data Flow:** `RPC (get_trade_stats)` + `DB Read (trade_entries, paginated)` → `UI Render`

**Components:** `TradeHistoryPage`, `TradeHistoryList`, `TradeHistoryCard`, `TradeHistoryStats`

**Hooks:** `useTradeHistory`, `useTradeHistoryFilters`, `useTradeStats`

---

### TH-02: Filter by Date Range

**Precondition:** User pada halaman Trade History

**Steps:**
1. Click **date range picker** di filter bar
2. Select start date dan end date (default: 1 year lookback)
3. Filter applied

**Expected Result:**
- Trade list di-filter berdasarkan `trade_date` range
- Stats header di-recalculate via `get_trade_stats` dengan parameter date
- Pagination di-reset ke page 1
- "Load More" count reflects filtered total

**Data Flow:** `RPC (get_trade_stats with date params)` + `DB Read (filtered)` → `UI Update`

**Components:** `TradeHistoryFilters`, `DateRangePicker`

**Hooks:** `useTradeHistoryFilters`, `useTradeHistory`

---

### TH-03: Filter by Result / Direction / Session

**Precondition:** User pada halaman Trade History

**Steps:**
1. Di filter bar, select satu atau kombinasi:
   - **Result:** Win, Loss, Breakeven
   - **Direction:** Long, Short
   - **Session:** Asia, London, New York
2. Filter applied secara real-time

**Expected Result:**
- Mapping UI → DB: `profit` → `win`, `loss` → `loss` (via `useTradeHistoryFilters`)
- Query `get_trade_stats` di-panggil ulang dengan filter params (`p_directions`, `p_sessions`, dll.)
- Trade list di-filter di level database (bukan client-side)
- Stats header di-recalculate sesuai filter aktif
- Multiple filters bisa dikombinasi (AND logic)

**Data Flow:** `RPC (filtered stats)` + `DB Read (filtered trades)` → `UI Update`

**Components:** `TradeHistoryFilters`, `FilterBadges`

**Hooks:** `useTradeHistoryFilters`, `useTradeHistory`, `useTradeStats`

---

### TH-04: Filter by Strategy

**Precondition:** User pada halaman Trade History, ≥1 strategy created

**Steps:**
1. Di filter bar, click **Strategy** dropdown
2. Select satu atau lebih strategy (badge toggle)
3. Filter applied

**Expected Result:**
- Query menggunakan `p_strategy_ids` parameter
- Hanya trade yang linked ke selected strategy ditampilkan
- Stats di-recalculate untuk filtered set
- Join via `trade_entry_strategies` table

**Data Flow:** `RPC (filtered by strategy)` + `DB Read (join trade_entry_strategies)` → `UI Update`

**Components:** `TradeHistoryFilters`, `StrategyFilterBadges`

**Hooks:** `useTradeHistoryFilters`, `useTradingStrategies`

---

### TH-05: Sort by AI Quality Score

**Precondition:** User pada halaman Trade History, ≥1 trade dengan `ai_quality_score`

**Steps:**
1. Click header kolom **"AI Score"** atau sort toggle
2. Toggle antara ascending / descending

**Expected Result:**
- Trade list di-sort berdasarkan `ai_quality_score`
- Client-side sorting (bukan DB-level) karena score bisa null
- Trades tanpa AI score muncul di akhir
- Score labels: Excellent (≥80), Good (≥60), Fair (≥40), No Data (0/null)

**Data Flow:** `Client-side sort` → `UI Re-render`

**Components:** `TradeHistoryList`, `SortToggle`

**Hooks:** `useTradeHistory`

---

### TH-06: Switch Tabs (All / Binance / Paper / Fees / Funding)

**Precondition:** User pada halaman Trade History

**Steps:**
1. Click salah satu tab: **All**, **Binance**, **Paper**, **Fees**, **Funding**

**Expected Result:**
- **All:** Semua closed trades (subject to `use_binance_history` toggle)
- **Binance:** Hanya trades dengan `source='binance'`
- **Paper:** Hanya trades dengan `source='manual'` atau `source IS NULL`
- **Fees:** Breakdown commission per trade (dari `commission`, `commission_asset`)
- **Funding:** Funding fee history (dari `funding_fees` field)
- Stats header di-recalculate per tab
- Pagination di-reset

**Data Flow:** `DB Read (filtered by source)` → `UI Update`

**Components:** `TradeHistoryTabs`, `TradeHistoryList`, `FeesTable`, `FundingTable`

**Hooks:** `useTradeHistory`, `useTradeHistoryFilters`

---

### TH-07: Incremental Sync (Auto)

**Precondition:** User logged in, Binance API connected, previous sync ≤30 days ago

**Steps:**
1. Navigate ke Trade History
2. On mount, `useIncrementalSync` hook checks `localStorage` untuk `lastSync.endTime`
3. Jika eligible → auto-trigger incremental sync
4. Fetch trades dari Binance sejak `lastSync.endTime - 5min` (safety overlap)

**Expected Result:**
- New trades dari Binance di-insert ke `trade_entries`
- Existing trades di-skip (upsert logic via `binance_trade_id`)
- `lastSync.endTime` di-update di `localStorage`
- Sync quota di-increment via `increment_sync_quota` RPC
- Trade list di-refresh otomatis
- Subtle indicator: "Last synced: X minutes ago"

**Data Flow:** `Edge Function (binance-background-sync)` → `API Read (Binance)` → `DB Upsert` → `Cache Invalidation`

**Components:** `SyncStatusIndicator`

**Hooks:** `useIncrementalSync`, `useSyncStore`

---

### TH-08: Full History Sync

**Precondition:** User logged in, Binance API connected, sync quota belum habis

**Steps:**
1. Click **"Full Sync"** button di Trade History header
2. `BinanceFullSyncPanel` opens
3. Select date range (default: 2 years)
4. Click **"Start Sync"**
5. Progress bar menampilkan: chunks processed, trades found, estimated time

**Expected Result:**
- Chunked fetching dari Binance API (paginated, rate-limited)
- Progress UI: percentage, trades count, current chunk
- Sync quota checked via `check_sync_quota` RPC sebelum start
- Jika quota exceeded → HTTP 429, UI menampilkan warning, button disabled
- Setelah selesai: trade list refresh, stats recalculated
- `Sync Quality Score` dihitung (Match Rate antara income records dan aggregated trades)
- Toast: "Sync complete! X trades imported"

**Data Flow:** `Edge Function (binance-background-sync)` → `Binance API (chunked)` → `DB Upsert` → `Reconciliation` → `Cache Invalidation`

**Components:** `BinanceFullSyncPanel`, `SyncProgressBar`, `SyncQualityIndicator`

**Hooks:** `useSyncStore`, `useSyncQuota`, `useSyncHealth`

---

### TH-09: Batch Re-Enrichment

**Precondition:** User logged in, ≥1 trade dengan data incomplete (e.g. `entry_price=0`)

**Steps:**
1. System mendeteksi trades yang incomplete
2. Banner/indicator muncul: "X trades need re-enrichment"
3. Click **"Re-Enrich"** button
4. Batch process berjalan: re-fetch data dari Binance API untuk setiap incomplete trade

**Expected Result:**
- Trades yang incomplete di-update dengan data yang benar
- `entry_price`, `exit_price`, `quantity`, `commission` diperbarui
- Progress indicator selama proses
- Toast: "X trades re-enriched successfully"

**Data Flow:** `Edge Function (re-enrich)` → `Binance API` → `DB Update (batch)` → `Cache Invalidation`

**Components:** `ReEnrichmentBanner`, `BatchProgressIndicator`

**Hooks:** `useReEnrichment`

---

### TH-10: Export to CSV

**Precondition:** User pada halaman Trade History, ≥1 trade visible

**Steps:**
1. Click **"Export"** button di Trade History header
2. Select format: **CSV**
3. System generates file dari currently filtered/visible trades

**Expected Result:**
- CSV file di-download ke browser
- Kolom: Date, Pair, Direction, Entry Price, Exit Price, Quantity, P&L, Fees, Result, Source, Strategy, Notes
- Filter yang aktif di-apply ke export (hanya export apa yang visible)
- Filename format: `trades_YYYY-MM-DD.csv`

**Data Flow:** `Client-side generation` → `Browser Download`

**Components:** `ExportButton`, `CSVExporter`

**Hooks:** `useTradeHistory` (current filtered data)

---

### TH-11: Enrich Trade from History

**Precondition:** User pada halaman Trade History, ≥1 closed trade

**Steps:**
1. Click trade card/row di Trade History
2. `TradeEnrichmentDrawer` opens (sama dengan TJ-10)
3. User adds/modifies: strategies, notes, emotions, screenshots, tags
4. Optional: Click **"Request AI Analysis"** untuk post-trade analysis
5. Click **"Save"**

**Expected Result:**
- Sama dengan TJ-10 (Enrich Trade via Drawer)
- Khusus History: trade sudah closed, jadi enrichment fokus pada review/journaling
- AI Analysis bisa di-request ulang jika belum ada atau ingin update

**Data Flow:** `DB Read (existing enrichment)` → `DB Write (update)` → `Cache Invalidation`

**Components:** `TradeEnrichmentDrawer`, `TradeHistoryCard`

**Hooks:** `useTradeEnrichment`, `useTradeAIAnalysis`

---

### TH-12: Soft Delete & Recovery

**Precondition:** User pada halaman Trade History, ≥1 trade visible

**Steps:**
1. Click **"Delete"** pada trade card/row
2. Confirmation dialog muncul
3. Click **"Confirm"**

**Recovery Steps:**
4. Navigate ke **Settings > Deleted Trades**
5. `DeletedTradesPanel` menampilkan soft-deleted trades
6. Click **"Restore"** pada trade yang ingin di-recover
7. RPC `restore_trade_entry` dipanggil

**Expected Result:**
- **Delete:** `deleted_at` di-set, trade hilang dari semua view
- **Restore:** `deleted_at` di-set ke NULL, trade muncul kembali
- RLS policy otomatis exclude/include berdasarkan `deleted_at`
- Permanent delete terjadi otomatis setelah retention period (via `cleanup_old_trades` RPC)

**Data Flow:** `DB Write (soft delete/restore)` → `Cache Invalidation`

**Components:** `DeleteConfirmDialog`, `DeletedTradesPanel`

**Hooks:** `useDeleteTrade`, `useDeletedTrades`

---

## 3. Cross-Module Scenarios

### CM-01: Journal to History Flow (Trade Lifecycle)

**Precondition:** User logged in

**Steps:**
1. **Journal:** Create trade via wizard (TJ-01/TJ-02)
2. **Journal:** Trade muncul di Active tab (TJ-05)
3. **Journal:** User melakukan enrichment (TJ-10) — optional
4. **Journal:** Close position (TJ-07)
5. **History:** Trade otomatis muncul di Trade History dengan status `closed`
6. **History:** Post-trade AI analysis tersedia (TJ-11)
7. **History:** User bisa enrich lebih lanjut dari History (TH-11)

**Expected Result:**
- Single `trade_entries` row mengalami lifecycle: `open` → `closed`
- Semua enrichment data (strategy, notes, emotions) persistent
- Stats di Trade History ter-update setelah close
- Cascading cache invalidation memastikan kedua module sinkron

**Data Flow:** `Journal (create) → Active Tab → Close → History (appear) → Enrich → Analytics`

---

### CM-02: Binance Data Visibility Toggle

**Precondition:** User logged in, Binance API connected, ≥1 synced Binance trade

**Steps:**
1. Navigate ke **Settings**
2. Toggle **"Show Binance History"** (`use_binance_history`) OFF
3. Navigate ke Trade History
4. Navigate ke Trading Journal

**Expected Result:**
- **Toggle OFF:**
  - Trade History: Binance tab masih ada, tapi "All" tab hanya menampilkan paper trades
  - Trading Journal: Active tab hanya menampilkan paper positions
  - Stats dihitung hanya dari paper trades
- **Toggle ON:**
  - Semua Binance data visible kembali
  - Stats include Binance + paper trades
- Setting disimpan di `user_settings.use_binance_history`

**Data Flow:** `DB Write (user_settings)` → `Hook (useBinanceDataSource)` → `Query refetch with filter`

**Components:** `BinanceSettingsPanel`

**Hooks:** `useBinanceDataSource`, `useUserSettings`

---

### CM-03: Sync Quota Enforcement

**Precondition:** User logged in, Binance API connected

**Steps:**
1. User melakukan full sync (TH-08) multiple times dalam satu hari
2. Setelah sync ke-10 (default quota), user mencoba sync lagi
3. System menolak request

**Expected Result:**
- `check_sync_quota` RPC returns `allowed=false`
- Edge function returns HTTP **429 Too Many Requests**
- UI: "Full Sync" button disabled
- Warning message: "Daily sync limit reached (10/10). Try again tomorrow."
- Quota reset pada midnight UTC (via `sync_date` column)
- Incremental sync (TH-07) juga terpengaruh quota

**Data Flow:** `RPC (check_sync_quota)` → `UI Disable` atau `Edge Function 429`

**Components:** `BinanceFullSyncPanel`, `SyncQuotaIndicator`

**Hooks:** `useSyncQuota`

---

## 4. Component Map

| Scenario | Primary Components | Primary Hooks | Data Flow |
|----------|-------------------|---------------|-----------|
| TJ-01 | TradeEntryWizard, SetupStep, ConfluenceValidator, PositionSizingStep, FinalChecklist | useTradeEntryWizard, useTradingGate, useRiskProfile | DB Write |
| TJ-02 | TradeEntryWizard (express) | useTradeEntryWizard | DB Write |
| TJ-03 | PreFlightCheck, SetupStep | useTradeEntryWizard, useTradingGate | Edge Function + DB Read |
| TJ-04 | PreFlightCheck, SetupStep | useTradeEntryWizard, useTradingGate | Edge Function + DB Read |
| TJ-05 | AllPositionsTable | useTradeEntries, useBinancePositions, useUnifiedPortfolio | DB Read + API Read |
| TJ-06 | BinanceOpenOrdersTable | useBinanceOpenOrders | API Read |
| TJ-07 | CloseTradeDialog, AllPositionsTable | useClosePosition, useQueryInvalidation | DB Write + Background Edge |
| TJ-08 | EditTradeDialog | useTradeEntries | DB Write |
| TJ-09 | DeleteConfirmDialog | useDeleteTrade | DB Write (soft) |
| TJ-10 | TradeEnrichmentDrawer, ScreenshotUploader, AIAnalysisDisplay | useTradeEnrichment, useTradeAIAnalysis, useTradingStrategies | DB Write + Storage |
| TJ-11 | (Background) | useTradeAIAnalysis | Edge Function + DB Write |
| TJ-12 | BinanceOpenOrdersTable, CancelOrderDialog | useBinanceOpenOrders, useCancelOrder | API Write |
| TH-01 | TradeHistoryPage, TradeHistoryList, TradeHistoryStats | useTradeHistory, useTradeStats | RPC + DB Read |
| TH-02 | TradeHistoryFilters, DateRangePicker | useTradeHistoryFilters | RPC + DB Read |
| TH-03 | TradeHistoryFilters, FilterBadges | useTradeHistoryFilters, useTradeStats | RPC + DB Read |
| TH-04 | TradeHistoryFilters, StrategyFilterBadges | useTradeHistoryFilters, useTradingStrategies | RPC + DB Read (join) |
| TH-05 | TradeHistoryList, SortToggle | useTradeHistory | Client-side sort |
| TH-06 | TradeHistoryTabs | useTradeHistory, useTradeHistoryFilters | DB Read (filtered) |
| TH-07 | SyncStatusIndicator | useIncrementalSync, useSyncStore | Edge Function + DB Upsert |
| TH-08 | BinanceFullSyncPanel, SyncProgressBar | useSyncStore, useSyncQuota, useSyncHealth | Edge Function + Binance API |
| TH-09 | ReEnrichmentBanner | useReEnrichment | Edge Function + DB Update |
| TH-10 | ExportButton, CSVExporter | useTradeHistory | Client-side |
| TH-11 | TradeEnrichmentDrawer, TradeHistoryCard | useTradeEnrichment, useTradeAIAnalysis | DB Read + DB Write |
| TH-12 | DeleteConfirmDialog, DeletedTradesPanel | useDeleteTrade, useDeletedTrades | DB Write (soft/restore) |
| CM-01 | (Multi-component lifecycle) | useTradeEntryWizard → useClosePosition → useTradeHistory | Full lifecycle |
| CM-02 | BinanceSettingsPanel | useBinanceDataSource, useUserSettings | DB Write (settings) |
| CM-03 | BinanceFullSyncPanel, SyncQuotaIndicator | useSyncQuota | RPC + Edge Function |

---

## 5. Glossary

| Term | Definition |
|------|-----------|
| **Enrichment** | Proses menambahkan data jurnal (strategy, notes, emotions, screenshots, tags) ke trade entry yang sudah ada |
| **Full Sync** | Sinkronisasi lengkap history trading dari Binance API, biasanya mencakup 1-2 tahun data dengan chunked fetching |
| **Incremental Sync** | Sinkronisasi parsial yang hanya mengambil data baru sejak last sync, dengan 5-menit safety overlap |
| **Soft Delete** | Penghapusan non-permanen menggunakan kolom `deleted_at`. Data masih ada di database tapi di-exclude oleh RLS policy |
| **Trading Gate** | Mekanisme AI pre-flight yang mengevaluasi apakah user memiliki statistical edge sebelum membuka trade baru |
| **AI Quality Score** | Skor 0-100 yang menilai kualitas setup trade berdasarkan: Win Rate (40%), Profit Factor (30%), Consistency (20%), Sample Size (10%) |
| **Confluence Score** | Jumlah checklist items yang terpenuhi dari strategy yang dipilih saat entry trade |
| **EV/R (Expected Value per R)** | Rumus edge: `(WinRate × AvgWinR) - ((1 - WinRate) × AvgLossR)`. Positif = edge exists |
| **Sync Quota** | Batas harian jumlah sinkronisasi Binance per user (default: 10/hari) untuk mencegah API abuse |
| **Match Rate** | Persentase kecocokan antara income records (P&L, commission) dengan aggregated trade data. Digunakan untuk Sync Quality Score |
| **Cascading Invalidation** | Pattern di mana satu perubahan data (e.g., close trade) memicu refresh pada multiple query keys secara otomatis |
| **Paper Trade** | Trade yang dibuat secara manual melalui Trade Entry Wizard, tanpa eksekusi di exchange |
| **Unified Position** | Representasi gabungan dari Paper trade dan Binance position dalam satu tabel yang seragam |
| **Pre-flight Check** | Analisis AI 5 lapis (Data Sufficiency, Edge Validation, Context Similarity, Stability, Bias Detection) sebelum entry trade |
| **Post-Trade Analysis** | Analisis AI otomatis setelah trade di-close, menghasilkan win/loss factors, lessons, dan pattern recognition |

---

> **Maintenance Note:** Dokumen ini harus di-update setiap kali ada perubahan pada flow Trading Journal atau Trade History. Setiap penambahan scenario baru harus mengikuti format standar yang telah ditetapkan.
