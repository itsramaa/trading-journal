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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useCreateAccount } from "@/hooks/use-accounts";
import { useUserSettings } from "@/hooks/use-user-settings";
import type { AccountType } from "@/types/account";

// Simplified schema - removed currency select and account_number
const accountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  broker: z.string().max(100, "Broker name too long").optional(),
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

export function AddAccountForm({ trigger, onSuccess, defaultIsBacktest = false }: AddAccountFormProps) {
  const [open, setOpen] = useState(false);
  const createAccount = useCreateAccount();
  const { data: settings } = useUserSettings();
  
  // Get currency from user settings (navbar toggle)
  const defaultCurrency = settings?.default_currency || 'USD';

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      broker: "",
      initial_balance: 0,
      is_backtest: defaultIsBacktest,
    },
  });

  const isBacktest = form.watch("is_backtest");

  const handleSubmit = async (data: AccountFormValues) => {
    try {
      await createAccount.mutateAsync({
        name: data.name,
        account_type: 'trading', // Always trading, differentiated by is_backtest flag
        currency: defaultCurrency, // Auto from user settings
        initial_balance: data.initial_balance,
        metadata: {
          broker: data.broker || undefined,
          is_backtest: data.is_backtest,
          initial_balance: data.initial_balance,
        },
      });

      const accountLabel = data.is_backtest ? 'Paper trading account' : 'Trading account';
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
            Currency will be set to {defaultCurrency} based on your settings.
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

            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance ({defaultCurrency})</FormLabel>
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
