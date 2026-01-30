# Binance API Enhancement Proposal

## Executive Summary

Dokumen ini menguraikan **15 endpoint Binance Futures** yang belum diimplementasi namun sangat applicable untuk meningkatkan akurasi dan fitur Trading Journey application.

**Status Implementasi Saat Ini:**
- ✅ 8 endpoints sudah diimplementasi
- 🔄 15 endpoints berpotensi tinggi (proposal ini)
- ⏸️ Sisanya tidak relevan untuk use case read-only

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
| 🔴 P0 | Klines | HIGH | Medium | Backtesting, Charts, AI |
| 🔴 P0 | Top Trader Ratio | HIGH | Low | AI Confluence, Sentiment |
| 🔴 P0 | Long/Short Ratio | HIGH | Low | AI Trade Quality |
| 🔴 P0 | Taker Buy/Sell | HIGH | Low | Whale Tracking |
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

---

## 🏗️ Technical Implementation Plan

### Step 1: Update Edge Function

Add new actions to `supabase/functions/binance-futures/index.ts`:

```typescript
// New PUBLIC actions (no auth required)
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

### New Capabilities
- **Market Sentiment Dashboard**: Real-time professional/retail positioning
- **Funding Cost Tracking**: Holding cost visibility
- **Enhanced AI**: Better confluence detection with market data

### User Experience
- **Trade Entry Wizard**: Mark price for accurate entry
- **Risk Management**: Real leverage brackets
- **AI Insights**: More accurate recommendations

---

## 🔒 Security Considerations

All proposed endpoints are either:
1. **PUBLIC**: No API key required (market data)
2. **USER_DATA with READ permission**: Only read access, no trading

No new security risks introduced. Existing HMAC signature mechanism covers all USER_DATA endpoints.

---

## 📅 Suggested Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | P0 Endpoints | Klines, Sentiment ratios (4 endpoints) |
| 2 | P1 Endpoints | Open Interest, Mark Price, Funding (3 endpoints) |
| 2 | UI Integration | Market Sentiment Dashboard |
| 3 | P2 Endpoints | Commission, Brackets, Orders (3 endpoints) |
| 3 | Feature Updates | Enhanced Backtesting, Position Calculator |
| 4 | Testing & Polish | Integration tests, documentation |

---

## 📝 Files to Create/Modify

### New Files
```
src/components/market-insight/MarketSentimentWidget.tsx
src/components/dashboard/FundingRateWidget.tsx
src/features/binance/useBinanceMarketData.ts
docs/binance/BINANCE_MARKET_DATA_GUIDE.md
```

### Modified Files
```
supabase/functions/binance-futures/index.ts  (add 10+ new actions)
src/features/binance/useBinanceFutures.ts    (add new hooks)
src/features/binance/types.ts                (add new types)
src/pages/Dashboard.tsx                      (add sentiment widget)
src/components/strategy/BacktestRunner.tsx   (use real klines)
src/components/risk/PositionSizeCalculator.tsx (use real brackets)
supabase/functions/confluence-detection/index.ts (enhance with sentiment)
```

---

## ✅ Conclusion

Implementasi 15 endpoint baru ini akan:
1. **Meningkatkan akurasi** backtesting, P&L, dan position sizing
2. **Menambah fitur** Market Sentiment Dashboard yang powerful
3. **Memperkuat AI** dengan data market real-time
4. **Tetap aman** karena semua endpoint read-only

**Recommended Next Step**: Mulai dengan Phase 1 (P0 endpoints) untuk market sentiment karena highest impact dan lowest effort.
