import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Plus, Loader2, Building2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateTransaction, useCreateAsset } from "@/hooks/use-portfolio";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/formatters";
import { AssetSearchSelect } from "./AssetSearchSelect";
import { SearchedAsset } from "@/hooks/use-asset-search";

// Binance spot fee rates
const BINANCE_SPOT_MAKER_FEE = 0.001; // 0.1%
const BINANCE_SPOT_TAKER_FEE = 0.001; // 0.1%

const transactionSchema = z.object({
  sourceAccountId: z.string().min(1, "Source account is required"),
  type: z.enum(["buy", "sell"]),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number",
  }),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number",
  }),
  feeType: z.enum(["maker", "taker"]).default("taker"),
  date: z.date(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  portfolioId?: string;
}

export function TransactionForm({ portfolioId }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SearchedAsset | null>(null);
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const createTransaction = useCreateTransaction();
  const createAsset = useCreateAsset();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      sourceAccountId: "",
      type: "buy",
      quantity: "",
      price: "",
      feeType: "taker",
      date: new Date(),
      notes: "",
    },
  });

  const handleSubmit = async (data: TransactionFormValues) => {
    if (!portfolioId) {
      toast.error("No portfolio selected");
      return;
    }

    if (!selectedAsset) {
      toast.error("Please select an asset");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to add transactions");
      return;
    }

    const quantity = Number(data.quantity);
    const price = Number(data.price);
    const totalAmount = quantity * price;

    try {
      // First, check if asset already exists for this user
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', selectedAsset.symbol)
        .single();

      let assetId: string;

      if (existingAsset) {
        assetId = existingAsset.id;
      } else {
        // Create the asset first
        const newAsset = await createAsset.mutateAsync({
          user_id: user.id,
          symbol: selectedAsset.symbol,
          name: selectedAsset.name,
          asset_type: selectedAsset.type,
          portfolio_id: portfolioId,
          exchange: selectedAsset.type === 'ID_STOCK' ? 'IDX' : selectedAsset.type === 'US_STOCK' ? 'NYSE' : null,
          sector: null,
          current_price: null,
          logo_url: selectedAsset.logo_url || null,
          coingecko_id: selectedAsset.coingecko_id || null,
          finnhub_symbol: selectedAsset.finnhub_symbol || null,
          fcs_symbol: selectedAsset.fcs_symbol || null,
          alpha_symbol: selectedAsset.alpha_symbol || null,
        });
        assetId = newAsset.id;
      }

      // Calculate fee based on selected type
      const feeRate = data.feeType === 'maker' ? BINANCE_SPOT_MAKER_FEE : BINANCE_SPOT_TAKER_FEE;
      const calculatedFee = totalAmount * feeRate;

      // Then create the transaction
      await createTransaction.mutateAsync({
        user_id: user.id,
        portfolio_id: portfolioId,
        asset_id: assetId,
        account_id: data.sourceAccountId || null,
        transaction_type: data.type.toUpperCase(),
        quantity,
        price_per_unit: price,
        total_amount: totalAmount,
        transaction_date: data.date.toISOString(),
        notes: data.notes || null,
        fee: calculatedFee,
      });
      
      toast.success("Transaction added successfully");
      form.reset();
      setSelectedAsset(null);
      setOpen(false);
    } catch (error: any) {
      if (error?.message?.includes('duplicate')) {
        toast.error("This asset already exists");
      } else {
        toast.error("Failed to add transaction");
      }
    }
  };

  const quantity = form.watch("quantity");
  const price = form.watch("price");
  const sourceAccountId = form.watch("sourceAccountId");
  const feeType = form.watch("feeType");
  const total = Number(quantity) * Number(price) || 0;
  const feeRate = feeType === 'maker' ? BINANCE_SPOT_MAKER_FEE : BINANCE_SPOT_TAKER_FEE;
  const calculatedFee = total * feeRate;
  
  const selectedAccount = accounts?.find(a => a.id === sourceAccountId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Search for an asset and record a buy or sell transaction.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Asset Search */}
            <div className="space-y-2">
              <FormLabel>Asset *</FormLabel>
              <AssetSearchSelect 
                value={selectedAsset}
                onChange={setSelectedAsset}
                placeholder="Search crypto or stocks..."
              />
              {!selectedAsset && form.formState.isSubmitted && (
                <p className="text-xs text-destructive">Please select an asset</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Account Selection */}
            <FormField
              control={form.control}
              name="sourceAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Account *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={accountsLoading ? "Loading..." : "Select source account"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.filter(a => a.is_active).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatCurrency(Number(account.balance), account.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the account to deduct funds from
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fee Type Selection */}
            <FormField
              control={form.control}
              name="feeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Type (Binance Spot)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="maker">Maker (0.1%)</SelectItem>
                      <SelectItem value="taker">Taker (0.1%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Unit</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this transaction..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-secondary p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Fee ({feeType === 'maker' ? '0.1%' : '0.1%'})</span>
                <span className="font-medium text-muted-foreground">
                  ${calculatedFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">Total Amount</span>
                <span className="text-lg font-bold">
                  ${(total + calculatedFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {selectedAccount && (
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Account Balance</span>
                  <span className={Number(selectedAccount.balance) >= (total + calculatedFee) ? "text-green-500" : "text-red-500"}>
                    {formatCurrency(Number(selectedAccount.balance), selectedAccount.currency)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTransaction.isPending || createAsset.isPending}>
                {(createTransaction.isPending || createAsset.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Transaction'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
