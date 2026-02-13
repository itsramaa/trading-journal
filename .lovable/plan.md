
# Update docs/FEATURE-MATRIX.md — 100% Component Coverage

## Problem
Current matrix has 87 features but still misses granular sub-features from deep component audit. After reading every line of every component file, **30+ additional features** are not documented.

## Gap Analysis (Grouped by Page)

### Trading Journal — Missing Features

**Enrichment Drawer Sub-Features (currently lumped under #12):**
1. Link Multiple Strategies (toggle strategy badges on/off)
2. Isi 3-Timeframe System (Bias HTF / Execution / Precision LTF — separate from wizard timeframe)
3. View Post-Mortem Analysis (structured display: Entry Timing, Exit Efficiency, SL Placement, Strategy Adherence, What Worked, To Improve, Follow-up Actions)
4. View AI Analysis Results (collapsible: Overall Assessment, Win Factors, Loss Factors, Lessons, Pattern Recognition)
5. Isi Notes (dedicated textarea section in drawer)
6. Isi Emotional State (badge-based selector in drawer)

**AllPositionsTable Sub-Features:**
7. View Leverage Badge (Nx leverage indicator per position)
8. View CryptoIcon (per-symbol icon in table)
9. View P&L Percentage (unrealized PnL %)

**System:**
10. Currency Conversion Display (useCurrencyConversion hook applied globally)
11. Unified Position Mapping (mapToUnifiedPositions merges paper + binance into single table)

### Trade History — Missing Features

**Sync Engine Sub-Features:**
12. View Sync Reconciliation Report (click SyncStatusBadge → full dialog with P&L reconciliation, lifecycle stats, validation warnings, failed lifecycles, trade details)
13. View Sync Quality Score (Excellent/Good/Fair/Poor badge based on match rate)
14. View Sync ETA (estimated time remaining during sync)
15. View Sync Progress Phases (fetching-income → fetching-trades → grouping → aggregating → validating → inserting)
16. View Data Quality Summary Widget (health metrics: Valid Trades, P&L Accuracy, Lifecycle Completion, Sync Failures)
17. Sync Monitoring Panel (comprehensive dashboard: failure alerts, retry actions, reconciliation warnings, quick stats)
18. Retry Failed Sync (from error state or monitoring panel)

**Trade Card Sub-Features:**
19. View R:R Ratio with Tooltip
20. View Confluence Score with Tooltip
21. View Fee per Trade (inline, Binance only)
22. View Tags Display (tag badges on cards)
23. View Strategy Badges on Cards
24. View Screenshot Count Indicator
25. View Notes Indicator Badge
26. View "Recently Updated" Note Badge
27. View Needs Enrichment Badge (gallery card, AlertCircle indicator)
28. View AI Quality Score Badge (color-coded: green 80+, yellow 60-79, red <60)

**UI/UX Features:**
29. Filter Count Display (filtered count vs total: "3/47 Filtered")
30. Error State Display (failed to load trades with error message)
31. Empty State per Sub-Tab (different messages for Binance/Paper/All)
32. View "All trades loaded" / "x of y loaded" indicator
33. View "All trades enriched" badge (when no trades need enrichment)

### Import Trades — Missing Features

34. Error State with Retry (scan failed → "Failed to scan. Please try again.")
35. Scan More Transactions (if no results found, button to scan 200)
36. View Wallet Address Badge (truncated public key display)
37. View Trade Details per Row (pair, direction, program, timestamp, quantity, fees, PnL)
38. Importing Progress State (dedicated loading with progress bar)

## Changes to docs/FEATURE-MATRIX.md

### Section 1: Trading Journal
- Split enrichment #12 into 6 granular sub-features (#23-#28)
- Add 3 new position table features (#29-#31)
- Add 2 new system features (#12-#13)
- **Trader features: 22 → 31 (+9)**
- **System features: 11 → 13 (+2)**

### Section 2: Trade History
- Add 7 sync monitoring features (#29-#35)
- Add 10 trade card display features (#36-#45)
- Add 5 UI/UX features (#46-#50)
- Add 4 new system features (#12-#15)
- **Trader features: 28 → 50 (+22)**
- **System features: 11 → 15 (+4)**

### Section 3: Import Trades
- Add 5 new features (#11-#15)
- **Trader features: 10 → 15 (+5)**
- **System features: 5 → 5 (unchanged)**

### Component Coverage Map Update
- Add: `SyncStatusBadge`, `SyncReconciliationReport`, `SyncQualityIndicator`, `DataQualitySummary`, `SyncMonitoringPanel`, `SyncETADisplay`, `SyncRangeSelector`, `SyncQuotaDisplay`, `ReSyncTimeWindow`, `PostMortemSection`, `AIAnalysisDisplay`, `TradeTimeframeSection`, `WalletConnectButton`, `FearGreedBadge`, `EventDayBadge`, `RiskRewardTooltip`, `ConfluenceScoreTooltip`, `FilterActiveIndicator`, `CryptoIcon`, `LazyImage`

## Result Summary
- Trading Journal: 33 → 44 features
- Trade History: 39 → 65 features
- Import Trades: 15 → 20 features
- **Total: 87 → 129 features (+48% increase)**
- Component Coverage Map: 18 → 38 components

## Technical Notes
- Revision history updated
- All features traced to actual source components
- No assumed/planned features — only what exists in code
- Cross-references maintained
