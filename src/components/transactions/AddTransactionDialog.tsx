import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { useDefaultPortfolio, useCreateTransaction, useCreateAsset } from "@/hooks/use-portfolio";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetSearchSelect } from "./AssetSearchSelect";
import { SearchedAsset } from "@/hooks/use-asset-search";
import type { TransactionType } from "@/types/portfolio";

const transactionSchema = z.object({
  type: z.enum(["BUY", "SELL", "DIVIDEND", "TRANSFER_IN", "TRANSFER_OUT"]),
  quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number",
  }),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Price must be a non-negative number",
  }),
  fees: z.string().optional(),
  date: z.date(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface AddTransactionDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  portfolioId?: string;
}

export function AddTransactionDialog({ trigger, onSuccess, portfolioId }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SearchedAsset | null>(null);
  
  const { data: defaultPortfolio } = useDefaultPortfolio();
  const createTransaction = useCreateTransaction();
  const createAsset = useCreateAsset();
  
  const effectivePortfolioId = portfolioId || defaultPortfolio?.id;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "BUY",
      quantity: "",
      price: "",
      fees: "0",
      date: new Date(),
      notes: "",
    },
  });

  const transactionType = form.watch("type");

  const handleSubmit = async (data: TransactionFormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to add transactions");
      return;
    }

    if (!effectivePortfolioId) {
      toast.error("No portfolio selected. Please create a portfolio first.");
      return;
    }

    if (!selectedAsset) {
      toast.error("Please select an asset");
      return;
    }

    const quantity = Number(data.quantity);
    const pricePerUnit = Number(data.price);
    const fees = Number(data.fees || 0);
    const totalAmount = quantity * pricePerUnit + fees;

    try {
      // Check if asset exists, if not create it
      const { data: existingAsset } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', selectedAsset.symbol)
        .maybeSingle();

      let assetId = existingAsset?.id;

      if (!assetId) {
        // Create the asset
        const newAsset = await createAsset.mutateAsync({
          user_id: user.id,
          symbol: selectedAsset.symbol,
          name: selectedAsset.name,
          asset_type: selectedAsset.type,
          logo_url: selectedAsset.logo_url || null,
          coingecko_id: selectedAsset.coingecko_id || null,
          finnhub_symbol: selectedAsset.finnhub_symbol || null,
          alpha_symbol: null,
          current_price: null,
          exchange: null,
          fcs_symbol: null,
          sector: null,
          portfolio_id: effectivePortfolioId,
        });
        assetId = newAsset.id;
      }

      await createTransaction.mutateAsync({
        user_id: user.id,
        portfolio_id: effectivePortfolioId,
        asset_id: assetId,
        transaction_type: data.type,
        quantity,
        price_per_unit: pricePerUnit,
        total_amount: totalAmount,
        fee: fees,
        transaction_date: data.date.toISOString(),
        notes: data.notes || null,
        account_id: null,
      });
      
      toast.success(`${data.type} transaction added for ${selectedAsset.symbol}`);
      form.reset();
      setSelectedAsset(null);
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast.error(error.message || "Failed to add transaction");
    }
  };

  const quantity = form.watch("quantity");
  const price = form.watch("price");
  const fees = form.watch("fees");
  const total = (Number(quantity) * Number(price)) + Number(fees || 0) || 0;

  const isDividendOrTransfer = transactionType === 'DIVIDEND';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new transaction for your portfolio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Asset</FormLabel>
                <AssetSearchSelect
                  value={selectedAsset}
                  onChange={setSelectedAsset}
                  placeholder="Search crypto or stocks..."
                />
              </FormItem>
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
                      <SelectContent className="bg-popover">
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                        <SelectItem value="DIVIDEND">Dividend</SelectItem>
                        <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                        <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <SelectContent className="bg-popover">
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                        <SelectItem value="DIVIDEND">Dividend</SelectItem>
                        <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                        <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isDividendOrTransfer ? 'Amount' : 'Quantity'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="0.00" 
                        {...field}
                        disabled={transactionType === 'DIVIDEND'} 
                      />
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
                    <FormLabel>{isDividendOrTransfer ? 'Dividend Amount' : 'Price per Unit'}</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fees (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="0.00" {...field} />
                    </FormControl>
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
                      <PopoverContent className="w-auto p-0 bg-popover" align="start">
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

            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-lg font-bold font-mono-numbers">
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTransaction.isPending || createAsset.isPending || !selectedAsset}
              >
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
