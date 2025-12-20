import { useState } from "react";
import { Sparkles, Check, Zap, Shield, BarChart3, Users, Loader2, Crown } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserSettings, useUpdateSubscription } from "@/hooks/use-user-settings";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "For personal use",
    features: [
      "1 Portfolio",
      "Basic analytics",
      "Limited transactions",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29.99,
    description: "For active investors",
    features: [
      "Unlimited portfolios",
      "Advanced analytics",
      "Unlimited transactions",
      "Priority support",
      "Real-time price alerts",
      "AI-powered insights",
      "Export reports",
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: 99.99,
    description: "For teams and professionals",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "API access",
      "Custom integrations",
      "Dedicated support",
      "White-label options",
    ],
  },
];

const features = [
  {
    icon: Zap,
    title: "Real-time Data",
    description: "Get live market prices and portfolio updates instantly",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Deep insights into your portfolio performance and trends",
  },
  {
    icon: Shield,
    title: "Bank-level Security",
    description: "Your data is encrypted and protected at all times",
  },
  {
    icon: Users,
    title: "Priority Support",
    description: "Get help when you need it from our expert team",
  },
];

export default function Upgrade() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSubscription = useUpdateSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentPlan = settings?.subscription_plan || "free";
  const planStatus = settings?.subscription_status || 'active';

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan) return;
    setSelectedPlan(planId);
    setShowConfirmDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    
    try {
      await updateSubscription.mutateAsync({ plan: selectedPlan as 'free' | 'pro' | 'business' });
      setShowConfirmDialog(false);
      setSelectedPlan(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const selectedPlanDetails = plans.find(p => p.id === selectedPlan);
  const isUpgrade = selectedPlan && plans.findIndex(p => p.id === selectedPlan) > plans.findIndex(p => p.id === currentPlan);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="text-center">
            <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
            <Skeleton className="mx-auto mt-4 h-8 w-48" />
            <Skeleton className="mx-auto mt-2 h-5 w-72" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-[400px]" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {currentPlan === "free" ? "Upgrade to Pro" : "Manage Your Plan"}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            {currentPlan === "free" 
              ? "Unlock the full potential of your portfolio management"
              : `You're currently on the ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan (${planStatus})`}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            
            return (
              <Card
                key={plan.name}
                className={cn(
                  "relative transition-all",
                  plan.popular && "border-primary shadow-lg",
                  isCurrent && "ring-2 ring-profit"
                )}
              >
                {plan.popular && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-profit text-profit-foreground">
                    <Crown className="mr-1 h-3 w-3" />
                    Current Plan
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-profit" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : plan.popular ? "default" : "secondary"}
                    disabled={isCurrent || updateSubscription.isPending}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {isCurrent ? (
                      "Current Plan"
                    ) : plan.id === "free" ? (
                      "Downgrade"
                    ) : (
                      "Get Started"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Grid */}
        <div className="space-y-4">
          <h2 className="text-center text-xl font-semibold">Why Upgrade?</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Is there a free trial?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! Pro plans come with a 14-day free trial. No credit card required.
              </p>
            </div>
            <div>
              <h4 className="font-medium">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards, PayPal, and bank transfers for annual plans.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isUpgrade ? "Confirm Upgrade" : "Confirm Downgrade"}
              </DialogTitle>
              <DialogDescription>
                {isUpgrade ? (
                  <>
                    You're about to upgrade to the <strong>{selectedPlanDetails?.name}</strong> plan 
                    for <strong>${selectedPlanDetails?.price}/month</strong>.
                    <br /><br />
                    <span className="text-muted-foreground text-xs">
                      Note: This is a demo. In production, you would be redirected to a secure checkout.
                    </span>
                  </>
                ) : (
                  <>
                    You're about to downgrade to the <strong>{selectedPlanDetails?.name}</strong> plan.
                    You'll lose access to premium features at the end of your current billing period.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmUpgrade}
                disabled={updateSubscription.isPending}
                variant={isUpgrade ? "default" : "destructive"}
              >
                {updateSubscription.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  isUpgrade ? "Confirm Upgrade" : "Confirm Downgrade"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
