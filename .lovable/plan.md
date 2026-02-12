
# UI/UX Overhaul — Modern Dashboard

**Status:** 🔄 In Progress

## Phase 1: Sidebar Navigation Restructure ✅

Consolidated sidebar from 6 groups → 4 groups + standalone items:

| Before | After |
|--------|-------|
| Market (4 items) | Market (4 items) — unchanged |
| Journal (3 items) | Journal (3 items) — unchanged |
| Risk (2 items) | → merged into **Tools** |
| Strategy (2 items) | → merged into **Tools** |
| Analytics (5 items) | Analytics (5 items) — unchanged |
| Settings (1 item) | → standalone at bottom |
| **New: Tools** | Risk Overview, Calculator, Strategies, Backtest |

## Phase 2: Dashboard Layout Cleanup ✅
- Improved visual hierarchy with 2-column grid layout
- Market Score (compact) + System Status side by side
- Risk Summary + ADL Risk side by side  
- Removed redundant section headers ("Risk & AI Insights")
- AI Insights output forced to English
- Cleaned up unused imports and i18n dependency

## Phase 3: Journal + History Page Merge (Pending)
- Combine Trading Journal + Trade History into tabbed single view

## Phase 4: Analytics Consolidation (Pending)
- Combine Performance, Daily P&L, Heatmap into tabbed analytics dashboard
