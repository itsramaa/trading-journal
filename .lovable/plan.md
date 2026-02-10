
# Plan: Create `docs/USER_SCENARIOS.md`

## Overview

Membuat file dokumentasi resmi yang berisi seluruh user scenario untuk **Trading Journal** dan **Trade History**, berdasarkan analisis mendalam dari kode aktual di codebase.

## File yang Dibuat

| File | Action |
|------|--------|
| `docs/USER_SCENARIOS.md` | **CREATE** |

## Struktur Dokumen

Dokumen akan mencakup **22+ user scenarios** yang dikelompokkan menjadi dua modul utama, dengan format standar per scenario:

```text
Scenario ID > Judul > Precondition > Steps > Expected Result > Components Involved > Hooks Involved
```

### Bagian 1: Trading Journal Scenarios (12 scenarios)

| ID | Scenario | Deskripsi Singkat |
|----|----------|-------------------|
| TJ-01 | Create Trade (Full Mode) | 5-step wizard: Setup, Confluence, Position Sizing, Checklist, Confirmation |
| TJ-02 | Create Trade (Express Mode) | 2-step simplified entry for quick logging |
| TJ-03 | AI Pre-Flight Gate (SKIP) | Trading gate blocks entry when AI verdict = SKIP |
| TJ-04 | AI Pre-Flight Gate (PROCEED) | Trading gate allows entry with warnings |
| TJ-05 | View Active Positions | Tab "Active" menampilkan Paper + Binance positions unified |
| TJ-06 | View Pending Orders | Tab "Pending" menampilkan Binance open orders + Paper drafts |
| TJ-07 | Close Position (Manual) | Dialog close dengan exit price, fee, P&L auto-calculated |
| TJ-08 | Edit Position (SL/TP/Notes) | Edit dialog untuk modify stop loss, take profit, notes |
| TJ-09 | Delete Trade Entry | Confirm dialog, soft delete (recoverable dari Settings) |
| TJ-10 | Enrich Trade (Drawer) | Side panel: strategy, emotions, screenshots, tags, AI analysis |
| TJ-11 | Post-Trade AI Analysis | Auto-triggered setelah close position, async background |
| TJ-12 | Cancel Binance Open Order | Cancel order langsung dari Pending tab |

### Bagian 2: Trade History Scenarios (12 scenarios)

| ID | Scenario | Deskripsi Singkat |
|----|----------|-------------------|
| TH-01 | Browse Closed Trades | Infinite scroll, List/Gallery toggle, paginated 50/page |
| TH-02 | Filter by Date Range | Date picker filter dengan 1-year default lookback |
| TH-03 | Filter by Result/Direction/Session | Multi-filter combination (win/loss, long/short, session) |
| TH-04 | Filter by Strategy | Badge-based strategy filter dari trading_strategies |
| TH-05 | Sort by AI Score | Toggle sort ascending/descending by ai_quality_score |
| TH-06 | Switch Tabs (All/Binance/Paper/Fees/Funding) | 5 tab categories dengan masing-masing data source |
| TH-07 | Incremental Sync | Auto-triggered on mount, fetches recent Binance trades |
| TH-08 | Full History Sync | 2-year Binance history via chunked fetching + progress bar |
| TH-09 | Batch Re-Enrichment | Re-enrich incomplete trades (entry_price = 0) in bulk |
| TH-10 | Export to CSV | Download filtered trades sebagai CSV file |
| TH-11 | Enrich from History | Open TradeEnrichmentDrawer dari trade card |
| TH-12 | Soft Delete & Recovery | Delete trade (soft), recover dari Settings > Deleted Trades |

### Bagian 3: Cross-Module Scenarios (3 scenarios)

| ID | Scenario | Deskripsi Singkat |
|----|----------|-------------------|
| CM-01 | Journal to History Flow | Trade created in Journal, closed, appears in History |
| CM-02 | Binance Toggle Visibility | Toggle `use_binance_history` hides/shows Binance data across both modules |
| CM-03 | Sync Quota Enforcement | Daily sync limit (10/day) blocks further syncs with 429 error |

### Detail Per Scenario (Contoh Format)

Setiap scenario akan ditulis dengan format berikut:

```markdown
### TJ-01: Create Trade via Full Wizard

**Precondition:** User logged in, trading gate status != 'disabled'

**Steps:**
1. Click "New Trade" button di Trading Journal header
2. Dialog opens dengan TradeEntryWizard
3. Step 1 (Setup): Select pair, direction, entry price, quantity
4. Step 2 (Confluence): Validate confluence checklist items
5. Step 3 (Position Sizing): Calculate position size, set SL/TP
6. Step 4 (Final Checklist): Review all parameters
7. Step 5 (Confirmation): Confirm and submit

**Expected Result:**
- Trade entry created in `trade_entries` table with status='open'
- Query `trade-entries` invalidated
- Wizard dialog closes
- New position appears in Active tab

**Components:** TradeEntryWizard, SetupStep, ConfluenceValidator, 
PositionSizingStep, FinalChecklist, TradeConfirmation

**Hooks:** useTradeEntryWizard, useTradingGate, useTradeEntries
```

## Konten Tambahan

- **Glossary**: Definisi istilah (Enrichment, Full Sync, Incremental Sync, Soft Delete, Trading Gate, dll.)
- **Component Map**: Tabel mapping scenario ke komponen dan hooks yang terlibat
- **Data Flow Indicators**: Arah aliran data untuk setiap scenario (DB read/write, API call, cache invalidation)
