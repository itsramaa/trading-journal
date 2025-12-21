/**
 * Types for Account Management
 * Aligned with database enum: account_type
 */

export type AccountType = 
  | 'bank' 
  | 'ewallet' 
  | 'broker' 
  | 'cash' 
  | 'soft_wallet' 
  | 'investment' 
  | 'emergency' 
  | 'goal_savings' 
  | 'trading';

export type AccountTransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'transfer_in' 
  | 'transfer_out' 
  | 'expense' 
  | 'income' 
  | 'transfer';

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
  metadata: Record<string, unknown> | null;
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
  bank: 'Bank Account',
  ewallet: 'E-Wallet',
  broker: 'Broker/Exchange',
  cash: 'Cash',
  soft_wallet: 'Soft Wallet',
  investment: 'Investment',
  emergency: 'Emergency Fund',
  goal_savings: 'Goal Savings',
  trading: 'Trading Account',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  bank: 'building-2',
  ewallet: 'smartphone',
  broker: 'trending-up',
  cash: 'banknote',
  soft_wallet: 'wallet',
  investment: 'piggy-bank',
  emergency: 'shield',
  goal_savings: 'target',
  trading: 'candlestick-chart',
};

export const CURRENCIES = [
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
] as const;
