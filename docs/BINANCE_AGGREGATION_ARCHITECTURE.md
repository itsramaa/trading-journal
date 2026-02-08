# Binance Aggregation Architecture
## Data Ingestion & Local DB Re-Architecture

**Version**: 2.0  
**Status**: ✅ IMPLEMENTED (Phase 1-3 Complete)  
**Date**: 2025-02-08

---

## 1. Executive Summary

### Current State (BROKEN)
```
Binance API → Direct Insert → Local DB (Corrupted)
                    ↓
           - Partial data
           - Hardcoded direction
           - Missing fees
           - Inconsistent lifecycle
```

### Target State (CORRECT)
```
Binance APIs (RAW)
├─ /fapi/v1/userTrades     (fills)
├─ /fapi/v1/allOrders      (orders)
├─ /fapi/v1/income         (PnL, fees, funding)
├─ /fapi/v2/positionRisk   (current positions)
└─ /fapi/v1/leverageBracket (leverage info)
           ↓
┌─────────────────────────────────────┐
│   AGGREGATION & ENRICHMENT LAYER   │
│                                     │
│  1. Group fills → orders            │
│  2. Group orders → position cycle   │
│  3. Attach income (PnL, fees)       │
│  4. Attach funding fees             │
│  5. Calculate derived fields        │
│  6. Validate completeness           │
└─────────────────────────────────────┘
           ↓
    LOCAL DB (TRADE ENTRIES)
    ├─ Final, trusted, queryable
    ├─ One row = One complete trade lifecycle
    └─ All fields have clear source
```

---

## 2. Trade Lifecycle Definition

### What is ONE Trade Entry?

```
TRADE ENTRY = Complete Position Lifecycle

┌─────────────────────────────────────────────────────────────┐
│                    POSITION LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ENTRY PHASE              EXIT PHASE                         │
│  ┌─────────┐              ┌─────────┐                        │
│  │ Order 1 │──┐       ┌──▶│ Order 3 │                        │
│  └─────────┘  │       │   └─────────┘                        │
│  ┌─────────┐  ├──▶ POSITION ──┤                              │
│  │ Order 2 │──┘       │   ┌─────────┐                        │
│  └─────────┘          └──▶│ Order 4 │                        │
│                           └─────────┘                        │
│                                                              │
│  + INCOME RECORDS:                                           │
│    - REALIZED_PNL (on close)                                 │
│    - COMMISSION (per fill)                                   │
│    - FUNDING_FEE (8-hour intervals)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Lifecycle States

| State | Description | Can Insert to DB? |
|-------|-------------|-------------------|
| `PENDING` | Orders placed, not filled | NO |
| `OPEN` | Position active, not closed | NO (or mark as `status=open`) |
| `CLOSED` | Position fully closed | YES ✓ |
| `PARTIALLY_CLOSED` | Position reduced but not zero | NO (wait for full close) |

**RULE**: Only `CLOSED` positions become trade entries with `status=closed`.

---

## 3. Binance API → Local DB Field Mapping

### Category A: Direct from Binance API

| Local DB Field | Binance Source | API Endpoint | Notes |
|----------------|----------------|--------------|-------|
| `pair` | `symbol` | userTrades | Direct mapping |
| `direction` | Derived from `positionSide` + `side` | userTrades | LONG if (positionSide=LONG AND side=BUY) OR (positionSide=BOTH AND first_side=BUY) |
| `entry_price` | Weighted avg of entry fills | userTrades | `Σ(price × qty) / Σ(qty)` for entry orders |
| `exit_price` | Weighted avg of exit fills | userTrades | `Σ(price × qty) / Σ(qty)` for exit orders |
| `quantity` | Sum of entry fill quantities | userTrades | `Σ(qty)` of entry fills |
| `realized_pnl` | `income` where `incomeType=REALIZED_PNL` | income | Sum for position lifecycle |
| `commission` | `income` where `incomeType=COMMISSION` | income | Sum of all commission for trades |
| `commission_asset` | `asset` from commission income | income | Usually USDT |
| `funding_fees` | `income` where `incomeType=FUNDING_FEE` | income | Sum between entry_datetime and exit_datetime |
| `fees` | `commission + funding_fees` | Calculated | Total cost |
| `pnl` | `realized_pnl - fees` | Calculated | Net P&L |
| `entry_datetime` | Earliest entry fill `time` | userTrades | First fill timestamp |
| `exit_datetime` | Latest exit fill `time` | userTrades | Last fill timestamp |
| `trade_date` | `entry_datetime` date portion | Calculated | For grouping |
| `hold_time_minutes` | `(exit_datetime - entry_datetime) / 60000` | Calculated | Duration |
| `leverage` | From position or account config | positionRisk / leverageBracket | At time of trade |
| `margin_type` | `marginType` | positionRisk | CROSSED or ISOLATED |
| `is_maker` | `maker` field from fills | userTrades | True if any fill is maker |
| `entry_order_type` | `type` from entry orders | allOrders | LIMIT, MARKET, etc. |
| `exit_order_type` | `type` from exit orders | allOrders | LIMIT, MARKET, STOP, etc. |
| `binance_trade_id` | Composite key | Generated | `{symbol}_{entryTime}_{exitTime}` or income `tranId` |
| `binance_order_id` | Primary entry order ID | allOrders | First entry order |
| `source` | Constant | N/A | Always `'binance'` |
| `result` | Derived from `realized_pnl` | Calculated | `win` if >0, `loss` if <0, `breakeven` if =0 |
| `status` | Position state | Calculated | `closed` for completed positions |

### Category B: Manual/UI Input (NOT from Binance)

| Local DB Field | Source | When Populated |
|----------------|--------|----------------|
| `stop_loss` | Manual entry OR from order type | Optional enrichment |
| `take_profit` | Manual entry OR from order type | Optional enrichment |
| `notes` | User input | Post-trade journaling |
| `tags` | User input | Post-trade categorization |
| `emotional_state` | User input | Post-trade reflection |
| `chart_timeframe` | User input | Optional |
| `market_condition` | User input OR AI | Optional enrichment |
| `screenshots` | User upload | Optional |

### Category C: AI-Generated (Post-Trade Analysis)

| Local DB Field | Source | When Populated |
|----------------|--------|----------------|
| `ai_quality_score` | AI analysis | After trade closed |
| `ai_confidence` | AI analysis | After trade closed |
| `ai_model_version` | System | When AI runs |
| `ai_analysis_generated_at` | System timestamp | When AI runs |
| `pre_trade_validation` | AI/Rule engine | Before trade (future) |
| `post_trade_analysis` | AI analysis | After trade closed |
| `confluences_met` | AI/Strategy matching | After trade closed |
| `market_context` | Market data snapshot | At trade time |

### Category D: System-Managed

| Local DB Field | Source | Notes |
|----------------|--------|-------|
| `id` | UUID | Auto-generated |
| `user_id` | Auth context | From session |
| `trading_account_id` | User config | Linked account |
| `created_at` | System timestamp | Insert time |
| `updated_at` | System timestamp | Last update |
| `deleted_at` | System timestamp | Soft delete |

---

## 4. Aggregation Algorithm

### Step 1: Collect Raw Data

```typescript
// Pseudocode - NOT implementation
interface RawBinanceData {
  trades: BinanceTrade[];      // from /userTrades
  orders: BinanceOrder[];       // from /allOrders
  income: BinanceIncome[];      // from /income
  positions: BinancePosition[]; // from /positionRisk
}

async function collectRawData(startTime: number, endTime: number): Promise<RawBinanceData> {
  // Fetch all endpoints in parallel with proper chunking
  // Handle 7-day limits for userTrades
  // Handle pagination for all endpoints
}
```

### Step 2: Group by Position Lifecycle

```typescript
interface PositionLifecycle {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryFills: BinanceTrade[];
  exitFills: BinanceTrade[];
  entryOrders: BinanceOrder[];
  exitOrders: BinanceOrder[];
  incomeRecords: BinanceIncome[];  // PnL, commission, funding
  
  // Derived
  entryTime: number;
  exitTime: number;
  isComplete: boolean;
}

function groupIntoLifecycles(raw: RawBinanceData): PositionLifecycle[] {
  // 1. Sort trades by time
  // 2. Track position changes (qty accumulation)
  // 3. Detect lifecycle boundaries (qty goes 0 → X → 0)
  // 4. Group income by time window
}
```

### Step 3: Aggregate & Enrich

```typescript
function aggregateLifecycle(lifecycle: PositionLifecycle): AggregatedTrade {
  // Entry price = weighted average
  const totalEntryValue = lifecycle.entryFills.reduce((sum, f) => sum + f.price * f.qty, 0);
  const totalEntryQty = lifecycle.entryFills.reduce((sum, f) => sum + f.qty, 0);
  const entryPrice = totalEntryValue / totalEntryQty;
  
  // Exit price = weighted average
  const totalExitValue = lifecycle.exitFills.reduce((sum, f) => sum + f.price * f.qty, 0);
  const totalExitQty = lifecycle.exitFills.reduce((sum, f) => sum + f.qty, 0);
  const exitPrice = totalExitValue / totalExitQty;
  
  // Income aggregation
  const realizedPnl = lifecycle.incomeRecords
    .filter(i => i.incomeType === 'REALIZED_PNL')
    .reduce((sum, i) => sum + i.income, 0);
  
  const commission = lifecycle.incomeRecords
    .filter(i => i.incomeType === 'COMMISSION')
    .reduce((sum, i) => sum + Math.abs(i.income), 0);
  
  const fundingFees = lifecycle.incomeRecords
    .filter(i => i.incomeType === 'FUNDING_FEE')
    .reduce((sum, i) => sum + i.income, 0);
  
  return {
    pair: lifecycle.symbol,
    direction: lifecycle.direction,
    entry_price: entryPrice,
    exit_price: exitPrice,
    quantity: totalEntryQty,
    realized_pnl: realizedPnl,
    commission,
    funding_fees: fundingFees,
    fees: commission + Math.abs(fundingFees),
    pnl: realizedPnl - commission - Math.abs(fundingFees),
    // ... other fields
  };
}
```

### Step 4: Validate Before Insert

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateAggregatedTrade(trade: AggregatedTrade): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // CRITICAL VALIDATIONS
  if (trade.entry_price <= 0) errors.push('Invalid entry price');
  if (trade.exit_price <= 0) errors.push('Invalid exit price');
  if (trade.quantity <= 0) errors.push('Invalid quantity');
  if (!trade.entry_datetime) errors.push('Missing entry datetime');
  if (!trade.exit_datetime) errors.push('Missing exit datetime');
  
  // WARNING VALIDATIONS
  if (trade.commission === 0) warnings.push('Zero commission - verify');
  if (trade.realized_pnl === 0 && trade.entry_price !== trade.exit_price) {
    warnings.push('Zero PnL but prices differ - verify');
  }
  
  // CROSS-VALIDATION
  const calculatedPnl = (trade.exit_price - trade.entry_price) * trade.quantity 
    * (trade.direction === 'LONG' ? 1 : -1);
  const pnlDiff = Math.abs(calculatedPnl - trade.realized_pnl);
  if (pnlDiff > trade.realized_pnl * 0.01) { // >1% difference
    warnings.push(`PnL mismatch: calculated=${calculatedPnl}, reported=${trade.realized_pnl}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## 5. Sync Strategy

### 5.1 Full Sync (Initial / Reset)

```
┌─────────────────────────────────────────────────────────────┐
│                     FULL SYNC PROCESS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. DELETE all existing trade_entries WHERE source='binance'│
│                                                              │
│  2. FETCH raw data from Binance (last 2 years max)          │
│     - Chunked by 90-day windows for income                  │
│     - Chunked by 7-day windows for userTrades               │
│                                                              │
│  3. AGGREGATE into position lifecycles                       │
│                                                              │
│  4. VALIDATE each aggregated trade                           │
│                                                              │
│  5. INSERT validated trades to local DB                      │
│                                                              │
│  6. RECONCILE: Compare totals                                │
│     - Binance total PnL ≈ Local DB total PnL                │
│     - Binance total fees ≈ Local DB total fees              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Incremental Sync (Daily/Periodic)

```
┌─────────────────────────────────────────────────────────────┐
│                   INCREMENTAL SYNC PROCESS                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. GET last sync timestamp from metadata                    │
│                                                              │
│  2. FETCH new data since last sync                          │
│     - Only fetch startTime = lastSync - 1 hour (overlap)    │
│                                                              │
│  3. IDENTIFY new position closures                          │
│     - Check for REALIZED_PNL income records                 │
│                                                              │
│  4. AGGREGATE only new closed positions                      │
│                                                              │
│  5. UPSERT to local DB                                       │
│     - Key: binance_trade_id (composite)                     │
│     - If exists: UPDATE (in case of corrections)            │
│     - If not: INSERT                                        │
│                                                              │
│  6. UPDATE last sync timestamp                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Re-Sync (Correction)

```
Trigger conditions:
- User requests manual re-sync
- Reconciliation shows mismatch >0.1%
- API error detected in previous sync

Process:
1. Mark affected trades as `needs_resync`
2. Re-fetch specific time window
3. Re-aggregate
4. Compare with existing
5. Update if different
```

---

## 6. Fee, Commission, Funding Strategy

### Income Types from Binance

| incomeType | Description | How to Use |
|------------|-------------|------------|
| `REALIZED_PNL` | P&L from closing position | Main PnL value |
| `COMMISSION` | Trading fee per fill | Sum for trade |
| `FUNDING_FEE` | 8-hourly funding payment | Sum between entry/exit |
| `TRANSFER` | Deposit/withdrawal | NOT for trades |
| `WELCOME_BONUS` | Bonus | NOT for trades |
| `INSURANCE_CLEAR` | Insurance fund | Edge case |
| `COIN_SWAP_DEPOSIT` | Asset conversion | NOT for trades |
| `COIN_SWAP_WITHDRAW` | Asset conversion | NOT for trades |

### Funding Fee Attribution

```
CHALLENGE: Funding fees are paid every 8 hours regardless of trades.
           How to attribute to specific trades?

SOLUTION: Time-window matching

For each trade lifecycle:
  funding_fees = SUM of FUNDING_FEE income WHERE:
    - symbol matches trade symbol
    - time >= entry_datetime
    - time <= exit_datetime
```

### Commission Attribution

```
CHALLENGE: Commission income may not have orderId directly linkable.

SOLUTION: Time + Symbol matching with tolerance

For each trade lifecycle:
  commission = SUM of COMMISSION income WHERE:
    - symbol matches trade symbol
    - time within trade lifecycle ± 1 minute tolerance
  
  OR if available:
    - Match by orderId from userTrades
```

---

## 7. Edge Cases & Known Risks

### Edge Case 1: Partial Closes

```
Scenario: 
  - Open 1 BTC LONG
  - Close 0.5 BTC (partial)
  - Close remaining 0.5 BTC

Challenge: Is this 1 trade or 2 trades?

Decision: 
  OPTION A (Recommended): Treat as 1 trade
    - Wait until position = 0
    - Aggregate all fills
  
  OPTION B: Treat as 2 separate trades
    - More granular
    - But complicates lifecycle tracking
```

### Edge Case 2: Position Flip

```
Scenario:
  - LONG 1 BTC @ 50000
  - SELL 2 BTC @ 51000 (flip to SHORT)

Challenge: This is technically 2 trades in 1 transaction

Solution:
  - Detect position sign change
  - Split into:
    1. Close LONG 1 BTC
    2. Open SHORT 1 BTC
```

### Edge Case 3: Hedge Mode

```
Scenario: User has both LONG and SHORT positions on same symbol

Solution:
  - Use positionSide field (LONG / SHORT / BOTH)
  - Track separately
  - Never mix
```

### Edge Case 4: ADL (Auto-Deleveraging)

```
Scenario: Position auto-closed by exchange

Solution:
  - Check for POSITION_ADL income type
  - Treat as normal close
  - Mark with metadata flag
```

### Edge Case 5: Liquidation

```
Scenario: Position liquidated

Solution:
  - Check for LIQUIDATION_CLEAR income type
  - Include liquidation fee in total fees
  - Mark with metadata flag
```

---

## 8. Reconciliation Process

### After Each Sync

```sql
-- Compare Binance totals with Local DB totals
WITH binance_totals AS (
  -- Fetched from Binance income API for the period
  -- SUM of REALIZED_PNL, COMMISSION, FUNDING_FEE
),
local_totals AS (
  SELECT 
    SUM(realized_pnl) as total_pnl,
    SUM(commission) as total_commission,
    SUM(funding_fees) as total_funding,
    COUNT(*) as trade_count
  FROM trade_entries
  WHERE source = 'binance'
    AND deleted_at IS NULL
    AND trade_date BETWEEN :start_date AND :end_date
)
SELECT 
  ABS(binance.total_pnl - local.total_pnl) as pnl_diff,
  ABS(binance.total_fees - local.total_fees) as fee_diff,
  CASE 
    WHEN pnl_diff / binance.total_pnl > 0.001 THEN 'MISMATCH'
    ELSE 'OK'
  END as status
```

### Tolerance Thresholds

| Metric | Acceptable Variance | Action if Exceeded |
|--------|--------------------|--------------------|
| Total PnL | ±0.1% | Re-sync period |
| Total Fees | ±1% | Warning, manual check |
| Trade Count | ±0 | Re-sync period |

---

## 9. Implementation Phases

### Phase 1: Database Reset
1. Backup existing trade_entries
2. Delete all WHERE source='binance'
3. Verify clean state

### Phase 2: Aggregation Layer
1. Implement lifecycle grouping
2. Implement income attachment
3. Implement validation

### Phase 3: Full Sync
1. Fetch 2-year history
2. Process in chunks
3. Insert validated trades
4. Reconcile

### Phase 4: Incremental Sync
1. Implement last-sync tracking
2. Implement delta fetching
3. Implement upsert logic

### Phase 5: Monitoring
1. Reconciliation alerts
2. Sync failure handling
3. Data quality dashboard

---

## 10. Open Questions

### Q1: Position Mode Detection
How to reliably detect if user is in One-Way vs Hedge mode at trade time?
- Need to check `/fapi/v1/positionSide/dual` history
- Or infer from positionSide values in trades

### Q2: Historical Leverage
Binance doesn't provide historical leverage per trade.
Options:
- Store current leverage at sync time
- Accept this as "approximate"
- Ask user to confirm/override

### Q3: Stop Loss / Take Profit
Not directly available in income/trades.
Options:
- Parse from order type (STOP, TAKE_PROFIT)
- Leave NULL, allow manual enrichment

### Q4: Time Zone Handling
Binance uses UTC milliseconds.
Local DB should:
- Store as TIMESTAMPTZ
- Convert to user timezone only in UI

---

## 11. Data Quality Metrics

### Post-Sync Validation Queries

```sql
-- Trades with missing critical data
SELECT COUNT(*) as incomplete_trades
FROM trade_entries
WHERE source = 'binance'
  AND (entry_price IS NULL OR entry_price = 0
       OR exit_price IS NULL OR exit_price = 0
       OR quantity IS NULL OR quantity = 0);

-- Trades with suspicious PnL
SELECT *
FROM trade_entries
WHERE source = 'binance'
  AND realized_pnl != 0
  AND ABS(
    (exit_price - entry_price) * quantity 
    * CASE WHEN direction = 'LONG' THEN 1 ELSE -1 END
    - realized_pnl
  ) / ABS(realized_pnl) > 0.1; -- >10% mismatch

-- Funding fee coverage
SELECT 
  t.id,
  t.pair,
  t.entry_datetime,
  t.exit_datetime,
  t.funding_fees,
  (SELECT COUNT(*) FROM binance_funding_records 
   WHERE symbol = t.pair 
     AND time BETWEEN t.entry_datetime AND t.exit_datetime) as expected_funding_events
FROM trade_entries t
WHERE source = 'binance';
```

---

## Appendix A: Binance API Reference

### Endpoints Used

| Endpoint | Weight | Max Records | Time Limit |
|----------|--------|-------------|------------|
| `/fapi/v1/userTrades` | 5 | 1000 | 7 days |
| `/fapi/v1/allOrders` | 5 | 1000 | 7 days |
| `/fapi/v1/income` | 30 | 1000 | 3 months |
| `/fapi/v2/positionRisk` | 5 | N/A | Current |
| `/fapi/v1/leverageBracket` | 1 | N/A | Current |

### Rate Limits
- Request Weight: 2400/minute
- Order Rate: 1200/minute
- Always include 100ms delay between calls

---

## Appendix B: Trade Entry Completeness Checklist

Before inserting a trade entry, verify:

- [ ] `entry_price > 0` (from weighted avg of entry fills)
- [ ] `exit_price > 0` (from weighted avg of exit fills)
- [ ] `quantity > 0` (from sum of entry fills)
- [ ] `direction` is 'LONG' or 'SHORT' (not 'UNKNOWN')
- [ ] `entry_datetime` exists (from first entry fill)
- [ ] `exit_datetime` exists (from last exit fill)
- [ ] `realized_pnl` exists (from income API)
- [ ] `commission >= 0` (from income API)
- [ ] `funding_fees` calculated (may be 0)
- [ ] `binance_trade_id` is unique (composite key)
- [ ] Cross-validation passed (calculated PnL ≈ reported PnL)

---

## Appendix C: Implementation Status

### Completed Components

| Phase | Component | File | Status |
|-------|-----------|------|--------|
| 1 | DB Reset | SQL migration | ✅ Soft-deleted 124 corrupted trades |
| 2 | Types | `src/services/binance/types.ts` | ✅ Complete |
| 2 | Position Grouper | `src/services/binance/position-lifecycle-grouper.ts` | ✅ Complete |
| 2 | Trade Aggregator | `src/services/binance/trade-aggregator.ts` | ✅ Complete |
| 2 | Validator | `src/services/binance/aggregation-validator.ts` | ✅ Complete |
| 2 | Full Sync Hook | `src/hooks/use-binance-aggregated-sync.ts` | ✅ Complete |
| 2 | Incremental Sync | `src/hooks/use-binance-incremental-sync.ts` | ✅ Complete |
| 3 | Full Sync Panel | `src/components/trading/BinanceFullSyncPanel.tsx` | ✅ Complete |
| 3 | Status Badge | `src/components/trading/SyncStatusBadge.tsx` | ✅ Complete |
| 3 | Reconciliation Report | `src/components/trading/SyncReconciliationReport.tsx` | ✅ Complete |
| 3 | Trade History Integration | `src/pages/TradeHistory.tsx` | ✅ Complete |

### Key Features Implemented

1. **Full Sync (2-year history)**
   - Fetches income, trades, orders from Binance
   - Groups into position lifecycles
   - Aggregates with weighted average prices
   - Validates and inserts to DB
   - Reconciles PnL within 0.1% tolerance

2. **Incremental Sync**
   - Auto-triggers on page load if stale (>4 hours)
   - Only fetches new trades since last sync
   - Stores last sync timestamp in localStorage

3. **Reconciliation Report UI**
   - Shows sync statistics (trades, win rate, P&L)
   - Displays P&L reconciliation accuracy
   - Lists validation warnings
   - Shows failed lifecycle details
   - Clickable badge opens full report modal
