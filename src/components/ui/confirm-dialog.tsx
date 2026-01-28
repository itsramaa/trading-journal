/**
 * Confirmation Dialog for Nielsen Heuristics:
 * #3: User Control and Freedom (undo/cancel)
 * #5: Error Prevention (confirm destructive actions)
 */

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive" | "warning";
  isLoading?: boolean;
}

const ConfirmDialog = React.forwardRef<HTMLDivElement, ConfirmDialogProps>(
  function ConfirmDialog(
    {
      open,
      onOpenChange,
      title,
      description,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      onConfirm,
      variant = "default",
      isLoading = false,
    },
    ref
  ) {
    const Icon = variant === "destructive" ? Trash2 : variant === "warning" ? AlertTriangle : RefreshCw;
    
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent ref={ref}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  variant === "destructive" && "bg-destructive/10",
                  variant === "warning" && "bg-yellow-500/10",
                  variant === "default" && "bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    variant === "destructive" && "text-destructive",
                    variant === "warning" && "text-yellow-500",
                    variant === "default" && "text-primary"
                  )}
                />
              </div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pl-[52px]">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {isLoading ? "Processing..." : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

ConfirmDialog.displayName = "ConfirmDialog";

export { ConfirmDialog };

// Pre-configured confirm dialogs for common actions
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName = "this item",
  isLoading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName?: string;
  isLoading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Confirmation"
      description={`Are you sure you want to delete ${itemName}? This action cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={onConfirm}
      variant="destructive"
      isLoading={isLoading}
    />
  );
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sign Out"
      description="Are you sure you want to sign out? You'll need to sign in again to access your portfolio."
      confirmLabel="Sign Out"
      onConfirm={onConfirm}
      variant="warning"
    />
  );
}

export function DiscardChangesDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Discard Changes"
      description="You have unsaved changes. Are you sure you want to discard them?"
      confirmLabel="Discard"
      onConfirm={onConfirm}
      variant="warning"
    />
  );
}
