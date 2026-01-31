# Trading Domain Model

## Binance Futures Lifecycle

```
1. OPEN POSITION
   └─ Order placed → Position opens
   └─ Entry Price, Leverage, Margin

2. HOLD POSITION
   └─ Mark Price updates (unrealized P&L)
   └─ Funding Fee every 8 hours

3. CLOSE POSITION
   └─ Position closed → REALIZED_PNL
   └─ Commission charged

4. POST-TRADE
   └─ Journal enrichment
   └─ Performance analytics
```

## Income Types (Binance API)

| Type | Domain Entity | Is Trade? |
|------|---------------|-----------|
| `REALIZED_PNL` | Trade P&L | YES |
| `COMMISSION` | Trading Fee | NO |
| `FUNDING_FEE` | Funding Cost/Income | NO |
| `TRANSFER` | Capital Flow | NO |
| `COMMISSION_REBATE` | Fee Rebate | NO |

**Critical**: Only `REALIZED_PNL` should be imported as trades.

## P&L Hierarchy

```
ACCOUNT LEVEL:
├── Total Capital (Wallet Balance)
├── Available Balance
├── Unrealized P&L (open positions)
└── Margin Used

TRADE LEVEL:
├── Gross P&L = REALIZED_PNL
├── Commission
├── Funding (during hold)
└── Net P&L = Gross - Commission - Funding

PERIOD ANALYTICS:
├── Total Gross P&L
├── Total Fees
├── Total Net P&L
├── Win Rate, Profit Factor
└── Max Drawdown
```

## Correct Calculations

### Net P&L
```typescript
const netPnl = grossPnl - totalCommission + totalFunding + totalRebates;
```

### Win Rate
```typescript
const winRate = winningTrades / totalTrades * 100;
```

### Profit Factor
```typescript
const profitFactor = totalGains / Math.abs(totalLosses);
```

## Risk Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `risk_per_trade_percent` | 2% | Max risk per trade |
| `max_daily_loss_percent` | 5% | Daily loss limit |
| `max_position_size_percent` | 40% | Max capital deployment |
| `max_concurrent_positions` | 3 | Max open positions |
