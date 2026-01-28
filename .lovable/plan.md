

# Plan: Multi-Fix - Emergency Fund, Market Sessions, Macro Analysis, Calculator, and Pairs System

## Objective

Menerapkan beberapa perbaikan dan fitur baru:
1. **Hapus Emergency Fund** - Hapus default creation dan semua referensi
2. **Market Sessions Time Fix** - Konversi waktu session ke user's local time
3. **Pindah AI Macro Analysis** - Dari Calendar ke Market Insight
4. **AI Economic News Analysis** - Widget baru di Calendar
5. **Position Calculator Default** - Ambil dari risk profile settings
6. **Pairs Central System** - Fetch dari Binance API dan simpan ke database

---

## 1. Hapus Emergency Fund

### File: `src/hooks/use-auth.ts`

Hapus block kode yang membuat default emergency fund account (lines 60-75):

```typescript
// DELETE THIS BLOCK:
// Create default emergency fund account (type: emergency)
await supabase.from('accounts').upsert({
  user_id: user.id,
  name: 'Emergency Fund',
  account_type: 'emergency',
  ...
}, { onConflict: 'user_id,name,account_type', ignoreDuplicates: true });
```

### Database Migration

Tidak perlu drop tabel (backward compatible), hanya tidak create baru.

---

## 2. Market Sessions - User Local Time Conversion

### Problem
Saat ini jam session (Sydney 21:00-06:00, Tokyo 23:00-08:00, dll) dalam UTC.
User melihat jam lokal, tapi data session masih dalam UTC sehingga tidak cocok.

### Solution
Konversi jam UTC session ke jam lokal user untuk perbandingan yang akurat.

### File: `src/components/dashboard/MarketSessionsWidget.tsx`

```typescript
// Session times in their ACTUAL local times
const MARKET_SESSIONS_LOCAL = [
  { 
    name: 'Sydney', 
    // Sydney session: 07:00-16:00 AEDT (UTC+11)
    // Convert to UTC: 20:00-05:00 UTC
    utcOpenHour: 20, 
    utcCloseHour: 5,
    timezone: 'Australia/Sydney',
    icon: Sunrise,
    color: 'bg-purple-500',
  },
  { 
    name: 'Tokyo', 
    // Tokyo session: 09:00-18:00 JST (UTC+9)
    // Convert to UTC: 00:00-09:00 UTC
    utcOpenHour: 0, 
    utcCloseHour: 9,
    timezone: 'Asia/Tokyo',
    icon: Sun,
    color: 'bg-red-500',
  },
  { 
    name: 'London', 
    // London session: 08:00-17:00 GMT (UTC+0)
    utcOpenHour: 8, 
    utcCloseHour: 17,
    timezone: 'Europe/London',
    icon: Activity,
    color: 'bg-blue-500',
  },
  { 
    name: 'New York', 
    // NY session: 08:00-17:00 EST (UTC-5)
    // Convert to UTC: 13:00-22:00 UTC
    utcOpenHour: 13, 
    utcCloseHour: 22,
    timezone: 'America/New_York',
    icon: Sunset,
    color: 'bg-green-500',
  },
];

// Function to get user's timezone offset
function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset() / -60; // Returns hours offset from UTC
}

// Convert UTC hour to local hour
function utcToLocalHour(utcHour: number): number {
  const offset = getTimezoneOffset();
  let localHour = (utcHour + offset) % 24;
  if (localHour < 0) localHour += 24;
  return localHour;
}

// Check if session is active based on current UTC hour
function isSessionActive(session: typeof MARKET_SESSIONS_LOCAL[0], currentUtcHour: number): boolean {
  const { utcOpenHour, utcCloseHour } = session;
  
  if (utcOpenHour > utcCloseHour) {
    // Session spans midnight UTC
    return currentUtcHour >= utcOpenHour || currentUtcHour < utcCloseHour;
  }
  return currentUtcHour >= utcOpenHour && currentUtcHour < utcCloseHour;
}

// Display session times in user's local time
function formatSessionTimeLocal(session: typeof MARKET_SESSIONS_LOCAL[0]): string {
  const openLocal = utcToLocalHour(session.utcOpenHour);
  const closeLocal = utcToLocalHour(session.utcCloseHour);
  return `${formatTime(openLocal)}-${formatTime(closeLocal)}`;
}
```

### UI Update
Display session hours converted to user's local time:
```tsx
<p className="text-xs text-muted-foreground">
  {formatSessionTimeLocal(session)}
</p>
```

---

## 3. Pindah AI Macro Analysis ke Market Insight

### File: `src/pages/Calendar.tsx`

**Remove:**
- `MACRO_CONDITIONS` mock data
- AI Macro Analysis widget

**Keep:**
- Page header
- Upcoming Events
- Add AI Economic News Analysis widget (new)

### File: `src/pages/MarketInsight.tsx`

**Add AI Macro Analysis section** (after AI Market Sentiment):

```tsx
{/* AI Macro Analysis - moved from Calendar */}
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">AI Macro Analysis</CardTitle>
        <Badge variant="outline" className="text-xs">AI Powered</Badge>
      </div>
      <Button variant="ghost" size="sm" onClick={handleRefreshMacro}>
        <RefreshCw className={cn("h-4 w-4", macroLoading && "animate-spin")} />
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    {/* Overall Sentiment pill */}
    {/* Key Correlations Grid: DXY, S&P 500, 10Y Treasury, VIX */}
    {/* AI Summary */}
  </CardContent>
</Card>
```

---

## 4. AI Economic News Analysis Widget (Calendar)

### File: `src/pages/Calendar.tsx`

**Add new widget below Upcoming Events:**

```tsx
{/* AI Economic News Analysis */}
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Newspaper className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">AI Economic News Analysis</CardTitle>
        <Badge variant="outline" className="text-xs">AI Powered</Badge>
      </div>
      <Button variant="ghost" size="sm" onClick={handleRefreshNews}>
        <RefreshCw className={cn("h-4 w-4", newsLoading && "animate-spin")} />
      </Button>
    </div>
    <CardDescription>
      AI predictions based on upcoming economic data releases
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Today's Key Release */}
    <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <span className="font-semibold">Today: US CPI (YoY)</span>
        <Badge>High Impact</Badge>
      </div>
      <div className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Forecast:</span>
          <span className="font-mono">3.2%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Previous:</span>
          <span className="font-mono">3.4%</span>
        </div>
        <Separator className="my-2" />
        <div className="space-y-2">
          <p className="font-medium">AI Prediction:</p>
          <p className="text-muted-foreground">
            Expected slightly below consensus at 3.1%. Positive surprise could trigger 
            USD weakness and risk-on rally. Watch for BTC reaction in the first 30 minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="bg-profit/10">If Below: Bullish Crypto</Badge>
          <Badge variant="outline" className="bg-loss/10">If Above: Bearish Crypto</Badge>
        </div>
      </div>
    </div>
    
    {/* Upcoming High-Impact Events with Predictions */}
    {UPCOMING_NEWS_PREDICTIONS.map((news, idx) => (
      <div key={idx} className="p-3 rounded-lg border">
        <div className="flex items-center justify-between">
          <span className="font-medium">{news.event}</span>
          <span className="text-xs text-muted-foreground">{news.date} {news.time}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{news.aiPrediction}</p>
      </div>
    ))}
  </CardContent>
</Card>
```

---

## 5. Position Calculator - Default dari Risk Profile

### File: `src/components/risk/PositionSizeCalculator.tsx`

**Current Issue:** Default values hardcoded (balance: 10000, risk: 2%, etc.)

**Fix:** Fetch from risk profile dan user's account balance.

```typescript
export function PositionSizeCalculator({ 
  accountBalance: initialBalance,
  onCalculate 
}: PositionSizeCalculatorProps) {
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { data: accounts } = useAccounts();
  
  // Get total trading account balance
  const tradingBalance = useMemo(() => {
    if (!accounts) return initialBalance || 10000;
    const tradingAccounts = accounts.filter(a => 
      a.account_type === 'trading' && a.is_active
    );
    return tradingAccounts.reduce((sum, a) => sum + a.balance, 0) || initialBalance || 10000;
  }, [accounts, initialBalance]);
  
  // Initialize from risk profile
  const [accountBalance, setAccountBalance] = useState(tradingBalance);
  const [riskPercent, setRiskPercent] = useState(riskProfile?.risk_per_trade_percent || 2);
  
  // Update when profile loads
  useEffect(() => {
    if (riskProfile) {
      setRiskPercent(riskProfile.risk_per_trade_percent);
    }
  }, [riskProfile]);
  
  useEffect(() => {
    setAccountBalance(tradingBalance);
  }, [tradingBalance]);
  
  // ... rest of component
}
```

### File: `src/pages/RiskManagement.tsx`

Update Calculator tab to pass actual account balance:

```tsx
<TabsContent value="calculator">
  <PositionSizeCalculator /> {/* Will auto-fetch balance */}
</TabsContent>
```

---

## 6. Pairs Central System - Binance API Integration

### New Database Table: `trading_pairs`

**Migration:**

```sql
-- Create trading_pairs table
CREATE TABLE IF NOT EXISTS public.trading_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'binance_futures',
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_trading_pairs_symbol ON public.trading_pairs(symbol);
CREATE INDEX idx_trading_pairs_is_active ON public.trading_pairs(is_active);

-- RLS Policy (public read, admin write)
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trading pairs"
ON public.trading_pairs FOR SELECT
USING (true);

CREATE POLICY "System can insert trading pairs"
ON public.trading_pairs FOR INSERT
WITH CHECK (true);
```

### New Edge Function: `sync-trading-pairs`

**File: `supabase/functions/sync-trading-pairs/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch from Binance Futures API
    const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response from Binance API');
    }
    
    // Extract unique symbols
    const pairs = data.map((item: any) => {
      const symbol = item.symbol;
      // Parse base and quote (e.g., BTCUSDT -> BTC, USDT)
      const quoteAsset = symbol.endsWith('USDT') ? 'USDT' : 
                         symbol.endsWith('BUSD') ? 'BUSD' : 'USDT';
      const baseAsset = symbol.replace(quoteAsset, '');
      
      return {
        symbol,
        base_asset: baseAsset,
        quote_asset: quoteAsset,
        is_active: true,
        source: 'binance_futures',
        last_synced_at: new Date().toISOString(),
      };
    });
    
    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Upsert pairs (no duplicates)
    const { error } = await supabase
      .from('trading_pairs')
      .upsert(pairs, { 
        onConflict: 'symbol',
        ignoreDuplicates: false 
      });
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ 
      success: true, 
      pairs_synced: pairs.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### New Hook: `use-trading-pairs.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TradingPair {
  id: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  is_active: boolean;
  source: string;
  last_synced_at: string;
}

export function useTradingPairs() {
  return useQuery({
    queryKey: ["trading-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_pairs")
        .select("*")
        .eq("is_active", true)
        .order("symbol");
      
      if (error) throw error;
      return data as TradingPair[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useSyncTradingPairs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-trading-pairs');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-pairs"] });
    },
  });
}
```

### Settings: Pair Sync Schedule

**Add to User Settings (or system config):**

```typescript
// Default: Asia session start (based on user time)
// Typically: 20:00-21:00 UTC (Sydney open)
pair_sync_hour: number; // Hour in user's local time to sync pairs
```

### Integration Points

Update pair selection components to use the new central pairs list:

**File: `src/components/trade/entry/TradeDetails.tsx`**

```typescript
const { data: tradingPairs } = useTradingPairs();

// In form:
<Select onValueChange={(value) => form.setValue("pair", value)}>
  <SelectTrigger>
    <SelectValue placeholder="Select trading pair" />
  </SelectTrigger>
  <SelectContent>
    {tradingPairs?.map((pair) => (
      <SelectItem key={pair.symbol} value={pair.symbol}>
        {pair.symbol}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/use-auth.ts` | Remove emergency fund creation |
| `src/components/dashboard/MarketSessionsWidget.tsx` | Fix timezone conversion |
| `src/pages/Calendar.tsx` | Remove Macro, Add AI Economic News |
| `src/pages/MarketInsight.tsx` | Add Macro Analysis widget |
| `src/components/risk/PositionSizeCalculator.tsx` | Default from risk profile |
| `src/pages/RiskManagement.tsx` | Update calculator integration |
| `supabase/functions/sync-trading-pairs/index.ts` | **CREATE** - Binance sync |
| `src/hooks/use-trading-pairs.ts` | **CREATE** - Pairs hook |
| `src/components/trade/entry/TradeDetails.tsx` | Use central pairs |
| Database migration | **CREATE** - trading_pairs table |

---

## Technical Notes

### Market Sessions Timezone Logic

```text
User in Jakarta (UTC+7):
- Sydney opens at 20:00 UTC = 03:00 WIB (next day)
- Tokyo opens at 00:00 UTC = 07:00 WIB
- London opens at 08:00 UTC = 15:00 WIB
- NY opens at 13:00 UTC = 20:00 WIB

Display shows these converted local times.
Active status checked against current UTC hour.
```

### Pairs Sync Schedule

```text
Default: Sync at Asia session start
- User sets preferred hour in settings
- Edge function triggered via cron or manual
- Upsert ensures no duplicates
- Symbol extraction: BTCUSDT → BTC + USDT
```

### Calculator Data Flow

```text
Risk Profile (DB) → useRiskProfile hook
Accounts (DB) → useAccounts hook
                    ↓
PositionSizeCalculator (auto-populated)
- Account Balance: Sum of trading accounts
- Risk %: From risk_per_trade_percent
- Leverage: Default 1x
```

