# Accounts Domain - Mode Consistency Refactor

## Status: ✅ COMPLETED

## Changes Made

### Accounts.tsx (Major Refactor)
- Removed all Tabs (Accounts/Transactions/Financial) — page is now a flat overview
- Unified layout: same structure for Paper and Live modes
- Unified summary cards (Balance, Accounts, Open Positions) with mode-aware subtitles
- Binance details moved to collapsible section (Live only)
- AccountCardList renders in both modes with correct filters
- AddAccountForm available in both modes with `defaultIsBacktest={showPaperData}`
- Fixed paper open trades query to filter by paper account IDs only
- Removed unused imports (Tabs, BinanceTransactionHistoryTab, FinancialSummaryCard, Wifi, CircleDollarSign)

### AccountDetail.tsx (Financial Tab Added)
- Added 4th "Financial" tab to TabsList
- Financial tab shows: Gross P&L, Net P&L, Fee Breakdown (Commission/Funding/Total), Capital Efficiency (Return on Capital, Fee Impact %)
- Works for both Paper and Live accounts using existing `stats` data
- Links to Performance page for detailed analytics
