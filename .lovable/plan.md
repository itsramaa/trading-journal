
# Update docs/FEATURE-MATRIX.md - Maximize Component Coverage

## Problem
Current FEATURE-MATRIX.md covers 31 Trader + 17 System = 48 features total, but misses significant sub-features from deep component analysis. Many wizard steps, enrichment drawer sections, Trade History tabs, sync sub-features, and UI indicators are not documented.

## Gap Analysis Summary
After auditing all components (TradeEntryWizard steps, TradeEnrichmentDrawer, TradeHistoryCard, BinanceFullSyncPanel, FeeHistoryTab, FundingHistoryTab, SolanaTradeImport, AllPositionsTable, etc.), **40+ features** are missing or insufficiently documented.

## Changes to docs/FEATURE-MATRIX.md

### Section 1: Trading Journal - Add/Expand

**New Trader/User Features (10 items):**

| # | Feature | Description |
|---|---------|-------------|
| 13 | Wizard: Isi Detail Setup (Step 1) | Pilih pair (combobox), direction, account, strategy, execution timeframe. Termasuk Binance account selection dan market context capture otomatis. |
| 14 | Wizard: Confluence Validation (Step 2) | Checklist dinamis dari strategy entry_rules. Termasuk AI Confluence Detection untuk auto-suggest checked items berdasarkan pair + timeframe. |
| 15 | Wizard: Position Sizing (Step 3) | Input Entry/SL/TP, risk % slider, position size calculator. Termasuk leverage tier warning dari Binance API dan paper account balance validation. |
| 16 | Wizard: Final Checklist (Step 4) | Emotional state selector, confidence slider, rule-following checkbox, trade comment. Termasuk AI Trade Quality Score real-time. |
| 17 | Wizard: Confirmation & Execute (Step 5) | Review summary semua data sebelum eksekusi. Menampilkan pair, direction, sizing, R:R, strategy, confluences, emotional state. |
| 18 | Upload Screenshot (Enrichment) | Drag & drop upload max 3 screenshot per trade dengan client-side compression. Bisa delete individual screenshot. |
| 19 | Request AI Trade Analysis (Enrichment) | Minta AI menganalisis trade secara on-demand. Hasil: overall assessment, win/loss factors, lessons, pattern recognition, confidence change. |
| 20 | Isi Trade Rating A-F (Enrichment) | Grade kualitas trade dari A (excellent) sampai F (poor) untuk review diri. |
| 21 | Isi Custom Tags (Enrichment) | Input tags comma-separated (breakout, news-driven, trend-following) untuk kategorisasi trade. |
| 22 | Isi Rule Compliance Checklist (Enrichment) | Checklist apakah trade mengikuti aturan yang ditetapkan. Termasuk lesson_learned text field. |

**New System Features (5 items):**

| # | Feature | Description |
|---|---------|-------------|
| 7 | Market Context Capture | Saat wizard dibuka, otomatis capture Fear&Greed Index, volatility, event risk. Disimpan sebagai `market_context` JSONB di trade entry. |
| 8 | Wizard Analytics Tracking | Track event wizard start, abandon (with last step + duration), dan complete ke analytics system. |
| 9 | Trade State Machine Display | Tampilkan badge state (OPENING, PARTIALLY_FILLED, ACTIVE, CLOSED, CANCELED, LIQUIDATED) di tabel posisi. |
| 10 | Live Time-in-Trade | Kolom duration yang auto-update setiap 60 detik menampilkan waktu sejak entry (e.g., 2h 30m, 1d 5h). |
| 11 | Read-Only Enforcement (Live/Binance) | Core trade data (price, qty, direction) locked untuk live/binance trades. Hanya journal fields yang editable. Tampil lock icon + notice. |

### Section 2: Trade History - Add/Expand

**New Trader/User Features (12 items):**

| # | Feature | Description |
|---|---------|-------------|
| 17 | Tab: Fees History | Tampilkan riwayat commission fee per trade dari local DB. Termasuk total summary, per-pair breakdown, fee trend. Requires Binance connected. |
| 18 | Tab: Funding History | Tampilkan riwayat funding rate payments. Breakdown earned vs paid, per-pair, funding trend. Requires Binance connected. |
| 19 | Sub-Tab: All/Binance/Paper | Pisahkan closed trades berdasarkan source (All, Binance only, Paper only) dengan badge count per tab. |
| 20 | Select Sync Range | Pilih rentang waktu sync: 30d, 90d, 6 bulan, 1 tahun, 2 tahun, atau All Time. Estimasi durasi ditampilkan per opsi. |
| 21 | Force Re-fetch Sync | Checkbox opsional saat Full Sync untuk hapus trades existing dan re-download semua data dari Binance. |
| 22 | Resume Interrupted Sync | Jika sync terganggu (close tab, error), resume dari checkpoint terakhir tanpa mulai ulang. Tampil jumlah symbols yang sudah diproses. |
| 23 | Discard Sync Checkpoint | Buang checkpoint dan mulai fresh sync dari awal. |
| 24 | Re-Sync Specific Date Range | Jika reconciliation mismatch, pilih range tanggal spesifik untuk re-sync hanya periode tersebut. |
| 25 | View Transaction on Solscan | Link eksternal ke Solscan untuk melihat detail transaksi on-chain (dari Trade History cards). |
| 26 | Expand/Collapse Notes | Notes di trade card bisa di-expand jika multi-line. Badge "Recently updated" muncul jika notes baru ditambahkan. |
| 27 | Clear All Filters | Banner FilterActiveIndicator dengan tombol clear semua filter sekaligus. Menampilkan jumlah filter aktif. |
| 28 | View Sync Quota | Lihat sisa quota sync harian (usage bar + remaining count). Warning jika mendekati limit. |

**New System Features (4 items):**

| # | Feature | Description |
|---|---------|-------------|
| 8 | Sync Quota Management | Track dan enforce daily sync quota. Block sync jika quota habis (reset midnight UTC). |
| 9 | Sync Checkpoint Persistence | Simpan checkpoint di Zustand store (global, persist across navigation). Track processed symbols dan current phase. |
| 10 | Partial Failure Handling | Jika beberapa symbols gagal saat sync, lanjutkan symbols lain. Tampilkan warning badge dengan daftar failed symbols. |
| 11 | Market Context Display | Tampilkan Fear&Greed badge dan Event Day badge di trade cards berdasarkan data `market_context` yang di-capture saat entry. |

### Section 3: Import Trades - Add/Expand

**New Trader/User Features (5 items):**

| # | Feature | Description |
|---|---------|-------------|
| 6 | Pilih Scan Limit | Pilih jumlah transaksi yang di-scan: 50, 100, atau 200. Default 50 untuk scan cepat. |
| 7 | Select All / Deselect All | Bulk select/deselect semua detected trades sekaligus. |
| 8 | View Transaction on Solscan | Link ke Solscan untuk verifikasi transaksi on-chain. |
| 9 | Scan Summary Stats | Lihat ringkasan: jumlah transaksi di-scan, trades ditemukan, trades terpilih. |
| 10 | Navigate to Journal | Setelah import selesai, tombol "View Journal" untuk langsung ke halaman Trading Journal. |

**New System Feature (1 item):**

| # | Feature | Description |
|---|---------|-------------|
| 5 | Import Progress Indicator | Tampilkan loading state dengan progress bar saat proses importing ke database berlangsung. |

## Result
- Trading Journal: dari 12+6 = **18** menjadi **22+11 = 33** features
- Trade History: dari 16+7 = **23** menjadi **28+11 = 39** features
- Import Trades: dari 5+4 = **9** menjadi **10+5 = 15** features
- **Total: dari 48 menjadi 87 features** (+81% coverage increase)

## Technical Notes
- Revision History akan diupdate dengan tanggal perubahan
- Penomoran ulang seluruh tabel agar sequential
- Cross-reference tetap dipertahankan
