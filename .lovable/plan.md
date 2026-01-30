

# Plan: Backtest Comparison View

## Overview

Menambahkan fitur untuk membandingkan hasil backtest dari multiple strategies secara side-by-side. Ini memungkinkan trader untuk dengan cepat melihat strategy mana yang memiliki performa terbaik berdasarkan berbagai metrik.

---

## Arsitektur Fitur

```text
Backtest Tab Structure (Updated)
├── Configuration Panel (existing)
├── Results View (existing)
└── Comparison View (NEW)
    ├── Strategy Selector (multi-select)
    ├── Side-by-Side Metrics Table
    ├── Overlay Equity Curves Chart
    └── Winner Indicators per Metric
```

---

## Komponen yang Dibuat

### 1. `src/components/strategy/BacktestComparison.tsx`

**Purpose:** Komponen utama untuk comparison view

**UI Elements:**
- Multi-select strategy picker (pilih 2-4 backtest results)
- Side-by-side metrics comparison table
- Overlay equity curves (multiple lines, satu warna per strategy)
- "Best" indicator dengan ikon crown/star untuk setiap metrik
- Quick summary: strategy terbaik berdasarkan kriteria user

**Features:**
- Sort by any metric
- Highlight winner per metric
- Color-coded equity curves
- Export comparison report

---

## Modifikasi Files Existing

### 1. `src/pages/trading-journey/StrategyManagement.tsx`

**Changes:**
- Menambahkan sub-tabs di dalam Backtest tab:
  - `[Run Backtest] [History] [Compare]`
- Compare tab menampilkan `BacktestComparison` component

### 2. `src/hooks/use-backtest.ts`

**Changes:**
- Memastikan `useBacktestHistory` sudah join dengan strategy name
- Sudah cukup untuk comparison (tidak perlu perubahan signifikan)

### 3. `src/types/backtest.ts`

**Additions:**
- Type untuk comparison data tidak diperlukan (gunakan existing BacktestResult[])

---

## Detail Implementasi

### `BacktestComparison.tsx` Structure

```text
┌─────────────────────────────────────────────────────────────────────┐
│  COMPARE BACKTEST RESULTS                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Select Backtests to Compare (2-4):                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [✓] Strategy A - BTC - Dec 2025 (+15.2%)                      │  │
│  │ [✓] Strategy B - BTC - Dec 2025 (+8.7%)                       │  │
│  │ [✓] Strategy C - ETH - Dec 2025 (+22.1%)                      │  │
│  │ [ ] Strategy A - ETH - Nov 2025 (+5.3%)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ METRICS COMPARISON ─────────────────────────────────────────┐  │
│  │                   │ Strategy A  │ Strategy B  │ Strategy C  │  │
│  │───────────────────│─────────────│─────────────│─────────────│  │
│  │ Total Return      │ +15.2%      │ +8.7%       │ +22.1% 🏆   │  │
│  │ Win Rate          │ 62% 🏆      │ 55%         │ 58%         │  │
│  │ Max Drawdown      │ -8.5%       │ -12.3%      │ -6.2% 🏆    │  │
│  │ Sharpe Ratio      │ 1.45 🏆     │ 0.92        │ 1.38        │  │
│  │ Profit Factor     │ 2.1 🏆      │ 1.5         │ 1.8         │  │
│  │ Total Trades      │ 45          │ 32          │ 28          │  │
│  │ Avg Win           │ $85         │ $120 🏆     │ $95         │  │
│  │ Avg Loss          │ -$40 🏆     │ -$65        │ -$52        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ EQUITY CURVES (OVERLAY) ────────────────────────────────────┐  │
│  │                                                               │  │
│  │  $15k ─┐                                    Strategy A ───    │  │
│  │        │        ╭───╮                       Strategy B ---    │  │
│  │        │    ╭──╯    ╰──╮    ╭───────╮       Strategy C ...    │  │
│  │  $10k ─┼───╯            ╰──╯                                  │  │
│  │        │                                                      │  │
│  │   $5k ─┤                                                      │  │
│  │        └────────────────────────────────────────────────────  │  │
│  │             Dec        Jan         Feb         Mar            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Export Comparison PDF]                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Metric Comparison Logic

```text
Untuk setiap metrik, tentukan "winner" dengan logic:
- Total Return: highest = best
- Win Rate: highest = best  
- Max Drawdown: lowest (least negative) = best
- Sharpe Ratio: highest = best
- Profit Factor: highest = best
- Avg Win: highest = best
- Avg Loss: lowest (least negative) = best
- Consecutive Losses: lowest = best
```

### Color Scheme untuk Equity Curves

```text
Strategy 1: Primary (blue)
Strategy 2: Success (green)
Strategy 3: Warning (orange)
Strategy 4: Destructive (red)
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/strategy/BacktestComparison.tsx` | Main comparison component |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/trading-journey/StrategyManagement.tsx` | Add sub-tabs for Backtest: Run / History / Compare |
| `src/hooks/use-backtest.ts` | Add strategy name join in useBacktestHistory |
| `src/hooks/use-backtest-export.ts` | Add exportComparisonToPDF function |

---

## Implementation Details

### Strategy Name Resolution

Saat ini `useBacktestHistory` tidak menginclude strategy name. Akan ditambahkan join untuk mendapatkan nama strategy dari relasi.

### Chart Implementation

Menggunakan Recharts `LineChart` dengan multiple `Line` components, masing-masing dengan warna berbeda. Legend akan menampilkan nama strategy dengan warna yang sesuai.

### Responsive Design

- Desktop: Table dengan semua kolom visible
- Mobile: Horizontal scroll untuk table, stacked cards sebagai alternatif

---

## Export Comparison

Menambahkan fungsi `exportComparisonToPDF` di `use-backtest-export.ts`:
- Multi-column metrics table
- Overlay equity curves sebagai image (simplified)
- Winner summary di akhir

---

## Summary

| Category | Count |
|----------|-------|
| Files Created | 1 |
| Files Modified | 3 |

**Total Changes: 4 files**

