/**
 * PositionDialogs - Close and Edit position modal dialogs
 */
import { UseFormReturn, FieldValues } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface ClosePositionFormValues {
  exit_price: number;
  fees?: number;
  notes?: string;
}

interface EditPositionFormValues {
  stop_loss?: number;
  take_profit?: number;
  notes?: string;
}

interface ClosePositionDialogProps {
  position: TradeEntry | null;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  onSubmit: (values: ClosePositionFormValues) => void;
  isPending: boolean;
  formatCurrency: (value: number, currency?: string) => string;
}

interface EditPositionDialogProps {
  position: TradeEntry | null;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  onSubmit: (values: EditPositionFormValues) => void;
  isPending: boolean;
  formatCurrency: (value: number, currency?: string) => string;
}

export function ClosePositionDialog({
  position,
  onOpenChange,
  form,
  onSubmit,
  isPending,
  formatCurrency,
}: ClosePositionDialogProps) {
  return (
    <Dialog open={!!position} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Position: {position?.pair}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Direction:</span>
              <Badge variant={position?.direction === "LONG" ? "default" : "secondary"}>
                {position?.direction}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entry Price:</span>
              <span className="font-mono">{formatCurrency(position?.entry_price || 0, "USD")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Position Size:</span>
              <span className="font-mono">{position?.quantity}</span>
            </div>
          </div>

          <div>
            <Label>Exit Price *</Label>
            <Input type="number" step="any" {...form.register("exit_price")} placeholder="Enter exit price" />
            {form.formState.errors.exit_price && (
              <p className="text-xs text-destructive mt-1">{String(form.formState.errors.exit_price.message || "")}</p>
            )}
          </div>

          <div>
            <Label>Fees</Label>
            <Input type="number" step="any" {...form.register("fees")} placeholder="0.00" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} placeholder="Exit reasoning, lessons learned..." />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Closing..." : "Close Position"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditPositionDialog({
  position,
  onOpenChange,
  form,
  onSubmit,
  isPending,
  formatCurrency,
}: EditPositionDialogProps) {
  return (
    <Dialog open={!!position} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Position: {position?.pair}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Direction:</span>
              <Badge variant={position?.direction === "LONG" ? "default" : "secondary"}>
                {position?.direction}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entry Price:</span>
              <span className="font-mono">{formatCurrency(position?.entry_price || 0, "USD")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Position Size:</span>
              <span className="font-mono">{position?.quantity}</span>
            </div>
          </div>

          <div>
            <Label>Stop Loss</Label>
            <Input type="number" step="any" {...form.register("stop_loss")} placeholder="Enter stop loss price" />
          </div>

          <div>
            <Label>Take Profit</Label>
            <Input type="number" step="any" {...form.register("take_profit")} placeholder="Enter take profit price" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} placeholder="Position notes..." />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
