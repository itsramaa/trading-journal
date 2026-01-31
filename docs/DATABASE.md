# Database Schema

## Core Tables

| Table | Purpose |
|-------|---------|
| `accounts` | Trading/backtest accounts |
| `trade_entries` | Individual trades |
| `trading_strategies` | Strategy definitions |
| `trading_sessions` | Trading session tracking |
| `risk_profiles` | User risk parameters |
| `daily_risk_snapshots` | Daily risk tracking |
| `risk_events` | Risk event audit trail |
| `user_settings` | User preferences |
| `account_transactions` | Deposits, withdrawals, transfers |
| `account_balance_snapshots` | Balance history |

## Key Relationships

```
user (auth.users)
  ├── accounts (1:N)
  ├── trade_entries (1:N)
  │     └── trade_entry_strategies (N:M) ── trading_strategies
  ├── trading_sessions (1:N)
  │     └── trade_entries (1:N)
  ├── risk_profiles (1:1)
  ├── daily_risk_snapshots (1:N)
  └── risk_events (1:N)
```

## RLS Policies

All tables have Row-Level Security enabled with base policy:
```sql
auth.uid() = user_id
```

## Account Types

```typescript
type AccountType = 
  | 'trading'     // Binance trading account
  | 'broker'      // Paper trading
  | 'bank'        // Bank account
  | 'ewallet'     // E-wallet
  | 'cash'        // Cash
  | 'investment'  // Investment
  | 'emergency'   // Emergency fund
  | 'goal_savings'// Savings goal
```

## Trade Entry Fields

Key fields for trade tracking:

| Field | Type | Description |
|-------|------|-------------|
| `pair` | string | Trading pair (BTCUSDT) |
| `direction` | string | LONG/SHORT |
| `entry_price` | number | Entry price |
| `exit_price` | number | Exit price |
| `quantity` | number | Position size |
| `realized_pnl` | number | Realized P&L |
| `commission` | number | Trading fee |
| `source` | string | 'binance'/'paper' |
| `market_context` | JSON | Market conditions at entry |
