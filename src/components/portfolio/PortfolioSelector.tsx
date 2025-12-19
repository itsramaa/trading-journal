import { useState } from "react";
import { ChevronDown, Plus, Settings, Trash2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  usePortfolios,
  useCreatePortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/use-portfolio";
import { useAuth } from "@/hooks/use-auth";
import type { Tables } from "@/integrations/supabase/types";

type Portfolio = Tables<'portfolios'>;

interface PortfolioSelectorProps {
  selectedPortfolioId?: string;
  onPortfolioChange: (portfolio: Portfolio) => void;
}

export function PortfolioSelector({ selectedPortfolioId, onPortfolioChange }: PortfolioSelectorProps) {
  const { user } = useAuth();
  const { data: portfolios, isLoading } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Portfolio | null>(null);

  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioDescription, setNewPortfolioDescription] = useState("");
  const [newPortfolioCurrency, setNewPortfolioCurrency] = useState("USD");

  const selectedPortfolio = portfolios?.find(p => p.id === selectedPortfolioId);

  const handleCreate = async () => {
    if (!user || !newPortfolioName.trim()) return;
    
    try {
      const portfolio = await createPortfolio.mutateAsync({
        user_id: user.id,
        name: newPortfolioName.trim(),
        description: newPortfolioDescription.trim() || null,
        currency: newPortfolioCurrency,
        is_default: portfolios?.length === 0,
      });
      
      toast.success("Portfolio created successfully");
      setCreateDialogOpen(false);
      setNewPortfolioName("");
      setNewPortfolioDescription("");
      setNewPortfolioCurrency("USD");
      onPortfolioChange(portfolio);
    } catch (error) {
      toast.error("Failed to create portfolio");
    }
  };

  const handleEdit = async () => {
    if (!selectedForEdit || !newPortfolioName.trim()) return;
    
    try {
      await updatePortfolio.mutateAsync({
        id: selectedForEdit.id,
        name: newPortfolioName.trim(),
        description: newPortfolioDescription.trim() || null,
        currency: newPortfolioCurrency,
      });
      
      toast.success("Portfolio updated successfully");
      setEditDialogOpen(false);
      setSelectedForEdit(null);
    } catch (error) {
      toast.error("Failed to update portfolio");
    }
  };

  const handleDelete = async () => {
    if (!selectedForEdit) return;
    
    try {
      await deletePortfolio.mutateAsync(selectedForEdit.id);
      toast.success("Portfolio deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedForEdit(null);
      
      // Select another portfolio if available
      const remaining = portfolios?.filter(p => p.id !== selectedForEdit.id);
      if (remaining && remaining.length > 0) {
        onPortfolioChange(remaining[0]);
      }
    } catch (error) {
      toast.error("Failed to delete portfolio");
    }
  };

  const handleSetDefault = async (portfolio: Portfolio) => {
    if (portfolio.is_default) return;
    
    try {
      // First, unset the current default
      const currentDefault = portfolios?.find(p => p.is_default);
      if (currentDefault) {
        await updatePortfolio.mutateAsync({ id: currentDefault.id, is_default: false });
      }
      
      // Then set the new default
      await updatePortfolio.mutateAsync({ id: portfolio.id, is_default: true });
      toast.success(`${portfolio.name} is now your default portfolio`);
    } catch (error) {
      toast.error("Failed to set default portfolio");
    }
  };

  const openEditDialog = (portfolio: Portfolio) => {
    setSelectedForEdit(portfolio);
    setNewPortfolioName(portfolio.name);
    setNewPortfolioDescription(portfolio.description || "");
    setNewPortfolioCurrency(portfolio.currency);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (portfolio: Portfolio) => {
    setSelectedForEdit(portfolio);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[180px] justify-between">
            <span className="truncate">{selectedPortfolio?.name || "Select Portfolio"}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {portfolios?.map((portfolio) => (
            <DropdownMenuItem
              key={portfolio.id}
              className="flex items-center justify-between"
              onClick={() => onPortfolioChange(portfolio)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {portfolio.id === selectedPortfolioId && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
                <span className="truncate">{portfolio.name}</span>
                {portfolio.is_default && (
                  <span className="text-xs text-muted-foreground">(Default)</span>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(portfolio);
                  }}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                {!portfolio.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-loss hover:text-loss"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(portfolio);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Portfolio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Portfolio Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Portfolio</DialogTitle>
            <DialogDescription>
              Add a new portfolio to track your investments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Portfolio Name</Label>
              <Input
                id="name"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                placeholder="My Portfolio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newPortfolioDescription}
                onChange={(e) => setNewPortfolioDescription(e.target.value)}
                placeholder="Describe this portfolio..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Base Currency</Label>
              <Select value={newPortfolioCurrency} onValueChange={setNewPortfolioCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newPortfolioName.trim() || createPortfolio.isPending}>
                {createPortfolio.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Portfolio'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Portfolio Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
            <DialogDescription>
              Update your portfolio details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Portfolio Name</Label>
              <Input
                id="edit-name"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={newPortfolioDescription}
                onChange={(e) => setNewPortfolioDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency">Base Currency</Label>
              <Select value={newPortfolioCurrency} onValueChange={setNewPortfolioCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedForEdit && !selectedForEdit.is_default && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  handleSetDefault(selectedForEdit);
                  setEditDialogOpen(false);
                }}
              >
                Set as Default Portfolio
              </Button>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!newPortfolioName.trim() || updatePortfolio.isPending}>
                {updatePortfolio.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Portfolio'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedForEdit?.name}"? This will also delete all associated holdings and transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePortfolio.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Portfolio'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
