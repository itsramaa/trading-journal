# Security Architecture

**Last Updated:** 2026-02-16

## Overview

Trading Journey implements defense-in-depth security across all layers: authentication, data access, credential management, and API communication.

## Authentication

### Auth Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Auth.tsx   │────►│ Supabase Auth│────►│  JWT Token   │
│              │     │              │     │  (access +   │
│ Email/Pass   │     │ Email verify │     │   refresh)   │
│ Google OAuth │     │ OAuth flow   │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │ RLS      │ │ Edge     │ │ Storage  │
                              │ Policies │ │ Functions│ │ Policies │
                              └──────────┘ └──────────┘ └──────────┘
```

### Auth Methods
| Method | Description |
|--------|-------------|
| Email/Password | Standard signup with email verification required |
| Google OAuth | Via Lovable Cloud managed SSO |
| Password Reset | Email-based reset with redirect |

### Protected Routes

```typescript
// src/components/ProtectedRoute.tsx
// Wraps all authenticated routes
// Redirects to /auth if no session
// Uses services.auth.onAuthStateChange() for real-time auth state
```

## Row-Level Security (RLS)

**Every table** in the database has RLS enabled. The standard policy pattern:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own data"
ON table_name FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON table_name FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON table_name FOR UPDATE
USING (auth.uid() = user_id);
```

### RLS Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE | Special |
|-------|--------|--------|--------|--------|---------|
| `trade_entries` | Own only (non-deleted) | Own | Own | Own | `deleted_at IS NULL` filter |
| `trading_strategies` | Own + shared (via `share_token`) | Own | Own | Own | Public read for shared |
| `exchange_credentials` | Own | Own | Own | Own | Encrypted at rest |
| `accounts` | Own (non-deleted) | Own | Own | Own | `deleted_at IS NULL` filter |
| `user_settings` | Own | Own | Own | ✗ | No delete allowed |
| `users_profile` | Own | Own | Own | ✗ | No delete allowed |
| `risk_profiles` | Own | Own | Own | Own | — |
| `trading_pairs` | **Public** | ✗ | ✗ | ✗ | Read-only reference |
| `feature_permissions` | **Public** | Admin only | Admin only | Admin only | — |
| `user_roles` | Own | Own/Admin | Admin only | Admin only | — |
| `backtest_results` | Own | Own | ✗ | Own | Immutable results |
| `notifications` | Own | Own | Own | Own | — |
| `api_rate_limits` | Own | ✗ | ✗ | ✗ | Managed by RPC only |
| `audit_logs` | Own | Own | ✗ | ✗ | Append-only |

## Exchange Credential Security

### Encryption Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    CREDENTIAL STORAGE                           │
│                                                                 │
│  1. User enters API Key + Secret in Settings                    │
│                        │                                        │
│                        ▼                                        │
│  2. save_exchange_credential() RPC (SECURITY DEFINER)          │
│     ├─ Retrieves encryption key from Supabase Vault            │
│     │   └─ private_get_encryption_key()                        │
│     │       └─ vault.decrypted_secrets → 'exchange_credentials │
│     │          _encryption_key'                                │
│     ├─ Encrypts with pgp_sym_encrypt()                         │
│     ├─ Stores as Base64-encoded ciphertext                     │
│     └─ Deactivates previous credentials                        │
│                        │                                        │
│  3. Stored in exchange_credentials table                        │
│     ├─ api_key_encrypted: Base64(pgp_sym_encrypt(key))         │
│     └─ api_secret_encrypted: Base64(pgp_sym_encrypt(secret))   │
│                                                                 │
│  4. Retrieval: get_decrypted_credential() RPC                  │
│     ├─ SECURITY DEFINER (bypasses RLS for decryption)          │
│     ├─ pgp_sym_decrypt(decode(ciphertext, 'base64'), key)      │
│     └─ Only returns to authenticated user's own credentials     │
│                                                                 │
│  5. Display: get_credential_status() RPC                        │
│     └─ Returns masked key (first 4 + **** + last 4)            │
└────────────────────────────────────────────────────────────────┘
```

### Key Security Properties

| Property | Implementation |
|----------|----------------|
| **Encryption at rest** | `pgp_sym_encrypt()` via pgcrypto extension |
| **Key management** | Encryption key stored in Supabase Vault |
| **Access control** | RLS + SECURITY DEFINER functions |
| **Key masking** | Only masked key shown in UI (`xxxx****xxxx`) |
| **Credential isolation** | Per-user, per-exchange |
| **Soft delete** | `is_active = false` instead of hard delete |

### Important Note on Base64

The `api_key_encrypted` and `api_secret_encrypted` columns contain Base64-encoded ciphertext, NOT Base64-encoded plaintext. The flow is:

```
Plaintext → pgp_sym_encrypt() → Binary Ciphertext → Base64 Encoding → Stored in TEXT column
```

## Edge Function Security

### JWT Authentication Pattern

All authenticated Edge Functions verify the JWT token:

```typescript
// Standard auth check in edge functions
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabaseClient.auth.getUser(token);
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
}
```

### Per-User Credential Lookup

Edge Functions never use shared API keys for user operations:

```typescript
// Edge function fetches per-user credentials
const { data: credential } = await supabase.rpc('get_decrypted_credential', {
  p_user_id: user.id,
  p_exchange: 'binance',
});

// HMAC signing with user's own secret
const signature = await createHmacSignature(queryString, credential.api_secret);
```

### CORS Configuration

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

## Data Integrity

### Trade Data Immutability

```sql
-- Trigger: prevent_live_trade_core_update
-- Blocks modification of core fields for live/binance trades
CREATE TRIGGER prevent_live_trade_core_update
BEFORE UPDATE ON trade_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_live_trade_core_update();

-- Protected fields: entry_price, direction, quantity, stop_loss
```

### Trade Mode Isolation

- Trade mode (`paper`/`live`) is immutable after creation
- Paper trades never appear in live analytics
- Enforced via `validate_trade_entry_enums()` trigger
- `useModeFilteredTrades` hook ensures UI isolation

### Soft Delete with Recovery

```sql
-- Trades are soft-deleted (deleted_at timestamp)
-- RLS policy excludes soft-deleted from SELECT
-- 30-day recovery window before permanent deletion
-- permanent_delete_old_trades() runs periodically
```

## Rate Limiting

### API Rate Limit System

```sql
-- check_rate_limit() RPC
-- Per-user, per-endpoint category, per-exchange
-- Weight-based (Binance uses weight system)
-- 1-minute sliding window
-- Security: Users can only check their own rate limits
```

### Sync Quota

```sql
-- check_sync_quota() / increment_sync_quota() RPCs
-- Daily sync limit per user (configurable, default 10)
-- Prevents excessive API usage
-- Security: Users can only modify their own quota
```

## Permission System

### Role-Based Access Control

```
auth.users
    │
    ├──► user_roles (app_role: 'admin' | 'user')
    │
    └──► user_settings (subscription_tier: 'free' | 'pro' | 'business')
```

### Feature Gating

```sql
-- has_permission(_user_id, _feature_key) → boolean
-- Checks: admin bypass OR (subscription tier ≥ min_subscription AND NOT admin_only)
--
-- has_subscription(_user_id, _min_tier) → boolean
-- Tier hierarchy: free < pro < business
```

## Storage Security

### Buckets

| Bucket | Public | Purpose | Access |
|--------|--------|---------|--------|
| `avatars` | ✅ Yes | User profile pictures | Public read, owner write |
| `trade-screenshots` | ❌ No | Trade chart screenshots | Owner only |

## Audit Trail

```sql
-- audit_logs table
-- Append-only (INSERT + SELECT only, no UPDATE/DELETE)
-- Tracks: action, entity_type, entity_id, ip_address, user_agent
-- Protected by RLS (users see only their own logs)
```

## Security Best Practices

1. **Never store API keys in frontend code** — Use Edge Functions as proxy
2. **Never log decrypted credentials** — Keys are decrypted only in memory
3. **Always verify JWT in Edge Functions** — No anonymous access to user data
4. **Use SECURITY DEFINER sparingly** — Only for credential encryption/decryption
5. **Validate enums at database level** — Triggers prevent invalid state
6. **Soft delete sensitive data** — Recovery window before permanent removal
7. **Rate limit all external API calls** — Prevent abuse and quota exhaustion
