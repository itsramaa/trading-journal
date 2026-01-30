
# Plan: Resizable Sidebar dengan Navigasi Domain-Based

## ✅ STATUS: COMPLETED

## Ringkasan Perubahan

Mengubah arsitektur navigasi dari "grouped dengan banyak tabs" menjadi "flat domain-based". Dashboard berada di paling atas tanpa grouping, dan item-item yang sebelumnya di dalam tabs dipindahkan ke sidebar sebagai menu level pertama.

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

## File yang Diubah

1. ✅ `src/components/layout/DashboardLayout.tsx` - Updated route titles
2. ✅ `src/components/layout/AppSidebar.tsx` - New domain-based navigation structure
3. ✅ `src/components/layout/NavGroup.tsx` - Simplified without group icons
4. ✅ `src/App.tsx` - Added all new routes

## File Baru

1. ✅ `src/pages/EconomicCalendar.tsx` - Halaman Calendar standalone
2. ✅ `src/pages/MarketData.tsx` - Halaman Market Data standalone
3. ✅ `src/pages/TradeHistory.tsx` - Halaman Trade History standalone
4. ✅ `src/pages/PositionCalculator.tsx` - Halaman Calculator standalone
5. ✅ `src/pages/Backtest.tsx` - Halaman Backtest standalone
6. ✅ `src/pages/DailyPnL.tsx` - Halaman Daily P&L standalone
7. ✅ `src/pages/TradingHeatmap.tsx` - Halaman Heatmap standalone
8. ✅ `src/pages/AIInsights.tsx` - Halaman AI Insights standalone

---

## Catatan Implementasi

- Dashboard standalone di paling atas (tidak dalam group)
- 7 groups terpisah tanpa ampersand (&): MARKET, JOURNAL, RISK, STRATEGY, ANALYTICS, ACCOUNTS, SETTINGS
- Group labels menggunakan uppercase, compact styling
- Collapsible groups dengan chevron rotation
- Existing shadcn sidebar tetap digunakan (tidak resizable, menggunakan icon collapse mode)
