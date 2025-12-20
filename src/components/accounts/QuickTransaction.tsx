import { useState, useMemo } from "react";
import { ArrowDown, ArrowUp, ArrowLeftRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useDeposit, useWithdraw, useTransfer } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import type { Account } from "@/types/account";

const transactionSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().optional(),
});

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Select source account"),
  toAccountId: z.string().min(1, "Select destination account"),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: "Cannot transfer to the same account",
  path: ["toAccountId"],
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

export function QuickTransaction() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'transfer'>('transfer');
  const { data: accounts } = useAccounts();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const transfer = useTransfer();

  const activeAccounts = useMemo(() => 
    accounts?.filter(a => a.is_active) || [], 
    [accounts]
  );

  const [depositForm, setDepositForm] = useState({ accountId: '', amount: '', description: '' });
  const [withdrawForm, setWithdrawForm] = useState({ accountId: '', amount: '', description: '' });
  const [transferForm, setTransferForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });

  const selectedFromAccount = activeAccounts.find(a => a.id === transferForm.fromAccountId);
  const selectedWithdrawAccount = activeAccounts.find(a => a.id === withdrawForm.accountId);

  const handleDeposit = async () => {
    if (!depositForm.accountId || !depositForm.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    const account = activeAccounts.find(a => a.id === depositForm.accountId);
    if (!account) return;

    try {
      await deposit.mutateAsync({
        accountId: depositForm.accountId,
        amount: Number(depositForm.amount),
        currency: account.currency,
        description: depositForm.description || undefined,
      });
      toast.success(`Deposited ${formatCurrency(Number(depositForm.amount), account.currency)}`);
      setDepositForm({ accountId: '', amount: '', description: '' });
    } catch (error: any) {
      toast.error(error?.message || "Failed to deposit");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawForm.accountId || !withdrawForm.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    const account = activeAccounts.find(a => a.id === withdrawForm.accountId);
    if (!account) return;

    const amount = Number(withdrawForm.amount);
    if (amount > Number(account.balance)) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      await withdraw.mutateAsync({
        accountId: withdrawForm.accountId,
        amount,
        currency: account.currency,
        description: withdrawForm.description || undefined,
      });
      toast.success(`Withdrew ${formatCurrency(amount, account.currency)}`);
      setWithdrawForm({ accountId: '', amount: '', description: '' });
    } catch (error: any) {
      toast.error(error?.message || "Failed to withdraw");
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      toast.error("Cannot transfer to the same account");
      return;
    }

    const fromAccount = activeAccounts.find(a => a.id === transferForm.fromAccountId);
    const toAccount = activeAccounts.find(a => a.id === transferForm.toAccountId);
    if (!fromAccount || !toAccount) return;

    const amount = Number(transferForm.amount);
    if (amount > Number(fromAccount.balance)) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      await transfer.mutateAsync({
        fromAccountId: transferForm.fromAccountId,
        toAccountId: transferForm.toAccountId,
        amount,
        currency: fromAccount.currency,
        description: transferForm.description || undefined,
      });
      toast.success(`Transferred ${formatCurrency(amount, fromAccount.currency)}`);
      setTransferForm({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
    } catch (error: any) {
      toast.error(error?.message || "Failed to transfer");
    }
  };

  const handleMaxAmount = (type: 'withdraw' | 'transfer') => {
    if (type === 'withdraw' && selectedWithdrawAccount) {
      setWithdrawForm(prev => ({ ...prev, amount: String(selectedWithdrawAccount.balance) }));
    } else if (type === 'transfer' && selectedFromAccount) {
      setTransferForm(prev => ({ ...prev, amount: String(selectedFromAccount.balance) }));
    }
  };

  const renderAccountOption = (account: Account) => (
    <SelectItem key={account.id} value={account.id}>
      <div className="flex items-center justify-between gap-2 w-full">
        <span>{account.name}</span>
        <span className="text-muted-foreground text-xs">
          {formatCurrency(Number(account.balance), account.currency)}
        </span>
      </div>
    </SelectItem>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="deposit" className="gap-1.5">
              <ArrowDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Deposit</span>
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-1.5">
              <ArrowUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Withdraw</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Transfer</span>
            </TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">To Account</Label>
              <Select 
                value={depositForm.accountId} 
                onValueChange={(v) => setDepositForm(prev => ({ ...prev, accountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(renderAccountOption)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={depositForm.amount}
                onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleDeposit}
              disabled={deposit.isPending || !depositForm.accountId || !depositForm.amount}
            >
              {deposit.isPending ? "Processing..." : "Deposit"}
            </Button>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">From Account</Label>
              <Select 
                value={withdrawForm.accountId} 
                onValueChange={(v) => setWithdrawForm(prev => ({ ...prev, accountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(renderAccountOption)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                {selectedWithdrawAccount && (
                  <button 
                    type="button"
                    onClick={() => handleMaxAmount('withdraw')}
                    className="text-xs text-primary hover:underline"
                  >
                    MAX
                  </button>
                )}
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleWithdraw}
              disabled={withdraw.isPending || !withdrawForm.accountId || !withdrawForm.amount}
            >
              {withdraw.isPending ? "Processing..." : "Withdraw"}
            </Button>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer" className="space-y-4 mt-0">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Select 
                value={transferForm.fromAccountId} 
                onValueChange={(v) => setTransferForm(prev => ({ ...prev, fromAccountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(renderAccountOption)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <div className="p-2 rounded-full bg-muted">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Select 
                value={transferForm.toAccountId} 
                onValueChange={(v) => setTransferForm(prev => ({ ...prev, toAccountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts
                    .filter(a => a.id !== transferForm.fromAccountId)
                    .map(renderAccountOption)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                {selectedFromAccount && (
                  <button 
                    type="button"
                    onClick={() => handleMaxAmount('transfer')}
                    className="text-xs text-primary hover:underline"
                  >
                    MAX
                  </button>
                )}
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleTransfer}
              disabled={transfer.isPending || !transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount}
            >
              {transfer.isPending ? "Processing..." : "Transfer"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
