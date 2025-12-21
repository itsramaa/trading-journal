import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Link2, Unlink, ArrowRight, Loader2 } from "lucide-react";
import { useAccountLinks, useCreateAccountLink, useDeleteAccountLink, AccountLink } from "@/hooks/use-account-links";
import { useAccounts } from "@/hooks/use-accounts";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountLinksManagerProps {
  accountId?: string;
  showAllLinks?: boolean;
}

export function AccountLinksManager({ accountId, showAllLinks = false }: AccountLinksManagerProps) {
  const { data: allLinks = [], isLoading: linksLoading } = useAccountLinks();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const createLink = useCreateAccountLink();
  const deleteLink = useDeleteAccountLink();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingLink, setDeletingLink] = useState<AccountLink | null>(null);
  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [linkType, setLinkType] = useState("general");

  // Filter links based on props
  const links = showAllLinks
    ? allLinks
    : allLinks.filter(l => l.parent_account_id === accountId || l.child_account_id === accountId);

  const getAccountName = (id: string) => {
    const account = accounts.find(a => a.id === id);
    return account?.name || "Unknown Account";
  };

  const getAccountType = (id: string) => {
    const account = accounts.find(a => a.id === id);
    return account?.account_type || "";
  };

  const handleCreate = async () => {
    if (!parentId || !childId) return;
    await createLink.mutateAsync({
      parent_account_id: parentId,
      child_account_id: childId,
      link_type: linkType,
    });
    setIsAddOpen(false);
    setParentId("");
    setChildId("");
    setLinkType("general");
  };

  const handleDelete = async () => {
    if (deletingLink) {
      await deleteLink.mutateAsync(deletingLink.id);
      setDeletingLink(null);
    }
  };

  // Filter out already linked accounts and self
  const availableParents = accounts.filter(a => 
    !links.some(l => l.parent_account_id === a.id && l.child_account_id === childId)
  );
  const availableChildren = accounts.filter(a => 
    a.id !== parentId && 
    !links.some(l => l.parent_account_id === parentId && l.child_account_id === a.id)
  );

  if (linksLoading || accountsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-primary" />
              Account Links
            </CardTitle>
            <CardDescription>
              Link related accounts together (e.g., broker to trading)
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Link
          </Button>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No account links"
              description="Link accounts to group related financial instruments"
              action={{
                label: "Create Link",
                onClick: () => setIsAddOpen(true),
              }}
            />
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <span className="font-medium">{getAccountName(link.parent_account_id)}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {getAccountType(link.parent_account_id)}
                      </Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="font-medium">{getAccountName(link.child_account_id)}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {getAccountType(link.child_account_id)}
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {link.link_type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeletingLink(link)}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Link Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parent Account</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent account" />
                </SelectTrigger>
                <SelectContent>
                  {availableParents.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>Child Account</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select child account" />
                </SelectTrigger>
                <SelectContent>
                  {availableChildren.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link Type</Label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="funding">Funding Source</SelectItem>
                  <SelectItem value="trading">Trading</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!parentId || !childId || createLink.isPending}
            >
              {createLink.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingLink}
        onOpenChange={(open) => !open && setDeletingLink(null)}
        title="Remove Account Link"
        description="Are you sure you want to remove this link? This won't delete the accounts themselves."
        onConfirm={handleDelete}
        confirmLabel="Remove"
        variant="destructive"
      />
    </>
  );
}
