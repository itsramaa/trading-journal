# Binance API Enhancement Proposal

## Executive Summary

Dokumen ini menguraikan **19 endpoint Binance Futures** yang belum diimplementasi namun sangat applicable untuk meningkatkan akurasi dan fitur Trading Journey application.

**Status Implementasi Saat Ini:**
- ✅ 8 endpoints sudah diimplementasi
- 🔄 19 endpoints berpotensi tinggi (proposal ini)
- ⏸️ Sisanya tidak relevan untuk use case read-only

**Update v2:** Ditambahkan 4 endpoint kritis yang terlewat:
- Force Orders (Liquidation History)
- Order Book Depth
- Aggregate Trades
- Position Mode

---

## 📊 Current Implementation Status

### Already Implemented (Edge Function: `binance-futures`)

| Action | Endpoint | Purpose |
|--------|----------|---------|
| `validate` | `/fapi/v2/account` | API validation |
| `balance` | `/fapi/v2/balance` | Account balance |
| `positions` | `/fapi/v2/positionRisk` | Active positions |
| `trades` | `/fapi/v1/userTrades` | Trade history (per symbol) |
| `open-orders` | `/fapi/v1/openOrders` | Open orders |
| `income` | `/fapi/v1/income` | P&L, Funding, Commission |
| `place-order` | `/fapi/v1/order` | Place order (TRADE permission) |
| `cancel-order` | `/fapi/v1/order` | Cancel order (TRADE permission) |

---

## 🚀 Proposed Enhancements

### Phase 1: Market Data Enhancement (PUBLIC - No API Key Required)

#### 1.1 Kline/Candlestick Data
```
Endpoint: GET /fapi/v1/klines
Permission: PUBLIC (no API key)
```

**Use Cases:**
- ✅ **Backtesting Engine**: Historical OHLCV data untuk simulasi strategy
- ✅ **Chart Display**: Candlestick chart di Trade Entry Wizard
- ✅ **AI Analysis**: Pattern recognition (doji, engulfing, etc.)

**Parameters:**
```typescript
interface KlineParams {
  symbol: string;      // e.g., "BTCUSDT"
  interval: string;    // 1m, 5m, 15m, 1h, 4h, 1d, 1w
  startTime?: number;  // Unix timestamp
  endTime?: number;
  limit?: number;      // Default 500, max 1500
}
```

**Impact:** HIGH - Meningkatkan akurasi backtesting dari mock data ke real data

---

#### 1.2 Mark Price
```
Endpoint: GET /fapi/v1/premiumIndex
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Position Sizing**: Kalkulasi accurate entry price
- ✅ **Risk Management**: Real-time liquidation distance
- ✅ **Unrealized P&L**: More accurate calculation

**Response Data:**
```typescript
interface MarkPrice {
  symbol: string;
  markPrice: number;
  indexPrice: number;
  estimatedSettlePrice: number;
  lastFundingRate: number;
  nextFundingTime: number;
  interestRate: number;
}
```

**Impact:** MEDIUM - Better accuracy for live P&L

---

#### 1.3 Funding Rate History
```
Endpoint: GET /fapi/v1/fundingRate
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Funding Rate Tracker**: Estimasi biaya holding
- ✅ **AI Insights**: Predict high funding scenarios
- ✅ **Daily P&L**: Breakdown funding costs

**Response:**
```typescript
interface FundingRate {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
}
```

**Impact:** MEDIUM - Better cost analysis

---

#### 1.4 Open Interest Statistics
```
Endpoint: GET /futures/data/openInterestHist
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Market Sentiment**: Volume analysis
- ✅ **Whale Tracking**: Large position detection
- ✅ **AI Confluence**: Market strength indicator

**Response:**
```typescript
interface OpenInterestStat {
  symbol: string;
  sumOpenInterest: number;
  sumOpenInterestValue: number;
  timestamp: number;
}
```

**Impact:** HIGH - Critical for sentiment analysis

---

#### 1.5 Top Trader Long/Short Position Ratio
```
Endpoint: GET /futures/data/topLongShortPositionRatio
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Professional Sentiment**: What top traders are doing
- ✅ **AI Trade Quality**: Contrarian indicator
- ✅ **Confluence Detection**: Alignment with pros

**Response:**
```typescript
interface TopTraderRatio {
  symbol: string;
  longShortRatio: number;
  longAccount: number;
  shortAccount: number;
  timestamp: number;
}
```

**Impact:** HIGH - Professional sentiment indicator

---

#### 1.6 Long/Short Ratio (Global)
```
Endpoint: GET /futures/data/globalLongShortAccountRatio
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Retail Sentiment**: Crowd positioning
- ✅ **Contrarian Signals**: Fade the crowd
- ✅ **AI Warnings**: Overcrowded trades

**Impact:** HIGH - Retail sentiment analysis

---

#### 1.7 Taker Buy/Sell Volume
```
Endpoint: GET /futures/data/takerlongshortRatio
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Buy/Sell Pressure**: Real-time aggression
- ✅ **Whale Detection**: Large taker orders
- ✅ **Entry Timing**: Momentum confirmation

**Response:**
```typescript
interface TakerVolume {
  buySellRatio: number;
  buyVol: number;
  sellVol: number;
  timestamp: number;
}
```

**Impact:** HIGH - Market pressure indicator

---

#### 1.8 Order Book Depth ⭐ NEW
```
Endpoint: GET /fapi/v1/depth
Permission: PUBLIC (no API key)
```

**Use Cases:**
- ✅ **Liquidity Analysis**: Detect support/resistance from order walls
- ✅ **Whale Detection**: Large limit orders (whale walls)
- ✅ **Entry Timing**: Identify liquidity gaps for better entries
- ✅ **Slippage Estimation**: Calculate expected slippage for large orders

**Parameters:**
```typescript
interface OrderBookParams {
  symbol: string;      // e.g., "BTCUSDT"
  limit?: number;      // 5, 10, 20, 50, 100, 500, 1000 (default 500)
}
```

**Response:**
```typescript
interface OrderBook {
  lastUpdateId: number;
  E: number;           // Message output time
  T: number;           // Transaction time
  bids: [string, string][];  // [price, quantity]
  asks: [string, string][];  // [price, quantity]
}
```

**Impact:** HIGH - Critical for whale tracking and liquidity analysis

---

#### 1.9 Aggregate Trades List ⭐ NEW
```
Endpoint: GET /fapi/v1/aggTrades
Permission: PUBLIC (no API key)
```

**Use Cases:**
- ✅ **Tick-by-Tick Analysis**: Detailed trade flow analysis
- ✅ **Large Trade Detection**: Identify whale market orders
- ✅ **Volume Profile**: Build accurate volume profiles
- ✅ **AI Pattern Recognition**: Detect accumulation/distribution patterns

**Parameters:**
```typescript
interface AggTradesParams {
  symbol: string;
  fromId?: number;     // Trade ID to fetch from
  startTime?: number;  // Unix timestamp
  endTime?: number;
  limit?: number;      // Default 500, max 1000
}
```

**Response:**
```typescript
interface AggregateTrade {
  a: number;           // Aggregate trade ID
  p: string;           // Price
  q: string;           // Quantity
  f: number;           // First trade ID
  l: number;           // Last trade ID
  T: number;           // Timestamp
  m: boolean;          // Was the buyer the maker?
}
```

**Impact:** HIGH - Essential for detailed trade flow analysis

---

#### 2.0 Force Orders (Liquidation History) ⭐ NEW - CRITICAL
```
Endpoint: GET /fapi/v1/forceOrders
Permission: USER_DATA (Read-Only)
```

**Use Cases:**
- ✅ **Liquidation History**: Track all forced liquidations
- ✅ **AI Risk Learning**: Learn from liquidation patterns to prevent future ones
- ✅ **Risk Analysis**: Identify problematic pairs/setups that led to liquidation
- ✅ **Risk Management**: Warning system based on historical liquidations

**Parameters:**
```typescript
interface ForceOrderParams {
  symbol?: string;     // Optional - filter by symbol
  autoCloseType?: 'LIQUIDATION' | 'ADL';
  startTime?: number;
  endTime?: number;
  limit?: number;      // Default 50, max 100
}
```

**Response:**
```typescript
interface ForceOrder {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: 'BUY' | 'SELL';
  positionSide: string;
  stopPrice: string;
  workingType: string;
  origType: string;
  time: number;
  updateTime: number;
}
```

**Impact:** 🔴 CRITICAL - Essential for risk management and AI learning

---

#### 2.0.1 Position Mode ⭐ NEW
```
Endpoint: GET /fapi/v1/positionSide/dual
Permission: USER_DATA (Read-Only)
```

**Use Cases:**
- ✅ **Trade Entry Wizard**: Validate positionSide before placing order
- ✅ **Settings Display**: Show current hedge/one-way mode
- ✅ **Order Validation**: Ensure correct LONG/SHORT/BOTH parameter

**Response:**
```typescript
interface PositionMode {
  dualSidePosition: boolean;  // true = Hedge Mode, false = One-way Mode
}
```

**Impact:** MEDIUM - Prevents order placement errors

---

### Phase 2: Account Data Enhancement (USER_DATA - API Key Required)

#### 2.1 User Commission Rate
```
Endpoint: GET /fapi/v1/commissionRate
Permission: USER_DATA (Read-Only)
```

**Use Cases:**
- ✅ **Net P&L Accuracy**: Exact fee calculation
- ✅ **Position Size Calculator**: Include actual fees
- ✅ **Daily P&L**: Accurate commission breakdown

**Response:**
```typescript
interface CommissionRate {
  symbol: string;
  makerCommissionRate: number;  // e.g., 0.0002
  takerCommissionRate: number;  // e.g., 0.0004
}
```

**Impact:** MEDIUM - More accurate P&L

---

#### 2.2 Leverage Brackets
```
Endpoint: GET /fapi/v1/leverageBracket
Permission: USER_DATA (Read-Only)
```

**Use Cases:**
- ✅ **Position Size Calculator**: Max notional limits
- ✅ **Risk Warnings**: Leverage tier alerts
- ✅ **Entry Wizard**: Dynamic leverage suggestions

**Response:**
```typescript
interface LeverageBracket {
  symbol: string;
  brackets: {
    bracket: number;
    initialLeverage: number;
    notionalCap: number;
    notionalFloor: number;
    maintMarginRatio: number;
    cum: number;
  }[];
}
```

**Impact:** MEDIUM - Better position sizing

---

#### 2.3 All Orders History
```
Endpoint: GET /fapi/v1/allOrders
Permission: USER_DATA (Read-Only)
```

**Use Cases:**
- ✅ **Complete History**: All orders, not just trades
- ✅ **Order Analysis**: Cancelled/rejected orders
- ✅ **Strategy Review**: Entry/exit patterns

**Impact:** MEDIUM - Complete order history

---

#### 2.4 Account Configuration
```
Endpoint: GET /fapi/v1/accountConfig
Permission: USER_DATA (Read-Only)
```

**Use Cases:**
- ✅ **Settings Display**: Current margin mode
- ✅ **Risk Profile**: Position mode detection
- ✅ **Validation**: Multi-asset mode check

**Impact:** LOW - Configuration visibility

---

#### 2.5 Position ADL Quantile
```
Endpoint: GET /fapi/v1/adlQuantile
Permission: USER_DATA (Read-Only)
```

**Use Cases:**
- ✅ **Risk Warning**: ADL risk level
- ✅ **Position Management**: Reduce risk alerts
- ✅ **Dashboard Widget**: ADL indicator

**Impact:** LOW - Advanced risk metric

---

### Phase 3: Advanced Analytics (PUBLIC)

#### 3.1 Basis Data
```
Endpoint: GET /futures/data/basis
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Contango/Backwardation**: Market structure
- ✅ **AI Analysis**: Premium analysis
- ✅ **Strategy Signals**: Basis trading

**Impact:** LOW - Advanced market structure

---

#### 3.2 Insurance Fund
```
Endpoint: GET /futures/data/insuranceFund
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Market Health**: Exchange stability
- ✅ **Risk Analysis**: System risk indicator

**Impact:** LOW - Market health indicator

---

#### 3.3 24h Ticker Statistics
```
Endpoint: GET /fapi/v1/ticker/24hr
Permission: PUBLIC
```

**Use Cases:**
- ✅ **Symbol Overview**: Volume, price change
- ✅ **Pair Selection**: High volume pairs
- ✅ **Dashboard**: Market overview widget

**Response:**
```typescript
interface Ticker24h {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  weightedAvgPrice: number;
  lastPrice: number;
  volume: number;
  quoteVolume: number;
  openTime: number;
  closeTime: number;
  highPrice: number;
  lowPrice: number;
  count: number;  // Trade count
}
```

**Impact:** MEDIUM - Market overview

---

## 📋 Implementation Priority Matrix

| Priority | Endpoint | Impact | Effort | Features Enhanced |
|----------|----------|--------|--------|-------------------|
| 🔴 P0 | **Force Orders (Liquidation)** ⭐ | CRITICAL | Low | Risk Management, AI Learning |
| 🔴 P0 | **Order Book Depth** ⭐ | HIGH | Low | Whale Tracking, Liquidity |
| 🔴 P0 | Klines | HIGH | Medium | Backtesting, Charts, AI |
| 🔴 P0 | Top Trader Ratio | HIGH | Low | AI Confluence, Sentiment |
| 🔴 P0 | Long/Short Ratio | HIGH | Low | AI Trade Quality |
| 🔴 P0 | Taker Buy/Sell | HIGH | Low | Whale Tracking |
| 🟡 P1 | **Aggregate Trades** ⭐ | HIGH | Low | Trade Flow Analysis |
| 🟡 P1 | **Position Mode** ⭐ | MEDIUM | Low | Trade Entry Validation |
| 🟡 P1 | Open Interest | HIGH | Low | Market Sentiment |
| 🟡 P1 | Mark Price | MEDIUM | Low | Risk, P&L |
| 🟡 P1 | Funding Rate | MEDIUM | Low | Cost Analysis |
| 🟡 P1 | 24h Ticker | MEDIUM | Low | Dashboard |
| 🟢 P2 | Commission Rate | MEDIUM | Low | P&L Accuracy |
| 🟢 P2 | Leverage Brackets | MEDIUM | Low | Position Sizing |
| 🟢 P2 | All Orders | MEDIUM | Medium | Trade History |
| 🟢 P2 | Account Config | LOW | Low | Settings |
| 🔵 P3 | ADL Quantile | LOW | Low | Risk |
| 🔵 P3 | Basis | LOW | Low | Advanced |
| 🔵 P3 | Insurance Fund | LOW | Low | Market Health |

**⭐ = Newly Added Endpoints (v2)**

---

## 🏗️ Technical Implementation Plan

### Step 1: Update Edge Function

Add new actions to `supabase/functions/binance-futures/index.ts`:

```typescript
// ⭐ NEW P0 CRITICAL actions
case 'force-orders':
  result = await getForceOrders(apiKey, apiSecret, symbol, autoCloseType, startTime, endTime, limit);
  break;
  
case 'order-book':
  result = await getOrderBook(symbol, limit);  // PUBLIC - no auth needed
  break;
  
case 'agg-trades':
  result = await getAggTrades(symbol, startTime, endTime, limit);  // PUBLIC
  break;
  
case 'position-mode':
  result = await getPositionMode(apiKey, apiSecret);
  break;

// Existing P0 PUBLIC actions (no auth required)
case 'klines':
  result = await getKlines(symbol, interval, startTime, endTime, limit);
  break;
  
case 'mark-price':
  result = await getMarkPrice(symbol);
  break;
  
case 'funding-rate':
  result = await getFundingRateHistory(symbol, startTime, endTime, limit);
  break;
  
case 'open-interest':
  result = await getOpenInterestStats(symbol, period, limit);
  break;
  
case 'top-trader-ratio':
  result = await getTopTraderRatio(symbol, period, limit);
  break;
  
case 'long-short-ratio':
  result = await getLongShortRatio(symbol, period, limit);
  break;
  
case 'taker-volume':
  result = await getTakerBuySellVolume(symbol, period, limit);
  break;

case 'ticker-24h':
  result = await getTicker24h(symbol);
  break;

// New USER_DATA actions (auth required)
case 'commission-rate':
  result = await getCommissionRate(apiKey, apiSecret, symbol);
  break;
  
case 'leverage-brackets':
  result = await getLeverageBrackets(apiKey, apiSecret, symbol);
  break;
  
case 'all-orders':
  result = await getAllOrders(apiKey, apiSecret, symbol, startTime, endTime, limit);
  break;
```

### Step 2: Create React Hooks

New hooks in `src/features/binance/`:

```
useBinanceFutures.ts (existing - add new hooks)
├── useBinanceForceOrders(symbol?)           ⭐ NEW - Liquidation history
├── useBinanceOrderBook(symbol, limit?)      ⭐ NEW - Order book depth
├── useBinanceAggTrades(symbol, options?)    ⭐ NEW - Aggregate trades
├── useBinancePositionMode()                 ⭐ NEW - Hedge/One-way mode
├── useBinanceKlines(symbol, interval, options)
├── useBinanceMarkPrice(symbol)
├── useBinanceFundingRate(symbol)
├── useBinanceOpenInterest(symbol, period)
├── useBinanceTopTraderRatio(symbol, period)
├── useBinanceLongShortRatio(symbol, period)
├── useBinanceTakerVolume(symbol, period)
├── useBinanceTicker24h(symbol)
├── useBinanceCommissionRate(symbol)
└── useBinanceLeverageBrackets(symbol)
```

### Step 3: UI Integration

| Feature | New Data Source | Component |
|---------|----------------|-----------|
| Market Sentiment Dashboard | Top Trader + Long/Short + Taker | NEW: `MarketSentimentWidget.tsx` |
| Enhanced Backtesting | Klines | UPDATE: `BacktestRunner.tsx` |
| Funding Rate Tracker | Funding Rate | NEW: `FundingRateWidget.tsx` |
| Position Calculator | Leverage Brackets + Commission | UPDATE: `PositionSizeCalculator.tsx` |
| AI Confluence | All sentiment data | UPDATE: `confluence-detection` edge function |
| Daily P&L | Commission Rate | UPDATE: `DailyPnL.tsx` |

---

## 📈 Expected Outcomes

### Accuracy Improvements
- **Backtesting**: 95%+ accuracy (real klines vs mock data)
- **P&L Calculation**: Exact fees vs estimated 0.04%
- **Position Sizing**: Real leverage limits vs assumed 20x
- **Risk Prevention**: Learn from liquidation history ⭐

### New Capabilities
- **Market Sentiment Dashboard**: Real-time professional/retail positioning
- **Funding Cost Tracking**: Holding cost visibility
- **Enhanced AI**: Better confluence detection with market data
- **Liquidation Tracker**: Historical liquidation analysis ⭐
- **Order Book Analysis**: Whale wall detection ⭐
- **Trade Flow Analysis**: Tick-by-tick market pressure ⭐

### User Experience
- **Trade Entry Wizard**: Mark price for accurate entry + position mode validation
- **Risk Management**: Real leverage brackets + liquidation warnings
- **AI Insights**: More accurate recommendations with full market context

---

## 🔒 Security Considerations

All proposed endpoints are either:
1. **PUBLIC**: No API key required (market data)
2. **USER_DATA with READ permission**: Only read access, no trading

No new security risks introduced. Existing HMAC signature mechanism covers all USER_DATA endpoints.

---

## 📅 Suggested Timeline (Updated v2)

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | P0 Critical | Force Orders, Order Book, Aggregate Trades ⭐ |
| 1 | P0 Sentiment | Klines, Top Trader/Long-Short Ratios, Taker Volume |
| 2 | P1 Endpoints | Position Mode, Open Interest, Mark Price, Funding |
| 2 | UI Integration | Liquidation Tracker, Market Sentiment Dashboard |
| 3 | P2 Endpoints | Commission, Brackets, Orders |
| 3 | Feature Updates | Enhanced Backtesting, Position Calculator |
| 4 | AI Enhancement | Update confluence-detection with all new data |
| 4 | Testing & Polish | Integration tests, documentation |

---

## 📝 Files to Create/Modify

### New Files
```
src/components/risk/LiquidationTracker.tsx           ⭐ NEW
src/components/market-insight/OrderBookAnalysis.tsx  ⭐ NEW
src/components/market-insight/MarketSentimentWidget.tsx
src/components/dashboard/FundingRateWidget.tsx
src/features/binance/useBinanceMarketData.ts
docs/binance/BINANCE_MARKET_DATA_GUIDE.md
```

### Modified Files
```
supabase/functions/binance-futures/index.ts  (add 19 new actions)
src/features/binance/useBinanceFutures.ts    (add 14 new hooks)
src/features/binance/types.ts                (add new types)
src/pages/Dashboard.tsx                      (add sentiment widget)
src/pages/RiskManagement.tsx                 (add liquidation tracker)
src/components/strategy/BacktestRunner.tsx   (use real klines)
src/components/risk/PositionSizeCalculator.tsx (use real brackets)
src/components/trade/entry/SetupStep.tsx     (position mode validation)
supabase/functions/confluence-detection/index.ts (enhance with sentiment + order book)
```

---

## ✅ Conclusion

Implementasi **19 endpoint baru** (termasuk 4 tambahan kritis) akan:
1. **Meningkatkan akurasi** backtesting, P&L, dan position sizing
2. **Menambah fitur** Market Sentiment Dashboard & Liquidation Tracker
3. **Memperkuat AI** dengan data market real-time + order book analysis
4. **Meningkatkan risk management** dengan liquidation history learning
5. **Tetap aman** karena semua endpoint read-only

**Recommended Next Step**: 
1. Mulai dengan **Force Orders** untuk risk management (highest impact)
2. Tambahkan **Order Book** untuk whale tracking enhancement
3. Implementasi **Sentiment Ratios** untuk AI confluence improvement
4. **Tetap aman** karena semua endpoint read-only

**Recommended Next Step**: Mulai dengan Phase 1 (P0 endpoints) untuk market sentiment karena highest impact dan lowest effort.
