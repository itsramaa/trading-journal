

# Full-System Batch Audit — Findings & Remediation Plan

## Audit Methodology

Audited all core calculation libs, 80+ hooks, state management, edge functions, error handling, data isolation patterns, and cross-referenced every claim in `JUDGING_CRITERIA_EVALUATION.md` against actual source code.

---

## Batch 1: All Findings

### Finding 1: Data Isolation Bug in `useSymbolBreakdown` (MAJOR)

**File:** `src/hooks/analytics/use-symbol-breakdown.ts`
**Severity:** Major
**Criteria Impacted:** Accuracy, Security (data contamination)

**Problem:**
The hook uses raw `isConnected` instead of `tradeMode === 'live' && isConnected` for source routing. When a user is in **Paper mode** but has Binance connected, this hook returns **Live Binance data** instead of Paper data — a direct violation of the data isolation policy.

**Two affected lines:**
- Line 42: `if (isConnected) return { daily: [], weekly: [] };`
  - Skips paper calculation even in Paper mode if Binance is connected
- Line 122: `if (isConnected && binancePnl.bySymbol)`
  - Returns Binance data even in Paper mode

**Correct pattern** (already used by `useUnifiedWeeklyPnl` at line 156 and `useUnifiedDailyPnl` at line 50):
```typescript
const useLiveSource = tradeMode === 'live' && isConnected;
```

**Fix:**
- Line 42: Change to `if (tradeMode === 'live' && isConnected) return { daily: [], weekly: [] };`
- Line 122: Change to `if (tradeMode === 'live' && isConnected && binancePnl.bySymbol)`

This was supposedly fixed previously (Finding #40 in the eval doc says "inline mode filter added to Paper path"), but the **source routing guard** at lines 42 and 122 was never updated — only the inner `trades.forEach` filter was fixed. The outer guard short-circuits before the mode filter even runs.

---

### Finding 2: Documentation Claim Mismatch — `useSymbolBreakdown` Fix Incomplete (MINOR)

**File:** `docs/JUDGING_CRITERIA_EVALUATION.md`, Line 40 and 156
**Severity:** Minor
**Criteria Impacted:** Accuracy

The doc claims `useSymbolBreakdown` is fully fixed (Finding #40), but as shown above, the source routing guard is still wrong. The doc entry needs to be updated to reflect the additional fix.

---

### Finding 3: Health Score Weights in Doc vs Code (VERIFIED OK)

Doc claims weights sum to 1.0: `0.20+0.20+0.15+0.15+0.15+0.15`. Code confirmed: exactly these values. No issue.

### Finding 4: Infinity Handling (VERIFIED OK)

`profitFactor` can be `Infinity` from `calculateTradingStats`. When passed to `calculateTradingHealthScore`, `mapRange(Infinity, 0.5, 3, 0, 100)` returns `Infinity`, but `clamp(Infinity, 0, 100)` returns `100`. All UI components handle `Infinity` display with `profitFactor === Infinity ? 'infinity' : ...` pattern. No issue.

### Finding 5: Session Overlap Priority (VERIFIED OK)

`getSessionForTime` uses if/else priority ordering (Sydney > Tokyo > London > NY). The separate `getActiveOverlaps` function correctly identifies overlap zones. By design, not a bug.

### Finding 6: Advanced Risk Metrics Math (VERIFIED OK)

Sharpe, Sortino, Calmar, VaR, Kelly — all formulas verified mathematically correct. Downside deviation correctly uses `returns.length` as denominator (not just `downsideReturns.length`), which is the standard Sortino formula.

### Finding 7: Error Boundary Architecture (VERIFIED OK)

Two-tier architecture confirmed: global `ErrorBoundary` (lines 16-81) + `WidgetErrorBoundary` (lines 87-122) with retry capability.

### Finding 8: Zustand Store Architecture (VERIFIED OK)

`app-store.ts` uses `persist` middleware with `partialize` (only persists currency/notifications, not transient UI state). `sync-store.ts` uses raw Zustand (no middleware) but manually persists checkpoint/lastSync to localStorage. Both clean.

### Finding 9: Binance FSM (VERIFIED OK)

6-state machine with valid transition matrix, liquidation detection with 90% loss heuristic. Enterprise-grade.

### Finding 10: All 25 Edge Functions (VERIFIED OK)

Counted: 25 directories in `supabase/functions/` (excluding `_shared/`). Matches doc.

---

## Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | `useSymbolBreakdown` source routing ignores `tradeMode` | Major | Needs fix |
| 2 | Doc claims Fix #40 is complete but guard was missed | Minor | Needs doc update |
| 3-10 | Health Score weights, Infinity, Sessions, Risk Metrics, Error Boundaries, Stores, FSM, Edge Functions | - | Verified OK |

---

## Implementation Plan

### Step 1: Fix `useSymbolBreakdown` Source Routing

**File:** `src/hooks/analytics/use-symbol-breakdown.ts`

**Change 1 (line 42):**
```typescript
// Before:
if (isConnected) return { daily: [], weekly: [] };
// After:
if (tradeMode === 'live' && isConnected) return { daily: [], weekly: [] };
```

**Change 2 (line 122):**
```typescript
// Before:
if (isConnected && binancePnl.bySymbol) {
// After:
if (tradeMode === 'live' && isConnected && binancePnl.bySymbol) {
```

### Step 2: Update `JUDGING_CRITERIA_EVALUATION.md`

- Update Finding #40 description to note the additional source routing fix
- Add Finding #54: Source routing guard fix in `useSymbolBreakdown`
- Verify "Data Isolation Patterns" section accurately reflects this fix

---

## Judging Criteria Impact

| Criteria | Impact |
|----------|--------|
| **Accuracy** | Fixes data contamination — Paper mode symbol breakdown now correctly isolated from Binance data |
| **Security** | Eliminates data leakage vector where Live exchange data bleeds into Paper analytics |
| **Code Quality** | Aligns `useSymbolBreakdown` with the same `tradeMode === 'live' && isConnected` pattern used by `useUnifiedDailyPnl` and `useUnifiedWeeklyPnl` |
| **Comprehensiveness** | No change |
| **Clarity** | No change |
| **Innovation** | No change |

