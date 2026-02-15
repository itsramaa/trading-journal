/**
 * ExchangeOnboardingModal - Post-login step to guide users to connect Binance
 * Shows once after first login when no exchange credentials exist.
 * Dismissed state persisted via localStorage.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Wallet, BarChart3, Shield, CheckCircle, X } from "lucide-react";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";

const STORAGE_KEY = "exchange-onboarding-dismissed";

interface ExchangeOnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export function ExchangeOnboardingModal({ open, onComplete }: ExchangeOnboardingModalProps) {
  const [showForm, setShowForm] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  };

  const handleSuccess = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-5 w-5 text-primary" />
            Connect Your Exchange
          </DialogTitle>
          <DialogDescription>
            Sync your Binance Futures trade history for automatic analytics, P&L tracking, and AI insights.
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4 pt-2">
            {/* Benefits */}
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: BarChart3, text: "Auto-import all closed trades with full P&L" },
                { icon: Shield, text: "Read-only API keys — no withdrawal access needed" },
                { icon: CheckCircle, text: "Real-time position tracking & risk monitoring" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              ))}
            </div>

            {/* How to get API key */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">How to get your API key:</span>{" "}
                  Binance App → Profile → API Management → Create API → Enable Futures (read-only).
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={() => setShowForm(true)}>
                Connect Binance <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={handleDismiss}>
                Skip for now
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <ApiKeyForm
              onSuccess={handleSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function useExchangeOnboarding() {
  const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
  return { shouldShow: !dismissed };
}
