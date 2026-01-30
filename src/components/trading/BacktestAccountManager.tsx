import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, FlaskConical, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { useBacktestAccounts, useCreateTradingAccount, useUpdateTradingAccount, useDeleteTradingAccount, TradingAccount } from "@/hooks/use-trading-accounts";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

const backtestAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  broker: z.string().optional(),
  account_number: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  initial_balance: z.coerce.number().min(0, "Balance must be positive"),
});

type BacktestAccountFormValues = z.infer<typeof backtestAccountSchema>;

export function BacktestAccountManager() {
  const { data: backtestAccounts = [], isLoading } = useBacktestAccounts();
  const createAccount = useCreateTradingAccount();
  const updateAccount = useUpdateTradingAccount();
  const deleteAccount = useDeleteTradingAccount();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<TradingAccount | null>(null);

  const form = useForm<BacktestAccountFormValues>({
    resolver: zodResolver(backtestAccountSchema),
    defaultValues: {
      name: "",
      broker: "",
      account_number: "",
      currency: "USD",
      initial_balance: 10000,
    },
  });

  const handleOpenAddDialog = () => {
    form.reset({
      name: "",
      broker: "",
      account_number: "",
      currency: "USD",
      initial_balance: 10000,
    });
    setEditingAccount(null);
    setIsAddOpen(true);
  };

  const handleOpenEditDialog = (account: TradingAccount) => {
    form.reset({
      name: account.name,
      broker: account.broker || "",
      account_number: account.account_number || "",
      currency: account.currency,
      initial_balance: account.initial_balance,
    });
    setEditingAccount(account);
    setIsAddOpen(true);
  };

  const handleSubmit = async (values: BacktestAccountFormValues) => {
    if (editingAccount) {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        ...values,
      });
    } else {
      await createAccount.mutateAsync({
        name: values.name,
        broker: values.broker,
        account_number: values.account_number,
        currency: values.currency,
        initial_balance: values.initial_balance,
        is_backtest: true,
      });
    }
    setIsAddOpen(false);
    setEditingAccount(null);
  };

  const handleDelete = async () => {
    if (deletingAccount) {
      await deleteAccount.mutateAsync(deletingAccount.id);
      setDeletingAccount(null);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Backtest / Paper Trading Accounts
            </CardTitle>
            <CardDescription>
              Isolated accounts for backtesting and paper trading - not shown in main Accounts
            </CardDescription>
          </div>
          <Button onClick={handleOpenAddDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Backtest Account
          </Button>
        </CardHeader>
        <CardContent>
          {backtestAccounts.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No backtest accounts"
              description="Create a backtest account to practice trading without risking real money"
              action={{
                label: "Add Backtest Account",
                onClick: handleOpenAddDialog,
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {backtestAccounts.map((account) => (
                <Card key={account.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-primary/10">
                          <FlaskConical className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{account.name}</CardTitle>
                          {account.broker && (
                            <p className="text-xs text-muted-foreground">{account.broker}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(account)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingAccount(account)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Balance</span>
                        <span className="font-semibold">
                          {formatCurrency(account.current_balance, account.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Initial</span>
                        <span className="text-sm">
                          {formatCurrency(account.initial_balance, account.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">P&L</span>
                        <span className={`text-sm font-medium ${
                          account.current_balance >= account.initial_balance 
                            ? "text-profit" 
                            : "text-loss"
                        }`}>
                          {account.current_balance >= account.initial_balance ? "+" : ""}
                          {formatCurrency(
                            account.current_balance - account.initial_balance,
                            account.currency
                          )}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs mt-2">
                        Paper Trading
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Backtest Account" : "Create Backtest Account"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Strategy Backtest #1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="broker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Demo Broker" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account # (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., DEMO-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="IDR">IDR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initial_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAccount.isPending || updateAccount.isPending}
                >
                  {(createAccount.isPending || updateAccount.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingAccount ? (
                    "Save Changes"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        title="Delete Backtest Account"
        description={`Are you sure you want to delete "${deletingAccount?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
