

# Plan: Create `docs/MISMATCH_REMEDIATION_PLAN.md`

## Overview

Membuat dokumen resmi yang mendokumentasikan **14 mismatch** antara implementasi saat ini dan spesifikasi `DETAILED_USER_SCENARIO.md`, beserta rencana remediasi bertahap (Phase A-D).

## File yang Dibuat

| File | Action |
|------|--------|
| `docs/MISMATCH_REMEDIATION_PLAN.md` | **CREATE** |

## Struktur Dokumen

### 1. Header & Context
- Version, date, reference ke `DETAILED_USER_SCENARIO.md`
- Summary: 14 mismatches (6 Critical, 4 High, 4 Medium)

### 2. Mismatch Registry (Tabel Lengkap)

Setiap mismatch didokumentasikan dengan format:

```text
ID | Severity | Title | Spec Section | Current State | Required State | Affected Files | Phase
```

**Critical (C-01 to C-06):**
- C-01: Dashboard tidak enforce mode visibility (Spec Section 3)
- C-02: PortfolioOverviewCard ignores trade_mode (Section 12)
- C-03: Performance page zero mode filtering (Section 12)
- C-04: `get_trade_stats` RPC missing `p_trade_mode` parameter (Section 12)
- C-05: TradeHistory page tidak filter by trade_mode (Section 12)
- C-06: SmartQuickActions ignores mode untuk "Add Trade" (Section 3.2)

**High (H-01 to H-04):**
- H-01: Audit logger hanya cover trade creation (Section 13)
- H-02: RiskManagement page no mode awareness (Section 3)
- H-03: No SIMULATION label/banner in Paper mode (Section 3.1)
- H-04: No mandatory session context enforcement (Section 2.2)

**Medium (M-01 to M-04):**
- M-01: Active Trade tab missing fees/funding + time-in-trade columns (Section 8.2)
- M-02: AI Post-Mortem tidak structured di enrichment drawer (Section 11)
- M-03: No daily reconciliation cron (Section 13)
- M-04: No WebSocket fallback documentation (Section 13)

### 3. Phase A: Data Isolation (Fixes C-01 to C-06)

Detail teknis per fix:
1. **DB Migration**: Add `p_trade_mode` parameter ke `get_trade_stats` RPC function
2. **Hook Updates**: `useTradeStats`, `useTradeEntriesPaginated`, `useUnifiedPortfolioData` pass `trade_mode`
3. **Page Updates**: `Dashboard.tsx`, `Performance.tsx`, `SmartQuickActions.tsx` import dan apply `useModeVisibility`
4. **TradeHistory**: Add `trade_mode` ke `TradeFilters` interface

File yang dimodifikasi:
- `supabase/migrations/` (new migration for RPC update)
- `src/hooks/use-trade-stats.ts`
- `src/hooks/use-trade-entries-paginated.ts`
- `src/hooks/use-unified-portfolio-data.ts` (atau equivalent)
- `src/pages/Dashboard.tsx`
- `src/pages/Performance.tsx`
- `src/pages/TradeHistory.tsx`
- `src/components/dashboard/SmartQuickActions.tsx`

### 4. Phase B: UX Enforcement (Fixes H-03, H-04)

1. **SIMULATION Banner**: Persistent banner di `DashboardLayout` saat Paper mode aktif (amber, dismissible=false)
2. **Session Context Modal**: First-time modal yang memaksa user pilih mode + style sebelum proceed. Triggered jika `active_trade_mode` belum pernah di-set.

File yang dimodifikasi:
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/SessionContextModal.tsx` (new)
- `src/hooks/use-trade-mode.ts` (add `hasSelectedContext` flag)

### 5. Phase C: Audit Trail Expansion (Fix H-01)

Integrasikan `logAuditEvent` ke semua flow kritis:
- Trade close (`useClosePosition` atau equivalent)
- Trade delete (`useDeleteTradeEntry`)
- Trade restore
- API key save/delete (`ApiKeyForm`)
- Settings change (`useUpdateUserSettings`)
- Sync start/complete/fail (`use-binance-sync`)
- Risk profile update

File yang dimodifikasi:
- `src/hooks/use-close-position.ts` (atau equivalent)
- `src/hooks/use-trade-entries.ts` (delete/restore)
- `src/components/settings/ApiKeyForm.tsx`
- `src/hooks/use-user-settings.ts`
- `src/hooks/use-binance-sync.ts`

### 6. Phase D: Polish (Fixes H-02, M-01 to M-04)

1. **Risk page mode awareness** (H-02): Filter `DailyLossTracker` by mode
2. **Active trade columns** (M-01): Add fee/funding + time-in-trade ke `AllPositionsTable`
3. **AI Post-Mortem UI** (M-02): Structured display di `TradeEnrichmentDrawer`
4. **Daily reconciliation** (M-03): Document sebagai known gap atau implement edge function cron
5. **WebSocket gap** (M-04): Document di `ARCHITECTURE.md` sebagai acceptable trade-off (REST polling = current approach)

### 7. Verification Checklist

Setiap phase memiliki acceptance criteria yang harus di-verify sebelum lanjut ke phase berikutnya.

### 8. Update DETAILED_USER_SCENARIO.md

Setelah semua phase selesai, update Implementation Status di `DETAILED_USER_SCENARIO.md` untuk merefleksikan status terbaru.

## Execution Order

```text
Phase A (Data Isolation) ──→ Phase B (UX) ──→ Phase C (Audit) ──→ Phase D (Polish)
     [~3 messages]            [~2 messages]     [~2 messages]       [~2 messages]
```

Estimasi total: **8-10 implementation messages**.

