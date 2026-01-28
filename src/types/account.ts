/**
 * Types for Trading Account Management
 * Simplified for Trading Journal focus
 */

// Simplified account types for trading journal - Real and Paper only
export type AccountType = 'trading' | 'backtest';

// Simplified transaction types - only deposit and withdrawal
export type AccountTransactionType = 'deposit' | 'withdrawal';

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
  trading: 'Real Trading',
  backtest: 'Paper Trading',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  trading: 'candlestick-chart',
  backtest: 'flask-conical',
};

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
] as const;
