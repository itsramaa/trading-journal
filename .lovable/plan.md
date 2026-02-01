
# Binance Integration Architecture Audit

## Executive Summary

The current Binance Futures integration is **architecturally sound** for a single-exchange system with **identified limitations** for multi-exchange readiness. The system follows the principle of "Binance as Source of Truth" correctly, with clear separation between Edge Functions (gateway) and Frontend (consumer).

---

## 1. Current Binance Integration Summary

### Architecture Overview

```text
┌─────────────────────┐
│     Frontend        │
│  (React + Hooks)    │
│                     │
│  useBinance*()      │
│  React Query Cache  │
└─────────┬───────────┘
          │ HTTP POST
          ▼
┌─────────────────────┐
│   Edge Functions    │
│                     │
│  binance-futures    │ ◄── Authenticated (HMAC SHA256)
│  binance-market-data│ ◄── Public endpoints
└─────────┬───────────┘
          │ HTTPS
          ▼
┌─────────────────────┐
│   Binance API       │
│  fapi.binance.com   │
└─────────────────────┘
```

### Implementation Completeness

| Category | Endpoints | Status |
|----------|-----------|--------|
| Account Data | 12 endpoints | ✅ Complete |
| Market Data | 10 endpoints | ✅ Complete |
| Advanced Analytics | 8 endpoints | ✅ Complete |
| Bulk Export | 3 endpoints | ✅ Complete |
| Transaction History | 1 endpoint | ✅ Complete |

**Total: 34+ endpoints integrated across 6 phases**

---

## 2. Binance Coupling Assessment

### ⚠️ CRITICAL FINDING: Global API Keys (Not Per-User)

**Current Implementation** (lines 1203-1205 in `binance-futures/index.ts`):
```typescript
const apiKey = Deno.env.get('BINANCE_API_KEY');
const apiSecret = Deno.env.get('BINANCE_API_SECRET');
```

**Issue**: API keys are retrieved from **environment secrets** (global), NOT per-user storage.

**Impact**:
- ❌ ALL users share the SAME Binance API credentials
- ❌ Cannot support multi-user production deployment
- ❌ Security risk: one user's actions appear as another's
- ❌ Contradicts documentation claiming "user-specific API keys"

**Evidence from `docs/BINANCE_INTEGRATION.md` (line 379-383)**:
> "Keys stored in user's browser (settings page)... Passed to Edge Function per request"

This is **INCORRECT** based on actual implementation.

### Coupling Level Analysis

| Layer | Coupling | Assessment |
|-------|----------|------------|
| Edge Function | HIGH | Hardcoded `fapi.binance.com` URL, Binance-specific response parsing |
| Types | MODERATE | Types named `Binance*` but could be aliased |
| Hooks | MODERATE | Named `useBinance*` but internally generic |
| UI Components | LOW | Uses generic props, not Binance-specific |
| Domain Model | LOW | Uses generic trading terms (P&L, positions) |

---

## 3. API Key Architecture Review

### Current State (PROBLEMATIC)

```text
┌──────────────────────────────────────────────┐
│           Environment Secrets                │
│                                              │
│  BINANCE_API_KEY = "single_global_key"       │
│  BINANCE_API_SECRET = "single_global_secret" │
│                                              │
└──────────────────────────────────────────────┘
                    │
                    ▼
           ALL users share this
```

### Expected State (Per-User)

```text
┌────────────────────────────────────────────────┐
│              User Settings Table               │
│                                                │
│  user_id | exchange | api_key_enc | secret_enc │
│  --------|----------|-------------|------------|
│  user_1  | binance  | enc(...)    | enc(...)   │
│  user_2  | binance  | enc(...)    | enc(...)   │
│  user_N  | bybit    | enc(...)    | enc(...)   │ ◄── Future
└────────────────────────────────────────────────┘
                    │
                    ▼
           Per-user credential lookup
```

### Database Schema Gap

The `accounts` table has:
- `metadata JSONB` - could store encrypted API keys
- But NO dedicated `api_credentials` table exists

**OPEN QUESTION**: Where should per-user API credentials be stored?

Options:
1. `accounts.metadata` (current implicit assumption)
2. New `exchange_credentials` table (recommended)
3. External secrets manager (Vault pattern)

---

## 4. Edge Function Gateway Review

### Positive Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| CORS Handling | ✅ Good | Proper preflight response |
| HMAC Signature | ✅ Secure | Standard implementation |
| Error Handling | ✅ Good | Binance error codes preserved |
| Response Normalization | ✅ Good | Consistent `{success, data, error}` format |
| Retry Logic | ⚠️ Partial | Exists in `_shared/retry.ts` but not used everywhere |

### Issues Identified

1. **No Authentication on Edge Function**
   - Anyone with Supabase anon key can call `binance-futures`
   - Should verify user JWT and match to their API keys

2. **No Rate Limit Protection**
   - No tracking of Binance weight usage per user
   - Could exhaust shared API quota quickly

3. **Response Parsing Coupled to Binance**
   - Field names like `positionAmt`, `unrealizedProfit` are Binance-specific
   - Normalization happens but uses Binance field names in internal types

### Isolation Quality

```text
┌─────────────────────────────────────────────────────────┐
│                 Edge Function Layer                      │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │ Binance API     │───►│ Response Normalization      │ │
│  │ (Raw Response)  │    │ (Still Binance-shaped)      │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│                                      │                   │
└──────────────────────────────────────│───────────────────┘
                                       ▼
                              Frontend receives
                              Binance-shaped data
```

**Assessment**: Normalization exists but is **not exchange-agnostic**.

---

## 5. Domain Normalization Findings

### Type System Analysis

| Type Name | Exchange-Specific | Recommendation |
|-----------|-------------------|----------------|
| `BinancePosition` | ✅ Yes | Should alias to `ExchangePosition` |
| `BinanceBalance` | ✅ Yes | Should alias to `ExchangeBalance` |
| `BinanceTrade` | ✅ Yes | Should alias to `ExchangeTrade` |
| `BinanceIncome` | ✅ Yes | Should alias to `ExchangeIncome` |
| `BinanceIncomeType` | ✅ Yes | Should map to generic `IncomeType` |

### Domain Terms Used

| Binance Term | Domain Term | Status |
|--------------|-------------|--------|
| `REALIZED_PNL` | Gross P&L | ⚠️ Used directly |
| `COMMISSION` | Fee | ⚠️ Used directly |
| `FUNDING_FEE` | Funding | ⚠️ Used directly |
| `positionAmt` | Quantity | ⚠️ Used directly |
| `unrealizedProfit` | Unrealized P&L | ⚠️ Used directly |

**Issue**: Binance-specific terms leak into domain layer.

### Sync Logic (use-binance-sync.ts)

```typescript
// Line 50-51
const direction = binanceTrade.side === "BUY" ? "LONG" : "SHORT";
const result = binanceTrade.realizedPnl > 0 ? "win" : ...;
```

**Assessment**: Mapping logic is correct but hardcoded to Binance conventions.

---

## 6. Multi-Exchange Readiness (COMING SOON)

### Readiness Checklist

| Requirement | Ready? | Notes |
|-------------|--------|-------|
| Per-user API key storage | ❌ NO | Global env var currently |
| Exchange identifier in DB | ⚠️ PARTIAL | `source` field exists but not exchange-agnostic |
| Type abstraction | ⚠️ PARTIAL | Types exist but named Binance* |
| Edge function routing | ❌ NO | `binance-futures` is monolithic |
| UI exchange selector | ❌ NO | Not needed now per spec |
| Rate limit per exchange | ❌ NO | No tracking |

### What Would Be Needed

```text
Phase A: Foundation (Required First)
├── Per-user API credential storage
├── Generic exchange types (ExchangePosition, etc.)
└── Exchange credential lookup in Edge Functions

Phase B: Abstraction (Before Adding Exchange)
├── Exchange factory pattern in Edge Functions
├── Unified response transformer
└── Exchange-agnostic hooks (useExchangeBalance)

Phase C: Implementation (Per Exchange)
├── Bybit Edge Function
├── OKX Edge Function
└── Exchange-specific type mappings
```

### Estimated Effort to Add Bybit

| Task | Effort | Blocked By |
|------|--------|------------|
| Create `bybit-futures` Edge Function | 2-3 days | Nothing |
| Add per-user credential storage | 2-3 days | Schema design |
| Update frontend hooks | 1-2 days | Type abstraction |
| Exchange selector UI | 1 day | Per-user credentials |
| **Total** | **6-9 days** | Credential architecture |

---

## 7. Acceptable vs Risky Technical Debt

### ✅ Acceptable Debt (Single Exchange Focus)

| Debt | Reason Acceptable |
|------|-------------------|
| Binance-prefixed types | Clear naming, easy to alias later |
| Hardcoded `fapi.binance.com` | Only one exchange now |
| Binance-specific income types | Category mapping exists |
| No exchange selector UI | Not needed per spec |

### ❌ Risky Debt (Must Fix Soon)

| Debt | Risk Level | Impact |
|------|------------|--------|
| Global API keys | 🔴 CRITICAL | Cannot support multi-user production |
| No Edge Function auth | 🔴 HIGH | Anyone can call with anon key |
| No rate limit tracking | 🟡 MEDIUM | Could exhaust Binance quota |
| Documentation mismatch | 🟡 MEDIUM | Claims per-user keys but isn't |

### Debt Prioritization

```text
Priority 1 (Block Production):
└── Fix API key architecture (per-user)

Priority 2 (Security):
└── Add JWT verification to Edge Functions

Priority 3 (Reliability):
└── Add rate limit tracking
└── Add retry logic to all endpoints

Priority 4 (Multi-Exchange Prep):
└── Create type aliases
└── Document exchange abstraction pattern
```

---

## 8. High-Level Improvement Recommendations

### Immediate (Before Production)

1. **Implement Per-User API Credentials**
   - Create `exchange_credentials` table
   - Encrypt API secrets at rest
   - Lookup credentials per-user in Edge Functions

2. **Secure Edge Functions**
   - Verify JWT in all authenticated endpoints
   - Match user_id to their credentials

3. **Update Documentation**
   - Clarify actual API key storage (not browser)
   - Document security model accurately

### Short-Term (This Quarter)

4. **Add Type Aliases**
   ```typescript
   // In src/types/exchange.ts
   export type ExchangePosition = BinancePosition;
   export type ExchangeBalance = BinanceAccountSummary;
   ```

5. **Create Exchange Abstraction Layer**
   ```typescript
   // In src/services/exchange.ts
   export function getExchangeAdapter(exchange: 'binance' | 'bybit') {
     // Factory pattern for future exchanges
   }
   ```

6. **Add Rate Limit Tracking**
   - Track weight usage per user
   - Implement backoff on 429

### Long-Term (Multi-Exchange Prep)

7. **Modular Edge Functions**
   - Create shared exchange interface
   - Per-exchange implementation files

8. **Database Schema Update**
   - Add `exchange` column to relevant tables
   - Create `exchange_credentials` table

---

## 9. Open Questions / Assumptions

### Open Questions

1. **API Key Storage**: Current implementation uses global env vars. Is this intentional for MVP/demo, or is this a bug?

2. **Multi-User Support**: Is the system intended to support multiple users with their own Binance accounts?

3. **Testnet vs Mainnet**: Is there support for Binance testnet? Not found in current implementation.

4. **API Key Rotation**: What's the process for rotating API keys? Currently would require secret update.

### Assumptions Made

1. The global API key is a temporary/demo configuration
2. Production will require per-user credential storage
3. Multi-exchange is truly "COMING SOON" (not imminent)
4. Current Binance-centric naming is acceptable for now

---

## Conclusion

### Strengths
- Clean Edge Function gateway pattern
- Proper HMAC signature implementation
- Comprehensive endpoint coverage (34+ endpoints)
- Good type definitions
- Correct domain model for trading lifecycle

### Critical Issues
- 🔴 **Global API keys** - Cannot support multiple users
- 🔴 **No Edge Function auth** - Security vulnerability
- 🟡 **Documentation mismatch** - Claims per-user, isn't

### Multi-Exchange Readiness
- **Architecture**: 60% ready (structure exists)
- **Implementation**: 20% ready (too Binance-specific)
- **Blocking Factor**: Per-user credential storage

### Recommended Next Step
Fix the API key architecture before any production deployment. This is the single most critical blocker for both multi-user support and multi-exchange readiness.
