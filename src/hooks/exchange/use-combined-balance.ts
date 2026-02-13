/**
 * Combined Balance Hook
 * Single source for account balance - switches based on trade_mode
 * 
 * C-11 ROOT FIX: useBestAvailableBalance is now mode-aware.
 * Paper → always paper balance. Live → Binance if connected.
 */
import { useMemo } from 'react';
import { useBinanceBalance, useBinanceConnectionStatus } from '@/features/binance';
import { useAccounts } from '@/hooks/use-accounts';
import { useTradeMode } from '@/hooks/use-trade-mode';

export type AccountSourceType = 'binance' | 'paper';

interface CombinedBalanceResult {
  balance: number;
  availableBalance: number;
  source: AccountSourceType;
  isConnected: boolean;
  isLoading: boolean;
  accountName: string;
}

/**
 * Get combined balance from Binance or Paper Trading account
 */
export function useCombinedBalance(
  preferredSource: AccountSourceType = 'binance',
  paperAccountId?: string
): CombinedBalanceResult {
  const { data: connectionStatus, isLoading: connectionLoading } = useBinanceConnectionStatus();
  const { data: binanceBalance, isLoading: binanceLoading } = useBinanceBalance();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  
  const isConnected = connectionStatus?.isConnected ?? false;
  
  return useMemo(() => {
    // If preferring Binance and connected, use Binance
    if (preferredSource === 'binance' && isConnected && binanceBalance) {
      return {
        balance: binanceBalance.totalWalletBalance,
        availableBalance: binanceBalance.availableBalance,
        source: 'binance' as AccountSourceType,
        isConnected: true,
        isLoading: binanceLoading,
        accountName: 'Binance Futures',
      };
    }
    
    // Fallback to paper account
    if (paperAccountId && accounts) {
      const paperAccount = accounts.find(a => a.id === paperAccountId);
      if (paperAccount) {
        return {
          balance: paperAccount.balance,
          availableBalance: paperAccount.balance,
          source: 'paper' as AccountSourceType,
          isConnected: false,
          isLoading: accountsLoading,
          accountName: paperAccount.name,
        };
      }
    }
    
    // Fallback to total trading accounts balance
    if (accounts) {
      const tradingAccounts = accounts.filter(a => 
        a.account_type === 'trading' && a.is_active
      );
      const totalBalance = tradingAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      
      return {
        balance: totalBalance,
        availableBalance: totalBalance,
        source: 'paper' as AccountSourceType,
        isConnected: false,
        isLoading: accountsLoading,
        accountName: tradingAccounts.length > 0 
          ? `${tradingAccounts.length} Paper Account(s)` 
          : 'No Account',
      };
    }
    
    // Default fallback
    return {
      balance: 0,
      availableBalance: 0,
      source: 'paper' as AccountSourceType,
      isConnected: false,
      isLoading: connectionLoading || accountsLoading,
      accountName: 'No Account',
    };
  }, [
    preferredSource, 
    isConnected, 
    binanceBalance, 
    paperAccountId, 
    accounts,
    binanceLoading,
    accountsLoading,
    connectionLoading,
  ]);
}

/**
 * Get the best available balance (Binance first, then Paper)
 */
export function useBestAvailableBalance() {
  const { tradeMode } = useTradeMode();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: binanceBalance, isLoading: binanceLoading } = useBinanceBalance();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  
  const isConnected = connectionStatus?.isConnected ?? false;
  
  return useMemo(() => {
    // C-11 FIX: In Paper mode, ALWAYS use paper accounts (never Binance)
    // In Live mode, prefer Binance if connected
    if (tradeMode === 'live' && isConnected && binanceBalance) {
      return {
        balance: binanceBalance.totalWalletBalance,
        availableBalance: binanceBalance.availableBalance,
        source: 'binance' as AccountSourceType,
        isLoading: binanceLoading,
      };
    }
    
    // Paper mode OR live without Binance → use paper accounts
    if (accounts) {
      const tradingAccounts = accounts.filter(a => 
        a.account_type === 'trading' && a.is_active
      );
      const totalBalance = tradingAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      
      return {
        balance: totalBalance,
        availableBalance: totalBalance,
        source: 'paper' as AccountSourceType,
        isLoading: accountsLoading,
      };
    }
    
    return {
      balance: 0,
      availableBalance: 0,
      source: 'paper' as AccountSourceType,
      isLoading: true,
    };
  }, [tradeMode, isConnected, binanceBalance, accounts, binanceLoading, accountsLoading]);
}
