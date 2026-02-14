/**
 * EditAccountDialog - Dialog for editing account name, broker, description
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateAccount } from "@/hooks/use-accounts";
import { toast } from "sonner";
import type { Account } from "@/types/account";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

export function EditAccountDialog({ open, onOpenChange, account }: EditAccountDialogProps) {
  const [name, setName] = useState("");
  const [broker, setBroker] = useState("");
  const [description, setDescription] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const updateAccount = useUpdateAccount();

  useEffect(() => {
    if (account) {
      setName(account.name);
      setBroker(account.metadata?.broker || "");
      setDescription(account.description || "");
      setAccountNumber(account.metadata?.account_number || "");
    }
  }, [account]);

  const handleSave = async () => {
    if (!account || !name.trim()) return;

    try {
      await updateAccount.mutateAsync({
        id: account.id,
        name: name.trim(),
        description: description.trim() || null,
        metadata: {
          ...account.metadata,
          broker: broker.trim() || undefined,
          account_number: accountNumber.trim() || undefined,
        },
      });
      toast.success("Account updated");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update account details
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Trading Account"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="broker">Broker</Label>
            <Input
              id="broker"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder="e.g. Binance, Bybit"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this account"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || updateAccount.isPending}>
            {updateAccount.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
