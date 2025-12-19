import { useState } from "react";
import { Helmet } from "react-helmet";
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, History, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { AccountTransactionsTable } from "@/components/accounts/AccountTransactionsTable";
import { useAccountsSummary, useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/formatters";
import type { Account } from "@/types/account";

export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const { data: accounts } = useAccounts();
  const { totalBalance, byCurrency, isLoading } = useAccountsSummary();

  const handleTransact = (accountId: string, type: 'deposit' | 'withdraw' | 'transfer') => {
    const account = accounts?.find(a => a.id === accountId);
    setSelectedAccount(account);
    setDefaultTransactionTab(type);
    setTransactionDialogOpen(true);
  };

  const handleQuickAction = (type: 'deposit' | 'withdraw' | 'transfer') => {
    setSelectedAccount(undefined);
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleQuickAction('deposit')} className="gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Deposit
            </Button>
            <Button variant="outline" onClick={() => handleQuickAction('withdraw')} className="gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Withdraw
            </Button>
            <Button variant="outline" onClick={() => handleQuickAction('transfer')} className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
            <AddAccountForm />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "Loading..." : formatCurrency(totalBalance, 'IDR')}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all accounts
              </p>
            </CardContent>
          </Card>

          {Object.entries(byCurrency).slice(0, 3).map(([currency, balance]) => (
            <Card key={currency}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{currency} Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono-numbers">
                  {formatCurrency(balance, currency)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts" className="gap-2">
              <Wallet className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <History className="h-4 w-4" />
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <AccountCardList
              onSelectAccount={(id) => {
                const account = accounts?.find(a => a.id === id);
                setSelectedAccount(account);
              }}
              onTransact={handleTransact}
            />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  All deposits, withdrawals, and transfers across your accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AccountTransactionsTable limit={50} />
              </CardContent>
            </Card>
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
