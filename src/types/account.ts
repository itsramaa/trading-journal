/**
 * Types for Account Management
 */

export type AccountType = 'bank' | 'ewallet' | 'broker' | 'cash' | 'soft_wallet';
export type AccountTransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  currency: string;
  balance: number;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
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
  reference_id: string | null;
  description: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
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
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  bank: 'building-2',
  ewallet: 'smartphone',
  broker: 'trending-up',
  cash: 'banknote',
  soft_wallet: 'wallet',
};

export const CURRENCIES = [
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
] as const;
