# Multi-Exchange Architecture

> **Status**: Binance-only implementation with multi-exchange ready design  
> **Last Updated**: 2026-02-01

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Architecture](#current-state-architecture)
3. [Future State Architecture](#future-state-architecture)
4. [Exchange Interface Contract](#exchange-interface-contract)
5. [Type System Design](#type-system-design)
6. [Technical Debt Analysis](#technical-debt-analysis)
7. [Migration Path](#migration-path)
8. [UX Principles](#ux-principles)
9. [Recommendations](#recommendations)

---

## Executive Summary

This system is designed with **multi-exchange readiness** while focusing on **Binance Futures** as the sole active exchange. The architecture follows the principle:

> **"Future-ready by design, single-exchange by implementation"**

### Current Support Matrix

| Exchange | Status | Timeline |
|----------|--------|----------|
| Binance Futures | ✅ Active | Now |
| Bybit Futures | 🔜 Coming Soon | TBD |
| OKX Futures | 🔜 Coming Soon | TBD |

---

## Current State Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  useBinanceFutures()    useBinanceAccountData()              │
│  useBinanceMarketData() useBinanceTransactionHistory()       │
│  ↓                                                           │
│  Uses: BinancePosition, BinanceTrade, BinanceBalance types   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Edge Functions Layer                       │
├─────────────────────────────────────────────────────────────┤
│  binance-futures/index.ts                                    │
│  ├── Actions: validate, balance, positions, trades, etc.    │
│  └── Uses: Per-user encrypted credentials from Supabase     │
│                                                              │
│  binance-market-data/index.ts                                │
│  └── Actions: ticker, orderbook, klines (public endpoints)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database (Supabase)                         │
├─────────────────────────────────────────────────────────────┤
│  exchange_credentials                                        │
│  ├── user_id: UUID                                          │
│  ├── exchange: 'binance' | 'bybit' | 'okx'  ← Ready!        │
│  ├── api_key_encrypted: TEXT (base64)                       │
│  ├── api_secret_encrypted: TEXT (base64)                    │
│  └── is_active, is_valid, permissions, etc.                 │
│                                                              │
│  api_rate_limits                                             │
│  ├── user_id, exchange, endpoint_category                   │
│  └── weight_used, window_start, window_end                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Binance Futures API                        │
│                   https://fapi.binance.com                   │
└─────────────────────────────────────────────────────────────┘
```

### What's Already Multi-Exchange Ready

| Component | Status | Notes |
|-----------|--------|-------|
| `exchange_credentials` table | ✅ Ready | Has `exchange` column |
| `api_rate_limits` table | ✅ Ready | Has `exchange` column |
| Per-user credential storage | ✅ Ready | Works for any exchange |
| Rate limit tracking | ✅ Ready | Exchange-agnostic design |
| Credential encryption | ✅ Ready | Same flow for all exchanges |

### What's Binance-Specific (By Design)

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend hooks | Binance-specific | `useBinanceFutures()` |
| Edge functions | Binance-specific | `binance-futures/` |
| Type definitions | Binance-specific | `BinancePosition`, etc. |
| UI components | Binance-specific | `BinancePositionsTab` |

---

## Future State Architecture

When adding new exchanges, follow this target architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  useExchangePositions(exchange)  useExchangeBalance()        │
│  ↓ (uses generic ExchangePosition, ExchangeBalance types)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function Gateway Layer                     │
├─────────────────────────────────────────────────────────────┤
│  exchange-gateway/index.ts (FUTURE)                          │
│  ├── routes to: binance-futures/                            │
│  ├── routes to: bybit-futures/  (COMING SOON)               │
│  └── routes to: okx-futures/    (COMING SOON)               │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
     │ Binance API   │ │ Bybit API     │ │ OKX API       │
     │ (ACTIVE)      │ │ (COMING SOON) │ │ (COMING SOON) │
     └───────────────┘ └───────────────┘ └───────────────┘
```

### Transition Strategy

**Principle**: "Add layer, don't rewrite layer"

1. Keep existing `useBinanceFutures()` hooks working
2. Create new `useExchangePositions()` that wraps exchange-specific hooks
3. Add mappers to convert exchange-specific types to generic types
4. UI components consume generic types via mappers

---

## Exchange Interface Contract

### Conceptual Interface (NOT implemented yet)

```typescript
/**
 * This interface is CONCEPTUAL for documentation purposes.
 * Actual implementation uses explicit functions, not class abstractions.
 */
interface ExchangeAdapter {
  // Account Data
  getBalance(): Promise<ExchangeBalance[]>;
  getPositions(): Promise<ExchangePosition[]>;
  getOpenOrders(): Promise<ExchangeOrder[]>;
  
  // Trade History
  getTrades(params: TradeHistoryParams): Promise<ExchangeTrade[]>;
  getIncome(params: IncomeHistoryParams): Promise<ExchangeIncome[]>;
  
  // Validation
  validateCredentials(): Promise<ValidationResult>;
  
  // Meta
  readonly exchangeType: ExchangeType;
  readonly rateLimits: RateLimitConfig;
}
```

### Actual Implementation Pattern

Instead of abstract classes, we use:

1. **Exchange-specific Edge Functions**: `binance-futures/`, `bybit-futures/` (future)
2. **Mapper Functions**: Convert API responses to generic types
3. **Wrapper Hooks**: Abstract exchange selection from UI

---

## Type System Design

### Generic Domain Types

Located in `src/types/exchange.ts`:

```typescript
type ExchangeType = 'binance' | 'bybit' | 'okx';

interface ExchangePosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  marginType: 'isolated' | 'cross';
  liquidationPrice: number;
  source: ExchangeType;
}

interface ExchangeBalance {
  asset: string;
  total: number;
  available: number;
  unrealizedPnl: number;
  source: ExchangeType;
}

interface ExchangeTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  realizedPnl: number;
  commission: number;
  timestamp: number;
  source: ExchangeType;
}
```

### Mapper Pattern

Located in `src/lib/exchange-mappers.ts`:

```typescript
// Binance → Generic
function mapBinancePosition(bp: BinancePosition): ExchangePosition
function mapBinanceTrade(bt: BinanceTrade): ExchangeTrade
function mapBinanceBalance(bb: BinanceBalance): ExchangeBalance
```

### Type Mapping Rules

| Binance Field | Generic Field | Notes |
|---------------|---------------|-------|
| `positionAmt` | `size` | Absolute value |
| `positionAmt > 0` | `side: 'LONG'` | Derived |
| `positionAmt < 0` | `side: 'SHORT'` | Derived |
| `walletBalance` | `total` | Direct map |
| `availableBalance` | `available` | Direct map |

---

## Technical Debt Analysis

### Acceptable Debt (Keep for Now)

| Item | Reason | Impact When Adding Exchange |
|------|--------|----------------------------|
| Binance-prefixed hooks | Clarity over abstraction | Add new hooks alongside |
| `binance-futures` edge function | Direct implementation | Add new functions |
| `BinancePosition` types in UI | Working code | Add mappers |
| Hardcoded API endpoints | Single exchange focus | New functions per exchange |

### Risky Debt (Already Mitigated)

| Item | Risk | Mitigation | Status |
|------|------|------------|--------|
| No generic types | UI coupled to Binance | Created `exchange.ts` | ✅ Done |
| No mappers | Raw API types in UI | Created `exchange-mappers.ts` | ✅ Done |
| Exchange column unused | Dead code | Now documented as "ready" | ✅ Done |

### Debt to Fix Before Multi-Exchange

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Create wrapper hooks | High | 2h | `usePositions()` wrapping `useBinancePositions()` |
| Add exchange selector to Settings | High | 1h | Simple dropdown, same flow |
| Create bybit-futures function | High | 4h | Copy binance-futures structure |

---

## Migration Path

### Phase 1: Foundation (COMPLETED ✅)

- [x] Per-user credential storage with `exchange` column
- [x] Rate limit tracking per exchange
- [x] Encrypted API key storage
- [x] Credential validation flow

### Phase 2: Type Abstraction (COMPLETED ✅)

- [x] Create `src/types/exchange.ts` with generic types
- [x] Create `src/lib/exchange-mappers.ts` with Binance mappers
- [x] Document type mapping rules
- [x] Create this architecture documentation

### Phase 3: When Adding Bybit/OKX (FUTURE)

```
□ Create bybit-futures edge function
  └── Copy binance-futures structure
  └── Implement Bybit API calls
  └── Handle Bybit-specific rate limits

□ Create BybitMapper in exchange-mappers.ts
  └── mapBybitPosition()
  └── mapBybitTrade()
  └── mapBybitBalance()

□ Update Settings UI
  └── Add exchange selector dropdown
  └── Same credential form, just different exchange param
  
□ Create wrapper hooks (optional)
  └── usePositions(exchange) → routes to useBinancePositions or useBybitPositions
```

### Phase 4: UI Abstraction (OPTIONAL)

```
□ Create ExchangePositionsTab component
  └── Uses ExchangePosition type (generic)
  └── Receives data via mappers
  
□ Migrate components from BinancePosition → ExchangePosition
  └── Gradual, component by component
  └── Use mappers at hook level
```

---

## UX Principles

### Do's ✅

1. **Keep it simple**: Single exchange focus in UI until user adds another
2. **Same flow**: Adding Bybit credentials = same form as Binance
3. **Clear separation**: Each exchange has its own card in Settings
4. **No forced selection**: If only Binance connected, no dropdown shown

### Don'ts ❌

1. **No exchange selector on every page**: Only in Settings
2. **No combined position view (yet)**: Each exchange shows separately
3. **No complex aggregation**: Keep data sources clear
4. **No premature abstraction**: Add layers when needed

### Visual Design for Multi-Exchange

```
┌────────────────────────────────────────────────────┐
│ Settings > Exchange                                 │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │ 🟡 Binance Futures           Connected  │       │
│  │ API Key: abc1****xyz9                   │       │
│  │ [Test Connection] [Remove]              │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │ ⚪ Bybit Futures            Coming Soon │       │
│  │ Connect your Bybit account when ready   │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  ┌─────────────────────────────────────────┐       │
│  │ ⚪ OKX Futures              Coming Soon │       │
│  │ Connect your OKX account when ready     │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## Recommendations

### Anti-Patterns to Avoid

1. **Don't create abstract `ExchangeGateway` class now**
   - Reason: Premature abstraction
   - Instead: Use explicit functions per exchange

2. **Don't add exchange selector to every page**
   - Reason: UX complexity
   - Instead: Show data from connected exchange(s)

3. **Don't force polymorphism before needed**
   - Reason: Over-engineering
   - Instead: Add mappers at hook boundary

4. **Don't rewrite existing hooks**
   - Reason: Working code is valuable
   - Instead: Add new hooks alongside, deprecate later

### Best Practices

1. **Use mappers at hook level**: Convert to generic types before returning
2. **Keep edge functions exchange-specific**: Easier to maintain
3. **Document mapping rules**: Each exchange has quirks
4. **Test credentials separately**: Different validation per exchange

---

## Related Documentation

- [Database Analysis](./COMPLETE_DATABASE_ANALYSIS.md) - Schema details
- [Binance Integration](./BINANCE_INTEGRATION.md) - Binance-specific docs
- [Backend Architecture](./BACKEND.md) - Edge functions overview

---

## Security Notes

### Credential Storage

Current implementation uses **base64 encoding** for API key storage in `exchange_credentials` table:

```sql
-- Current: Base64 encoding (obfuscation, NOT encryption)
v_encrypted_key := encode(convert_to(p_api_key, 'UTF8'), 'base64');
```

| Column | Format | Security Level | Risk |
|--------|--------|----------------|------|
| `api_key_encrypted` | Base64 | Obfuscation | Medium - readable if DB leaked |
| `api_secret_encrypted` | Base64 | Obfuscation | Medium - readable if DB leaked |

**Mitigations in Place:**
- Row Level Security (RLS) prevents other users from reading
- Service role key only used in Edge Functions (server-side)
- Credentials never sent to frontend

**For Production Multi-Tenant:**
Consider upgrading to Supabase Vault (`vault.secrets` table) or external KMS.

### Rate Limit Cleanup

Auto-cleanup is handled via database trigger:

```sql
-- Trigger: tr_auto_cleanup_rate_limits
-- Fires: AFTER INSERT on api_rate_limits
-- Behavior: Deletes records older than 1 hour when table > 10000 rows
```

This eliminates the need for `pg_cron` extension.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-01 | Initial architecture documentation created |
| 2026-02-01 | Added generic types (`src/types/exchange.ts`) |
| 2026-02-01 | Added security notes section |
| 2026-02-01 | Created `usePositions()` and `useExchangeBalance()` wrapper hooks |
| 2026-02-01 | Added auto-cleanup trigger for rate limits |
| 2026-02-01 | Created credential rotation integration tests |
| 2026-02-01 | Added mappers (`src/lib/exchange-mappers.ts`) |
