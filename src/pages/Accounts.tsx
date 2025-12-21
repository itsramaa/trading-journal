import { useState } from "react";
import { Helmet } from "react-helmet";
import { History, Wallet, Building2, Smartphone, TrendingUp, Banknote, WalletCards, PiggyBank, Target, LineChart, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { AccountTransactionsTable } from "@/components/accounts/AccountTransactionsTable";
import { AccountsDashboard } from "@/components/accounts/AccountsDashboard";
import { QuickTransaction } from "@/components/accounts/QuickTransaction";
import { AccountLinksManager } from "@/components/accounts/AccountLinksManager";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountsRealtime } from "@/hooks/use-realtime";
import type { Account, AccountType } from "@/types/account";

const ACCOUNT_TYPE_FILTERS: { value: AccountType | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Wallet },
  { value: 'bank', label: 'Bank', icon: Building2 },
  { value: 'ewallet', label: 'E-Wallet', icon: Smartphone },
  { value: 'broker', label: 'Broker', icon: TrendingUp },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'soft_wallet', label: 'Soft Wallet', icon: WalletCards },
  { value: 'investment', label: 'Investment', icon: LineChart },
  { value: 'emergency', label: 'Emergency', icon: PiggyBank },
  { value: 'goal_savings', label: 'Goal Savings', icon: Target },
  { value: 'trading', label: 'Trading', icon: TrendingUp },
];

export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountType | 'all'>('all');
  const { data: accounts } = useAccounts();
  
  // Enable realtime updates for accounts
  useAccountsRealtime();

  const handleTransact = (accountId: string, type: 'deposit' | 'withdraw' | 'transfer') => {
    const account = accounts?.find(a => a.id === accountId);
    setSelectedAccount(account);
    setDefaultTransactionTab(type);
    setTransactionDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Accounts | Portfolio Manager</title>
        <meta name="description" content="Manage your financial accounts - bank, e-wallet, broker, and cash accounts" />
      </Helmet>

      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            <p className="text-muted-foreground">
              Manage all your financial accounts in one place
            </p>
          </div>
          <AddAccountForm />
        </div>

        {/* Quick Tip */}
        <QuickTip storageKey="accounts_tip">
          <strong>Pro tip:</strong> Link your investment accounts to track portfolio transactions and cash flow in one place. 
          Use transfers to move funds between accounts.
        </QuickTip>

        {/* Main Layout: Dashboard + Quick Transaction + Account Links */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Dashboard Summary */}
          <div className="lg:col-span-2 space-y-6">
            <AccountsDashboard />
            {/* Account Links Manager */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Link className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Account Links</CardTitle>
                  <CardDescription>
                    Link related accounts together (e.g., bank to trading account)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <AccountLinksManager />
              </CardContent>
            </Card>
          </div>

          {/* Right: Quick Transaction */}
          <div className="lg:col-span-1">
            <QuickTransaction />
          </div>
        </div>

        {/* Account Type Filter */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Accounts</h2>
            <ToggleGroup 
              type="single" 
              value={accountTypeFilter} 
              onValueChange={(v) => v && setAccountTypeFilter(v as AccountType | 'all')}
              className="flex-wrap"
            >
              {ACCOUNT_TYPE_FILTERS.map((filter) => {
                const Icon = filter.icon;
                return (
                  <ToggleGroupItem 
                    key={filter.value} 
                    value={filter.value}
                    aria-label={filter.label}
                    className="gap-1.5 px-3"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{filter.label}</span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {/* Filtered Account Cards */}
          <AccountCardList
            filterType={accountTypeFilter === 'all' ? undefined : accountTypeFilter}
            onSelectAccount={(id) => {
              const account = accounts?.find(a => a.id === id);
              setSelectedAccount(account);
            }}
            onTransact={handleTransact}
          />
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Latest deposits, withdrawals, and transfers
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AccountTransactionsTable limit={10} />
          </CardContent>
        </Card>
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
