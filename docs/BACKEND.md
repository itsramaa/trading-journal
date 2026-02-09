# Backend Architecture (Edge Functions)

## Overview

Backend dijalankan melalui **Supabase Edge Functions** (Deno runtime) yang berfungsi sebagai:
1. API proxy untuk Binance (dengan HMAC signature)
2. AI processing layer
3. External API aggregation

## Edge Functions List

```
supabase/functions/
├── binance-futures/        # Binance authenticated API proxy
├── binance-market-data/    # Binance public market data
├── ai-preflight/           # Pre-trade AI validation
├── trade-quality/          # Trade quality scoring
├── dashboard-insights/     # AI dashboard insights
├── post-trade-analysis/    # Post-trade AI analysis
├── confluence-detection/   # Confluence validation
├── macro-analysis/         # Macro market analysis
├── market-insight/         # Market sentiment
├── economic-calendar/      # Economic events
├── youtube-strategy-import/# YouTube strategy extraction (enhanced)
├── backtest-strategy/      # Strategy backtesting (with session analysis)
├── check-permission/       # Feature permission check
├── sync-trading-pairs/     # Trading pairs sync
├── strategy-clone-notify/  # Clone notification
└── trading-analysis/       # General trading analysis
```

## Function Details

### binance-futures

**Purpose**: Secure proxy for Binance Futures authenticated endpoints.

**Supported Actions**:
| Action | Endpoint | Description |
|--------|----------|-------------|
| `validate` | `/fapi/v2/account` | Validate API credentials |
| `balance` | `/fapi/v2/balance` | Get wallet balance |
| `positions` | `/fapi/v2/positionRisk` | Get open positions |
| `trades` | `/fapi/v1/userTrades` | Get trade history |
| `open-orders` | `/fapi/v1/openOrders` | Get open orders |
| `income` | `/fapi/v1/income` | Get income history |
| `commission-rate` | `/fapi/v1/commissionRate` | Get fee rates |
| `leverage-brackets` | `/fapi/v1/leverageBracket` | Get leverage tiers |
| `force-orders` | `/fapi/v1/forceOrders` | Get liquidations |
| `position-mode` | `/fapi/v1/positionSide/dual` | Get hedge mode |
| `all-orders` | `/fapi/v1/allOrders` | Get all orders |
| `symbol-config` | (internal) | Get symbol config |
| `adl-quantile` | `/fapi/v1/adlQuantile` | Get ADL risk |
| `transaction-history` | `/fapi/v1/income` (filtered) | Get transfers |
| `request-download` | `/fapi/v1/income/asyn` | Request CSV export |
| `get-download` | `/fapi/v1/income/asyn/id` | Get export status |

**Request Format**:
```typescript
{
  action: string;
  apiKey: string;
  apiSecret: string;
  // Additional params per action
  symbol?: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}
```

**Response Format**:
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}
```

### binance-market-data

**Purpose**: Public Binance market data (no auth required).

**Supported Actions**:
| Action | Description |
|--------|-------------|
| `top-trader-ratio` | Long/Short ratio |
| `open-interest` | Open interest data |
| `taker-volume` | Taker buy/sell volume |
| `funding-rate` | Funding rate history |
| `klines` | Candlestick data |
| `ticker-24hr` | 24hr price change |
| `historical-volatility` | Volatility data |
| `top-movers` | Price change leaders |

### ai-preflight

**Purpose**: Pre-trade AI validation sebelum entry.

**Input**:
```typescript
{
  pair: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  marketContext?: MarketContext;
}
```

**Output**:
```typescript
{
  score: number;        // 0-100
  recommendation: 'PROCEED' | 'CAUTION' | 'AVOID';
  reasons: string[];
  warnings: string[];
}
```

### trade-quality

**Purpose**: Score trade quality untuk analysis.

**Input**: Trade entry data
**Output**: Quality score (0-100) dengan breakdown

### dashboard-insights

**Purpose**: Generate AI insights untuk dashboard widget.

**Input**: User trading history, market context
**Output**: Recommendations, warnings, best setups

### post-trade-analysis

**Purpose**: Analyze completed trade untuk lessons learned.

**Input**: Closed trade data
**Output**: Analysis (what went well, improvements, patterns)

### confluence-detection

**Purpose**: Validate trade confluences.

**Input**: Entry rules, market data
**Output**: Confluence score, met/unmet rules

### macro-analysis

**Purpose**: Macro market analysis using AI.

**Input**: Market data, news context
**Output**: Macro outlook, risk factors

### market-insight

**Purpose**: Multi-symbol market sentiment analysis.

**Input**: Symbol atau symbols array
**Output**: Sentiment score, signals, recommendation

### economic-calendar

**Purpose**: Fetch economic events.

**Input**: Date range
**Output**: Events dengan impact level

### youtube-strategy-import

**Purpose**: Extract trading strategy dari YouTube video dengan AI.

**Input**: YouTube URL
**Output**: Parsed strategy dengan full schema alignment

**Extracted Fields**:
| Field | Description |
|-------|-------------|
| `strategyName` | Nama strategi |
| `description` | Deskripsi lengkap |
| `methodology` | ICT, SMC, Price Action, Indicator-based, Hybrid |
| `tradingStyle` | Scalping, Day Trading, Swing, Position |
| `timeframeContext` | Primary, Higher TF, Lower TF (MTFA) |
| `sessionPreference` | Trading session yang direkomendasikan |
| `difficultyLevel` | Beginner, Intermediate, Advanced |
| `entryRules` | Array of entry conditions dengan source quote |
| `exitRules` | TP, SL, trailing stop logic |
| `suitablePairs` | Pair yang cocok untuk strategi |
| `indicatorsUsed` | Indikator yang digunakan |
| `conceptsUsed` | Konsep trading (Order Blocks, FVG, dll) |
| `riskManagement` | SL logic, position sizing rules |

**Accuracy Pipeline**:
1. Transcript acquisition (mandatory)
2. Quality validation
3. Methodology detection
4. Structured extraction
5. Actionability gate (blocks if incomplete)

### backtest-strategy

**Purpose**: Run strategy backtest dengan historical data dan session analysis.

**Input**: Strategy rules, pair, date range, session filter
**Output**: Metrics (win rate, profit factor, trades), equity curve, session breakdown

**Enhanced Features**:
| Feature | Description |
|---------|-------------|
| MTFA Assumptions | Higher/Lower TF context in results |
| Methodology Badge | Display strategy methodology |
| Session Auto-Apply | Apply strategy.session_preference to filter |
| Trade Session Tags | Each trade tagged with entry session |

### strategy-clone-notify

**Purpose**: Send notification saat strategy di-clone.

**Input**: Strategy ID, cloner info
**Output**: Success status

## Edge Function Pattern

```typescript
// Standard structure
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type, ...',
};

Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Parse request
    const body = await req.json();
    
    // 3. Auth check (optional)
    const authHeader = req.headers.get('Authorization');
    
    // 4. Process based on action
    const result = await processAction(body);
    
    // 5. Return success
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    // 6. Error handling
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

## Binance HMAC Signature

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

## External APIs

### Binance Futures API
- Base URL: `https://fapi.binance.com`
- Auth: HMAC SHA256 signature
- Rate limits: See Binance docs

### Fear & Greed Index
- Source: Alternative.me
- Endpoint: `https://api.alternative.me/fng/`
- No auth required

### Economic Calendar
- Custom API integration
- Returns upcoming economic events

### Lovable AI
- Model: Gemini 2.5 Flash
- Used for: Trade analysis, strategy extraction, insights

## Error Handling

```typescript
// Standard error response
{
  success: false,
  error: "Error message",
  code: -1001  // Binance error code if applicable
}

// Common Binance error codes
-1001: Unknown error
-1002: Auth failed
-1003: Rate limit
-1021: Invalid timestamp
-2014: Invalid API key
-2015: Invalid signature
```

## Environment Variables

Edge functions access secrets via:
```typescript
const apiKey = Deno.env.get('BINANCE_API_KEY');
```

User-specific credentials passed in request body (encrypted in transit).
