# Feature Matrix — Trading Journal, Trade History, Import Trade

> Dokumen ini adalah referensi lengkap fitur, fungsi, dan proses bisnis untuk tiga halaman utama aplikasi Trading Journal. Disusun per halaman dan per aktor (Trader/User vs System).  
> Cross-ref: [DATABASE.md](./DATABASE.md) · [USER_SCENARIOS.md](./USER_SCENARIOS.md)

---

## 1. Trading Journal (`/trading`)

Halaman utama untuk membuat, memantau, dan mengelola trade aktif. Mendukung Paper Trading (manual entry) dan Live Trading (Binance Futures) dengan isolasi data ketat.

### 1.1 Trader/User Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Buat Trade Baru (Wizard Full/Express Mode) | Trader | Mencatat entry trade baru ke journal | Klik "New Trade" → Pilih mode (Full 5-step / Express 3-step) → Isi pair, direction, entry price, quantity → (Full: AI Pre-flight) → Confirm → Simpan | Mode = Paper; User logged in; Strategy minimal 1 tersedia (Full mode) | Trade tersimpan dengan status `open`, `trade_mode` & `trade_style` terkunci immutable | Tombol hanya muncul di Paper mode. Live mode menampilkan badge "Live Mode — trades via exchange" |
| 2 | Lihat Summary Stats | Trader | Melihat ringkasan operasional: jumlah posisi terbuka, unrealized & realized P&L | Buka halaman → Stats cards otomatis ter-render dari data trades + Binance API | User logged in; Trades tersedia | Tampil 3 kartu: Open Positions, Unrealized P&L, Realized P&L | Angka Binance hanya muncul jika connected di Live mode |
| 3 | Lihat Pending Orders | Trader | Melihat order yang belum tereksekusi (paper drafts + Binance open orders) | Klik tab "Pending" → Lihat tabel gabungan paper pending + exchange orders | User logged in; Tab Pending aktif | Tabel menampilkan pending trades dengan badge count di tab | Paper pending = trades tanpa entry_price atau entry_price = 0 |
| 4 | Lihat Active Positions | Trader | Memantau posisi yang sedang berjalan secara real-time | Klik tab "Active" → Lihat tabel unified (paper + Binance positions) | User logged in; Tab Active aktif | Tabel menampilkan posisi aktif dengan live Time-in-Trade & Fees | Default tab saat halaman dibuka |
| 5 | Close Position Manual | Trader | Menutup posisi paper trade dengan exit price manual | Klik Close pada posisi → Isi exit price & fees → Confirm | Mode = Paper; Posisi berstatus `open` | Status berubah ke `closed`; P&L dihitung (direction-aware); AI Post-Trade Analysis ter-trigger | Tidak tersedia untuk Binance positions (read-only) |
| 6 | Edit Position (SL/TP/Notes) | Trader | Mengubah Stop Loss, Take Profit, atau catatan pada posisi aktif | Klik Edit → Dialog terbuka dengan form SL/TP/Notes → Save | Posisi berstatus `open` | Data SL/TP/Notes terupdate di database | Field entry price, direction, quantity tetap read-only untuk source: binance |
| 7 | Enrich Trade (Drawer) | Trader | Menambahkan konteks profesional: strategy, screenshots, timeframes, rating, notes | Klik ikon Enrich → Drawer terbuka → Isi data enrichment → Save | Trade tersedia (open/closed) | Trade diperkaya dengan strategy_snapshot, timeframes (3-tier), trade_rating (A-F), lesson_learned | Mencakup AI Post-Mortem section untuk closed trades |
| 8 | Delete Trade (Soft Delete) | Trader | Menghapus trade dari tampilan aktif dengan opsi recovery | Klik Delete → Confirm dialog → Soft delete | Trade tersedia; User logged in | `deleted_at` terisi; Trade hilang dari tampilan; Recoverable via Settings > Deleted Trades (30 hari) | Bukan permanent delete |
| 9 | Switch Tab Pending/Active | Trader | Berpindah antara tampilan pending orders dan active positions | Klik tab "Pending" atau "Active" | Halaman Trading Journal terbuka | Tab aktif berubah; Tabel ter-render sesuai konteks | Badge count dinamis per tab |
| 10 | Cancel Binance Open Order | Trader | Membatalkan open order di Binance langsung dari journal | Di tab Pending → Klik Cancel pada Binance order → Confirm | Mode = Live; Binance connected; Order masih aktif di exchange | Order dibatalkan di Binance; Tabel ter-refresh | Melalui BinanceOpenOrdersTable component |
| 11 | Toggle Trade Mode (Paper/Live) | Trader | Mengubah konteks trading antara simulasi dan live | Klik TradeModeSelector di header → Pilih Paper atau Live | User logged in | `active_trade_mode` tersimpan di user_settings; Seluruh data, stats, dan visibilitas ter-filter ulang | Persistent across sessions; Amber SIMULATION banner di Paper mode |
| 12 | Dismiss Pro Tip | Trader | Menyembunyikan tips bantuan secara permanen | Klik dismiss/close pada QuickTip component | Pro tip sedang ditampilkan | State tersimpan di localStorage (`trading_journal_tip`); Tip tidak muncul lagi | One-time dismissal |

### 1.2 System Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Mode Isolation | System | Memastikan data Paper dan Live tidak tercampur | Setiap query/render → `useModeFilteredTrades` filter by `trade_mode` → Hanya data sesuai mode aktif yang ditampilkan | `active_trade_mode` tersedia di user_settings | Data terisolasi sempurna; Stats akurat per mode | Legacy trades tanpa trade_mode di-map: source='binance' → live, lainnya → paper |
| 2 | Trading Gate | System | Mencegah overtrading saat daily loss limit tercapai | Saat wizard dibuka → Cek daily P&L vs risk profile → Jika limit tercapai → Wizard diblokir dengan peringatan | Risk profile ter-konfigurasi; `max_daily_loss_percent` tersedia | Wizard disabled jika limit terlampaui; User mendapat feedback visual | Berdasarkan `daily_risk_snapshots` dan Binance balance |
| 3 | AI Pre-flight Check | System | Memvalidasi edge/setup sebelum entry (Full mode only) | Di wizard step Pre-flight → Kirim data setup ke AI → Evaluasi EV/R → Return verdict: Proceed/Caution/Skip | Full mode wizard; Strategy & pair terisi | Verdict ditampilkan; Jika SKIP → tombol Next disabled (bypass tersedia) | Scoring: Win Rate 40%, PF 30%, Consistency 20%, Sample Size 10% |
| 4 | Post-Trade AI Analysis | System | Menganalisis kualitas trade setelah ditutup secara otomatis | Trade di-close → `analyzeClosedTrade(tradeId)` ter-trigger async → AI evaluasi Entry Timing, Exit Efficiency, SL Placement, Strategy Adherence | Trade baru saja di-close; AI service tersedia | `post_trade_analysis` JSONB terisi di trade entry; Tersedia di Enrichment Drawer | Fire-and-forget (error di-catch, tidak blocking) |
| 5 | Real-time Binance Data Fetch | System | Menyediakan data posisi, order, dan balance terkini dari Binance | Halaman mount → Hooks fetch: `useBinancePositions`, `useBinanceOpenOrders`, `useBinanceBalance` → Data ter-render | Mode = Live; Binance credentials valid & connected | UI menampilkan data exchange real-time | Hanya fetch jika `showExchangeData = true` |
| 6 | P&L Calculation (on Close) | System | Menghitung profit/loss secara akurat berdasarkan direction | Close position → Hitung: LONG = (exit - entry) × qty - fees; SHORT = (entry - exit) × qty - fees | Exit price & fees tersedia | `pnl` dan `realized_pnl` tersimpan di trade entry | Direction-aware; Fees dikurangi dari gross P&L |

---

## 2. Trade History (`/history`)

Halaman untuk melihat, menganalisis, dan mengelola riwayat trade yang sudah ditutup. Mendukung filtering lanjutan, sinkronisasi Binance, dan export data.

### 2.1 Trader/User Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Lihat Closed Trades (List/Gallery) | Trader | Melihat riwayat trade dalam format list atau gallery | Buka halaman → Toggle view mode (List/Gallery) → Browse trades | User logged in; Minimal 1 closed trade | Trades ditampilkan sesuai format pilihan dengan stats summary | Gallery view menampilkan card-based layout |
| 2 | Filter by Date Range | Trader | Menyaring trades berdasarkan periode waktu | Pilih start date & end date di date picker → Tabel ter-filter | Halaman History terbuka | Hanya trades dalam range ditampilkan; Stats ter-recalculate server-side | — |
| 3 | Filter by Result | Trader | Menyaring trades berdasarkan outcome (Win/Loss/BE) | Pilih filter result → Tabel ter-filter | Halaman History terbuka | Hanya trades dengan result terpilih ditampilkan | BE = Breakeven (P&L mendekati 0) |
| 4 | Filter by Direction | Trader | Menyaring trades berdasarkan arah (Long/Short) | Pilih filter direction → Tabel ter-filter | Halaman History terbuka | Hanya trades dengan direction terpilih ditampilkan | — |
| 5 | Filter by Strategy | Trader | Menyaring trades berdasarkan strategi yang digunakan | Pilih strategy dari dropdown → Tabel ter-filter | Halaman History terbuka; Minimal 1 strategy tersedia | Hanya trades terkait strategy terpilih ditampilkan | Via `trade_entry_strategies` junction table |
| 6 | Filter by Pair | Trader | Menyaring trades berdasarkan trading pair | Pilih pair dari dropdown → Tabel ter-filter | Halaman History terbuka | Hanya trades dengan pair terpilih ditampilkan | — |
| 7 | Filter by Session | Trader | Menyaring trades berdasarkan sesi trading (Asia/London/NY) | Pilih session → Tabel ter-filter | Halaman History terbuka | Hanya trades dari sesi terpilih ditampilkan | Sesi berbasis UTC: Asia 20:00-05:00, London 08:00-17:00, NY 13:00-22:00 |
| 8 | Sort by AI Score | Trader | Mengurutkan trades berdasarkan skor kualitas AI | Klik sort toggle AI Score → Tabel ter-sort | Halaman History terbuka; Trades memiliki `ai_quality_score` | Trades diurutkan ascending/descending by AI score | Trades tanpa score ditampilkan di akhir |
| 9 | Export CSV | Trader | Mengekspor data trade history ke file CSV | Klik Export → CSV ter-generate → Download otomatis | Halaman History terbuka; Minimal 1 trade | File CSV terunduh dengan data sesuai filter aktif | Mengikuti filter & mode yang aktif |
| 10 | Enrich Trade (via Drawer) | Trader | Menambahkan konteks profesional pada closed trade | Klik Enrich → Drawer terbuka → Isi enrichment data → Save | Trade tersedia di history | Trade diperkaya; AI Post-Mortem tersedia untuk review | Sama dengan Enrichment di Trading Journal |
| 11 | Quick Note (inline) | Trader | Menambahkan catatan singkat langsung dari tabel | Klik note icon → Input inline → Save | Trade tersedia di history | `notes` field terupdate tanpa membuka drawer | Fast-path untuk catatan ringan |
| 12 | Delete Trade (Soft Delete) | Trader | Menghapus trade dari history dengan opsi recovery | Klik Delete → Confirm → Soft delete | Trade tersedia di history | `deleted_at` terisi; Recoverable 30 hari via Settings | Konsisten dengan soft-delete di Trading Journal |
| 13 | Trigger Incremental Sync | Trader | Menyinkronkan trade terbaru dari Binance | Klik Sync → Incremental sync berjalan → Trades baru masuk | Mode = Live; Binance connected | Trades baru dari Binance tersimpan di local DB | Hanya fetch trades setelah last sync checkpoint |
| 14 | Trigger Full Sync (Binance) | Trader | Menyinkronkan seluruh riwayat trade dari Binance | Klik Full Sync → Confirm → Full sync berjalan | Mode = Live; Binance connected; Quota tersedia | Seluruh trade history dari Binance tersinkron | Rate-limited; Quota harian terbatas (`sync_quota_usage`) |
| 15 | Trigger Batch Enrichment | Trader | Memperkaya batch trade Binance yang data-nya belum lengkap | Klik Enrich All → Batch process berjalan | Trades dengan direction='UNKNOWN' atau entry_price=0 tersedia | Trades ter-enrich dengan data lengkap dari Binance API | Badge count "Needs Enrichment" muncul di UI |
| 16 | Load More (Infinite Scroll) | Trader | Memuat lebih banyak trades saat scroll ke bawah | Scroll ke bawah → Intersection observer trigger → Fetch next page | Lebih banyak trades tersedia di server | Page berikutnya ter-append ke list | Cursor-based, bukan offset-based |

### 2.2 System Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Server-Side Stats (RPC) | System | Menghitung statistik akurat terlepas dari pagination | Filter berubah → Call RPC `get_trade_stats` dengan parameter filter → Return aggregated stats | User logged in; Database tersedia | Stats (P&L, win rate, total trades, PF) akurat di level server | Mencegah inkonsistensi dari client-side calculation |
| 2 | Cursor-Based Pagination | System | Memuat data secara efisien tanpa skip/offset issues | Request page → Kirim cursor (last item ID) → Server return next batch + new cursor | Data tersedia di database | Batch trades ter-load; Cursor tersimpan untuk next request | Lebih reliable dari offset pagination untuk large datasets |
| 3 | Mode Isolation | System | Memfilter history berdasarkan trade_mode aktif | Query trades → Filter by `trade_mode` = active mode → Return filtered set | `active_trade_mode` tersedia | Hanya trades dari mode aktif yang ditampilkan dan dihitung | Konsisten dengan Trading Journal isolation |
| 4 | Auto Incremental Sync on Mount | System | Otomatis sync trades terbaru saat halaman dibuka | Halaman mount → Cek last sync time → Jika stale → Auto trigger incremental sync | Mode = Live; Binance connected | Data terbaru dari exchange tersedia tanpa manual trigger | Threshold staleness configurable |
| 5 | Binance Source Filter | System | Menghormati preferensi user soal sumber data Binance | Load settings → Cek `use_binance_history` flag → Filter/include Binance trades accordingly | User settings tersedia | Trades ditampilkan sesuai preferensi sumber data user | Dari `user_settings.use_binance_history` |
| 6 | Stale Sync Detection | System | Mendeteksi dan memberi tahu jika data sync sudah kadaluarsa | Cek last sync timestamp → Bandingkan dengan threshold → Tampilkan warning jika stale | Binance connected; Last sync timestamp tersedia | Warning visual muncul jika data sudah lama tidak di-sync | Mendorong user untuk trigger sync |
| 7 | Trades Needing Enrichment Count | System | Menghitung dan menampilkan jumlah trades yang belum lengkap datanya | Query trades where direction='UNKNOWN' OR entry_price=0 → Count → Tampilkan badge | Trades dari Binance sync tersedia | Badge count muncul di UI; User aware ada trades yang perlu enrichment | Flag berdasarkan data integrity policy |

---

## 3. Import Trades (`/import`)

Halaman untuk mengimpor trade on-chain dari wallet Solana. Mendukung auto-detection DEX dan proteksi duplikat berbasis signature.

### 3.1 Trader/User Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | Connect Solana Wallet | Trader | Menghubungkan wallet Solana untuk scanning trades | Klik Connect Wallet → Pilih wallet provider (Phantom/Solflare) → Approve connection | Wallet extension terinstall di browser | Wallet terhubung; Public key tersedia untuk scanning | Menggunakan Wallet Standard auto-detection |
| 2 | Scan Wallet for Trades | Trader | Memindai riwayat transaksi wallet untuk mendeteksi trades | Klik Scan → Sistem fetch transaction history → Parse & detect DEX interactions | Wallet connected; Public key tersedia | Daftar detected trades ditampilkan untuk review | Scan via Solana JSON-RPC `getSignaturesForAddress` |
| 3 | Review Detected Trades | Trader | Meninjau dan memilih trades yang akan diimpor | Lihat daftar trades → Select/deselect individual trades → Review detail (pair, direction, P&L) | Scan selesai; Minimal 1 trade terdeteksi | User memiliki daftar final trades untuk diimpor | Already-imported trades otomatis di-skip |
| 4 | Import Selected Trades | Trader | Mengimpor trades terpilih ke dalam journal | Klik Import → Trades tersimpan ke database → Konfirmasi sukses | Minimal 1 trade terpilih; User logged in | Trades tersimpan di `trade_entries` dengan source='solana'; Muncul di Trade History | `trade_mode` di-set sesuai mode aktif saat import |
| 5 | Reset / Scan Again | Trader | Membersihkan hasil scan dan memulai ulang proses | Klik Reset → State ter-clear → Kembali ke initial state | Proses scan/review sedang berlangsung | State kembali ke awal; Siap untuk scan ulang | Berguna jika wallet berganti atau perlu refresh |

### 3.2 System Features

| # | Nama Fitur / Fungsi | Aktor | Tujuan / Outcome | Flow / Alur Singkat | Precondition | Postcondition | Catatan / Masalah |
|---|----------------------|-------|-------------------|---------------------|--------------|---------------|-------------------|
| 1 | DEX Auto-Detection | System | Mengidentifikasi protokol DEX dari transaksi on-chain | Parse transaction → Match program IDs → Identify DEX (Deriverse, Drift, Zeta, Mango) | Transaction data tersedia | Setiap trade ditandai dengan DEX asal | Deriverse & Deriverse Perps = Primary; Drift, Zeta, Mango = Supported |
| 2 | Duplicate Protection | System | Mencegah import trade yang sudah pernah diimpor | Cek transaction signature → Compare dengan existing `binance_trade_id` di DB → Skip jika sudah ada | Trades terdeteksi; Database tersedia | Duplicates otomatis di-filter dari daftar review | Signature-based matching (unique per transaction) |
| 3 | PnL Calculation | System | Menghitung profit/loss dari data token balance on-chain | Analisis perubahan token balance pre & post transaction → Hitung selisih → Convert ke nilai | Transaction data lengkap dengan token transfers | P&L tersedia per trade yang terdeteksi | Token balance analysis; Akurasi tergantung kelengkapan data on-chain |
| 4 | Direction/Pair/Quantity Extraction | System | Mengekstrak metadata trade dari transaksi on-chain | Parse instruction data → Identify token pair → Determine direction (Long/Short) → Extract quantity | Transaction berhasil di-parse oleh DEX detector | Setiap trade memiliki pair, direction, dan quantity yang terisi | Jika gagal extract → direction='UNKNOWN', entry_price=0 (flag enrichment) |

---

## Appendix

### Legend Aktor
- **Trader** — End user yang menggunakan aplikasi untuk trading journal
- **System** — Proses otomatis yang berjalan tanpa intervensi user

### Cross-References
- Schema database: [`docs/DATABASE.md`](./DATABASE.md)
- Skenario pengguna detail: [`docs/USER_SCENARIOS.md`](./USER_SCENARIOS.md)
- Frontend architecture: [`docs/FRONTEND.md`](./FRONTEND.md)
- Backend architecture: [`docs/BACKEND.md`](./BACKEND.md)

### Revision History
| Tanggal | Perubahan |
|---------|-----------|
| 2026-02-13 | Initial creation — 31 Trader features, 17 System features across 3 pages |
