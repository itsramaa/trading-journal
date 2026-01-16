import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useCreateAccount } from "@/hooks/use-accounts";
import { CURRENCIES, type AccountType } from "@/types/account";

const accountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  account_type: z.enum(['trading', 'funding'] as const),
  broker: z.string().max(100, "Broker name too long").optional(),
  account_number: z.string().max(50, "Account number too long").optional(),
  currency: z.string().min(1, "Currency is required"),
  initial_balance: z.coerce.number().min(0, "Balance cannot be negative").default(0),
  is_backtest: z.boolean().default(false),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AddAccountFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  defaultType?: AccountType;
  defaultIsBacktest?: boolean;
}

export function AddAccountForm({ trigger, onSuccess, defaultType = 'trading', defaultIsBacktest = false }: AddAccountFormProps) {
  const [open, setOpen] = useState(false);
  const createAccount = useCreateAccount();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      account_type: defaultType === 'backtest' ? 'trading' : defaultType,
      broker: "",
      account_number: "",
      currency: "USD",
      initial_balance: 0,
      is_backtest: defaultIsBacktest,
    },
  });

  const accountType = form.watch("account_type");
  const isBacktest = form.watch("is_backtest");

  const handleSubmit = async (data: AccountFormValues) => {
    try {
      await createAccount.mutateAsync({
        name: data.name,
        account_type: data.account_type,
        currency: data.currency,
        initial_balance: data.initial_balance,
        metadata: {
          broker: data.broker || undefined,
          account_number: data.account_number || undefined,
          is_backtest: data.is_backtest,
          initial_balance: data.initial_balance,
        },
      });

      const accountLabel = data.is_backtest ? 'Paper trading account' : 'Account';
      toast.success(`${accountLabel} "${data.name}" created successfully`);
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Trading Account</DialogTitle>
          <DialogDescription>
            Add a new trading account to track your trades and performance.
          </DialogDescription>
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
                    <Input placeholder="e.g., Binance Futures" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trading">Trading Account</SelectItem>
                        <SelectItem value="funding">Funding Source</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {accountType === 'trading' && (
              <>
                <FormField
                  control={form.control}
                  name="broker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broker / Exchange</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Binance, IBKR, TD Ameritrade" {...field} />
                      </FormControl>
                      <FormDescription>
                        The broker or exchange where this account is held
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ***1234" {...field} />
                      </FormControl>
                      <FormDescription>
                        Last digits for identification (not stored securely)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_backtest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Paper Trading</FormLabel>
                        <FormDescription>
                          Mark this as a simulated/paper trading account
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>
                    {isBacktest ? "Starting capital for paper trading" : "Current account balance"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
