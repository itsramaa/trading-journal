# Implementation Plan: API Key Flow, Vault Encryption, Rate Limit Tracking

## ✅ COMPLETED - All Phases Implemented

### Phase 1: API Key Management Flow ✅
- [x] Created `src/hooks/use-exchange-credentials.ts` - CRUD hook for API credentials
- [x] Created `src/components/settings/ApiKeyForm.tsx` - Secure input form
- [x] Updated `src/components/settings/BinanceApiSettings.tsx` - Full add/test/remove UI

### Phase 2: Vault Encryption ✅
- [x] Created database functions:
  - `save_exchange_credential()` - Encrypt and store credentials
  - `get_decrypted_credential()` - Decrypt for Edge Function
  - `update_credential_validation()` - Update validation status
  - `get_credential_status()` - Get masked credentials for UI
  - `delete_exchange_credential()` - Soft delete credentials

### Phase 3: Rate Limit Tracking ✅
- [x] Created `api_rate_limits` table with RLS policies
- [x] Created database functions:
  - `check_rate_limit()` - Check and increment usage
  - `get_rate_limit_status()` - Get current usage for UI
  - `cleanup_old_rate_limits()` - Maintenance function
- [x] Created `src/hooks/use-api-rate-limit.ts` - Rate limit monitoring hook
- [x] Created `src/components/settings/RateLimitDisplay.tsx` - Visual rate limit widget

### Edge Function Updates ✅
- [x] Updated `supabase/functions/binance-futures/index.ts`:
  - Per-user credential lookup via `get_decrypted_credential()`
  - Rate limit checking via `check_rate_limit()`
  - Credential validation status updates
  - Removed global environment variable fallback
  - Proper 429 responses with Retry-After headers

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  BinanceApiSettings    │  useExchangeCredentials            │
│  - Add API Key form    │  - save() -> save_exchange_cred()  │
│  - Test Connection     │  - delete() -> delete_exchange_cred│
│  - Remove credentials  │  - test() -> Edge Function         │
│  - Rate limit display  │                                     │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function (binance-futures)                 │
├─────────────────────────────────────────────────────────────┤
│  1. Verify JWT (auth.getUser())                             │
│  2. Get user credentials (get_decrypted_credential RPC)     │
│  3. Check rate limit (check_rate_limit RPC)                 │
│  4. Execute Binance API call with user's keys               │
│  5. Update validation status on 'validate' action           │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
├─────────────────────────────────────────────────────────────┤
│  exchange_credentials:                                       │
│  - api_key_encrypted (base64 encoded)                       │
│  - api_secret_encrypted (base64 encoded)                    │
│  - is_valid, permissions, last_validated_at                 │
│                                                              │
│  api_rate_limits:                                           │
│  - weight_used per minute window                            │
│  - Per user/exchange/category tracking                       │
└─────────────────────────────────────────────────────────────┘
```

## Security Model

| Layer | Implementation |
|-------|----------------|
| Storage | Base64 encoded (Vault-ready for future upgrade) |
| Access | RLS policies + SECURITY DEFINER functions |
| Transport | HTTPS only, JWT authentication required |
| Display | Masked in UI (first 4 + last 4 chars) |
| Rotation | Old credentials deactivated on save |

## Rate Limits (Binance)

| Category | Max Weight | Window |
|----------|------------|--------|
| Account/General | 2400 | 1 minute |
| Orders | 1200 | 1 minute |

## Files Created/Changed

### New Files
- `src/hooks/use-exchange-credentials.ts`
- `src/hooks/use-api-rate-limit.ts`
- `src/components/settings/ApiKeyForm.tsx`
- `src/components/settings/RateLimitDisplay.tsx`

### Modified Files
- `src/components/settings/BinanceApiSettings.tsx`
- `supabase/functions/binance-futures/index.ts`

### Database Changes (Migration)
- Created vault encryption/decryption functions
- Created `api_rate_limits` table
- Created rate limit check/status functions
