# Scope Coverage Map

Pemetaan 13 scope item ke komponen dan file implementasi.

---

## 1. Total PnL Tracking with Visual Performance Indicators

| Item | File |
|------|------|
| RPC | `get_trade_stats` → `total_pnl_net`, `total_pnl_gross` |
| Hook | `src/hooks/use-trade-stats.ts` |
| UI | `src/components/performance/PerformanceKeyMetrics.tsx` — Total P&L card |
| Visual | 7-Day Stats (Best/Worst Day) di `src/components/performance/SevenDayStats.tsx` |

## 2. Complete Trading Volume and Fee Analysis

| Item | File |
|------|------|
| RPC | `get_trade_stats` → `total_fees`, `total_commission`, `total_funding_fees` |
| Hook | `src/hooks/use-trade-stats.ts` |
| UI | `src/components/performance/PerformanceKeyMetrics.tsx` — Profit Factor card |
| Fee Breakdown | Tooltip di metric cards, cumulative fee tracking di Account Detail |

## 3. Win Rate Statistics and Trade Count Metrics

| Item | File |
|------|------|
| RPC | `get_trade_stats` → `win_rate`, `win_count`, `loss_count`, `total_trades` |
| Hook | `src/hooks/use-trade-stats.ts` |
| UI | `src/components/performance/PerformanceKeyMetrics.tsx` — Win Rate card dengan progress bar |

## 4. Average Trade Duration Calculations

| Item | File |
|------|------|
| DB Field | `trade_entries.hold_time_minutes` |
| UI | `src/components/performance/TradingBehaviorSection.tsx` — Avg Trade Duration card (mean, median, shortest, longest) |

## 5. Long/Short Ratio Analysis with Directional Bias Tracking

| Item | File |
|------|------|
| UI | `src/components/performance/TradingBehaviorSection.tsx` — Long/Short Ratio card |
| Metrics | Win Rate per direction, P&L per direction, visual ratio bar |

## 6. Largest Gain/Loss Tracking for Risk Management

| Item | File |
|------|------|
| UI | `src/components/performance/ExtremeOutcomesSection.tsx` |
| Metrics | Largest Gain (+$), Largest Loss ($) dengan TrendingUp/Down icons |

## 7. Average Win/Loss Amount Analysis

| Item | File |
|------|------|
| RPC | `get_trade_stats` → `avg_win`, `avg_loss`, `avg_pnl_per_trade` |
| UI | `src/components/performance/PerformanceKeyMetrics.tsx` — Expectancy card |

## 8. Symbol-specific Filtering and Date Range Selection

| Item | File |
|------|------|
| UI | `src/components/performance/PerformanceFilters.tsx` |
| Filters | Analytics Level Selector (Overall/By Type/By Exchange/Per Account), Date Range picker, Strategy filter |
| Trade History | `src/pages/TradeHistory.tsx` — Symbol filter, session filter, result filter |

## 9. Historical PnL Charts with Drawdown Visualization

| Item | File |
|------|------|
| Equity Curve | `src/components/performance/EquityCurveChart.tsx` — Cumulative P&L over time |
| Drawdown | `src/components/performance/DrawdownChart.tsx` — Max Drawdown % chart |

## 10. Time-based Performance Metrics

| Item | File |
|------|------|
| Day-of-Week | `src/components/performance/WinRateByDayChart.tsx` — Best/Worst day indicators |
| Session-based | `src/components/performance/SessionPerformance.tsx` — Asia/London/NY breakdown |
| Session Utils | `src/lib/session-utils.ts` — UTC-based session definitions |
| Heatmap | `src/pages/Heatmap.tsx` — Time-of-day analysis |

## 11. Detailed Trade History Table with Annotation Capabilities

| Item | File |
|------|------|
| Page | `src/pages/TradeHistory.tsx` |
| Table | `src/components/trade-history/TradeHistoryTable.tsx` |
| Annotations | `src/components/trade/TradeEnrichmentDrawer.tsx` — Notes, ratings, lesson learned, rule compliance |
| Pagination | Server-side via `get_trade_stats` RPC |

## 12. Fee Composition Breakdown and Cumulative Fee Tracking

| Item | File |
|------|------|
| RPC | `get_trade_stats` → `total_commission`, `total_funding_fees`, `total_fees` |
| UI | Tooltip breakdowns di Performance cards |
| Account Detail | `src/components/accounts/detail/CostBreakdownCard.tsx` — Commission vs Funding split |

## 13. Order Type Performance Analysis

| Item | File |
|------|------|
| DB Field | `trade_entries.entry_order_type` (market/limit/stop_limit) |
| UI | `src/components/performance/TradingBehaviorSection.tsx` — Order Type Performance card |
| Metrics | Win rate dan P&L per order type |

---

**Status: 13/13 ✅ — Semua scope item telah diimplementasikan.**
