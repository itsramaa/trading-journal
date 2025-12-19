import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAccounts, useDeposit, useWithdraw, useTransfer } from "@/hooks/use-accounts";
import type { Account } from "@/types/account";
import { formatCurrency } from "@/lib/formatters";

const transactionSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  description: z.string().max(200, "Description too long").optional(),
  notes: z.string().max(500, "Notes too long").optional(),
});

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  toAccountId: z.string().min(1, "Destination account is required"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  description: z.string().max(200, "Description too long").optional(),
  notes: z.string().max(500, "Notes too long").optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts must be different",
  path: ["toAccountId"],
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

interface AccountTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccount?: Account;
  defaultTab?: 'deposit' | 'withdraw' | 'transfer';
}

export function AccountTransactionDialog({
  open,
  onOpenChange,
  defaultAccount,
  defaultTab = 'deposit',
}: AccountTransactionDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { data: accounts } = useAccounts();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const transfer = useTransfer();

  const depositForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId: defaultAccount?.id || "",
      amount: "",
      description: "",
      notes: "",
    },
  });

  const withdrawForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId: defaultAccount?.id || "",
      amount: "",
      description: "",
      notes: "",
    },
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: defaultAccount?.id || "",
      toAccountId: "",
      amount: "",
      description: "",
      notes: "",
    },
  });

  const handleDeposit = async (data: TransactionFormValues) => {
    const account = accounts?.find((a) => a.id === data.accountId);
    if (!account) return;

    try {
      await deposit.mutateAsync({
        accountId: data.accountId,
        amount: Number(data.amount),
        currency: account.currency,
        description: data.description,
        notes: data.notes,
      });

      toast.success(`Deposited ${formatCurrency(Number(data.amount), account.currency)} to ${account.name}`);
      depositForm.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to process deposit");
    }
  };

  const handleWithdraw = async (data: TransactionFormValues) => {
    const account = accounts?.find((a) => a.id === data.accountId);
    if (!account) return;

    const amount = Number(data.amount);
    if (amount > Number(account.balance)) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      await withdraw.mutateAsync({
        accountId: data.accountId,
        amount,
        currency: account.currency,
        description: data.description,
        notes: data.notes,
      });

      toast.success(`Withdrew ${formatCurrency(amount, account.currency)} from ${account.name}`);
      withdrawForm.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to process withdrawal");
    }
  };

  const handleTransfer = async (data: TransferFormValues) => {
    const fromAccount = accounts?.find((a) => a.id === data.fromAccountId);
    const toAccount = accounts?.find((a) => a.id === data.toAccountId);
    if (!fromAccount || !toAccount) return;

    const amount = Number(data.amount);
    if (amount > Number(fromAccount.balance)) {
      toast.error("Insufficient balance in source account");
      return;
    }

    try {
      await transfer.mutateAsync({
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount,
        currency: fromAccount.currency,
        description: data.description,
        notes: data.notes,
      });

      toast.success(`Transferred ${formatCurrency(amount, fromAccount.currency)} from ${fromAccount.name} to ${toAccount.name}`);
      transferForm.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to process transfer");
    }
  };

  const renderAccountSelect = (
    field: any,
    excludeId?: string,
    label: string = "Account"
  ) => (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {accounts
            ?.filter((a) => a.is_active && a.id !== excludeId)
            .map((account) => (
              <SelectItem key={account.id} value={account.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{account.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Account Transaction</DialogTitle>
          <DialogDescription>
            Manage your account balance with deposits, withdrawals, or transfers.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit" className="gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Deposit
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-4">
            <Form {...depositForm}>
              <form onSubmit={depositForm.handleSubmit(handleDeposit)} className="space-y-4">
                <FormField
                  control={depositForm.control}
                  name="accountId"
                  render={({ field }) => renderAccountSelect(field)}
                />

                <FormField
                  control={depositForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={depositForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Salary, Bonus" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={depositForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={deposit.isPending}>
                    {deposit.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Deposit'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4">
            <Form {...withdrawForm}>
              <form onSubmit={withdrawForm.handleSubmit(handleWithdraw)} className="space-y-4">
                <FormField
                  control={withdrawForm.control}
                  name="accountId"
                  render={({ field }) => renderAccountSelect(field)}
                />

                <FormField
                  control={withdrawForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ATM withdrawal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={withdraw.isPending}>
                    {withdraw.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Withdraw'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="transfer" className="mt-4">
            <Form {...transferForm}>
              <form onSubmit={transferForm.handleSubmit(handleTransfer)} className="space-y-4">
                <FormField
                  control={transferForm.control}
                  name="fromAccountId"
                  render={({ field }) => renderAccountSelect(field, transferForm.watch("toAccountId"), "From Account")}
                />

                <FormField
                  control={transferForm.control}
                  name="toAccountId"
                  render={({ field }) => renderAccountSelect(field, transferForm.watch("fromAccountId"), "To Account")}
                />

                <FormField
                  control={transferForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={transferForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Transfer to savings" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={transfer.isPending}>
                    {transfer.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Transfer'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
