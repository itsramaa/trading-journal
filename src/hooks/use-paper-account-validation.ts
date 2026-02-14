/**
 * Paper Account Balance Validation Hook
 * Validates that trade value doesn't exceed paper account balance
 */
import { useAccounts } from '@/hooks/use-accounts';

export interface ValidationResult {
  valid: boolean;
  message?: string;
  availableBalance?: number;
}

export function usePaperAccountValidation() {
  const { data: accounts } = useAccounts();

  /**
   * Validate if trade value is within account balance
   * Only applies to paper/backtest accounts
   */
  const validateTradeBalance = (
    accountId: string | null,
    tradeValue: number
  ): ValidationResult => {
    // No account selected - allow (might be Binance)
    if (!accountId) {
      return { valid: true };
    }

    // Find the account
    const account = accounts?.find(a => a.id === accountId);
    
    if (!account) {
      return { valid: true }; // Account not found, might be Binance
    }

    // Only validate paper accounts (canonical check)
    const isPaper = !account.exchange || account.exchange === 'manual' || account.exchange === '';
    if (!isPaper) {
      return { valid: true }; // Real accounts use Binance validation
    }

    const balance = Number(account.balance);
    
    if (tradeValue > balance) {
      return {
        valid: false,
        message: `Insufficient paper account balance. Available: $${balance.toLocaleString()}, Required: $${tradeValue.toLocaleString()}`,
        availableBalance: balance,
      };
    }

    // Warn if using more than 50% of paper balance
    if (tradeValue > balance * 0.5) {
      return {
        valid: true,
        message: `This trade uses ${((tradeValue / balance) * 100).toFixed(1)}% of your paper account balance`,
        availableBalance: balance,
      };
    }

    return {
      valid: true,
      availableBalance: balance,
    };
  };

  /**
   * Check if account is a paper account
   */
  const isPaperAccount = (accountId: string | null): boolean => {
    if (!accountId) return false;
    const account = accounts?.find(a => a.id === accountId);
    if (!account) return false;
    return !account.exchange || account.exchange === 'manual' || account.exchange === '';
  };

  /**
   * Get account balance
   */
  const getAccountBalance = (accountId: string | null): number => {
    if (!accountId) return 0;
    const account = accounts?.find(a => a.id === accountId);
    return Number(account?.balance || 0);
  };

  return {
    validateTradeBalance,
    isPaperAccount,
    getAccountBalance,
    accounts,
  };
}
