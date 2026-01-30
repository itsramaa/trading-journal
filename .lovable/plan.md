
# Binance Futures API Implementation Plan

## Executive Summary

Dokumentasi di `docs/binance/` menjelaskan implementasi menggunakan **Python/Flask backend**. Namun, project ini adalah **React + Vite + Supabase** yang tidak dapat menjalankan Python. Implementasi akan diadaptasi menggunakan **Supabase Edge Functions** (Deno/TypeScript) untuk menyediakan Binance Futures API integration.

---

## Architecture Adaptation

### Original (Documentation)
```text
Frontend (HTML/JS) → Flask Backend → Binance API
```

### Adapted (This Project)
```text
React Frontend → Supabase Edge Function → Binance API
                         ↓
                  Secrets: BINANCE_API_KEY
                          BINANCE_API_SECRET
```

---

## Implementation Scope

### What Will Be Implemented

| Feature | Edge Function Endpoint | Frontend Hook |
|---------|----------------------|---------------|
| Validate API Keys | POST `/binance-futures` action: `validate` | `useBinanceConnection` |
| Get Account Balance | GET `/binance-futures` action: `balance` | `useBinanceBalance` |
| Get Positions | GET `/binance-futures` action: `positions` | `useBinancePositions` |
| Get Trade History | GET `/binance-futures` action: `trades` | `useBinanceTrades` |
| Get Open Orders | GET `/binance-futures` action: `open-orders` | `useBinanceOrders` |
| Place Order | POST `/binance-futures` action: `place-order` | `usePlaceBinanceOrder` |
| Cancel Order | POST `/binance-futures` action: `cancel-order` | `useCancelBinanceOrder` |

### What Will NOT Be Implemented

1. **Order Execution from App** - Safety concern: Traders should execute orders directly on Binance
2. **Real-time Position Sync** - Can poll periodically instead
3. **WebSocket Streams** - Edge functions don't support persistent connections

---

## Files to Create

### 1. Edge Function: `supabase/functions/binance-futures/index.ts`

**Purpose:** Unified Binance Futures API wrapper

**Features:**
- HMAC SHA256 signature generation for authenticated endpoints
- Multiple actions via single function (validate, balance, positions, trades, orders)
- Rate limiting awareness
- Proper error handling

**Binance Futures Base URL:** `https://fapi.binance.com`

**Required Endpoints:**
```text
GET  /fapi/v2/balance       → Account balance
GET  /fapi/v2/positionRisk  → Current positions
GET  /fapi/v1/userTrades    → Trade history
GET  /fapi/v1/openOrders    → Open orders
POST /fapi/v1/order         → Place order
DELETE /fapi/v1/order       → Cancel order
```

---

### 2. Feature Types: `src/features/binance/types.ts`

**Types:**
```typescript
interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
}

interface BinanceBalance {
  totalWalletBalance: number;
  availableBalance: number;
  totalUnrealizedProfit: number;
  totalMarginRequired: number;
}

interface BinancePosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfit: number;
  leverage: number;
  side: 'LONG' | 'SHORT';
}

interface BinanceTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  realizedPnl: number;
  commission: number;
  time: string;
}

interface BinanceOrder {
  orderId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price: number;
  origQty: number;
  executedQty: number;
  status: string;
  time: string;
}
```

---

### 3. React Hooks: `src/features/binance/useBinanceFutures.ts`

**Hooks:**
- `useBinanceConnection()` - Validate & store API keys
- `useBinanceBalance()` - Get account balance
- `useBinancePositions(symbol?)` - Get current positions
- `useBinanceTrades(symbol, limit)` - Get trade history
- `useBinanceOpenOrders(symbol?)` - Get open orders

---

### 4. Feature Index: `src/features/binance/index.ts`

**Purpose:** Export all binance feature modules

---

### 5. Settings Integration: Update `src/pages/Settings.tsx`

**Add new tab:** "Binance API" under Security tab

**UI Components:**
- API Key input (password masked)
- API Secret input (password masked)
- Validate & Save button
- Connection status indicator
- Last connected timestamp
- Test connection button

---

### 6. Active Positions Enhancement

**Update:** `src/components/dashboard/ActivePositionsTable.tsx`

**Features:**
- Add option to fetch real positions from Binance
- Display real-time unrealized P&L from Binance
- Sync button to refresh data

---

## Edge Function Implementation Detail

### HMAC Signature Generation (Binance Requirement)

```typescript
async function createSignature(
  queryString: string, 
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(queryString)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Request Flow

```text
1. Frontend sends action + params to Edge Function
2. Edge Function adds timestamp
3. Creates query string with all params
4. Generates HMAC signature
5. Calls Binance API with signature
6. Returns formatted response
```

---

## Security Considerations

### API Key Storage

**Option A: Environment Secrets (Recommended)**
- Store in Supabase secrets via settings UI
- Edge function reads from `Deno.env.get()`
- Single user setup

**Option B: Per-User Database Storage**
- Encrypt API keys before storing
- Store in user_settings.metadata
- Multi-user support
- Requires encryption key management

**Decision:** Start with Option A (secrets), can migrate to Option B later

---

### Permission Validation

Edge function will validate API key has ONLY:
- Futures trading permission
- Read-only access
- NO withdrawal permission

```typescript
// Test API key by calling account info
const accountInfo = await fetch('/fapi/v2/account');
// If successful, key is valid
```

---

## Files to Modify

### 1. `supabase/config.toml`

**Add:**
```toml
[functions.binance-futures]
verify_jwt = false
```

---

### 2. `src/pages/Settings.tsx`

**Add:** New "Exchange" tab with Binance API configuration

---

### 3. `docs/ai_plan.md`

**Update:** Add Binance Futures implementation status

---

## Implementation Order

1. **Create types** - `src/features/binance/types.ts`
2. **Create edge function** - `supabase/functions/binance-futures/index.ts`
3. **Register in config.toml**
4. **Create React hooks** - `src/features/binance/useBinanceFutures.ts`
5. **Create feature index** - `src/features/binance/index.ts`
6. **Update Settings.tsx** - Add Exchange API tab
7. **Create Settings component** - `src/components/settings/BinanceApiSettings.tsx`
8. **Update documentation** - `docs/ai_plan.md`

---

## API Key Configuration

Since the edge function needs Binance API credentials, users will need to add secrets:

**Required Secrets:**
- `BINANCE_API_KEY` - User's Binance API key
- `BINANCE_API_SECRET` - User's Binance API secret

The Settings page will provide a UI to:
1. Input API key and secret
2. Test connection
3. Save to Supabase secrets (via edge function)

---

## Testing Strategy

### Manual Testing
1. Configure API key in Settings
2. Verify connection status shows "Connected"
3. Check Dashboard shows real positions (if any)
4. Verify trade history displays correctly

### Edge Function Testing
```bash
# Test validate action
curl -X POST [EDGE_FUNCTION_URL]/binance-futures \
  -H "Content-Type: application/json" \
  -d '{"action": "validate"}'

# Test balance action
curl -X POST [EDGE_FUNCTION_URL]/binance-futures \
  -H "Content-Type: application/json" \
  -d '{"action": "balance"}'
```

---

## Limitations & Trade-offs

### Trade-off 1: No Real-time WebSocket
**Problem:** Edge functions can't maintain persistent connections
**Solution:** Use polling with 30-second intervals for position updates
**Impact:** Slight delay in position data, acceptable for journaling

### Trade-off 2: Order Execution
**Problem:** Executing orders from journal app adds risk
**Solution:** Initially read-only, order placement optional
**Impact:** Users manually execute on Binance, sync to journal

### Trade-off 3: Single User API Key
**Problem:** Secrets are project-wide, not per-user
**Solution:** Store encrypted in user_settings for multi-user later
**Impact:** V1 works for single trader, upgrade path exists

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| API key validation works | Connection status shows "Connected" |
| Balance displays correctly | Real USDT balance from Binance |
| Positions sync | Active positions from Binance visible |
| Trade history | Recent trades displayed with P&L |
| Error handling | Clear error messages for invalid keys |
| Secure storage | API keys never exposed in frontend |

---

## Notes

### Yang Sengaja Tidak Diubah
1. **Python code dari dokumentasi** - Tidak applicable untuk project ini
2. **Flask endpoints** - Diganti dengan Supabase Edge Functions
3. **HTML templates** - Sudah ada React components

### Adaptasi yang Dibuat
1. **Python → TypeScript (Deno)** - Edge function runtime
2. **Flask routes → Single edge function with actions** - Simpler deployment
3. **Environment variables → Supabase secrets** - Managed secrets
4. **localStorage → Supabase secrets** - Secure storage
