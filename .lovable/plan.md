
# Implementation Plan: API Key Flow, Vault Encryption, Rate Limit Tracking

## Executive Summary

Tiga task utama yang akan diimplementasikan:

1. **Verifikasi & Lengkapi API Key Flow** - UI untuk add/test/remove API key
2. **Vault Encryption** - Enkripsi api_key dan api_secret menggunakan Supabase Vault
3. **Rate Limit Tracking** - Tracking per-user untuk mencegah API quota exhaustion

---

## Current State Analysis

### Issues Found

| Component | Current State | Issue |
|-----------|---------------|-------|
| Edge Function | Uses `Deno.env.get('BINANCE_API_KEY')` | Global keys, NOT per-user |
| Settings UI | Shows "Test Connection" only | No add/remove API key UI |
| Credentials Table | Exists with RLS | Empty, no UI to populate |
| Encryption | Column named `api_key_encrypted` | But stored as plain text |
| Rate Limiting | None | No tracking table exists |

### What Works

- `exchange_credentials` table with proper RLS policies
- `supabase_vault` extension installed (v0.3.1)
- `_shared/retry.ts` handles Binance rate limit errors
- JWT auth header IS sent to Edge Function

---

## Implementation Plan

### Phase 1: API Key Management Flow (Frontend + Hook)

**Goal**: User dapat add, test, dan remove API key dari Settings page.

#### 1.1 Create `useExchangeCredentials` Hook

```text
src/hooks/use-exchange-credentials.ts
```

Functions:
- `fetchCredentials()` - Get current active credential
- `saveCredentials({ apiKey, apiSecret, label })` - Insert new, deactivate old
- `testCredentials()` - Call validate action
- `deleteCredentials(id)` - Remove credential
- `updateCredentials(id, updates)` - Update label/status

#### 1.2 Update Settings UI

```text
src/components/settings/BinanceApiSettings.tsx
```

Add:
- API Key input form (masked)
- API Secret input form (masked)  
- Save button (with validation)
- Delete button (with confirmation)
- Connection status display
- Last validated timestamp

UI Flow:
```text
┌─────────────────────────────────────────────────────┐
│  Binance Futures API                    [Connected] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  API Key: ████████████████████████xxxx    [Show]    │
│  API Secret: ••••••••••••••••••••••••     [Show]    │
│                                                     │
│  Label: [Main Account        ]                      │
│                                                     │
│  [Test Connection]  [Save Changes]  [Remove]        │
│                                                     │
│  Last validated: 2 minutes ago ✅                    │
│  Permissions: Read, Futures                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 1.3 Update Edge Function for Per-User Credentials

```text
supabase/functions/binance-futures/index.ts
```

Changes:
1. Extract user_id from JWT
2. Lookup credentials from `exchange_credentials` table
3. Decrypt using Vault
4. Use per-user credentials for HMAC signing
5. Remove fallback to env vars

---

### Phase 2: Supabase Vault Encryption

**Goal**: API keys dienkripsi at-rest menggunakan Supabase Vault.

#### 2.1 Database Migration

Create database functions for encrypt/decrypt:

```sql
-- Function to encrypt and store credentials
CREATE OR REPLACE FUNCTION public.save_exchange_credential(
  p_api_key TEXT,
  p_api_secret TEXT,
  p_exchange TEXT DEFAULT 'binance',
  p_label TEXT DEFAULT 'Main Account'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_credential_id UUID;
BEGIN
  -- Deactivate existing credentials for this exchange
  UPDATE exchange_credentials 
  SET is_active = false, updated_at = now()
  WHERE user_id = v_user_id 
    AND exchange = p_exchange 
    AND is_active = true;
  
  -- Insert new credential with encrypted values
  INSERT INTO exchange_credentials (
    user_id,
    exchange,
    api_key_encrypted,
    api_secret_encrypted,
    label,
    is_active
  )
  VALUES (
    v_user_id,
    p_exchange,
    vault.encrypt(p_api_key::BYTEA),
    vault.encrypt(p_api_secret::BYTEA),
    p_label,
    true
  )
  RETURNING id INTO v_credential_id;
  
  RETURN v_credential_id;
END;
$$;

-- Function to decrypt credentials (for Edge Function)
CREATE OR REPLACE FUNCTION public.get_decrypted_credential(
  p_user_id UUID,
  p_exchange TEXT DEFAULT 'binance'
)
RETURNS TABLE (
  api_key TEXT,
  api_secret TEXT,
  label TEXT,
  permissions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    convert_from(vault.decrypt(ec.api_key_encrypted::BYTEA), 'UTF8'),
    convert_from(vault.decrypt(ec.api_secret_encrypted::BYTEA), 'UTF8'),
    ec.label,
    ec.permissions
  FROM exchange_credentials ec
  WHERE ec.user_id = p_user_id
    AND ec.exchange = p_exchange
    AND ec.is_active = true
  LIMIT 1;
END;
$$;
```

#### 2.2 Edge Function Integration

Update `binance-futures/index.ts`:

```typescript
async function getUserCredentials(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .rpc('get_decrypted_credential', {
      p_user_id: userId,
      p_exchange: 'binance'
    })
    .single();
  
  if (error || !data) {
    throw new Error('No valid API credentials found');
  }
  
  return {
    apiKey: data.api_key,
    apiSecret: data.api_secret
  };
}
```

---

### Phase 3: Rate Limit Tracking

**Goal**: Track API usage per-user untuk mencegah quota exhaustion.

#### 3.1 Create Rate Limit Table

```sql
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL DEFAULT 'binance',
  endpoint_category TEXT NOT NULL, -- 'account', 'market', 'order'
  weight_used INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_exchange_window 
    UNIQUE (user_id, exchange, endpoint_category, window_start)
);

-- Enable RLS
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own rate limits"
  ON api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);
```

#### 3.2 Rate Limit Functions

```sql
-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_exchange TEXT,
  p_category TEXT,
  p_weight INTEGER DEFAULT 1
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_weight INTEGER,
  max_weight INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_weight INTEGER;
  v_max_weight INTEGER;
BEGIN
  -- Binance limits: 2400/min for most, 1200/min for orders
  v_max_weight := CASE p_category
    WHEN 'order' THEN 1200
    ELSE 2400
  END;
  
  -- Current minute window
  v_window_start := date_trunc('minute', now());
  v_window_end := v_window_start + interval '1 minute';
  
  -- Get or create rate limit record
  INSERT INTO api_rate_limits (
    user_id, exchange, endpoint_category, 
    weight_used, window_start, window_end
  )
  VALUES (
    v_user_id, p_exchange, p_category,
    p_weight, v_window_start, v_window_end
  )
  ON CONFLICT (user_id, exchange, endpoint_category, window_start)
  DO UPDATE SET 
    weight_used = api_rate_limits.weight_used + p_weight,
    last_request_at = now()
  RETURNING weight_used INTO v_current_weight;
  
  RETURN QUERY SELECT 
    v_current_weight <= v_max_weight,
    v_current_weight,
    v_max_weight,
    v_window_end;
END;
$$;
```

#### 3.3 Edge Function Rate Limit Check

```typescript
// Before each Binance API call
async function checkRateLimit(
  supabase: SupabaseClient, 
  category: string, 
  weight: number
) {
  const { data, error } = await supabase
    .rpc('check_rate_limit', {
      p_exchange: 'binance',
      p_category: category,
      p_weight: weight
    })
    .single();
  
  if (!data?.allowed) {
    const retryAfter = Math.ceil(
      (new Date(data.reset_at).getTime() - Date.now()) / 1000
    );
    throw new RateLimitError(
      `Rate limit exceeded. Retry after ${retryAfter}s`,
      retryAfter
    );
  }
}
```

#### 3.4 Frontend Rate Limit Hook

```text
src/hooks/use-api-rate-limit.ts
```

```typescript
export function useApiRateLimit() {
  return useQuery({
    queryKey: ['api-rate-limit'],
    queryFn: async () => {
      const { data } = await supabase
        .from('api_rate_limits')
        .select('*')
        .gte('window_end', new Date().toISOString())
        .order('window_start', { ascending: false });
      
      return data;
    },
    refetchInterval: 10000, // 10s refresh
  });
}
```

#### 3.5 Rate Limit Widget (Optional)

Display in Settings or Dashboard:

```text
┌───────────────────────────────────┐
│  API Usage (Current Minute)       │
├───────────────────────────────────┤
│  Account: ████████░░ 1850/2400    │
│  Orders:  ███░░░░░░░ 350/1200     │
│  Resets in: 23s                   │
└───────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/use-exchange-credentials.ts` | CRUD hook for credentials |
| `src/hooks/use-api-rate-limit.ts` | Rate limit monitoring |
| `src/components/settings/ApiKeyForm.tsx` | API key input form |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/settings/BinanceApiSettings.tsx` | Add full API key management UI |
| `supabase/functions/binance-futures/index.ts` | Per-user credential lookup, rate limit check |
| `supabase/functions/_shared/rate-limit.ts` | Shared rate limit utility |

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `..._create_vault_functions.sql` | Encrypt/decrypt functions |
| `..._create_rate_limits_table.sql` | Rate limit tracking table |

---

## Implementation Order

```text
Phase 1: API Key Flow (3-4 hours)
├── 1.1 Create useExchangeCredentials hook
├── 1.2 Create ApiKeyForm component
├── 1.3 Update BinanceApiSettings UI
└── 1.4 Test add/test/remove flow

Phase 2: Vault Encryption (2-3 hours)
├── 2.1 Create migration for Vault functions
├── 2.2 Update Edge Function credential lookup
├── 2.3 Update hook to use RPC functions
└── 2.4 Test encryption/decryption

Phase 3: Rate Limit Tracking (2-3 hours)
├── 3.1 Create rate_limits table migration
├── 3.2 Create check_rate_limit function
├── 3.3 Integrate into Edge Function
├── 3.4 Create useApiRateLimit hook
└── 3.5 Add rate limit display (optional)

Documentation Update (30 min)
├── Update BINANCE_INTEGRATION.md
└── Update COMPLETE_DATABASE_ANALYSIS.md
```

---

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| Encryption at Rest | Vault encrypt/decrypt |
| Encryption in Transit | HTTPS only |
| Access Control | RLS + SECURITY DEFINER |
| Key Visibility | Masked in UI, never logged |
| Credential Rotation | Deactivate old on save new |

---

## Technical Notes

### Vault Encryption Format

Supabase Vault menggunakan `pgsodium` untuk enkripsi:
- Algorithm: `xchacha20poly1305`
- Key management: Automatic via Vault extension
- Decryption: Only via `vault.decrypt()` function

### Binance Rate Limits

| Endpoint Type | Weight Limit | Window |
|---------------|--------------|--------|
| General (account, positions) | 2400 | 1 minute |
| Order placement | 1200 | 1 minute |
| IP-based (if no API key) | 1200 | 1 minute |

### Error Handling

Rate limit exceeded flow:
1. Edge Function returns `{ error: 'Rate limited', retryAfter: 30 }`
2. Frontend shows toast with countdown
3. React Query auto-retries after `retryAfter` seconds
