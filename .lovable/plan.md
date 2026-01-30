
# Plan: Resizable Sidebar dengan Navigasi Domain-Based

## Ringkasan Perubahan

Mengubah arsitektur navigasi dari "grouped dengan banyak tabs" menjadi "flat domain-based dengan sidebar resizable". Dashboard akan berada di paling atas tanpa grouping, dan item-item yang sebelumnya di dalam tabs akan dipindahkan ke sidebar sebagai menu level pertama.

---

## Perubahan Struktur Navigasi

### Struktur Sidebar Baru (Flat, Domain-Based)

```text
+------------------------------------------+
| Trading Journey (Logo)                   |
+------------------------------------------+
| Dashboard                 /              |  <-- Standalone, tidak dalam group
+------------------------------------------+
| MARKET                                   |  <-- Group Header
|   AI Analysis             /market        |
|   Economic Calendar       /calendar      |
|   Market Data             /market-data   |
+------------------------------------------+
| JOURNAL                                  |
|   Trade Entry             /trading       |
|   Trade History           /history       |
+------------------------------------------+
| RISK                                     |
|   Risk Overview           /risk          |
|   Position Calculator     /calculator    |
+------------------------------------------+
| STRATEGY                                 |
|   My Strategies           /strategies    |
|   Backtest                /backtest      |
+------------------------------------------+
| ANALYTICS                                |
|   Performance Overview    /performance   |
|   Daily P&L               /daily-pnl     |
|   Heatmap                 /heatmap       |
|   AI Insights             /ai-insights   |
+------------------------------------------+
| ACCOUNTS                                 |
|   Account List            /accounts      |
+------------------------------------------+
| SETTINGS                                 |
|   Settings                /settings      |
+------------------------------------------+
| User Profile                             |
+------------------------------------------+
```

---

## Perubahan Teknis

### 1. Resizable Sidebar

**File:** `src/components/layout/DashboardLayout.tsx`

Menggunakan `ResizablePanelGroup` dari `react-resizable-panels` untuk membuat sidebar yang bisa di-resize secara horizontal.

```text
+----------------+---------------------------+
|                |                           |
|   Sidebar      |      Main Content         |
|   (resizable)  |                           |
|   min: 200px   |                           |
|   max: 320px   |                           |
|   default: 260px|                          |
|                |                           |
+----------------+---------------------------+
```

### 2. Struktur Navigasi Baru

**File:** `src/components/layout/AppSidebar.tsx`

- Dashboard di paling atas sebagai item standalone (tidak dalam group)
- 7 groups terpisah tanpa ampersand (&):
  - MARKET (3 items)
  - JOURNAL (2 items)
  - RISK (2 items)
  - STRATEGY (2 items)
  - ANALYTICS (4 items)
  - ACCOUNTS (1 item)
  - SETTINGS (1 item)

### 3. Halaman Baru (Pecahan dari Tabs)

Beberapa halaman baru yang dipecah dari tabs:

| Route Baru | Asal | Konten |
|------------|------|--------|
| `/calendar` | Market Insight tab | CalendarTab component |
| `/market-data` | Market Insight tab | MarketDataTab component |
| `/history` | Trading Journal tab | Trade History content |
| `/calculator` | Risk Management tab | PositionSizeCalculator |
| `/backtest` | Strategies tab | Backtest runner |
| `/daily-pnl` | Performance tab | Daily P&L content |
| `/heatmap` | Performance tab | TradingHeatmap |
| `/ai-insights` | Performance tab | AIPatternInsights |

### 4. Halaman yang Tetap Menggunakan Tabs (Minimal)

Beberapa halaman tetap menggunakan tabs karena konteksnya sangat terkait:

- **Trading Journal (`/trading`):** Tetap ada tabs untuk Binance/Paper positions karena ini adalah real-time data yang saling terkait
- **Market Insight (`/market`):** Menjadi AI Analysis saja, Calendar dan Market Data jadi halaman terpisah

---

## File yang Diubah

1. `src/components/layout/DashboardLayout.tsx` - Tambah ResizablePanelGroup
2. `src/components/layout/AppSidebar.tsx` - Struktur navigasi baru
3. `src/components/layout/NavGroup.tsx` - Penyesuaian untuk layout baru
4. `src/App.tsx` - Tambah routes baru

## File Baru

1. `src/pages/EconomicCalendar.tsx` - Halaman Calendar standalone
2. `src/pages/MarketData.tsx` - Halaman Market Data standalone
3. `src/pages/TradeHistory.tsx` - Halaman Trade History standalone
4. `src/pages/PositionCalculator.tsx` - Halaman Calculator standalone
5. `src/pages/Backtest.tsx` - Halaman Backtest standalone
6. `src/pages/DailyPnL.tsx` - Halaman Daily P&L standalone
7. `src/pages/TradingHeatmap.tsx` - Halaman Heatmap standalone
8. `src/pages/AIInsights.tsx` - Halaman AI Insights standalone

---

## Catatan Teknis

### Trade-offs

1. **Pro:** Navigasi lebih jelas, setiap fitur punya domain sendiri
2. **Pro:** Sidebar resizable memberikan kontrol kepada user
3. **Con:** Jumlah routes bertambah (dari 8 menjadi 16)
4. **Con:** Beberapa komponen perlu di-extract dari halaman yang ada

### Asumsi

1. Groups tidak menggunakan ampersand (&) - menggunakan nama domain tunggal
2. Dashboard standalone di paling atas
3. Sidebar width: min 200px, max 320px, default 260px
4. Resize handle visible dengan grip indicator

### Yang Tidak Diubah

- Floating AI Chatbot tetap ada
- Semua fitur dan fungsionalitas tetap sama
- Struktur komponen dalam `src/components/` tetap sama
- Hooks dan services tidak berubah
