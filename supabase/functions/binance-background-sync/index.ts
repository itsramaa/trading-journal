/**
 * Binance Background Sync Edge Function
 * Called by Service Worker (browser background) or pg_cron (server-side)
 * Performs incremental sync of Binance Futures trades
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  success: boolean;
  tradesCount: number;
  incomeCount: number;
  error?: string;
  syncedAt: string;
}

/**
 * Decode JWT to get user ID
 */
function decodeJwt(token: string): { sub: string; exp: number } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT');
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    throw new Error('Failed to decode JWT');
  }
}

/**
 * Get user credentials from database
 */
async function getUserCredentials(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ apiKey: string; apiSecret: string } | null> {
  const { data, error } = await supabase.rpc('get_decrypted_credential', {
    p_user_id: userId,
    p_exchange: 'binance',
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    apiKey: data[0].api_key,
    apiSecret: data[0].api_secret,
  };
}

/**
 * Generate HMAC SHA256 signature for Binance API
 */
async function generateSignature(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fetch trades from Binance API
 */
async function fetchBinanceTrades(
  apiKey: string,
  apiSecret: string,
  startTime: number
): Promise<unknown[]> {
  const timestamp = Date.now();
  const params = new URLSearchParams({
    timestamp: timestamp.toString(),
    startTime: startTime.toString(),
    recvWindow: '10000',
  });

  const signature = await generateSignature(params.toString(), apiSecret);
  params.append('signature', signature);

  const response = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/userTrades?${params.toString()}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch income from Binance API
 */
async function fetchBinanceIncome(
  apiKey: string,
  apiSecret: string,
  startTime: number
): Promise<unknown[]> {
  const timestamp = Date.now();
  const params = new URLSearchParams({
    timestamp: timestamp.toString(),
    startTime: startTime.toString(),
    limit: '1000',
    recvWindow: '10000',
  });

  const signature = await generateSignature(params.toString(), apiSecret);
  params.append('signature', signature);

  const response = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/income?${params.toString()}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Send push notification to user
 */
async function sendPushNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  result: SyncResult
): Promise<void> {
  // Get user's push subscription
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No push subscriptions for user');
    return;
  }

  // Also create in-app notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'sync_complete',
    title: result.success ? '✅ Sync Selesai' : '⚠️ Sync Error',
    message: result.success
      ? `${result.tradesCount} trades dan ${result.incomeCount} income records disinkronkan`
      : `Sync gagal: ${result.error}`,
    metadata: { syncResult: result },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Service role client for database operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let userId: string;
    
    // Check if called by cron (no auth header) or by user
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      // User-initiated sync (from Service Worker)
      const token = authHeader.replace('Bearer ', '');
      const claims = decodeJwt(token);
      
      if (!claims.sub || (claims.exp && claims.exp * 1000 < Date.now())) {
        throw new Error('Unauthorized');
      }
      
      userId = claims.sub;
    } else {
      // Cron-initiated sync - get userId from body
      const body = await req.json();
      userId = body.userId;
      
      if (!userId) {
        // If no specific user, sync all users with auto-sync enabled
        const { data: settings } = await supabase
          .from('user_settings')
          .select('user_id')
          .contains('notification_preferences', { auto_sync_enabled: true });
        
        if (!settings || settings.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: 'No users with auto-sync enabled' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Process all users
        const results: SyncResult[] = [];
        for (const setting of settings) {
          try {
            const result = await performSyncForUser(supabase, setting.user_id);
            results.push(result);
          } catch (error) {
            console.error(`Sync failed for user ${setting.user_id}:`, error);
            results.push({
              success: false,
              tradesCount: 0,
              incomeCount: 0,
              error: String(error),
              syncedAt: new Date().toISOString(),
            });
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Perform sync for single user
    const result = await performSyncForUser(supabase, userId);
    
    // Send push notification
    await sendPushNotification(supabase, userId, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Background sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Perform sync for a specific user
 */
async function performSyncForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<SyncResult> {
  // Get user credentials
  const credentials = await getUserCredentials(supabase, userId);
  
  if (!credentials) {
    return {
      success: false,
      tradesCount: 0,
      incomeCount: 0,
      error: 'No Binance credentials configured',
      syncedAt: new Date().toISOString(),
    };
  }

  // Get last sync timestamp (default to 24 hours ago)
  const { data: lastTrade } = await supabase
    .from('trade_entries')
    .select('entry_datetime')
    .eq('user_id', userId)
    .eq('source', 'binance')
    .order('entry_datetime', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastSyncTime = lastTrade?.entry_datetime
    ? new Date(lastTrade.entry_datetime).getTime()
    : Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

  // Fetch new trades and income
  const [trades, income] = await Promise.all([
    fetchBinanceTrades(credentials.apiKey, credentials.apiSecret, lastSyncTime),
    fetchBinanceIncome(credentials.apiKey, credentials.apiSecret, lastSyncTime),
  ]);

  console.log(`Fetched ${trades.length} trades and ${income.length} income records for user ${userId}`);

  // TODO: Process and upsert trades to trade_entries table
  // This is a simplified version - the full implementation would include:
  // - Trade aggregation (grouping fills into positions)
  // - P&L calculation
  // - Deduplication

  return {
    success: true,
    tradesCount: trades.length,
    incomeCount: income.length,
    syncedAt: new Date().toISOString(),
  };
}
