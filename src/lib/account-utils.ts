/**
 * Account utility functions
 * Single source of truth for paper account identification
 */
import type { Account } from '@/types/account';

/**
 * Determines if an account is a paper/simulated trading account.
 * Rule: Paper accounts have no exchange or exchange === 'manual'.
 * This is the CANONICAL method — do NOT use metadata.is_backtest for this check.
 */
export function isPaperAccount(account: Pick<Account, 'exchange'>): boolean {
  return !account.exchange || account.exchange === 'manual' || account.exchange === '';
}
