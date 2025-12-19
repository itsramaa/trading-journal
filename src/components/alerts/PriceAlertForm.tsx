import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePriceAlert } from "@/hooks/use-portfolio";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PriceAlertFormProps {
  assetId: string;
  assetSymbol: string;
  currentPrice: number;
  onClose: () => void;
}

export function PriceAlertForm({ assetId, assetSymbol, currentPrice, onClose }: PriceAlertFormProps) {
  const [targetPrice, setTargetPrice] = useState(currentPrice.toString());
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const createAlert = useCreatePriceAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to create alerts");
      return;
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await createAlert.mutateAsync({
        user_id: user.id,
        asset_id: assetId,
        target_price: price,
        condition,
        is_active: true,
      });
      
      toast.success(`Alert created: Notify when ${assetSymbol} goes ${condition} $${price.toFixed(2)}`);
      onClose();
    } catch (error) {
      toast.error("Failed to create alert");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Set Price Alert
          </DialogTitle>
          <DialogDescription>
            Get notified when {assetSymbol} reaches your target price.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Price</Label>
            <p className="text-lg font-semibold font-mono-numbers">${currentPrice.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as 'above' | 'below')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Price goes above</SelectItem>
                <SelectItem value="below">Price goes below</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetPrice">Target Price</Label>
            <Input
              id="targetPrice"
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createAlert.isPending}>
              {createAlert.isPending ? "Creating..." : "Create Alert"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
