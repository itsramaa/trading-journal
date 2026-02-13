# Feature Matrix — Trading Journal, Trade History, Import Trade

> Dokumen ini adalah referensi lengkap fitur, fungsi, dan proses bisnis untuk tiga halaman utama aplikasi Trading Journal. Disusun per halaman dan per aktor (Trader/User vs System).  
> Cross-ref: [DATABASE.md](./DATABASE.md) · [USER_SCENARIOS.md](./USER_SCENARIOS.md)

---

## 1. Trading Journal (`/trading`)

Halaman utama untuk membuat, memantau, dan mengelola trade aktif. Mendukung Paper Trading (manual entry) dan Live Trading (Binance Futures) dengan isolasi data ketat.

### 1.1 Trader/User Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Buat Trade Baru (Wizard Full/Express Mode) | Trader | Mencatat entry trade baru ke journal | Klik "New Trade" → Pilih mode (Full 5-step / Express 3-step) → Isi data → Confirm → Simpan | Mode = Paper; User logged in; Strategy minimal 1 tersedia (Full mode) | Trade tersimpan dengan status `open`, `trade_mode` & `trade_style` terkunci immutable | Tombol hanya muncul di Paper mode. Live mode menampilkan badge "Live Mode — trades via exchange" |
| 2 | Wizard: Isi Detail Setup (Step 1) | Trader | Mengisi informasi dasar trade: pair, direction, account, strategy, timeframe | Pilih pair (combobox search) → Pilih direction (Long/Short) → Pilih account → Pilih strategy → Pilih execution timeframe | Wizard terbuka; Strategy & account tersedia | Data setup terisi; Mandatory fields (strategy, execution TF) harus terisi untuk lanjut | Next button disabled sampai strategy + execution timeframe dipilih |
| 3 | Wizard: Confluence Validation (Step 2 — Full Mode) | Trader | Memvalidasi confluence/konfirmasi teknikal sebelum entry | Checklist dinamis dari `strategy.entry_rules` → Centang setiap confluence terpenuhi → AI auto-suggest berdasarkan pair + timeframe | Full mode wizard; Strategy memiliki entry_rules | Confluence score terhitung; AI suggestions ditampilkan | `min_confluences` dari strategy menentukan threshold minimum |
| 4 | Wizard: Position Sizing (Step 3) | Trader | Menentukan ukuran posisi, entry/SL/TP, dan risk management | Input Entry Price, Stop Loss, Take Profit → Atur risk % via slider → Kalkulator otomatis hitung quantity & R:R | Step 1 & 2 selesai | Entry price, SL, TP, quantity, leverage terisi; R:R ratio terhitung | Leverage tier warning dari Binance API; Paper account balance validation (`usePaperAccountValidation`) |
| 5 | Wizard: Final Checklist (Step 4 — Full Mode) | Trader | Evaluasi kesiapan mental dan kepatuhan aturan sebelum entry | Pilih emotional state → Atur confidence slider → Centang rule-following checklist → Tambah komentar opsional | Full mode wizard; Sizing selesai | Emotional state, confidence, rule compliance tercatat | AI Trade Quality Score real-time berdasarkan data yang diisi |
| 6 | Wizard: Confirmation & Execute (Step 5) | Trader | Review final dan eksekusi trade | Review summary: pair, direction, sizing, R:R, strategy, confluences, emotional state → Klik Execute | Semua step sebelumnya selesai | Trade entry tersimpan di database; Wizard tertutup; Query cache invalidated | Tampil ringkasan lengkap sebelum konfirmasi akhir |
| 7 | Lihat Summary Stats | Trader | Melihat ringkasan operasional: jumlah posisi terbuka, unrealized & realized P&L | Buka halaman → Stats cards otomatis ter-render dari data trades + Binance API | User logged in; Trades tersedia | Tampil 3 kartu: Open Positions, Unrealized P&L, Realized P&L | Angka Binance hanya muncul jika connected di Live mode (`TradeSummaryStats`) |
| 8 | Lihat Pending Orders | Trader | Melihat order yang belum tereksekusi (paper drafts + Binance open orders) | Klik tab "Pending" → Lihat tabel gabungan paper pending + exchange orders | User logged in; Tab Pending aktif | Tabel menampilkan pending trades dengan badge count di tab | Paper pending = trades tanpa entry_price atau entry_price = 0 |
| 9 | Lihat Active Positions | Trader | Memantau posisi yang sedang berjalan secara real-time | Klik tab "Active" → Lihat tabel unified (paper + Binance positions) | User logged in; Tab Active aktif | Tabel menampilkan posisi aktif dengan live Time-in-Trade & Fees | Default tab saat halaman dibuka |
| 10 | Close Position Manual | Trader | Menutup posisi paper trade dengan exit price manual | Klik Close pada posisi → Isi exit price & fees → Confirm (`ClosePositionDialog`) | Mode = Paper; Posisi berstatus `open` | Status berubah ke `closed`; P&L dihitung (direction-aware); AI Post-Trade Analysis ter-trigger | Tidak tersedia untuk Binance positions (read-only) |
| 11 | Edit Position (SL/TP/Notes) | Trader | Mengubah Stop Loss, Take Profit, atau catatan pada posisi aktif | Klik Edit → `EditPositionDialog` terbuka dengan form SL/TP/Notes → Save | Posisi berstatus `open` | Data SL/TP/Notes terupdate di database | Field entry price, direction, quantity tetap read-only untuk source: binance |
| 12 | Enrich Trade (Drawer — Overview) | Trader | Membuka drawer untuk menambahkan konteks profesional ke trade | Klik ikon Enrich → `TradeEnrichmentDrawer` terbuka → Lihat semua section enrichment | Trade tersedia (open/closed) | Drawer terbuka dengan semua section: strategy, timeframes, screenshots, rating, notes, compliance | Entry point untuk semua enrichment sub-features (#13-#22) |
| 13 | Link Multiple Strategies (Enrichment) | Trader | Mengaitkan satu atau lebih strategy ke trade | Di Enrichment Drawer → Toggle strategy badges on/off → Save | Enrichment Drawer terbuka; Strategies tersedia | `trade_entry_strategies` junction records tersimpan; `strategy_snapshot` JSONB immutable | Strategy snapshot diambil saat pertama kali di-link |
| 14 | Isi 3-Timeframe System (Enrichment) | Trader | Mengisi analisis multi-timeframe: Bias HTF, Execution, Precision LTF | Di Enrichment Drawer → Section Timeframes → Pilih Bias TF, Execution TF, Precision TF | Enrichment Drawer terbuka | `bias_timeframe`, `execution_timeframe`, `precision_timeframe` tersimpan | Component: `TradeTimeframeSection`; Terpisah dari wizard execution TF |
| 15 | View Post-Mortem Analysis (Enrichment) | Trader | Melihat analisis AI terstruktur untuk closed trades | Di Enrichment Drawer → Section Post-Mortem → Lihat: Entry Timing, Exit Efficiency, SL Placement, Strategy Adherence | Trade status = closed; AI analysis sudah ter-generate | User mendapat feedback terstruktur: What Worked, To Improve, Follow-up Actions | Component: `PostMortemSection`; Read-only display |
| 16 | View AI Analysis Results (Enrichment) | Trader | Melihat hasil analisis AI dalam format collapsible | Di Enrichment Drawer → Section AI Analysis → Expand/collapse sections | AI analysis tersedia di `post_trade_analysis` | Display: Overall Assessment, Win Factors, Loss Factors, Lessons, Pattern Recognition | Component: `AIAnalysisDisplay`; Collapsible accordion |
| 17 | Upload Screenshot (Enrichment) | Trader | Menambahkan bukti visual (chart screenshot) ke trade | Di Enrichment Drawer → Drag & drop atau browse file → Upload → Preview ditampilkan | Enrichment Drawer terbuka; Trade tersedia | Screenshot tersimpan (max 3 per trade); Thumbnail preview tersedia | Client-side compression sebelum upload; Bisa delete individual screenshot |
| 18 | Request AI Trade Analysis (Enrichment) | Trader | Meminta AI menganalisis kualitas trade secara on-demand | Di Enrichment Drawer → Klik "Analyze" → AI proses → Hasil ditampilkan | Trade memiliki data cukup (pair, direction, entry/exit, P&L) | AI analysis tersimpan di `post_trade_analysis` JSONB | Evaluasi: Entry Timing, Exit Efficiency, SL Placement, Strategy Adherence |
| 19 | Isi Trade Rating A-F (Enrichment) | Trader | Self-assessment kualitas eksekusi trade | Di Enrichment Drawer → Klik grade A/B/C/D/F → Toggle on/off | Enrichment Drawer terbuka | `trade_rating` tersimpan | Component: `TradeRatingSection` — A=Perfect, B=Good, C=Average, D=Below, F=Poor |
| 20 | Isi Custom Tags (Enrichment) | Trader | Mengkategorisasi trade dengan label kustom | Di Enrichment Drawer → Input tags (comma-separated) → Save | Enrichment Drawer terbuka | `tags` array tersimpan di trade entry | Contoh: breakout, news-driven, trend-following, reversal |
| 21 | Isi Rule Compliance Checklist (Enrichment) | Trader | Mengevaluasi kepatuhan terhadap trading rules | Di Enrichment Drawer → Centang checklist rules → Isi lesson learned → Save | Enrichment Drawer terbuka | `rule_compliance` JSONB & `lesson_learned` tersimpan | Component: `TradeReviewSection` — 6 default rules |
| 22 | Isi Notes (Enrichment) | Trader | Menulis catatan detail tentang trade | Di Enrichment Drawer → Section Notes → Isi textarea → Save | Enrichment Drawer terbuka | `notes` field tersimpan di trade entry | Dedicated textarea; Terpisah dari Quick Note |
| 23 | Isi Emotional State (Enrichment) | Trader | Memilih kondisi emosional saat trading | Di Enrichment Drawer → Klik badge emotional state → Save | Enrichment Drawer terbuka | `emotional_state` tersimpan | Badge-based selector: Confident, Fearful, Greedy, Calm, Anxious, etc. |
| 24 | Delete Trade (Soft Delete) | Trader | Menghapus trade dari tampilan aktif dengan opsi recovery | Klik Delete → `ConfirmDialog` → Soft delete | Trade tersedia; User logged in | `deleted_at` terisi; Trade hilang dari tampilan; Recoverable via Settings > Deleted Trades (30 hari) | Bukan permanent delete |
| 25 | Switch Tab Pending/Active | Trader | Berpindah antara tampilan pending orders dan active positions | Klik tab "Pending" atau "Active" | Halaman Trading Journal terbuka | Tab aktif berubah; Tabel ter-render sesuai konteks | Badge count dinamis per tab |
| 26 | Cancel Binance Open Order | Trader | Membatalkan open order di Binance langsung dari journal | Di tab Pending → Klik Cancel pada Binance order → Confirm | Mode = Live; Binance connected; Order masih aktif | Order dibatalkan di Binance; Tabel ter-refresh | Component: `BinanceOpenOrdersTable` |
| 27 | Toggle Trade Mode (Paper/Live) | Trader | Mengubah konteks trading antara simulasi dan live | Klik `TradeModeSelector` di header → Pilih Paper atau Live | User logged in | `active_trade_mode` tersimpan di user_settings; Seluruh data, stats, visibilitas ter-filter ulang | Persistent across sessions; Amber SIMULATION banner di Paper mode |
| 28 | Dismiss Pro Tip | Trader | Menyembunyikan tips bantuan secara permanen | Klik dismiss pada `QuickTip` component | Pro tip sedang ditampilkan | State tersimpan di localStorage (`trading_journal_tip`); Tip tidak muncul lagi | One-time dismissal |
| 29 | View Leverage Badge | Trader | Melihat indikator leverage per posisi di tabel | Lihat kolom leverage di `AllPositionsTable` → Badge Nx ditampilkan | Posisi memiliki data leverage | Leverage level terlihat jelas per posisi | Binance positions auto-populated; Paper trades manual |
| 30 | View CryptoIcon per Symbol | Trader | Melihat ikon crypto per pair di tabel posisi | Render tabel → CryptoIcon ditampilkan di kolom pair | Trade memiliki pair/symbol | Ikon crypto ter-render dengan multi-source fallback | Component: `CryptoIcon` — CoinCap → CryptoCompare → cryptocurrency-icons CDN → text avatar |
| 31 | View Unrealized P&L % | Trader | Melihat persentase P&L unrealized per posisi | Lihat kolom P&L di tabel aktif → Persentase ditampilkan di samping nominal | Posisi aktif dengan mark price tersedia | P&L % ter-render real-time | Hanya untuk posisi open; Closed positions menampilkan realized P&L |

### 1.2 System Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Mode Isolation | System | Memastikan data Paper dan Live tidak tercampur | Setiap query/render → `useModeFilteredTrades` filter by `trade_mode` → Hanya data sesuai mode aktif ditampilkan | `active_trade_mode` tersedia di user_settings | Data terisolasi sempurna; Stats akurat per mode | Legacy trades tanpa trade_mode di-map: source='binance' → live, lainnya → paper |
| 2 | Trading Gate | System | Mencegah overtrading saat daily loss limit tercapai | Saat wizard dibuka → Cek daily P&L vs risk profile → Jika limit tercapai → Wizard diblokir dengan peringatan | Risk profile ter-konfigurasi; `max_daily_loss_percent` tersedia | Wizard disabled jika limit terlampaui; User mendapat feedback visual | Berdasarkan `daily_risk_snapshots` dan Binance balance |
| 3 | AI Pre-flight Check | System | Memvalidasi edge/setup sebelum entry (Full mode only) | Di wizard step Pre-flight → Kirim data setup ke AI → Evaluasi EV/R → Return verdict: Proceed/Caution/Skip | Full mode wizard; Strategy & pair terisi | Verdict ditampilkan; Jika SKIP → tombol Next disabled (bypass tersedia) | Scoring: Win Rate 40%, PF 30%, Consistency 20%, Sample Size 10% |
| 4 | Post-Trade AI Analysis | System | Menganalisis kualitas trade setelah ditutup secara otomatis | Trade di-close → `analyzeClosedTrade(tradeId)` ter-trigger async → AI evaluasi | Trade baru saja di-close; AI service tersedia | `post_trade_analysis` JSONB terisi di trade entry | Fire-and-forget (error di-catch, tidak blocking) |
| 5 | Real-time Binance Data Fetch | System | Menyediakan data posisi, order, dan balance terkini dari Binance | Halaman mount → Hooks fetch: `useBinancePositions`, `useBinanceOpenOrders`, `useBinanceBalance` → Data ter-render | Mode = Live; Binance credentials valid & connected | UI menampilkan data exchange real-time | Hanya fetch jika `showExchangeData = true` |
| 6 | P&L Calculation (on Close) | System | Menghitung profit/loss secara akurat berdasarkan direction | Close position → LONG: (exit - entry) × qty - fees; SHORT: (entry - exit) × qty - fees | Exit price & fees tersedia | `pnl` dan `realized_pnl` tersimpan di trade entry | Direction-aware; Fees dikurangi dari gross P&L |
| 7 | Market Context Capture | System | Otomatis capture kondisi pasar saat trade dibuat | Wizard dibuka → Fetch Fear&Greed Index, volatility, event risk → Simpan ke `market_context` JSONB | Wizard aktif; Market data API tersedia | `market_context` tersimpan immutable di trade entry | Berguna untuk post-hoc analysis korelasi market condition vs performance |
| 8 | Trade State Machine Display | System | Menampilkan lifecycle state trade di tabel posisi | Render posisi → Map `trade_state` ke badge visual | Trade memiliki `trade_state` field | Badge state ditampilkan: OPENING, PARTIALLY_FILLED, ACTIVE, CLOSED, CANCELED, LIQUIDATED | 6-state machine sesuai profesional lifecycle |
| 9 | Live Time-in-Trade | System | Kolom duration auto-update menampilkan waktu sejak entry | Timer interval 60s → Hitung selisih `entry_datetime` vs now → Render format (2h 30m, 1d 5h) | Posisi open dengan `entry_datetime` tersedia | Kolom duration selalu aktual tanpa refresh manual | Auto-update setiap 60 detik di `AllPositionsTable` |
| 10 | Read-Only Enforcement (Live/Binance) | System | Mengunci core trade data untuk trades dari exchange | Render form/tabel → Cek `source` & `trade_mode` → Lock entry price, direction, quantity jika live/binance | Trade source = 'binance' atau trade_mode = 'live' | Core fields read-only; Hanya journal fields (notes, tags, rating) editable | Lock icon + notice ditampilkan; Mencegah manipulasi statistik ("ego-palsu") |
| 11 | Wizard Analytics Tracking | System | Track conversion funnel wizard untuk optimisasi UX | Wizard start → Track step progression → Track abandon (last step + duration) → Track complete | Wizard dibuka | Event analytics tercatat: wizard_start, wizard_step, wizard_abandon, wizard_complete | Berguna untuk UX improvement: identifikasi step dengan drop-off tertinggi |
| 12 | Currency Conversion Display | System | Menampilkan nilai dalam mata uang lokal user | Render angka finansial → `useCurrencyConversion` hook convert USD → local currency | User preference currency tersedia; Rate cache valid (1 jam) | Semua angka P&L, balance ditampilkan dalam currency pilihan user | Hook: `useCurrencyConversion`; Hourly rate caching |
| 13 | Unified Position Mapping | System | Menggabungkan paper + Binance positions ke satu tabel | Fetch paper trades + Binance positions → `mapToUnifiedPositions` → Render single table | Tab Active aktif; Data tersedia | Tabel unified dengan data dari kedua sumber | Mapping: paper `trade_entries` + Binance API response → unified format |

---

## 2. Trade History (`/history`)

Halaman untuk melihat, menganalisis, dan mengelola riwayat trade yang sudah ditutup. Mendukung filtering lanjutan, export data, dan enrichment per-trade. Sync/import telah dipindahkan ke `/import`.

### 2.1 Trader/User Features

#### Module 1: Trade History / Viewing (12 features)

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|---------|
| 1 | Lihat Closed Trades (List/Gallery) | Trader | Melihat riwayat trade | Buka halaman → Toggle view mode (List/Gallery) → Browse trades | User logged in; Minimal 1 closed trade | Trades ditampilkan sesuai format pilihan dengan stats summary | Gallery view card-based |
| 2 | Filter by Date Range | Trader | Menyaring trades per periode | Pilih start & end date → Tabel ter-filter | Halaman History terbuka | Hanya trades dalam range ditampilkan; Stats ter-recalculate | — |
| 3 | Filter by Result | Trader | Menyaring trades berdasarkan outcome (Win/Loss/BE) | Pilih filter result → Tabel ter-filter | Halaman History terbuka | Hanya trades dengan result terpilih ditampilkan | BE = Breakeven (P&L ≈ 0) |
| 4 | Filter by Direction | Trader | Menyaring trades Long/Short | Pilih filter direction → Tabel ter-filter | Halaman History terbuka | Hanya trades dengan direction terpilih | — |
| 5 | Filter by Strategy | Trader | Menyaring trades berdasarkan strategi | Pilih strategy → Tabel ter-filter | Halaman History terbuka; Minimal 1 strategy tersedia | Hanya trades terkait strategy terpilih | Via trade_entry_strategies junction table |
| 6 | Filter by Pair | Trader | Menyaring trades berdasarkan trading pair | Pilih pair → Tabel ter-filter | Halaman History terbuka | Hanya trades dengan pair terpilih | — |
| 7 | Filter by Session | Trader | Menyaring trades berdasarkan sesi trading | Pilih session → Tabel ter-filter | Halaman History terbuka | Hanya trades dari sesi terpilih | Asia 20:00-05:00, London 08:00-17:00, NY 13:00-22:00 UTC |
| 8 | Sort by AI Score | Trader | Mengurutkan trades per AI quality score | Klik sort toggle AI Score → Tabel ter-sort | Halaman History terbuka; Trades memiliki ai_quality_score | Trades diurutkan ascending/descending; Trades tanpa score di akhir | — |
| 9 | Clear All Filters | Trader | Menghapus semua filter aktif | Klik "Clear All" → Semua filter ter-reset | Minimal 1 filter aktif | Full dataset ditampilkan | Banner menampilkan jumlah filter aktif |
| 10 | Load More (Infinite Scroll) | Trader | Memuat lebih banyak trades saat scroll | Scroll → Intersection Observer trigger → Fetch next page | Lebih banyak trades tersedia | Page berikutnya ter-append | Cursor-based pagination |
| 11 | View Load Progress Indicator | Trader | Menunjukkan progress loading trades | Scroll/load → Indicator update | Pagination aktif | User aware progress loading | Bottom-of-list indicator |
| 12 | Sub-Tab: All/Binance/Paper | Trader | Memisahkan trades berdasarkan source | Klik sub-tab → Tabel ter-filter by source | Halaman History terbuka | Hanya trades dari source terpilih ditampilkan | Badge count per sub-tab |

#### Module 2: Trade Enrichment (4 features)

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|---------|
| 13 | Enrich Trade (Drawer) | Trader | Menambahkan konteks profesional | Klik Enrich → Drawer terbuka → Isi data → Save | Trade tersedia | Trade diperkaya; AI Post-Mortem tersedia | — |
| 14 | Trigger Batch Enrichment | Trader | Memperkaya batch trade yang data-nya belum lengkap | Klik Enrich All → Batch process berjalan | Trades direction='UNKNOWN' atau entry_price=0 | Trades ter-enrich; Badge "Needs Enrichment" muncul | Batch process dari Binance API |
| 15 | Needs Enrichment Badge | Trader | Indikator trade butuh enrichment | Gallery card menampilkan icon | Trade direction='UNKNOWN' atau entry_price=0 | Badge visible | Dorong user enrich |
| 16 | All Trades Enriched Badge | Trader | Konfirmasi semua trades sudah lengkap | Cek enrichment status → Jika 0 needs enrichment → Badge muncul | Binance trades tersedia | Badge visible | Positive confirmation badge |

#### Module 3: Notes / Tags / Screenshots (6 features)

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|---------|
| 17 | Quick Note (inline) | Trader | Menambahkan catatan singkat | Klik note icon → Input inline → Save | Trade tersedia | notes field terupdate | Fast-path untuk catatan ringan |
| 18 | Expand/Collapse Notes | Trader | Melihat notes multi-line | Klik expand → Full text muncul | Trade memiliki notes multi-line | Notes ter-expand; Badge "Recently Updated" jika baru | Collapsible untuk layout card |
| 19 | View Notes Indicator Badge | Trader | Menunjukkan trade memiliki notes | Icon notes ditampilkan jika field tidak kosong | Trade memiliki notes | Badge visible di card | Visual cue cepat |
| 20 | View "Recently Updated" Note Badge | Trader | Badge jika notes baru saja diupdate | Notes diupdate → Badge muncul sementara | Notes diupdate periode tertentu | Badge auto-dismiss | — |
| 21 | View Tags Display | Trader | Menunjukkan tag badges | Tags ditampilkan di trade card | Trade memiliki tags array | Tag badges ter-render | Clickable untuk filter |
| 22 | View Screenshot Count Indicator | Trader | Menunjukkan jumlah screenshot | Icon kamera + count ditampilkan | Trade memiliki screenshots | Count visible | Klik untuk drawer detail |

#### Module 4: Sync & Data Management (13 features)

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|---------|
| 23 | Trigger Incremental Sync | Trader | Sinkronisasi trade terbaru dari Binance | Klik Sync → Incremental sync berjalan | Mode = Live; Binance connected | Trades baru tersimpan | Hanya fetch trades setelah last checkpoint |
| 24 | Trigger Full Sync (Binance) | Trader | Sinkronisasi seluruh history | Klik Full Sync → Confirm → Sync berjalan | Mode = Live; Binance connected; Quota tersedia | Seluruh trade history tersinkron | Rate-limited; Quota harian |
| 25 | Select Sync Range | Trader | Pilih range untuk Full Sync | Pilih range → Estimasi durasi ditampilkan | Full Sync dialog terbuka | Range terpilih; Estimasi durasi muncul | 30d/90d/6mo/1y/2y/All Time |
| 26 | Force Re-fetch Sync | Trader | Hapus trade existing & re-download | Centang "Force Re-fetch" → Confirm | Full Sync dialog terbuka | Trades existing dihapus; Fresh data masuk | Berguna untuk data inconsistent |
| 27 | Resume Interrupted Sync | Trader | Lanjutkan sync dari checkpoint | Buka sync panel → Klik Resume | Sync terganggu; Checkpoint tersedia | Sync lanjut dari last symbol | Progress visible |
| 28 | Discard Sync Checkpoint | Trader | Buang checkpoint & mulai fresh sync | Klik Discard → Confirm | Checkpoint tersedia | Checkpoint terhapus; Next sync fresh | Berguna jika checkpoint corrupt |
| 29 | Re-Sync Specific Date Range | Trader | Re-sync periode tertentu | Pilih range → Trigger re-sync | Reconciliation mismatch; Binance connected | Data range ter-refresh | Lebih efisien dari Full Sync |
| 30 | Retry Failed Sync | Trader | Mengulang sync yang gagal | Klik "Retry Now" → Sync diulang | Sync gagal; Consecutive failures > 0 | Sync ulang; Failure counter reset | Available di monitoring panel |
| 31 | View Sync Progress Phases | Trader | Lihat fase sync berjalan | Phase indicator: fetching → grouping → aggregating → validating → inserting | Full sync berjalan | Phase aktif ter-highlight; selesai ter-checklist | 6-phase indicator |
| 32 | View Sync ETA | Trader | Lihat estimasi waktu tersisa | Sync berjalan → ETA ditampilkan | Full sync berjalan | ETA update periodik | Format: "~Xm Ys remaining" |
| 33 | View Sync Quality Score | Trader | Indikator kualitas sync | Setelah sync → Badge quality tampil | Sync selesai; Match rate terhitung | Badge ter-render: Excellent/Good/Fair/Poor | — |
| 34 | View Data Quality Summary | Trader | Ringkasan kualitas data sync | Sync Monitoring → Metrics widget | Sync pernah dijalankan; Last result tersedia | Metrics: Valid Trades, P&L Accuracy, Lifecycle Completion, Failures | — |
| 35 | View Sync Monitoring Panel | Trader | Dashboard monitoring komprehensif | Buka monitoring section → Panel menampilkan alerts & stats | Binance connected; Mode = Live | Dashboard lengkap ditampilkan | — |

#### Module 5: Trade Metrics / Visuals (7 features)

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|---------|
| 36 | View R:R Ratio with Tooltip | Trader | Risk:Reward ratio per trade | Hover R:R badge → Tooltip muncul | Trade memiliki SL & TP data | R:R ratio ditampilkan; Tooltip detail | — |
| 37 | View Confluence Score with Tooltip | Trader | Lihat confluence score per trade | Hover confluence badge → Tooltip checklist items | Trade memiliki confluence data | Score % + matched items | — |
| 38 | View Fee per Trade (inline) | Trader | Lihat biaya per trade | Fee amount tampil inline | Trade source = Binance; Fee data tersedia | Fee visible tanpa drawer | Aggregasi commission + funding |
| 39 | Tab: Fees History | Trader | Lihat riwayat commission | Klik tab → Tabel fee history + summary | Binance connected; Mode = Live | Riwayat fee ditampilkan | Per-pair breakdown + trend chart |
| 40 | Tab: Funding History | Trader | Lihat funding rate payments | Klik tab → Tabel funding history | Binance connected; Mode = Live | Funding history & net P&L tampil | Per-pair breakdown |
| 41 | View Strategy Badges on Cards | Trader | Menampilkan strategi tiap trade | Strategy badges tampil di card | Trade linked ke strategy via junction table | Strategy badges ter-render | Multiple strategies possible |
| 42 | View AI Quality Score Badge | Trader | Skor kualitas AI per trade | Badge warna-coded muncul | Trade memiliki ai_quality_score | Badge visible | Threshold: green ≥80, yellow ≥60, red <60 |

#### Module 6: External / Miscellaneous (1 feature)

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|---------|
| 43 | View Transaction on Solscan | Trader | Lihat transaksi on-chain | Klik link → Buka Solscan | Trade source = Solana; Transaction signature tersedia | Browser buka tab baru | Solana-only |

### 2.2 System Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Server-Side Stats (RPC) | System | Menghitung statistik akurat terlepas dari pagination | Filter berubah → Call RPC `get_trade_stats` dengan parameter filter → Return aggregated stats | User logged in; Database tersedia | Stats (P&L, win rate, total trades, PF) akurat di level server | Mencegah inkonsistensi dari client-side calculation |
| 2 | Cursor-Based Pagination | System | Memuat data secara efisien tanpa skip/offset issues | Request page → Kirim cursor (last item ID) → Server return next batch + new cursor | Data tersedia di database | Batch trades ter-load; Cursor tersimpan untuk next request | Lebih reliable dari offset pagination untuk large datasets |
| 3 | Mode Isolation | System | Memfilter history berdasarkan trade_mode aktif | Query trades → Filter by `trade_mode` = active mode → Return filtered set | `active_trade_mode` tersedia | Hanya trades dari mode aktif ditampilkan dan dihitung | Konsisten dengan Trading Journal isolation |
| 4 | Auto Incremental Sync on Mount | System | Otomatis sync trades terbaru saat halaman dibuka | Halaman mount → Cek last sync time → Jika stale → Auto trigger incremental sync | Mode = Live; Binance connected | Data terbaru dari exchange tersedia tanpa manual trigger | Threshold staleness configurable |
| 5 | Binance Source Filter | System | Menghormati preferensi user soal sumber data Binance | Load settings → Cek `use_binance_history` flag → Filter/include Binance trades accordingly | User settings tersedia | Trades ditampilkan sesuai preferensi sumber data user | Dari `user_settings.use_binance_history` |
| 6 | Stale Sync Detection | System | Mendeteksi dan memberi tahu jika data sync sudah kadaluarsa | Cek last sync timestamp → Bandingkan threshold → Tampilkan warning jika stale | Binance connected; Last sync timestamp tersedia | Warning visual muncul jika data sudah lama tidak di-sync | Mendorong user untuk trigger sync |
| 7 | Trades Needing Enrichment Count | System | Menghitung jumlah trades yang belum lengkap datanya | Query trades where direction='UNKNOWN' OR entry_price=0 → Count → Tampilkan badge | Trades dari Binance sync tersedia | Badge count muncul di UI; User aware ada trades perlu enrichment | Flag berdasarkan data integrity policy |
| 8 | Sync Quota Management | System | Track dan enforce daily sync quota | Setiap sync request → Cek `sync_quota_usage` → Block jika quota habis | User logged in; Quota table tersedia | Sync diblokir jika quota harian terlampaui; Reset midnight UTC | Hook: `useSyncQuota`; RPC: `check_sync_quota`, `increment_sync_quota` |
| 9 | Sync Checkpoint Persistence | System | Menyimpan progress sync untuk resume jika terganggu | Setiap symbol selesai → Update checkpoint di Zustand store → Persist across navigation | Full sync aktif | Checkpoint tersimpan: processed symbols, current phase, timestamp | Global Zustand store; Survive page navigation |
| 10 | Partial Failure Handling | System | Melanjutkan sync meskipun beberapa symbols gagal | Sync symbol → Jika error → Log failed symbol → Lanjut ke symbol berikutnya → Tampilkan warning | Full sync aktif; Network/API intermittent | Sync selesai untuk symbols yang berhasil; Failed symbols ditampilkan dengan warning badge | Retry mechanism untuk failed symbols |
| 11 | Market Context Display | System | Menampilkan kondisi pasar saat trade dibuat di trade cards | Render trade card → Cek `market_context` JSONB → Tampilkan Fear&Greed badge + Event Day badge | Trade memiliki `market_context` data | Badge visual muncul di trade card memberikan konteks historis | Data dari capture saat wizard entry; Immutable setelah disimpan |
| 12 | Sync Reconciliation Engine | System | Memvalidasi P&L accuracy antara Binance vs local DB | Sync selesai → Bandingkan Binance total P&L vs aggregated local P&L → Hitung difference % | Sync result tersedia; Income data & trade data fetched | `reconciliation` object tersimpan: isReconciled, differencePercent, binanceTotalPnl, aggregatedTotalPnl | Threshold: <0.1% = reconciled; Notification jika mismatch > threshold |
| 13 | Sync Quality Scoring | System | Menghitung skor kualitas sync berdasarkan match rate | Post-sync → Hitung match rate (valid trades / total attempts) → Map ke quality level | Sync result tersedia | `SyncQualityScore`: Excellent (95%+), Good (80-95%), Fair (60-80%), Poor (<60%) | Stored in `_syncMeta` dan `sync-store` |
| 14 | Sync Failure Monitoring & Retry | System | Track consecutive failures dan schedule retry dengan backoff | Sync gagal → Increment failure counter → Jika < max → Schedule retry (exponential backoff + jitter) | Sync failed | Retry ter-schedule; Notification jika 3+ failures (termasuk email) | Hook: `useSyncMonitoring`; Base delay 5s × 2^n + random jitter |
| 15 | Sync Notification System | System | Membuat notifikasi untuk sync failures dan reconciliation issues | Failure/mismatch terdeteksi → Create in-app notification → Optionally send email (3+ failures) | User logged in; Notification service tersedia | Notification tersimpan di `notifications` table; Toast ditampilkan | Uses `notifySyncFailure` dan `notifySyncReconciliationIssue` |

---

## 3. Import & Sync Trades (`/import`)

Halaman terpusat untuk mengimpor dan menyinkronkan trade dari berbagai sumber. Tab Binance Sync untuk sinkronisasi exchange, tab Solana untuk import on-chain wallet.

### 3.1 Trader/User Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Connect Solana Wallet | Trader | Menghubungkan wallet Solana untuk scanning trades | Klik Connect Wallet → Pilih wallet provider (Phantom/Solflare) → Approve connection | Wallet extension terinstall di browser | Wallet terhubung; Public key tersedia untuk scanning | Menggunakan Wallet Standard auto-detection (`SolanaWalletProvider`) |
| 2 | Scan Wallet for Trades | Trader | Memindai riwayat transaksi wallet untuk mendeteksi trades | Klik Scan → Sistem fetch transaction history → Parse & detect DEX interactions | Wallet connected; Public key tersedia | Daftar detected trades ditampilkan untuk review | Scan via Solana JSON-RPC `getSignaturesForAddress` |
| 3 | Pilih Scan Limit | Trader | Mengatur jumlah transaksi yang di-scan | Pilih limit: 50, 100, atau 200 → Scan menggunakan limit terpilih | Wallet connected; Sebelum scan dimulai | Scan terbatas pada jumlah transaksi terpilih | Default 50 untuk scan cepat; 200 untuk scan mendalam |
| 4 | Review Detected Trades | Trader | Meninjau dan memilih trades yang akan diimpor | Lihat daftar trades → Select/deselect individual trades → Review detail (pair, direction, P&L) | Scan selesai; Minimal 1 trade terdeteksi | User memiliki daftar final trades untuk diimpor | Already-imported trades otomatis di-skip |
| 5 | Select All / Deselect All | Trader | Bulk select/deselect semua detected trades sekaligus | Klik "Select All" atau "Deselect All" → Semua checkbox ter-toggle | Detected trades tersedia | Semua trades terpilih atau tidak terpilih sekaligus | Shortcut untuk batch selection |
| 6 | Import Selected Trades | Trader | Mengimpor trades terpilih ke dalam journal | Klik Import → Trades tersimpan ke database → Konfirmasi sukses | Minimal 1 trade terpilih; User logged in | Trades tersimpan di `trade_entries` dengan source='solana'; Muncul di Trade History | `trade_mode` di-set sesuai mode aktif saat import |
| 7 | View Transaction on Solscan | Trader | Memverifikasi transaksi on-chain di Solscan | Klik link external → Redirect ke Solscan transaction page | Trade terdeteksi; Transaction signature tersedia | Browser buka tab baru ke Solscan | Verifikasi independen sebelum import |
| 8 | Scan Summary Stats | Trader | Melihat ringkasan hasil scan | Setelah scan → Lihat summary: transaksi di-scan, trades ditemukan, trades terpilih | Scan selesai | User informed jumlah trades dan status seleksi | Membantu keputusan sebelum import |
| 9 | Navigate to Journal | Trader | Langsung ke Trading Journal setelah import selesai | Setelah import sukses → Klik "View Journal" → Redirect ke `/trading` | Import selesai | User di-redirect ke Trading Journal untuk melihat trades yang baru diimpor | CTA button post-import |
| 10 | Reset / Scan Again | Trader | Membersihkan hasil scan dan memulai ulang proses | Klik Reset → State ter-clear → Kembali ke initial state | Proses scan/review sedang berlangsung | State kembali ke awal; Siap untuk scan ulang | Berguna jika wallet berganti atau perlu refresh |
| 11 | Error State with Retry | Trader | Melihat pesan error dan mengulang scan | Scan gagal → Error message ditampilkan → Klik "Try Again" → Scan diulang | Scan pernah gagal (network, RPC error) | Error message informatif; Retry button tersedia | "Failed to scan. Please try again." |
| 12 | Scan More Transactions | Trader | Memperluas pencarian jika hasil awal sedikit | Hasil scan 0 atau sedikit → Klik "Scan More (200)" → Scan ulang dengan limit lebih besar | Scan selesai; Hasil dirasa kurang | Scan ulang dengan limit 200 transactions | Hanya muncul jika initial results < threshold |
| 13 | View Wallet Address Badge | Trader | Melihat alamat wallet yang terhubung | Badge truncated public key ditampilkan di UI | Wallet connected | User konfirmasi wallet yang benar terhubung | Format: "AbCd...xYz" (truncated) |
| 14 | Trigger Full Sync (Binance) | Trader | Menyinkronkan seluruh riwayat trade dari Binance | Buka tab Binance Sync → Klik Full Sync → Confirm → Full sync berjalan | Mode = Live; Binance connected; Quota tersedia | Seluruh trade history dari Binance tersinkron | **Dipindahkan dari Trade History**; Rate-limited; Quota harian terbatas |
| 15 | Trigger Batch Enrichment | Trader | Memperkaya batch trade Binance yang data-nya belum lengkap | Buka tab Binance Sync → Klik Enrich → Batch process berjalan | Trades dengan direction='UNKNOWN' atau entry_price=0 | Trades ter-enrich dengan data lengkap dari Binance API | **Dipindahkan dari Trade History** |
| 16 | Trigger Incremental Sync | Trader | Menyinkronkan trade terbaru dari Binance | Buka tab Binance Sync → Klik Incremental Sync → Fetch trades since last checkpoint | Mode = Live; Binance connected | Trades baru dari Binance tersimpan di local DB | **Dipindahkan dari Trade History** |
| 17 | View Sync Quota | Trader | Melihat sisa quota sync harian | Buka tab Binance Sync → Quota indicator ditampilkan | Binance connected | User aware sisa quota | **Dipindahkan dari Trade History**; Hook: `useSyncQuota` |
| 18 | Select Sync Range | Trader | Memilih rentang waktu untuk Full Sync | Pilih range: 30d, 90d, 6mo, 1y, 2y, All Time | Full Sync dialog terbuka | Range terpilih | **Dipindahkan dari Trade History** |
| 19 | Force Re-fetch Sync | Trader | Menghapus trades existing dan re-download dari Binance | Centang "Force Re-fetch" → Confirm | Full Sync dialog terbuka | Fresh data dari Binance | **Dipindahkan dari Trade History** |
| 20 | Resume Interrupted Sync | Trader | Melanjutkan sync dari checkpoint terakhir | Klik Resume → Sync lanjut dari last symbol | Checkpoint tersedia | Sync lanjut tanpa mulai ulang | **Dipindahkan dari Trade History** |
| 21 | Discard Sync Checkpoint | Trader | Membuang checkpoint dan mulai fresh sync | Klik Discard → Confirm → Checkpoint terhapus | Checkpoint tersedia | Next sync mulai dari awal | **Dipindahkan dari Trade History** |
| 22 | View Sync Reconciliation Report | Trader | Melihat laporan rekonsiliasi P&L setelah sync | Klik `SyncStatusBadge` → Dialog terbuka | Sync selesai | Reconciliation report ditampilkan | **Dipindahkan dari Trade History** |
| 23 | View Sync Quality Score | Trader | Melihat indikator kualitas sync | Setelah sync → Badge quality ditampilkan | Sync selesai | Quality badge ter-render | **Dipindahkan dari Trade History** |
| 24 | View Trade Details per Row | Trader | Melihat detail per detected trade | Setiap row: pair, direction, DEX, timestamp, quantity, fees, PnL | Trades terdeteksi | Detail lengkap visible | Membantu keputusan import per-trade |
| 25 | View Import Success Summary | Trader | Melihat ringkasan import yang berhasil | Import selesai → Summary ditampilkan → CTA buttons | Import selesai | User informed hasil akhir | Toast notification + inline summary |
| 26 | Mode Guard (Paper Mode Warning) | Trader | Menampilkan warning jika Binance tab dibuka di Paper mode | Buka tab Binance Sync di Paper mode → Empty state warning ditampilkan | Mode = Paper | User informed untuk switch ke Live mode | Prevents confusion |

### 3.2 System Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | DEX Auto-Detection | System | Mengidentifikasi protokol DEX dari transaksi on-chain | Parse transaction → Match program IDs → Identify DEX (Deriverse, Drift, Zeta, Mango) | Transaction data tersedia | Setiap trade ditandai dengan DEX asal | Deriverse & Deriverse Perps = Primary; Drift, Zeta, Mango = Supported |
| 2 | Duplicate Protection | System | Mencegah import trade yang sudah pernah diimpor | Cek transaction signature → Compare dengan existing `binance_trade_id` di DB → Skip jika sudah ada | Trades terdeteksi; Database tersedia | Duplicates otomatis di-filter dari daftar review | Signature-based matching (unique per transaction) |
| 3 | PnL Calculation | System | Menghitung profit/loss dari data token balance on-chain | Analisis perubahan token balance pre & post transaction → Hitung selisih → Convert ke nilai | Transaction data lengkap dengan token transfers | P&L tersedia per trade yang terdeteksi | Token balance analysis; Akurasi tergantung kelengkapan data on-chain |
| 4 | Direction/Pair/Quantity Extraction | System | Mengekstrak metadata trade dari transaksi on-chain | Parse instruction data → Identify token pair → Determine direction (Long/Short) → Extract quantity | Transaction berhasil di-parse | Setiap trade memiliki pair, direction, dan quantity | Jika gagal extract → direction='UNKNOWN', entry_price=0 (flag enrichment) |
| 5 | Import Progress Indicator | System | Menampilkan status progress saat importing ke database | Import dimulai → Loading state + progress bar → Per-trade insert → Complete | Import di-trigger oleh user | Progress visual ditampilkan; User informed saat selesai | Mencegah double-click dan memberikan feedback proses |

---

## Appendix

### Legend Aktor
- **Trader** — End user yang menggunakan aplikasi untuk trading journal
- **System** — Proses otomatis yang berjalan tanpa intervensi user

### Coverage Summary

| Page | Trader Features | System Features | Total |
|------|----------------|-----------------|-------|
| Trading Journal | 31 | 13 | **44** |
| Trade History | 43 | 15 | **58** |
| Import & Sync | 26 | 5 | **31** |
| **Grand Total** | **100** | **33** | **133** |

### Component Coverage Map

| Component | Page | Features Covered |
|-----------|------|-----------------|
| `TradeEntryWizard` | Journal | #1-6 (Wizard steps) |
| `TradeSummaryStats` | Journal | #7 (Summary cards) |
| `AllPositionsTable` | Journal | #8, #9, #29-31 (Tables, leverage, crypto icon, PnL%) |
| `ClosePositionDialog` | Journal | #10 (Close position) |
| `EditPositionDialog` | Journal | #11 (Edit SL/TP/Notes) |
| `TradeEnrichmentDrawer` | Journal | #12-23 (All enrichment sub-features) |
| `TradeTimeframeSection` | Journal (Drawer) | #14 (3-Timeframe system) |
| `PostMortemSection` | Journal (Drawer) | #15 (Post-mortem analysis view) |
| `AIAnalysisDisplay` | Journal (Drawer) | #16 (AI analysis collapsible) |
| `TradeRatingSection` | Journal (Drawer) | #19 (A-F rating) |
| `TradeReviewSection` | Journal (Drawer) | #21 (Rule compliance) |
| `BinanceOpenOrdersTable` | Journal | #26 (Cancel orders) |
| `ConfirmDialog` | Journal, History | #24, #12 (Delete confirmation) |
| `QuickTip` | Journal | #28 (Dismissable tips) |
| `TradeModeSelector` | Global Header | #27 (Mode toggle) |
| `CryptoIcon` | Journal, History | #30, J-System#12 (Symbol icons) |
| `FeeHistoryTab` | History | #17 (Fee history) |
| `FundingHistoryTab` | History | #18 (Funding history) |
| `BinanceFullSyncPanel` | **Import & Sync** | #14, #18-23 (Full sync features) — **Moved from History** |
| `SyncStatusBadge` | History | #29-30 (Reconciliation report trigger, quality score) |
| `SyncReconciliationReport` | History | #29 (Full reconciliation dialog) |
| `SyncQualityIndicator` | History | #30 (Quality level badge) |
| `SyncETADisplay` | History | #31 (ETA during sync) |
| `DataQualitySummary` | History | #33 (Health metrics widget) |
| `SyncMonitoringPanel` | History | #34-35 (Monitoring dashboard, retry) |
| `ReSyncTimeWindow` | History | #28 (Date range re-sync) |
| `SyncQuotaDisplay` | **Import & Sync** | #17 (Quota usage bar) — **Moved from History** |
| `SyncRangeSelector` | **Import & Sync** | #18 (Range picker for full sync) — **Moved from History** |
| `FilterActiveIndicator` | History | #24, #46 (Clear filters, filter count) |
| `FearGreedBadge` | History | H-System#11 (Market context badge) |
| `EventDayBadge` | History | H-System#11 (Event day indicator) |
| `RiskRewardTooltip` | History | #36 (R:R tooltip) |
| `ConfluenceScoreTooltip` | History | #37 (Confluence tooltip) |
| `LazyImage` | History | #41 (Screenshot thumbnail lazy load) |
| `SolanaTradeImport` | Import | #1-15 (All import features) |
| `WalletConnectButton` | Import | #1, #13 (Wallet connection, address badge) |

---

## 4. Full System Phase Map

> Memetakan seluruh sistem (9 domain, 26+ edge functions, 20+ pages, 300+ features) ke dalam 15 phase development berurutan berdasarkan dependency graph. Setiap phase membangun fondasi untuk phase berikutnya.

### Phase Dependency Diagram

```
Phase 1: Foundation ──┬── Phase 2: Shell ──┬── Phase 3: Settings ──── Phase 4: Accounts
                      │                    │                                    │
                      │                    │                          Phase 5: Binance Layer
                      │                    │                                    │
                      │                    ├── Phase 6: Market ────────────────┤
                      │                    │                                    │
                      │                    ├── Phase 7: Risk ─────────────────┤
                      │                    │                                    │
                      │                    └── Phase 8: Strategy ─────────────┤
                      │                                                        │
                      │                    ┌───────────────────────────────────┘
                      │                    │
                      │               Phase 9: Journal Core ── Phase 10: Journal Enrichment
                      │                    │
                      │               Phase 11: Trade History
                      │                    │
                      │               Phase 12: Import & Sync
                      │                    │
                      │               Phase 13: Analytics
                      │                    │
                      │               Phase 14: Dashboard
                      │                    │
                      └───────────── Phase 15: Global & Polish
```

### Phase Coverage Summary

| Phase | Domain | Pages | Features | Edge Functions | Key Components |
|-------|--------|-------|----------|----------------|----------------|
| 1 | Foundation | 2 (Auth) | 12 | 0 | ErrorBoundary, ThemeProvider, i18n |
| 2 | Platform Shell | 0 (Layout) | 14 | 0 | Sidebar, Header, CommandPalette, ProtectedRoute |
| 3 | User & Settings | 2 | 18 | 0 | ProfilePage, SettingsPage (5 tabs) |
| 4 | Accounts | 2 | 22 | 0 | AccountsList, AccountDetail, AccountComparison |
| 5 | Binance Integration | 0 (Layer) | 16 | 1 | binance-futures proxy, useBinancePositions |
| 6 | Market | 4 | 32 | 6 | MarketInsight, EconomicCalendar, TopMovers, MarketContext |
| 7 | Risk | 2 | 24 | 0 | RiskManagement, PositionCalculator, TradingGate |
| 8 | Strategy | 2 | 20 | 2 | StrategyManager, RulesBuilder, YouTubeImport |
| 9 | Journal Core | 1 | 31 | 0 | TradeWizard, AllPositionsTable, CloseDialog |
| 10 | Journal Enrichment | 0 (Drawer) | 22 | 4 | EnrichmentDrawer, AIAnalysis, PostMortem |
| 11 | Trade History | 1 | 43 | 0 | HistoryTable, GalleryView, FeeHistory |
| 12 | Import & Sync | 1 | 26 | 3 | BinanceFullSync, SolanaImport, SyncMonitoring |
| 13 | Analytics | 4 | 28 | 2 | Performance, DailyPnL, Heatmap, AIInsights |
| 14 | Dashboard | 1 | 18 | 0 | PortfolioCard, MarketScore, SystemStatus, Widgets |
| 15 | Global & Polish | 3 | 30 | 8 | AIChatbot, BulkExport, Notifications, Backtest |
| **Total** | **9 Domains** | **25+ Pages** | **336 Features** | **26 Edge Functions** | — |

---

### Phase 1: Foundation & Infrastructure

**Dependency:** None (root)
**Goal:** Auth, database, dan infrastruktur dasar yang menjadi fondasi seluruh sistem.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Auth System (Signup/Login/Session) | Core | Email + password auth via Lovable Cloud Auth; Session management; ProtectedRoute wrapper |
| 2 | Database Schema — Core Tables | Core | `users_profile`, `user_settings`, `accounts`, `trade_entries`, `trading_strategies` |
| 3 | Row Level Security (RLS) Policies | Security | Per-user data isolation pada semua tabel; `auth.uid() = user_id` pattern |
| 4 | Lovable Cloud Client Setup | Core | Auto-generated client (`src/integrations/supabase/client.ts`); Type-safe queries |
| 5 | Global Error Boundary | Resilience | App-level crash handler; Fallback UI dengan retry action |
| 6 | Widget Error Boundary | Resilience | Per-widget isolation; Dashboard widgets fail independently |
| 7 | Theme System (Dark/Light) | UX | `next-themes` provider; CSS variables; Persistent preference |
| 8 | i18n Foundation | UX | `i18next` + `react-i18next`; Language switcher; Translation files structure |
| 9 | Environment Configuration | Core | `.env` auto-managed; VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY |
| 10 | User Role System | Security | `user_roles` table; `app_role` enum (admin/user); `has_role()` RPC |
| 11 | Subscription Tier System | Business | `subscription_tier` enum (free/pro/business); `feature_permissions` table; `has_permission()` RPC |
| 12 | Audit Log Foundation | Security | `audit_logs` table; `logAuditEvent()` utility; Entity tracking |

---

### Phase 2: Platform Shell & Navigation

**Dependency:** Phase 1
**Goal:** Layout persisten, navigasi, dan UX shell yang menjadi kerangka seluruh aplikasi.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Sidebar Layout | Navigation | Collapsible groups: Portfolio, Journal, Analytics, Tools; Active state highlight; Icons |
| 2 | Header with TradeModeSelector | Navigation | Persistent header; Paper/Live toggle; SIMULATION banner (amber) di Paper mode |
| 3 | Command Palette (⌘K) | UX | `cmdk` library; Global search; Quick navigation to any page/action |
| 4 | ProtectedRoute Wrapper | Auth | Route guard; Redirect to `/auth` if not authenticated; Session check |
| 5 | Lazy Loading for All Pages | Performance | `React.lazy` + `Suspense`; Per-page code splitting; Loading skeleton |
| 6 | Currency Display System | UX | `useCurrencyConversion` hook; Hourly rate caching; Format helpers (`format`, `formatPnl`) |
| 7 | Notification Bell Icon | UX | Header notification icon; Unread count badge; Link to notification center |
| 8 | Persistent Layout (No Full Reload) | UX | Nested routing via `<Outlet />`; Sidebar/header always mounted during navigation |
| 9 | Live Price Ticker | UX | Header ticker; Real-time price display; Configurable symbols |
| 10 | Breadcrumbs | Navigation | Context-aware breadcrumb trail; Auto-generated from route hierarchy |
| 11 | Mobile Responsive Layout | UX | Collapsible sidebar on mobile; Touch-friendly interactions |
| 12 | Keyboard Shortcuts System | UX | `Shift+?` for shortcuts list; Global hotkey bindings |
| 13 | Page Header Component | UX | Standardized `PageHeader` with icon, title, description; Consistent across all pages |
| 14 | Toast Notification System | Feedback | `sonner` library; Success/error/warning/info variants; Auto-dismiss |

---

### Phase 3: User & Settings Domain

**Dependency:** Phase 1, Phase 2
**Goal:** Profil pengguna, preferensi, dan konfigurasi sistem.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Profile Page | Page | Avatar upload, display name, bio, preferred currency |
| 2 | Settings Page — Binance API Tab | Page | API key input (masked); Encrypt/store via Vault; Validate endpoint; Permission display |
| 3 | Settings Page — Trading Config Tab | Page | Default leverage, risk per trade, trading style preferences |
| 4 | Settings Page — AI Settings Tab | Page | AI model preference; Auto-analysis toggle; Confidence threshold |
| 5 | Settings Page — Export Tab | Page | Journal CSV/PDF export; Data backup/restore |
| 6 | Settings Page — Backup Tab | Page | Full settings backup (JSON); Restore from backup file |
| 7 | user_settings Persistence | Data | Auto-create on first login; `active_trade_mode`, `active_trading_style`, `theme`, `language`, `default_currency` |
| 8 | Binance API Key Management | Security | `exchange_credentials` table; Vault encryption; `save_exchange_credential()` RPC |
| 9 | API Key Validation Flow | Integration | Edge function call → Test with `/fapi/v2/balance` → Update `is_valid`, `permissions`, `last_validated_at` |
| 10 | AI Settings Enforcement Hook | Logic | `useAISettings` — enforce model, auto-analysis, confidence thresholds globally |
| 11 | Notification Preferences | Settings | Email, push, market news, portfolio updates, price alerts, weekly report toggles |
| 12 | Trade Retention Config | Settings | `trade_retention_days` — configurable soft-delete retention period |
| 13 | Default Trading Account | Settings | `default_trading_account_id` — auto-select account in wizard |
| 14 | Sync Quota Config | Settings | `binance_daily_sync_quota` — configurable daily sync limit |
| 15 | Display Name & Avatar | Profile | Profile avatar (storage upload); Display name for chat/sharing |
| 16 | Preferred Currency | Profile | `preferred_currency` in `users_profile`; Drives currency conversion display |
| 17 | Bio / About | Profile | Optional trader bio for shared strategy profiles |
| 18 | Deleted Trades Recovery | Settings | View soft-deleted trades (30-day window); Restore individual trades via `restore_trade_entry()` |

---

### Phase 4: Accounts Domain (Foundation)

**Dependency:** Phase 1, Phase 3
**Goal:** Manajemen akun trading (paper & live), tracking capital, dan analytics per-akun.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Accounts List Page | Page | CRUD accounts; Filter by type (`account_type` enum); Active/inactive toggle |
| 2 | Create Account | Action | Name, type, currency, initial balance, exchange, color, icon, description |
| 3 | Edit Account | Action | Update metadata; Cannot change `account_type` after creation |
| 4 | Delete Account (Soft) | Action | `deleted_at` timestamp; Cascade check for linked trades |
| 5 | Account Detail Page | Page | Capital flow timeline; Fee/rebate breakdown; Transaction history |
| 6 | Account Transactions | Data | `account_transactions` table; Types: deposit, withdrawal, transfer, expense, income |
| 7 | Paper Account Balance Tracking | Logic | Manual balance management; Deduct on trade entry; Credit on trade close |
| 8 | Binance Balance Integration | Integration | `/fapi/v2/balance` endpoint; Real-time USDT balance; Only in Live mode |
| 9 | Account Balance Snapshots | Data | `account_balance_snapshots` table; Daily snapshots for equity curve |
| 10 | Account Balance Discrepancies | Data | `account_balance_discrepancies` table; Detect expected vs actual balance drift |
| 11 | Account Comparison Analytics | Analytics | Side-by-side account performance comparison; `useAccountLevelStats` hook |
| 12 | Multi-Level Analytics Architecture | Architecture | Per-account → Per-exchange → Per-type → Aggregate; Prevents cross-contamination |
| 13 | Account Transaction Categories | Data | `category_id` for transaction categorization |
| 14 | Inter-Account Transfers | Action | `transfer_in`/`transfer_out` with `counterparty_account_id` |
| 15 | Portfolio Transaction Linking | Data | `portfolio_transaction_id` for grouped transfers |
| 16 | Account Color & Icon | UX | Visual differentiation; Color picker; Icon selector |
| 17 | System Accounts | Logic | `is_system` flag; Auto-created accounts (e.g., default paper account) |
| 18 | Account Currency | Data | Per-account currency; Supports multi-currency portfolio |
| 19 | Mode-Isolated Overview | Logic | Summary cards filtered by `trade_mode`; Paper/Live balances never aggregated |
| 20 | Active Account Filter | UX | `is_active` toggle; Hide inactive accounts from dropdowns |
| 21 | Account Sub-Type | Data | `sub_type` field for granular categorization within `account_type` |
| 22 | Target Allocations | Settings | `target_allocations` JSON in user_settings; Portfolio allocation targets |

---

### Phase 5: Binance Integration Layer

**Dependency:** Phase 3 (API Key), Phase 4 (Accounts)
**Goal:** Proxy layer untuk Binance Futures API dengan HMAC signing dan rate limiting.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Edge Function: `binance-futures` | Backend | HMAC proxy; JWT auth; 41+ endpoint routing; Error normalization |
| 2 | `useBinancePositions` Hook | Frontend | Fetch open positions; Auto-refresh; Mode-gated (Live only) |
| 3 | `useBinanceBalance` Hook | Frontend | USDT futures balance; Real-time update; Currency conversion |
| 4 | `useBinanceOpenOrders` Hook | Frontend | Open orders list; Cancel order support; Tab badge count |
| 5 | `useBinanceConnectionStatus` Hook | Frontend | Connection health check; `isConnected` boolean; Error state |
| 6 | Position Mode Detection | Logic | Hedge vs One-way mode; Affects position display and order logic |
| 7 | Leverage Brackets Fetching | Data | `/fapi/v1/leverageBracket`; Tier-based leverage limits; Wizard warning |
| 8 | Commission Rate Fetching | Data | `/fapi/v1/commissionRate`; Maker/taker rates per symbol |
| 9 | API Key Validation Flow | Logic | Test credentials → Update `is_valid` → Store `permissions` JSON |
| 10 | Rate Limiting System | Backend | `api_rate_limits` table; `check_rate_limit()` RPC; Per-category weight tracking |
| 11 | Rate Limit Status Display | UX | `get_rate_limit_status()` RPC; Usage percentage per endpoint category |
| 12 | Error Normalization | Backend | Binance error codes → Standardized error format; Retry guidance |
| 13 | Request Signing (HMAC-SHA256) | Security | Server-side signing; Timestamp validation; Secret never exposed to client |
| 14 | Multi-Endpoint Routing | Backend | Single edge function handles all Binance API paths via `endpoint` parameter |
| 15 | Credential Decryption | Backend | `get_decrypted_credential()` RPC; Vault integration; Per-user isolation |
| 16 | Cleanup Old Rate Limits | Maintenance | `cleanup_old_rate_limits()` RPC; Remove expired rate limit windows |

---

### Phase 6: Market Domain (Context Provider)

**Dependency:** Phase 2 (Shell), Phase 5 (Binance for ticker data)
**Goal:** Data pasar real-time, kalender ekonomi, dan context provider untuk keputusan trading.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Market Insight Page (4-Tab Hub) | Page | Tabs: Data, Calendar, AI Analysis, Combined View |
| 2 | Market Data Page | Page | Sentiment gauges, Volatility metrics, Whale tracking indicators |
| 3 | Economic Calendar Page | Page | Event timeline; Impact filtering (High/Medium/Low); Countdown timer |
| 4 | Top Movers Page | Page | Gainers, Losers, Volume leaders; Sortable tables; Timeframe selector |
| 5 | Edge Function: `binance-market-data` | Backend | Public market data proxy; No auth required for public endpoints |
| 6 | Edge Function: `economic-calendar` | Backend | External calendar API integration; Event parsing and normalization |
| 7 | Edge Function: `macro-analysis` | Backend | AI-powered macro environment analysis; Gemini integration |
| 8 | Edge Function: `market-insight` | Backend | Combined market analysis; Multi-source aggregation |
| 9 | Edge Function: `market-analysis` | Backend | Technical analysis signals; Pattern recognition |
| 10 | Edge Function: `public-ticker` | Backend | Real-time ticker data; WebSocket-like polling |
| 11 | Unified Market Score Hook | Logic | 4-component weighted scoring: Sentiment + Volatility + Momentum + Events |
| 12 | Market Alert System | UX | Fear/Greed extremes alert; Event proximity warnings; Threshold-based triggers |
| 13 | Fear & Greed Index Integration | Data | External API; Historical tracking; Badge display in trade context |
| 14 | Market Context Provider (React Context) | Architecture | Global market state; Consumed by Risk, Journal, Dashboard domains |
| 15 | Sentiment Thresholds Config | Config | `sentiment-thresholds.ts` — Extreme Fear/Greed boundaries |
| 16 | Volatility Config | Config | `volatility-config.ts` — ATR multipliers, VIX-like thresholds |
| 17 | Market Session Detection | Logic | Asia/London/NY session identification; Overlap detection |
| 18 | Watchlist Management | UX | User-configurable symbol watchlist; Max limit from `market-config.ts` |
| 19 | Fear & Greed Historical Chart | Analytics | 30/90/365 day trend; Zone coloring (Extreme Fear → Extreme Greed) |
| 20 | Whale Activity Tracking | Data | Large transaction detection; Threshold-based alerts |
| 21 | Volatility Meter | Widget | Real-time volatility gauge; Color-coded severity |
| 22 | Market Regime Badge | UX | Current regime: Trending/Ranging/Volatile/Calm; AI-determined |
| 23 | Event Impact Assessment | Logic | Economic event severity scoring; Trading Gate integration |
| 24 | Market Data Caching | Performance | React Query staleTime/gcTime optimization; Reduce redundant API calls |
| 25 | Top Movers Timeframe Selector | UX | 1h, 4h, 24h timeframe options; Dynamic re-sort |
| 26 | Volume Leaders Ranking | Data | Top symbols by trading volume; Relative volume comparison |
| 27 | Sentiment Source Aggregation | Logic | Multiple sentiment sources → Weighted average score |
| 28 | Calendar Event Categories | UX | GDP, CPI, FOMC, Employment, etc.; Category-based filtering |
| 29 | Event Countdown Timer | UX | Live countdown to next high-impact event; Auto-refresh |
| 30 | Market Data Export | Action | Export market snapshot as JSON/CSV for external analysis |
| 31 | Combined Market View | Page | Unified dashboard: Sentiment + Calendar + Movers in single view |
| 32 | AI Market Commentary | AI | Gemini-powered market narrative; Context for trading decisions |

---

### Phase 7: Risk Domain (Guardian)

**Dependency:** Phase 4 (Accounts), Phase 5 (Binance Balance), Phase 6 (Market Context)
**Goal:** Risk management, position sizing, dan trading gate system.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Risk Management Page | Page | Daily Loss Tracker, Risk Profile, Event Log, Correlation Matrix |
| 2 | Position Calculator Page | Page | Risk-based sizing; Volatility-adjusted SL; Context warnings |
| 3 | Risk Profiles CRUD | Data | `risk_profiles` table; `max_daily_loss_percent`, `risk_per_trade_percent`, `max_concurrent_positions` |
| 4 | Daily Risk Snapshots | Data | `daily_risk_snapshots` table; Starting balance, current P&L, positions open, loss limit usage |
| 5 | Trading Gate System | Logic | `useTradingGate` hook; Block wizard if daily loss limit hit; Visual indicator (green/yellow/red) |
| 6 | Context-Aware Risk Adjustment | Logic | 5 factors: Volatility, Events, Sentiment, Momentum, Performance → Adjusted risk % |
| 7 | Correlation Matrix | Analytics | Consolidated coefficient model; Correlated exposure warnings; `max_correlated_exposure` threshold |
| 8 | Risk Event Types | Data | `risk_events` table; Types: `warning_70`, `warning_90`, `limit_reached`, `trading_disabled` |
| 9 | Risk Event Log | UX | Chronological event timeline; Severity coloring; Filterable |
| 10 | Daily Loss Tracker Widget | Widget | Progress bar showing daily loss usage %; Threshold warnings at 70%/90% |
| 11 | Position Size Calculator | Tool | Input: Account balance, risk %, entry, SL → Output: Position size, $ risk, R:R |
| 12 | Volatility-Based Stop Loss | Logic | ATR-based SL calculation; `risk-multipliers.ts` configuration |
| 13 | Max Weekly Drawdown | Config | `max_weekly_drawdown_percent` in risk profile; Weekly aggregation |
| 14 | Max Position Size | Config | `max_position_size_percent` per risk profile; Prevents over-concentration |
| 15 | Risk Summary Card | Widget | Dashboard widget; Daily loss usage + correlation warning + gate status |
| 16 | ADL Risk Widget | Widget | Auto-Deleveraging risk indicator; Binance ADL queue position |
| 17 | Risk Multipliers Config | Config | `risk-multipliers.ts` — ATR multipliers, volatility adjustments per trading style |
| 18 | Risk Thresholds Config | Config | `risk-thresholds.ts` — Warning/critical/limit boundaries |
| 19 | Trading Gate Visual Indicator | UX | System Status: Green (OK), Yellow (Warning 70%+), Red (Blocked 100%) |
| 20 | Context Warnings in Calculator | UX | "High volatility: consider reducing size", "FOMC in 2h", "Extreme Fear" |
| 21 | Risk Profile Activation | Logic | `is_active` toggle; Only one active profile per user |
| 22 | Capital Deployed Percentage | Metric | Currently deployed capital as % of total; Concentration risk indicator |
| 23 | Trading Health Score | Metric | 0-100 composite: Sharpe (25%), Drawdown (20%), WR (20%), PF (15%), Consistency (15%), Sample (5%) |
| 24 | Advanced Risk Metrics | Analytics | Sharpe Ratio, Sortino Ratio, Value at Risk (VaR); Historical calculation |

---

### Phase 8: Strategy Domain (Playbook)

**Dependency:** Phase 1 (Auth), Phase 2 (Shell)
**Goal:** Strategy management, rules builder, sharing, dan performance tracking.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Strategy Management Page | Page | CRUD strategies; Library view; Active/inactive filter |
| 2 | Trading Strategies Schema | Data | MTFA: `higher_timeframe`, `timeframe` (primary), `lower_timeframe`; Entry/exit rules JSON |
| 3 | Entry Rules Builder | Tool | 6 rule types: Price Action, Indicator, Volume, Structure, Pattern, Custom |
| 4 | Exit Rules Builder | Tool | SL rules, TP rules, Time-based exit, Trailing stop rules |
| 5 | Strategy Form Dialog | UX | Full strategy creation/edit form; Methodology, tags, difficulty, session preference |
| 6 | YouTube Strategy Import | AI | Paste YouTube URL → AI extracts strategy → Pre-fill form; Gemini via edge function |
| 7 | Edge Function: `youtube-strategy-import` | Backend | YouTube transcript extraction → AI strategy parsing → Structured JSON output |
| 8 | Strategy Sharing (Link + QR) | Social | `share_token` generation; `is_shared` flag; QR code via `qrcode.react` |
| 9 | Strategy Cloning | Social | Clone from shared link or leaderboard; `increment_clone_count()` RPC |
| 10 | Edge Function: `strategy-clone-notify` | Backend | Notify strategy creator when cloned; Clone count tracking |
| 11 | Strategy Performance Tracking | Analytics | `useStrategyPerformance` hook; Win rate, PF, avg R:R per strategy |
| 12 | Strategy Tags | UX | Tags array; Filterable; Common tags: trend, reversal, breakout, scalp |
| 13 | Strategy Difficulty Level | UX | Beginner/Intermediate/Advanced; Displayed in library |
| 14 | Strategy Versioning | Data | `version` integer; Increment on edit; Historical version tracking |
| 15 | Valid Pairs | Config | `valid_pairs` array; Restrict strategy to specific symbols |
| 16 | Session Preference | Config | `session_preference` array; Optimal trading sessions for strategy |
| 17 | Min Confluences | Config | `min_confluences` integer; Required confluences before entry |
| 18 | Min Risk:Reward | Config | `min_rr` float; Minimum R:R ratio for strategy compliance |
| 19 | Automation Score | Metric | `automation_score` 0-100; How rule-based/systematic the strategy is |
| 20 | Strategy Soft Delete | Data | `deleted_at` timestamp; Recoverable; Linked trades preserve snapshot |

---

### Phase 9: Journal Domain — Core (Trade Lifecycle)

**Dependency:** Phase 4, Phase 5, Phase 7 (Trading Gate), Phase 8 (Strategies)
**Goal:** Trade lifecycle management — entry, monitoring, close.

> **Detail features: See Section 1 (31 Trader + 13 System = 44 features)**

| Aspect | Coverage |
|--------|----------|
| Trade Entry | Wizard Full (5-step) + Express (3-step); Mode-aware; Gate-blocked if risk limit hit |
| Position Monitoring | AllPositionsTable; Live Time-in-Trade (60s); Unified paper + Binance |
| Trade Close | Direction-aware P&L; Fee deduction; AI Post-Trade auto-trigger |
| State Machine | 6 states: OPENING → PARTIALLY_FILLED → ACTIVE → CLOSED/CANCELED/LIQUIDATED |
| Mode Isolation | `useModeFilteredTrades`; `trade_mode` immutable at creation |
| Read-Only Enforcement | Core fields locked for `source: binance` or `trade_mode: live` |
| Market Context | Auto-capture Fear/Greed, volatility, events at entry time |

---

### Phase 10: Journal Domain — Enrichment & AI

**Dependency:** Phase 9
**Goal:** Post-entry enrichment, AI analysis, dan trade quality scoring.

> **Detail features: See Section 1 Enrichment (#12-#23) + System (#3-#4)**

| Aspect | Coverage |
|--------|----------|
| Enrichment Drawer | 10+ sub-features: Strategy linking, 3-TF system, screenshots, rating, tags, compliance, notes |
| AI Pre-flight | EV/R scoring → Proceed/Caution/Skip verdict; Blocks wizard on SKIP |
| AI Post-Trade | Auto-trigger on close; Entry Timing, Exit Efficiency, SL Placement, Strategy Adherence |
| Edge Functions | `ai-preflight`, `trade-quality`, `post-trade-analysis`, `confluence-detection` |
| Trade Rating | A-F self-assessment; Execution quality grading |
| Rule Compliance | 6-item checklist; `rule_compliance` JSONB; `lesson_learned` field |
| Wizard Analytics | Conversion funnel tracking: start → step → abandon → complete |

---

### Phase 11: Trade History & Data Management

**Dependency:** Phase 9, Phase 10
**Goal:** Historical trade browsing, filtering, export, dan data lifecycle.

> **Detail features: See Section 2 (43 Trader + 14 System = 57 features across 6 modules)**

| Module | Features | Key Components |
|--------|----------|----------------|
| Viewing | 12 | List/Gallery toggle, 7 filter dimensions, cursor pagination |
| Enrichment | 4 | Inline enrich, batch enrichment, full drawer access |
| Notes/Tags/Screenshots | 6 | Quick note, tag edit, screenshot gallery, lazy loading |
| Sync & Data Management | 13 | Soft delete, recovery, quality scoring, reconciliation |
| Metrics/Visuals | 7 | Stats cards, P&L coloring, R:R tooltip, AI score badge |
| External | 1 | Fee history, funding history tabs |

---

### Phase 12: Import & Sync Engine

**Dependency:** Phase 5 (Binance), Phase 9 (Trade Schema)
**Goal:** Trade data import dari Binance dan Solana; sync engine dengan reconciliation.

> **Detail features: See Section 3 (26 Trader + 6 System = 32 features)**

| Aspect | Coverage |
|--------|----------|
| Binance Sync | Full sync panel; Range selector; Quota management; Checkpoint resume |
| Lifecycle Grouper | `groupIntoLifecycles` — position lifecycle aggregation; Weighted avg prices |
| Reconciliation | Tolerance 0.1%; Calculated vs reported P&L validation; Quality scoring |
| Sync Monitoring | ETA display; Phase indicator; Failure retry; Rate limit detection |
| Solana Import | Phantom/Solflare wallet; DEX auto-detection; Signature-based dedup |
| Edge Functions | `binance-background-sync`, `reconcile-balances`, `send-sync-failure-email` |

---

### Phase 13: Analytics Domain (Insights)

**Dependency:** Phase 9 (Trade Data), Phase 6 (Market Context)
**Goal:** Performance analytics, pattern recognition, dan AI-powered insights.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Performance Page | Page | Win Rate, Profit Factor, Expectancy, Max Drawdown, P&L Distribution chart |
| 2 | Daily PnL Page | Page | Day-by-day breakdown; Week-over-week comparison; Symbol breakdown; CSV/PDF export |
| 3 | Trading Heatmap Page | Page | Hour × Day-of-Week grid; Session analysis; Win/Loss streaks |
| 4 | AI Insights Page | Page | Pattern detection; Contextual recommendations; Action items; Pair rankings |
| 5 | Contextual Analytics | Charts | Fear/Greed zone performance; Event-day performance; Volatility level charts |
| 6 | Edge Function: `dashboard-insights` | Backend | AI-powered portfolio analysis; Market regime correlation |
| 7 | Edge Function: `trading-analysis` | Backend | Pattern recognition; Statistical analysis; Trend detection |
| 8 | Win Rate by Strategy | Metric | Per-strategy win rate breakdown; Identifies best/worst strategies |
| 9 | Win Rate by Session | Metric | Asia/London/NY session performance; Optimal trading hours |
| 10 | Win Rate by Day of Week | Metric | Monday-Friday performance; Day-specific patterns |
| 11 | Profit Factor Trend | Chart | Rolling profit factor over time; Trend direction indicator |
| 12 | Expectancy Calculator | Metric | (Win% × AvgWin) - (Loss% × AvgLoss); Per-strategy and overall |
| 13 | Max Drawdown Tracking | Metric | Peak-to-trough; Duration; Recovery time |
| 14 | P&L Distribution Histogram | Chart | Normal distribution overlay; Skewness indicator |
| 15 | Equity Curve | Chart | Cumulative P&L over time; Benchmark comparison |
| 16 | Goal Tracking Widget | Widget | User-defined targets; Progress tracking; Milestone notifications |
| 17 | Trade Duration Analysis | Metric | Average hold time; Optimal hold time by strategy |
| 18 | R-Multiple Distribution | Chart | Risk-adjusted returns; Outlier identification |
| 19 | Consecutive Win/Loss Streaks | Metric | Current and historical streaks; Impact on psychology tracking |
| 20 | Session Overlap Performance | Analytics | Performance during Asia-London and London-NY overlaps |
| 21 | Symbol Performance Ranking | Analytics | Best/worst performing pairs; Volume-weighted |
| 22 | Monthly/Weekly Summaries | Analytics | Aggregated performance; Period-over-period comparison |
| 23 | Export Analytics Data | Action | CSV/PDF export for performance reports |
| 24 | AI Pattern Recognition | AI | Recurring setups; Success/failure patterns; Behavioral insights |
| 25 | AI Action Items | AI | Specific recommendations: "Avoid EUR pairs on NFP days" |
| 26 | AI Pair Rankings | AI | AI-scored pair rankings based on personal performance history |
| 27 | AI Confidence Score | AI | 0-100 confidence on each insight; Expiration timestamps |
| 28 | AI Analytics Config | Config | `ai-analytics.ts` — Performance benchmarks, minimum sample sizes |

---

### Phase 14: Dashboard Domain (Aggregation Hub)

**Dependency:** Phase 4, Phase 6, Phase 7, Phase 9, Phase 13
**Goal:** Unified dashboard mengagregasi data dari semua domain.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | Dashboard Page (Widget Grid) | Page | Responsive grid layout; Widget-level error boundaries |
| 2 | Portfolio Overview Card | Widget | Total capital, daily/weekly P&L, win rate, account count |
| 3 | Today Performance Widget | Widget | 7-day stats; Current streak; Today's P&L |
| 4 | Smart Quick Actions | Widget | Context-aware buttons: New Trade, Risk Check, Sync, etc. |
| 5 | Market Score Widget | Widget | Unified market score (0-100); Market bias indicator |
| 6 | System Status Indicator | Widget | Trading gate status: Green/Yellow/Red; API health |
| 7 | Open Positions Table | Widget | Live Binance positions; Mode-gated (Live only) |
| 8 | Risk Summary Card | Widget | Daily loss usage %; Correlation warning; Gate status |
| 9 | AI Insights Widget | Widget | Top recommendations; Market regime badge; Action items |
| 10 | Volatility Meter Widget | Widget | Real-time volatility gauge; Severity coloring |
| 11 | Dashboard Analytics Summary | Widget | Sparkline charts; Quick stats overview |
| 12 | Equity Curve Chart | Widget | Cumulative P&L chart; Embedded from Analytics |
| 13 | Goal Tracking Widget | Widget | Progress toward user-defined trading goals |
| 14 | ADL Risk Widget | Widget | Auto-Deleveraging risk indicator |
| 15 | Risk Metrics Cards | Widget | Sharpe, Sortino, VaR quick-view cards |
| 16 | Onboarding Tooltip System | UX | First-time user guide; Step-by-step overlay; Dismissible |
| 17 | Pro Tip (Dismissible) | UX | Context-aware tips; localStorage persistence; One-time dismiss |
| 18 | Empty State CTA | UX | "Log First Trade" prompt when no trades exist |

---

### Phase 15: Global Features & Production Polish

**Dependency:** All previous phases
**Goal:** Cross-cutting features, production readiness, dan final polish.

| # | Feature | Type | Detail |
|---|---------|------|--------|
| 1 | AI Chatbot (Floating) | AI | 3 modes: Analyst, Validator, Coach; Session persistence; Markdown support |
| 2 | Edge Function: `confluence-chat` | Backend | Analyst mode: Market analysis, setup validation, trade ideas |
| 3 | Edge Function: `post-trade-chat` | Backend | Coach mode: Trade review, psychological coaching, improvement plans |
| 4 | Bulk Export Page | Page | Journal CSV/PDF; Settings backup/restore; Binance daily PnL |
| 5 | Edge Function: `weekly-report` | Backend | Automated weekly performance report; Email delivery |
| 6 | Notification Center | Page | In-app notification list; Read/unread management; Category filtering |
| 7 | Push Notifications | System | Browser push; `push_subscriptions` table; Service worker |
| 8 | Edge Function: `send-push-notification` | Backend | Push notification delivery; Subscription management |
| 9 | Edge Function: `send-cleanup-notification` | Backend | Cleanup expired subscriptions; Maintenance |
| 10 | Global Audit Log System | Security | `audit_logs` table; `logAuditEvent()`; Entity tracking across all domains |
| 11 | Currency Conversion Display | UX | Hourly rate caching; Multi-currency support; `useCurrencyConversion` |
| 12 | Backtest Engine | Tool | Real Klines data; Session breakdown; Equity curve; Comparison mode |
| 13 | Edge Function: `backtest-strategy` | Backend | Kline fetching; Strategy simulation; Metrics calculation |
| 14 | Strategy Leaderboard | Social | Global shared strategies ranking; Clone count sorting; Performance metrics |
| 15 | Solana Wallet Provider | Integration | Global `WalletProvider` wrapper; Phantom/Solflare adapters |
| 16 | Landing Page | Page | Product showcase; Feature highlights; CTA to signup |
| 17 | PWA Configuration | Production | `vite-plugin-pwa`; Service worker; Offline capability; Install prompt |
| 18 | Performance Optimization | Production | React Query tuning (staleTime: 2m, gcTime: 10m); Memoization; Lazy loading |
| 19 | Hybrid Trading Mode Audit | Security | Complete data isolation verification; Mode leakage prevention |
| 20 | Edge Function: `sync-trading-pairs` | Backend | `trading_pairs` table sync from Binance; Active pairs list |
| 21 | Trading Pairs Management | Data | `trading_pairs` table; Auto-sync; Active/inactive filtering |
| 22 | Edge Function: `send-sync-failure-email` | Backend | Email notification after 3+ sync failures |
| 23 | Sync Notification System | System | In-app + email for sync failures; Quota warnings |
| 24 | Batch Trade Insert | Performance | `batch_insert_trades()` RPC; Bulk import optimization |
| 25 | Trade Cleanup Automation | Maintenance | `cleanup_old_trades()` RPC; `permanent_delete_old_trades()` |
| 26 | React Query Error Retry | Resilience | Exponential backoff; Max 3 retries; Error boundary fallback |
| 27 | SEO & Meta Tags | Production | `react-helmet`; Dynamic title/description per page; OG tags |
| 28 | Accessibility (a11y) | Production | ARIA labels; Keyboard navigation; Screen reader support |
| 29 | Trading Session Detection | Logic | `get_trading_session()` RPC; Auto-detect Asia/London/NY from trade time |
| 30 | Feature Permission Enforcement | Security | `has_permission()` RPC; Tier-gated features; Upgrade prompts |

---

### Coverage Summary (Full System)

| Metric | Count |
|--------|-------|
| Total Domains | 9 (Foundation, Shell, Settings, Accounts, Binance, Market, Risk, Strategy, Journal) |
| Total Pages | 25+ |
| Total Features (Detailed) | 336+ |
| Total Edge Functions | 26 |
| Total Database Tables | 20 |
| Total RPC Functions | 25+ |
| Total React Hooks (Custom) | 30+ |
| Total Phases | 15 |

### Cross-References
- Schema database: [`docs/DATABASE.md`](./DATABASE.md)
- Skenario pengguna detail: [`docs/USER_SCENARIOS.md`](./USER_SCENARIOS.md)
- Frontend architecture: [`docs/FRONTEND.md`](./FRONTEND.md)
- Backend architecture: [`docs/BACKEND.md`](./BACKEND.md)
- Architecture gaps: [`docs/ARCHITECTURE_GAPS.md`](./ARCHITECTURE_GAPS.md)

### Revision History
| Tanggal | Perubahan |
|---------|-----------|
| 2026-02-13 | Initial creation — 31 Trader features, 17 System features across 3 pages |
| 2026-02-13 | Expanded coverage — 60 Trader features, 27 System features (87 total, +81%). Added wizard steps, enrichment sub-features, sync engine details, component coverage map |
| 2026-02-13 | Full coverage — 96 Trader features, 33 System features (129 total, +48%). Added enrichment drawer granular sub-features, sync monitoring/reconciliation, trade card indicators, import error/retry states. Component map expanded to 36 entries |
| 2026-02-13 | Restructured Import as unified hub — Moved Binance sync/enrichment from Trade History to Import & Sync (`/import`). Added Binance tab features (#14-26). Trade History cleaned to pure data viewing. Total: 137 features |
| 2026-02-13 | v2.3 — Refined Trade History into 6 modules (43 features), removed deprecated/duplicate entries. Modules: Viewing (12), Enrichment (4), Notes/Tags/Screenshots (6), Sync & Data Management (13), Metrics/Visuals (7), External (1). Total: 133 features |
| 2026-02-13 | v3.0 — Added Section 4: Full System Phase Map. 15 phases covering 9 domains, 25+ pages, 336+ features, 26 edge functions. Phase dependency diagram and coverage summary included |
