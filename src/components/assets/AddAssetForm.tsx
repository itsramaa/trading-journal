import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { useCreateAsset } from "@/hooks/use-portfolio";

const assetSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(20, "Symbol too long").transform(val => val.toUpperCase()),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  asset_type: z.enum(["CRYPTO", "US_STOCK", "ID_STOCK"]),
  coingecko_id: z.string().optional(),
  finnhub_symbol: z.string().optional(),
  fcs_symbol: z.string().optional(),
  alpha_symbol: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AddAssetFormProps {
  trigger?: React.ReactNode;
}

export function AddAssetForm({ trigger }: AddAssetFormProps) {
  const [open, setOpen] = useState(false);
  const createAsset = useCreateAsset();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      symbol: "",
      name: "",
      asset_type: "CRYPTO",
      coingecko_id: "",
      finnhub_symbol: "",
      fcs_symbol: "",
      alpha_symbol: "",
      logo_url: "",
    },
  });

  const assetType = form.watch("asset_type");

  const handleSubmit = async (data: AssetFormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to add assets");
      return;
    }

    try {
      await createAsset.mutateAsync({
        user_id: user.id,
        symbol: data.symbol,
        name: data.name,
        asset_type: data.asset_type,
        portfolio_id: null,
        exchange: data.asset_type === 'ID_STOCK' ? 'IDX' : data.asset_type === 'US_STOCK' ? 'NYSE' : null,
        sector: null,
        current_price: null,
        logo_url: data.logo_url || null,
        coingecko_id: data.coingecko_id || null,
        finnhub_symbol: data.finnhub_symbol || null,
        fcs_symbol: data.fcs_symbol || null,
        alpha_symbol: data.alpha_symbol || null,
      });
      
      toast.success(`Asset ${data.symbol} added successfully`);
      form.reset();
      setOpen(false);
    } catch (error: any) {
      if (error?.message?.includes('duplicate')) {
        toast.error(`Asset ${data.symbol} already exists`);
      } else {
        toast.error("Failed to add asset");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
          <DialogDescription>
            Add a new cryptocurrency, stock, or other asset to track.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="BTC" {...field} className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="asset_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CRYPTO">Cryptocurrency</SelectItem>
                        <SelectItem value="US_STOCK">US Stock</SelectItem>
                        <SelectItem value="ID_STOCK">Indonesia Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Bitcoin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {assetType === "CRYPTO" && (
              <FormField
                control={form.control}
                name="coingecko_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CoinGecko ID (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="bitcoin" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used to fetch live prices from CoinGecko API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {assetType === "US_STOCK" && (
              <FormField
                control={form.control}
                name="finnhub_symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finnhub Symbol (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="AAPL" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used to fetch live prices from Finnhub API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {assetType === "ID_STOCK" && (
              <FormField
                control={form.control}
                name="fcs_symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FCS API Symbol (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="BBCA" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used to fetch live prices for Indonesian stocks
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(assetType === "US_STOCK" || assetType === "ID_STOCK") && (
              <FormField
                control={form.control}
                name="alpha_symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alpha Vantage Symbol (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="AAPL or BBCA.JK" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used to fetch historical price data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAsset.isPending}>
                {createAsset.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Asset'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
