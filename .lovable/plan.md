

# Create docs/FEATURE-MATRIX.md

## Overview
Create a comprehensive feature matrix document covering all features, functions, and business processes for the **Trading Journal**, **Trade History**, and **Import Trade** pages, structured per page and per actor (Trader/User vs System).

## File to Create
`docs/FEATURE-MATRIX.md`

## Content Structure

The document will be organized into 3 main sections (one per page), each containing:
1. **Trader/User Features** - actions initiated by the user
2. **System Features** - automated processes triggered by the system

Each feature entry in the table will have columns:
- Nama Fitur / Fungsi
- Aktor
- Tujuan / Outcome
- Flow / Alur Singkat
- Precondition
- Postcondition
- Catatan / Masalah

### Section 1: Trading Journal (/trading)
**Trader/User features (12 items):**
- Buat Trade Baru (Wizard Full/Express Mode)
- Lihat Summary Stats (Open Positions, Unrealized/Realized P&L)
- Lihat Pending Orders (Paper + Binance Open Orders)
- Lihat Active Positions (Paper + Binance)
- Close Position Manual (Paper mode)
- Edit Position (SL/TP/Notes)
- Enrich Trade (Strategy, Screenshots, Timeframes, Rating, Notes via Drawer)
- Delete Trade (Soft delete with recovery)
- Switch Tab Pending/Active
- Cancel Binance Open Order (from Pending tab)
- Toggle Trade Mode (Paper/Live via header selector)
- Dismiss Pro Tip

**System features (6 items):**
- Mode Isolation (filter trades by active trade_mode)
- Trading Gate (block wizard if daily loss limit reached)
- AI Pre-flight Check (validate edge before entry in Full mode)
- Post-Trade AI Analysis (auto-trigger on close)
- Real-time Binance Data Fetch (positions, orders, balance)
- P&L Calculation (direction-aware on close)

### Section 2: Trade History (/history)
**Trader/User features (14 items):**
- Lihat Closed Trades (List/Gallery view toggle)
- Filter by Date Range
- Filter by Result (Win/Loss/BE)
- Filter by Direction (Long/Short)
- Filter by Strategy
- Filter by Pair
- Filter by Session (Asia/London/NY)
- Sort by AI Score
- Export CSV
- Enrich Trade (via Drawer)
- Quick Note (inline)
- Delete Trade (Soft delete)
- Trigger Incremental Sync
- Trigger Full Sync (Binance)
- Trigger Batch Enrichment (Binance trades needing data)
- Load More (Infinite scroll)

**System features (7 items):**
- Server-Side Stats (RPC get_trade_stats)
- Cursor-Based Pagination
- Mode Isolation (tradeMode filter)
- Auto Incremental Sync on mount
- Binance Source Filter (user settings)
- Stale Sync Detection
- Trades Needing Enrichment Count

### Section 3: Import Trades (/import)
**Trader/User features (5 items):**
- Connect Solana Wallet
- Scan Wallet for Trades
- Review Detected Trades (select/deselect)
- Import Selected Trades
- Reset/Scan Again

**System features (4 items):**
- DEX Auto-Detection (Deriverse, Drift, Zeta, Mango)
- Duplicate Protection (signature-based)
- PnL Calculation (token balance analysis)
- Direction/Pair/Quantity Extraction

## Technical Notes
- Format: Markdown tables with 7 columns per feature
- Language: Mixed (feature names in Indonesian-friendly English, descriptions in Bahasa Indonesia for consistency with user preference)
- Each section will have a brief intro paragraph describing the page's purpose
- Cross-references to existing docs (DATABASE.md, USER_SCENARIOS.md) where relevant

