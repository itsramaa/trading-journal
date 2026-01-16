import { useState } from "react";
import { Helmet } from "react-helmet";
import { History, CandlestickChart, FlaskConical, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { TradingAccountsDashboard } from "@/components/accounts/TradingAccountsDashboard";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountsRealtime } from "@/hooks/use-realtime";
import type { Account } from "@/types/account";

export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [activeTab, setActiveTab] = useState<'trading' | 'backtest' | 'funding'>('trading');
  const { data: accounts } = useAccounts();
  
  // Enable realtime updates for accounts
  useAccountsRealtime();

  const handleTransact = (accountId: string, type: 'deposit' | 'withdraw') => {
    const account = accounts?.find(a => a.id === accountId);
    setSelectedAccount(account);
    setDefaultTransactionTab(type);
    setTransactionDialogOpen(true);
  };

  // Count accounts by type
  const tradingCount = accounts?.filter(a => a.account_type === 'trading' && !a.metadata?.is_backtest).length || 0;
  const backtestCount = accounts?.filter(a => a.account_type === 'trading' && a.metadata?.is_backtest).length || 0;
  const fundingCount = accounts?.filter(a => a.account_type === 'funding').length || 0;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Trading Accounts | Trading Journal</title>
        <meta name="description" content="Manage your trading accounts - real trading, paper trading, and funding sources" />
      </Helmet>

      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Accounts</h1>
            <p className="text-muted-foreground">
              Manage your trading accounts and track your capital
            </p>
          </div>
          <AddAccountForm />
        </div>

        {/* Dashboard Summary */}
        <TradingAccountsDashboard />

        {/* Account Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="trading" className="gap-2">
              <CandlestickChart className="h-4 w-4" />
              <span className="hidden sm:inline">Trading</span>
              {tradingCount > 0 && (
                <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                  {tradingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="backtest" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">Paper Trading</span>
              {backtestCount > 0 && (
                <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                  {backtestCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="funding" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Funding</span>
              {fundingCount > 0 && (
                <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                  {fundingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Real Trading Accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Your live trading accounts connected to brokers/exchanges
                  </p>
                </div>
              </div>
              <AccountCardList
                filterType="trading"
                excludeBacktest
                onSelectAccount={(id) => {
                  const account = accounts?.find(a => a.id === id);
                  setSelectedAccount(account);
                }}
                onTransact={handleTransact}
                emptyMessage="No trading accounts yet. Add your first trading account to start tracking your trades."
              />
            </div>
          </TabsContent>

          <TabsContent value="backtest" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Paper Trading Accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Simulated accounts for backtesting and paper trading
                  </p>
                </div>
              </div>
              <AccountCardList
                filterType="trading"
                backtestOnly
                onSelectAccount={(id) => {
                  const account = accounts?.find(a => a.id === id);
                  setSelectedAccount(account);
                }}
                onTransact={handleTransact}
                emptyMessage="No paper trading accounts yet. Create one to test your strategies risk-free."
              />
            </div>
          </TabsContent>

          <TabsContent value="funding" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Funding Sources</h2>
                  <p className="text-sm text-muted-foreground">
                    Bank accounts and wallets used to fund your trading
                  </p>
                </div>
              </div>
              <AccountCardList
                filterType="funding"
                onSelectAccount={(id) => {
                  const account = accounts?.find(a => a.id === id);
                  setSelectedAccount(account);
                }}
                onTransact={handleTransact}
                emptyMessage="No funding sources yet. Add your bank account or wallet to track capital flow."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Dialog */}
      <AccountTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        defaultAccount={selectedAccount}
        defaultTab={defaultTransactionTab}
      />
    </DashboardLayout>
  );
}
