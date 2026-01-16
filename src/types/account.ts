/**
 * Types for Trading Account Management
 * Simplified for Trading Journal focus
 */

// Simplified account types for trading journal
export type AccountType = 'trading' | 'backtest' | 'funding';

export type AccountTransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'transfer_in' 
  | 'transfer_out';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  sub_type: string | null;
  currency: string;
  balance: number;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  is_system: boolean;
  metadata: {
    broker?: string;
    account_number?: string;
    is_backtest?: boolean;
    initial_balance?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface AccountTransaction {
  id: string;
  user_id: string;
  account_id: string;
  transaction_type: AccountTransactionType;
  amount: number;
  currency: string;
  sub_type: string | null;
  category_id: string | null;
  counterparty_account_id: string | null;
  portfolio_transaction_id: string | null;
  trade_entry_id: string | null;
  reference_id: string | null;
  description: string | null;
  notes: string | null;
  transaction_date: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AccountWithBalance extends Account {
  recent_transactions?: AccountTransaction[];
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  trading: 'Trading Account',
  backtest: 'Paper Trading',
  funding: 'Funding Source',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  trading: 'candlestick-chart',
  backtest: 'flask-conical',
  funding: 'wallet',
};

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
] as const;
