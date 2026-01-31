# Trading Domain Model

## Binance Futures Trading Lifecycle

```
1. OPEN POSITION
   ├─ User places order on Binance
   ├─ Order executed → Position opens
   └─ Recorded: Entry Price, Leverage, Margin
       
2. HOLD POSITION
   ├─ Mark Price updates continuously
   ├─ Unrealized P&L calculated: (Mark - Entry) × Qty
   └─ Funding Fee charged/received every 8 hours
       
3. CLOSE POSITION
   ├─ User closes position (market/limit)
   ├─ REALIZED_PNL event generated
   ├─ COMMISSION event generated
   └─ Position cleared
       
4. POST-TRADE
   ├─ Sync to journal (auto-sync or manual)
   ├─ Enrich with notes, screenshots, strategy
   └─ AI post-trade analysis
```

## Income Types (Binance API)

| Income Type | Domain Entity | Is Trade? | Display Location |
|-------------|---------------|-----------|------------------|
| `REALIZED_PNL` | Trade P&L | **YES** | Trade History |
| `COMMISSION` | Trading Fee | NO | Financial Summary |
| `FUNDING_FEE` | Funding Cost/Income | NO | Financial Summary |
| `TRANSFER` | Deposit/Withdrawal | NO | Transactions |
| `INTERNAL_TRANSFER` | Wallet Transfer | NO | Transactions |
| `COMMISSION_REBATE` | Fee Rebate | NO | Financial Summary |
| `API_REBATE` | API Rebate | NO | Financial Summary |
| `WELCOME_BONUS` | Promo Bonus | NO | Financial Summary |
| `REFERRAL_KICKBACK` | Referral Reward | NO | Financial Summary |
| `CONTEST_REWARD` | Contest Prize | NO | Financial Summary |

**Critical Rule**: Hanya `REALIZED_PNL` yang di-sync sebagai trade entry.

## P&L Hierarchy

```
ACCOUNT LEVEL (Binance Wallet)
├── Total Wallet Balance
├── Available Balance
├── Unrealized P&L (sum of open positions)
├── Margin Used
└── Cross/Isolated Margin Mode

POSITION LEVEL (Open Position)
├── Entry Price
├── Mark Price
├── Position Amount
├── Unrealized P&L
├── Leverage
├── Liquidation Price
└── Margin (Isolated) or Cross Wallet

TRADE LEVEL (Closed Trade)
├── Gross P&L = REALIZED_PNL
├── Commission = COMMISSION
├── Funding = FUNDING_FEE (during hold)
└── Net P&L = Gross - Commission - Funding + Rebates

PERIOD ANALYTICS (Daily/Weekly/Monthly)
├── Total Gross P&L
├── Total Fees (commission + funding paid)
├── Total Rebates
├── Total Net P&L
├── Trade Count
├── Win Rate
├── Profit Factor
├── Expectancy
└── Max Drawdown
```

## Net P&L Calculation

```typescript
// Per trade (simplified)
const netPnl = grossPnl - commission;

// Period aggregate (accurate)
const netPnl = grossPnl 
  - totalCommission 
  - fundingPaid 
  + fundingReceived 
  + totalRebates;

// Formula in code (use-binance-daily-pnl.ts)
const netPnl = grossPnl - totalCommission + totalFunding + totalRebates;
// Note: totalFunding sudah signed (negative = paid, positive = received)
```

## Risk Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `risk_per_trade_percent` | 2% | Max risk per single trade |
| `max_daily_loss_percent` | 5% | Daily loss limit (triggers trading block) |
| `max_weekly_drawdown_percent` | 10% | Weekly drawdown limit |
| `max_position_size_percent` | 40% | Max capital per position |
| `max_correlated_exposure` | 0.75 | Max correlation coefficient |
| `max_concurrent_positions` | 3 | Max simultaneous positions |

## Market Context Model

```typescript
interface UnifiedMarketContext {
  // Fear & Greed (0-100)
  fearGreed: {
    value: number;       // 0-100
    label: string;       // 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
    timestamp: number;
  };
  
  // Volatility (ATR-based)
  volatility: {
    atr: number;
    atrPercent: number;
    level: 'low' | 'medium' | 'high' | 'extreme';
  };
  
  // Economic Events
  events: {
    hasHighImpact: boolean;
    upcomingCount: number;
    nextEvent?: EconomicEvent;
  };
  
  // Market Momentum
  momentum: {
    score: number;       // -100 to +100
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    signals: MomentumSignal[];
  };
  
  // Timestamp
  capturedAt: string;
}
```

## Trade Entry States

```
PENDING
  │ User enters trade via wizard
  ▼
ACTIVE (Open)
  │ Position opened, unrealized P&L tracking
  ▼
CLOSED
  │ Position closed, realized P&L recorded
  ▼
ENRICHED
    Notes, screenshots, AI analysis added
```

## Trade Sources

| Source | Description | Auto-sync |
|--------|-------------|-----------|
| `binance` | Synced from Binance API | Yes |
| `paper` | Paper trading (manual) | No |
| `manual` | Manual entry | No |

## Strategy Entry Rules

```typescript
type EntryRuleType = 
  | 'indicator'   // Technical indicator condition
  | 'price'       // Price action pattern
  | 'volume'      // Volume condition
  | 'trend'       // Trend confirmation
  | 'confluence'  // Multiple conditions
  | 'custom';     // Custom rule

interface EntryRule {
  id: string;
  type: EntryRuleType;
  name: string;
  description: string;
  required: boolean;
}
```

## Trading Session Model

```typescript
interface TradingSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  mood: string;           // 'excellent' | 'good' | 'neutral' | 'anxious' | 'frustrated'
  market_condition: string;
  pnl: number;
  trades_count: number;
  rating: number;         // 1-5
  notes: string | null;
  tags: string[];
}
```

## Correlation Model

```typescript
// Hardcoded crypto correlations (approximation)
const CRYPTO_CORRELATIONS: Record<string, number> = {
  'BTCUSDT-ETHUSDT': 0.82,
  'BTCUSDT-BNBUSDT': 0.75,
  'BTCUSDT-SOLUSDT': 0.78,
  'ETHUSDT-BNBUSDT': 0.70,
  'ETHUSDT-SOLUSDT': 0.65,
};

// Warning threshold
const CORRELATION_WARNING_THRESHOLD = 0.6;
```

## Subscription Tiers

| Tier | Features |
|------|----------|
| `free` | Basic journaling, manual entry |
| `pro` | AI features, Binance sync, backtesting |
| `business` | All features, priority support |
