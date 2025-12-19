import { useState } from "react";
import { Helmet } from "react-helmet";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, History, Wallet, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { AccountTransactionsTable } from "@/components/accounts/AccountTransactionsTable";
import { AccountsDashboard } from "@/components/accounts/AccountsDashboard";
import { useAccounts } from "@/hooks/use-accounts";
import type { Account } from "@/types/account";

export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const { data: accounts } = useAccounts();

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

        {/* Main Content Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2">
              <Wallet className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <History className="h-4 w-4" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <AccountsDashboard />
          </TabsContent>

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
