# Professional Trading Journal System — Detailed User Scenario

> **Version:** 1.0  
> **Last Updated:** 2026-02-10  
> **Status:** Official Operational Blueprint  
> **Type:** Source of Truth — No Gap Edition  
> **Scope:** Full system (Binance + Hybrid Paper/Live)

---

## 0. Prinsip Dasar Sistem (FIXED, TIDAK BISA DINEGO)

| Prinsip | Detail |
|---------|--------|
| **Paper dan Live DIPISAH di:** | Data, Domain logic, Statistik, AI learning |
| **Paper dan Live DIGABUNG di:** | Aplikasi, UI/UX, User journey |
| **Sistem TIDAK PERNAH mengeksekusi trade** | Eksekusi selalu di Binance App |
| **Jika dilanggar:** | Semua yang di bawah otomatis runtuh |

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Data separation (source field) | ✅ Done | `source: 'manual' \| 'binance'` di `trade_entries` |
| Statistik terpisah | ✅ Done | `get_trade_stats` RPC dengan `p_source` filter |
| AI learning terpisah | ✅ Done | AI context menerima source info |
| UI/UX unified | ✅ Done | Single app, shared components |
| No trade execution | ✅ Done | Read-only API architecture |

---

## 1. Pra-Kondisi (Sebelum User Login)

### 1.1 Akun & Integrasi

- User memiliki akun Binance (Spot / Futures)
- User membuat API Key Binance (**READ-ONLY**):
  - Read Account
  - Read Orders
  - Read Trades
  - ❌ NO trade permission
- API Key disimpan:
  - Encrypted (Supabase Vault)
  - Scope-validated
  - Audit-log aktif

### 1.2 Initial Data Sync

Sistem melakukan:
- Historical trade sync (configurable, default 90 hari, max 2 tahun)
- Account metadata sync
- Market metadata preload

Output:
- Baseline statistik live
- Paper trades **tidak ikut**

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| API Key encrypted storage | ✅ Done | `exchange_credentials` + Vault encryption |
| Scope validation | ✅ Done | `permissions` field + validation on save |
| UI read-only guidance | ✅ Done | `ApiKeyForm.tsx` warning text |
| Historical sync (configurable) | ✅ Done | Full History Sync 2 tahun, chunk-based |
| Account metadata sync | ✅ Done | `useBinanceBalance` |
| Audit log untuk API access | 🔴 Missing | Tidak ada `audit_logs` table |

---

## 2. Login & Session Initialization

### 2.1 User Login

Sistem memuat:
- Profile user
- Strategy library
- Statistik LIVE (default)
- Last session context (jika ada)

### 2.2 Session Context Setup (WAJIB)

User **HARUS** memilih sebelum lanjut:

```json
{
  "trade_mode": "LIVE | PAPER",
  "trade_style": "SCALPING | SHORT | SWING"
}
```

**Catatan penting:**
- Session context ≠ trade
- Context hanya template
- Trade akan **mengunci** context saat tercipta (immutable per trade)

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Profile load | ✅ Done | `useAuth` + `users_profile` |
| Strategy library load | ✅ Done | `useTradingStrategies` |
| Statistik global load | ✅ Done | `useTradeEntries` + RPC |
| `trade_mode` persistent field | ✅ Done | `active_trade_mode` in `user_settings` + `useTradeMode` hook |
| `trade_style` persistent field | ✅ Done | `active_trading_style` in `user_settings` + `useTradeMode` hook |
| Mode selector UI (wajib) | ✅ Done | `TradeModeSelector` in header (Paper/Live toggle + Style dropdown) |
| Last session context restore | ✅ Done | Persisted via `user_settings` DB, restored on login |

---

## 3. Mode Handling (Hybrid Implementation)

### 3.1 Jika User Memilih PAPER MODE

**Sistem mengaktifkan:**
- Paper trading engine
- Market data publik
- Simulator order book

**Sistem menonaktifkan:**
- Binance private API
- Live trade ingestion
- Live statistics

**UI:**
- Label `SIMULATION`
- Warna konteks berbeda
- Statistik hanya paper

### 3.2 Jika User Memilih LIVE MODE

**Sistem mengaktifkan:**
- Binance WebSocket (private)
- Live trade ingestion
- Live statistics

**Sistem menonaktifkan:**
- Manual trade creation (Trade Entry Wizard DIBLOKIR)
- Paper engine
- Editing trade core data (read-only execution)

**UI:**
- Label `LIVE`
- Read-only execution
- Semua data real

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Paper: public market data only | 🔴 Missing | Binance private API always-on jika connected |
| Paper: `source=PAPER` enforced | ✅ Done | `source: 'manual'` pada paper trades |
| Paper: tidak masuk statistik live | ✅ Done | `p_source` filter di RPC |
| Paper: simulasi label UI | ✅ Done | `TradeModeSelector` shows PAPER badge (amber) |
| Live: Binance real-time active | ✅ Done | `useBinancePositions` + background sync |
| Live: manual create DIBLOKIR | 🔴 Missing | Trade Entry Wizard selalu available |
| Live: editing core data blocked | 🔴 Missing | Edit dialog tidak membedakan mode |
| Mode-based color scheme | ✅ Done | Amber (paper) / Emerald (live) in `TradeModeSelector` |
| Global mode indicator | ✅ Done | `TradeModeSelector` persistent di header semua halaman |

---

## 4. Market Overview & AI Pre-Flight

### 4.1 Market Overview Dashboard

Disesuaikan dengan `trade_style`:

| Data | Scalping | Short Trade | Swing |
|------|----------|-------------|-------|
| Market regime | ✅ (1m-15m) | ✅ (1h-4h) | ✅ (4h-1D) |
| BTC dominance | ✅ | ✅ | ✅ |
| Volatility (ATR/StdDev) | High priority | Medium | Low priority |
| Funding rate & OI | ✅ | ✅ | ✅ (weekly) |

### 4.2 AI Pre-Flight Analysis

AI memberikan **BIAS**, bukan sinyal.

```json
{
  "market_bias": "Bearish",
  "confidence": 68,
  "valid_until": "2026-02-10T21:00:00Z",
  "based_on": [
    "HTF structure break",
    "Volatility expansion",
    "Funding shift"
  ]
}
```

**Catatan:**
- Bias expire (`valid_until`)
- Confidence numerik (0-100)
- Tidak auto-recommend pair
- Tidak auto-execute

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Market regime detection | ✅ Done | `useCombinedAnalysis` |
| BTC dominance | ✅ Done | `useMarketSentiment` |
| Volatility metrics | ✅ Done | ATR-based volatility calculation |
| Funding rate & OI | ✅ Done | Binance endpoints integrated |
| Style-aware data prioritization | 🔴 Missing | Same data shown regardless of style |
| AI confidence score | ✅ Done | `ai_confidence` field |
| AI `valid_until` / expiry | 🔴 Missing | Tidak ada expiry mechanism |
| AI reasoning summary | ✅ Done | In analysis response |
| AI tidak auto-execute | ✅ Done | Read-only by design |

---

## 5. Pair Discovery & Strategy Context

### 5.1 Pair Discovery

- User menggunakan **Binance App** untuk scanning
- User menyaring pair sesuai bias & strategi pribadi
- Sistem **tidak memaksa** rekomendasi pair

### 5.2 Strategy Selection (WAJIB)

User memilih strategy yang digunakan.

Strategy disimpan sebagai **snapshot** (immutable per trade):

```json
{
  "strategy_id": "uuid",
  "strategy_name": "ICT Silver Bullet",
  "risk_percent": 2,
  "rr_target": 3,
  "allowed_timeframes": ["5m", "15m"],
  "setup_type": "liquidity_sweep",
  "methodology": "ICT"
}
```

**Snapshot immutable** — jika strategy di-edit, historical data tetap akurat.

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Strategy sebagai entitas data | ✅ Done | `trading_strategies` table (structured) |
| Strategy ID, rules, RR | ✅ Done | `min_rr`, `entry_rules`, `exit_rules`, `methodology` |
| `strategy_snapshot` immutable per trade | 🔴 Missing | Hanya junction table (`trade_entry_strategies`) — ID reference, bukan snapshot. Edit strategy = corrupt historical context |
| Strategy selection di trade flow | ✅ Done | Wizard Step + Enrichment Drawer |

---

## 6. Trade Execution (Binance)

### 6.1 User Open Posisi di Binance App

- Market / Limit
- Partial size boleh
- Multiple TP boleh
- Manual atau conditional

**Sistem:**
- ❌ Tidak mengirim order
- ❌ Tidak memodifikasi order
- ✅ Hanya mendengar

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Read-only architecture | ✅ Done | No trade permission in API scope |
| Order ingestion | ✅ Done | Sync engine + `trade-aggregator.ts` |

---

## 7. Live Trade Ingestion & Correlation

### 7.1 Trade Detection

Via sync engine (polling + realtime):
- Order update
- Trade fill
- Position update

Sistem membuat **Trade Entity (LIVE)**:

```json
{
  "trade_id": "UUID",
  "mode": "LIVE",
  "source": "BINANCE",
  "symbol": "ETHUSDT",
  "position_side": "SHORT",
  "state": "OPENING"
}
```

### 7.2 Order Correlation

- 1 Trade → N Orders
- Scale in/out → tetap 1 trade
- Partial fill → tracked

**Trade State Machine:**

```
OPENING
  ↓
PARTIALLY_FILLED
  ↓
ACTIVE
  ↓
CLOSED | CANCELED | LIQUIDATED
```

State ini **tidak bisa dimanipulasi user**.

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Trade detection via sync | ✅ Done | `trade-aggregator.ts` + lifecycle engine |
| 1 Trade → N Orders | ✅ Done | `PositionLifecycle` type |
| Partial fill handling | ✅ Done | `calculateWeightedAverage()` |
| Scale in/out | ✅ Done | Lifecycle grouping |
| `trade_mode` field per trade | 🔴 Missing | Tidak ada di `trade_entries` |
| State: OPENING | ✅ Done | `trade-state-machine.ts` → `resolveStateFromOrder()` |
| State: PARTIALLY_FILLED | ✅ Done | `trade-state-machine.ts` → `resolveStateFromOrder()` |
| State: ACTIVE | ✅ Done | `resolveTradeState()` |
| State: CLOSED | ✅ Done | `resolveTradeState()` |
| State: CANCELED | ✅ Done | `resolveStateFromOrder()` |
| State: LIQUIDATED | ✅ Done | `isLiquidation()` heuristics |
| State immutable by user | 🟡 Partial | User bisa close manual via UI |

---

## 8. Pending & Active Trade View

### 8.1 Pending Trade Tab

Menampilkan:
- Planned entry
- SL / TP
- Order status
- Risk & sizing
- Strategy snapshot

User boleh:
- Menambahkan enrichment awal

### 8.2 Active Trade Tab

Saat posisi aktif:
- Real-time PnL
- Unrealized risk
- Fees & funding
- Time in trade

User boleh:
- Upload chart screenshot
- Menentukan timeframe:
  - **1 execution TF (mandatory)**
  - **N optional TF**
- Menambahkan note (bias, eksekusi, presisi)

**Enrichment tidak mengubah trade.**

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Pending: Entry, SL, TP | ✅ Done | `BinanceOpenOrdersTable` |
| Pending: Order status | ✅ Done | Real-time from Binance |
| Pending: Risk & sizing | 🟡 Partial | Sizing shown, risk % context missing |
| Pending: Strategy snapshot | 🔴 Missing | No snapshot persisted |
| Pending: Enrichment | ✅ Done | `TradeEnrichmentDrawer` via `onEnrich` |
| Active: Real-time PnL | ✅ Done | `useBinancePositions` |
| Active: Unrealized risk | ✅ Done | Calculated |
| Active: Fees & funding | ✅ Done | Tracked |
| Active: Time in trade | ✅ Done | `hold_time_minutes` |
| Active: Screenshot upload | ✅ Done | `ScreenshotUploader` |
| Active: 1 mandatory execution TF | 🔴 Missing | Only 1 optional `chart_timeframe` |
| Active: N optional TF | 🔴 Missing | No multi-timeframe support |
| Active: Notes | ✅ Done | `notes` field |
| Enrichment doesn't modify trade | ✅ Done | Update only enrichment fields |

---

## 9. Trade Closure & History

### 9.1 Trade Close Event

**Triggers:**
- TP hit
- SL hit
- Manual close
- Liquidation

**Sistem menyimpan:**
- Realized PnL
- R multiple
- Max adverse excursion (MAE)
- Duration
- Fees total
- State → `CLOSED`

### 9.2 Trade History

User boleh:
- Menambah enrichment lanjutan
- **Rating trade** (A/B/C/D/F)
- **Checklist rule compliance** (post-trade version)
- **Lesson learned** (structured field)

Semua enrichment melekat ke trade yang sama.

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Close via TP/SL/Manual | ✅ Done | Close dialog + Binance sync |
| Close via Liquidation | ✅ Done | `isLiquidation()` in `trade-state-machine.ts` |
| Realized PnL | ✅ Done | Calculated + stored |
| R multiple | ✅ Done | `calculateRMultiple()` in `trade-metrics.ts`, auto-calculated on close |
| Max adverse excursion (MAE) | ✅ Done | `calculateMAEFromLifecycle()` in `trade-metrics.ts`, approximated from fill prices |
| Duration | ✅ Done | `hold_time_minutes` |
| Fees total | ✅ Done | `fees` + `commission` + `funding_fees` |
| State → CLOSED | ✅ Done | `status: 'closed'` |
| History: Enrichment | ✅ Done | `TradeEnrichmentDrawer` di `TradeHistory.tsx` |
| History: Trade rating | 🔴 Missing | No field |
| History: Rule compliance checklist | 🔴 Missing | Only pre-trade version exists |
| History: Lesson learned (structured) | 🔴 Missing | Only free-text `notes` |

---

## 10. Paper Trade Flow (Paralel, Terpisah Data)

Paper mode mengikuti flow serupa, dengan perbedaan:

| Aspek | Paper | Live |
|-------|-------|------|
| Trade creation | User/simulator | Binance only |
| Data source | Local DB | Binance API |
| Statistik | Isolated | Isolated |
| AI learning | Paper context | Live context |
| Source field | `manual` | `binance` |

**Tidak ada satu byte pun masuk ke live.**

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Paper trade creation | ✅ Done | Trade Entry Wizard |
| Data isolation | ✅ Done | `source` field |
| Statistik isolation | ✅ Done | `p_source` filter |
| AI context per source | ✅ Done | Source passed to analysis |
| Paper simulator | 🟡 Partial | Basic entry/close, no simulated order book |

---

## 11. Post-Trade & AI Review

### 11.1 AI Post-Mortem (Opsional)

AI menganalisis:
- Entry timing
- Exit efficiency
- SL placement
- Strategy adherence

**AI:**
- ✅ Memberi insight
- ❌ Tidak mengubah data
- ❌ Tidak mempengaruhi live bias

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| AI Post-Mortem | ✅ Done | `post-trade-analysis` edge function |
| Entry timing analysis | ✅ Done | In AI response |
| Exit efficiency | ✅ Done | In AI response |
| SL placement analysis | ✅ Done | In AI response |
| Strategy adherence | ✅ Done | Strategy context passed |
| AI read-only (no data mutation) | ✅ Done | Analysis stored in `post_trade_analysis` field only |

---

## 12. Statistics & Review

### 12.1 Statistik Terpisah Ketat

- **Live stats = default**
- **Paper stats = eksplisit** (hanya jika diminta)

**Filter:**
- Per strategy
- Per market condition
- Per timeframe

**Tidak ada agregasi silang. Titik.**

### Implementation Status

| Item | Status | Evidence |
|------|--------|----------|
| Live stats default | ✅ Done | `p_source` filter in `get_trade_stats` |
| Paper stats isolated | ✅ Done | Filtered separately |
| Per strategy filter | ✅ Done | `p_strategy_ids` parameter |
| Per market condition | ✅ Done | `useContextualAnalytics` |
| Per timeframe | 🟡 Partial | Only execution TF, not multi-TF |
| No cross-aggregation | ✅ Done | Source-based strict separation |

---

## 13. Security, Sync & Reliability

| Item | Status | Evidence |
|------|--------|----------|
| API key read-only | ✅ Done | Scope validation + UI guidance |
| API key encrypted | ✅ Done | Supabase Vault |
| Audit log | 🔴 Missing | No `audit_logs` table |
| Daily reconciliation | ✅ Done | P&L reconciliation engine |
| Sync fallback (REST) | ✅ Done | Polling-based sync as fallback |
| Mismatch detection & alert | ✅ Done | Reconciliation alerts + email notifications |
| Credential rotation | ✅ Done | `save_exchange_credential` replaces old key |

---

## Gap Summary

### 🔴 Critical Gaps (Must-Fix Before Production)

| # | Gap | Section | Effort |
|---|-----|---------|--------|
| 1 | **Global Mode Selector** (`trade_mode: PAPER\|LIVE`) persistent di `user_settings` | §2, §3 | Medium |
| 2 | **Trading Style Selector** (`trade_style: SCALPING\|SHORT\|SWING`) persistent | §2, §4 | Medium |
| 3 | **Mode-Based Visibility** (Paper hides exchange, Live blocks manual create) | §3 | Large |
| 4 | **Trade State Machine** (`OPENING`, `PARTIALLY_FILLED`, `CANCELED`, `LIQUIDATED`) di journal level | §7 | Medium |
| 5 | **Strategy Snapshot** (JSONB immutable per trade, bukan ID reference saja) | §5 | Small |
| 6 | **3-Timeframe Enrichment** (1 execution mandatory + N optional) | §8 | Small |
| 7 | **Trade Rating** (A/B/C/D/F post-trade) | §9 | Small |
| 8 | **R Multiple** calculation & storage | §9 | Small |
| 9 | **Max Adverse Excursion** (MAE) tracking | §9 | Medium |
| 10 | **AI Bias Expiry** (`valid_until` field) | §4 | Small |
| 11 | **Audit Logs** table | §13 | Small |

### 🟡 Medium Gaps (Enhancement)

| # | Gap | Section |
|---|-----|---------|
| 12 | Style-aware Market Insight prioritization | §4 |
| 13 | Post-trade rule compliance checklist | §9 |
| 14 | Structured lesson learned field | §9 |
| 15 | Liquidation event detection from Binance | §9 |
| 16 | Paper order book simulator | §10 |

### ✅ Already Implemented (~40+ items)

Core sync engine, trade correlation, enrichment flow, AI analysis, statistics separation, security basics, reconciliation, notification system, risk management, strategy library.

---

## Recommended Implementation Phases

### Phase 1: Foundation (DB Schema)

**Migration adds to `user_settings`:**
- `active_trade_mode` ENUM (`paper`, `live`) DEFAULT `live`
- `active_trading_style` ENUM (`scalping`, `short_trade`, `swing`) DEFAULT `short_trade`

**Migration adds to `trade_entries`:**
- `trade_mode` TEXT (immutable, set on creation)
- `trade_style` TEXT (immutable, set on creation)
- `trade_state` TEXT DEFAULT `'active'` (OPENING/PARTIALLY_FILLED/ACTIVE/CLOSED/CANCELED/LIQUIDATED)
- `strategy_snapshot` JSONB (immutable copy of strategy at trade time)
- `trade_rating` TEXT (A/B/C/D/F, nullable)
- `r_multiple` NUMERIC (calculated on close)
- `max_adverse_excursion` NUMERIC (MAE, tracked during trade)
- `execution_timeframe` TEXT (mandatory enrichment)
- `bias_timeframe` TEXT (optional enrichment)
- `precision_timeframe` TEXT (optional enrichment)
- `lesson_learned` TEXT (structured post-trade field)
- `rule_compliance` JSONB (post-trade checklist)

### Phase 2: Mode System (UI + Logic)

- Global mode selector component (persistent)
- Mode-based visibility rules
- Live mode: block Trade Entry Wizard
- Paper mode: hide private API data
- Mode indicator badge across all pages

### Phase 3: Trade Lifecycle Enhancement

- ✅ State machine integration (journal level) — `src/services/binance/trade-state-machine.ts`
  - 6-state system: OPENING → PARTIALLY_FILLED → ACTIVE → CLOSED / CANCELED / LIQUIDATED
  - Integrated into `trade-aggregator.ts` and `use-binance-sync.ts`
  - Liquidation detection via exit order type + loss heuristics
  - Valid transition matrix enforced
- R multiple auto-calculation on close
- MAE tracking during active trade
- Liquidation detection from Binance Force Orders

### Phase 4: Enrichment & Review

- 3-timeframe enrichment UI
- Trade rating UI (post-trade)
- Rule compliance checklist (post-trade)
- Structured lesson learned field
- Strategy snapshot saved on trade creation

### Phase 5: AI & Market Intelligence

- AI bias `valid_until` expiry mechanism
- Style-aware market insight prioritization
- Expired bias visual indicator

### Phase 6: Compliance

- `audit_logs` table creation
- API access logging
- Trade data change tracking

---

## Component Map

### Phase 1 Impact (Schema Only)

```
trade_entries ← new fields (trade_mode, trade_style, trade_state, strategy_snapshot, 
                             trade_rating, r_multiple, max_adverse_excursion,
                             execution_timeframe, bias_timeframe, precision_timeframe,
                             lesson_learned, rule_compliance)

user_settings ← new fields (active_trade_mode, active_trading_style)
```

### Phase 2 Impact (UI)

```
Components affected:
├── DashboardLayout (mode indicator)
├── TradingJournal.tsx (conditional wizard access)
├── TradeHistory.tsx (mode-aware filtering)
├── MarketInsight.tsx (style-aware data)
├── TradeEntryWizard (blocked in live mode)
└── New: ModeSelector component
```

### Phase 3-6 Impact

```
Components affected:
├── TradeEnrichmentDrawer (3-TF, rating, compliance, lesson)
├── AllPositionsTable (state machine badges)
├── TradeHistoryCard (rating display)
├── trade-aggregator.ts (state mapping)
├── use-trade-enrichment.ts (new fields)
└── New: audit-logs edge function
```

---

> **Maintenance:** Dokumen ini adalah operational blueprint resmi. Setiap implementasi phase HARUS di-verify terhadap checklist di atas. Update dokumen ini setelah setiap phase selesai.
