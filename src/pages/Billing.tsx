import { useState } from "react";
import { CreditCard, Receipt, Calendar, CheckCircle2, Crown, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserSettings, useUpdateSubscription } from "@/hooks/use-user-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const mockInvoices = [
  { id: "INV-001", date: "Dec 1, 2024", amount: 29.99, status: "paid" },
  { id: "INV-002", date: "Nov 1, 2024", amount: 29.99, status: "paid" },
  { id: "INV-003", date: "Oct 1, 2024", amount: 29.99, status: "paid" },
];

const planDetails: Record<string, { name: string; price: number; description: string }> = {
  free: { name: "Free", price: 0, description: "Basic features included" },
  pro: { name: "Pro", price: 29.99, description: "Advanced features for active investors" },
  business: { name: "Business", price: 99.99, description: "Full suite for teams and professionals" },
};

export default function Billing() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSubscription = useUpdateSubscription();

  const currentPlan = settings?.subscription_plan || "free";
  const planInfo = planDetails[currentPlan] || planDetails.free;
  const expiresAt = settings?.plan_expires_at 
    ? format(new Date(settings.plan_expires_at), "MMM d, yyyy")
    : null;

  // Show mock invoices only for paid plans
  const invoices = currentPlan !== "free" ? mockInvoices : [];

  const handleCancelSubscription = async () => {
    await updateSubscription.mutateAsync({ plan: "free" });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
            <p className="text-muted-foreground">
              Manage your subscription and payment methods
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                {currentPlan !== "free" && <Crown className="h-4 w-4 text-yellow-500" />}
              </CardTitle>
              <CardDescription>Your active subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{planInfo.name} Plan</p>
                  <p className="text-sm text-muted-foreground">{planInfo.description}</p>
                </div>
                <Badge 
                  variant={currentPlan === "free" ? "secondary" : "default"}
                  className={currentPlan !== "free" ? "bg-profit text-profit-foreground" : ""}
                >
                  Active
                </Badge>
              </div>
              <Separator />
              
              {currentPlan !== "free" ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly cost</span>
                    <span className="font-medium">${planInfo.price}/month</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Next billing date</span>
                    <span>{expiresAt || "—"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link to="/upgrade">Change Plan</Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive"
                      onClick={handleCancelSubscription}
                      disabled={updateSubscription.isPending}
                    >
                      {updateSubscription.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Cancel"
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Next billing date</span>
                    <span>—</span>
                  </div>
                  <Button className="w-full" asChild>
                    <Link to="/upgrade">Upgrade to Pro</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPlan !== "free" ? (
                <>
                  <div className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-muted">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/25</p>
                    </div>
                    <Badge variant="outline">Default</Badge>
                  </div>
                  <Button variant="outline" className="w-full">
                    Update Payment Method
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-muted">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">No payment method added</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/upgrade">Add Payment Method</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>Your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-profit/10">
                        <CheckCircle2 className="h-5 w-5 text-profit" />
                      </div>
                      <div>
                        <p className="font-medium">{invoice.id}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {invoice.date}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-medium">${invoice.amount}</p>
                      <Badge variant="secondary" className="bg-profit/10 text-profit">
                        {invoice.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">No billing history yet</p>
                <p className="text-sm text-muted-foreground">
                  {currentPlan === "free" 
                    ? "Upgrade to Pro to see your invoices here" 
                    : "Your invoices will appear here"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
