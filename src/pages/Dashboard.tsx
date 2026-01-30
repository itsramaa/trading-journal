/**
 * Trading Dashboard - Main overview showing trading performance
 * Reorganized per user spec:
 * 1. System Status, 2. Quick Actions (Add), 3. Pro Tip, 4. Market Sessions,
 * 5. Today Activity, 6. Risk & AI Insights, 7. Trading Journey CTA
 */
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuickTip, OnboardingTooltip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskSummaryCard } from "@/components/risk/RiskSummaryCard";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { TodayPerformance } from "@/components/dashboard/TodayPerformance";
import { SystemStatusIndicator } from "@/components/dashboard/SystemStatusIndicator";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useRealtime } from "@/hooks/use-realtime";
import { MarketSessionsWidget } from "@/components/dashboard/MarketSessionsWidget";
import { 
  ChevronRight,
  LineChart,
  BookOpen,
  Shield,
  Globe,
  Calendar,
  AlertTriangle,
  Activity,
  CandlestickChart,
} from "lucide-react";

// First-time user onboarding steps (UCD + JTBD framework)
const DASHBOARD_ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Trading Journey",
    description: "Track your trades, analyze patterns, and improve your trading with AI insights.",
  },
  {
    id: "quick-actions",
    title: "Quick Actions",
    description: "Log trades, start sessions, and check your risk from the Quick Actions section below.",
  },
  {
    id: "ai-insights",
    title: "AI-Powered Analysis",
    description: "Get personalized recommendations based on your trading history after 5+ trades.",
  },
];

const Dashboard = () => {
  const { t } = useTranslation();
  
  // Enable realtime updates for dashboard data
  useRealtime({
    tables: ["accounts", "account_transactions", "trade_entries"],
  });

  // Trading data
  const { data: trades = [] } = useTradeEntries();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>

        {/* System Status - Right after welcome, no title */}
        <SystemStatusIndicator />

        {/* Quick Actions - Add something */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/trading">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-sm">Add Trade</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/accounts">
                <CandlestickChart className="h-5 w-5 text-primary" />
                <span className="text-sm">Add Account</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/strategies">
                <LineChart className="h-5 w-5 text-primary" />
                <span className="text-sm">Add Strategy</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/risk">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">Risk Check</span>
              </Link>
            </Button>
          </div>
        </section>

        {/* Pro Tip */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> for all shortcuts.
        </QuickTip>

        {/* Market Sessions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Market Sessions</h2>
          </div>
          <MarketSessionsWidget />
        </section>

        {/* Today's Activity */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Today's Activity</h2>
          </div>
          <TodayPerformance />
        </section>

        {/* Section 7: Risk & AI Insights */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Risk & AI Insights</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/risk" className="flex items-center gap-1">
                View Details <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <RiskSummaryCard />
            <AIInsightsWidget />
          </div>
        </section>

        {/* Section 7: Trading Journey CTA (if no trades) */}
        {trades.length === 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('nav.tradingJourney')}</h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/trading" className="flex items-center gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={Activity}
                  title="Start Your Trading Journey"
                  description="Log your first trade to begin tracking your performance and receiving AI-powered insights."
                  action={{
                    label: "Log First Trade",
                    onClick: () => window.location.href = '/trading',
                  }}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* First-Time User Onboarding */}
      <OnboardingTooltip 
        steps={DASHBOARD_ONBOARDING_STEPS} 
        storageKey="dashboard" 
      />
    </DashboardLayout>
  );
};

export default Dashboard;
