/**
 * Risk Management Page - Per Trading Journey Markdown spec
 * Refactored: Extracted RiskProfileSummaryCard and RiskSettingsForm
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { Shield, Calculator, Settings, AlertTriangle, History, LayoutDashboard } from "lucide-react";
import { 
  DailyLossTracker, 
  PositionSizeCalculator, 
  RiskEventLog, 
  CorrelationMatrix,
  RiskProfileSummaryCard,
  RiskSettingsForm,
} from "@/components/risk";
import { useRiskProfile, useUpsertRiskProfile } from "@/hooks/use-risk-profile";
import { useState, useEffect } from "react";

export default function RiskManagement() {
  const { data: riskProfile, isLoading } = useRiskProfile();
  const upsertProfile = useUpsertRiskProfile();

  // Form state
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5);
  const [maxWeeklyDrawdown, setMaxWeeklyDrawdown] = useState(10);
  const [maxPositionSize, setMaxPositionSize] = useState(40);
  const [maxConcurrentPositions, setMaxConcurrentPositions] = useState(3);

  // Load existing profile values
  useEffect(() => {
    if (riskProfile) {
      setRiskPerTrade(riskProfile.risk_per_trade_percent);
      setMaxDailyLoss(riskProfile.max_daily_loss_percent);
      setMaxWeeklyDrawdown(riskProfile.max_weekly_drawdown_percent);
      setMaxPositionSize(riskProfile.max_position_size_percent);
      setMaxConcurrentPositions(riskProfile.max_concurrent_positions);
    }
  }, [riskProfile]);

  const handleSaveProfile = async () => {
    await upsertProfile.mutateAsync({
      risk_per_trade_percent: riskPerTrade,
      max_daily_loss_percent: maxDailyLoss,
      max_weekly_drawdown_percent: maxWeeklyDrawdown,
      max_position_size_percent: maxPositionSize,
      max_concurrent_positions: maxConcurrentPositions,
    });
  };

  const navigateToSettings = () => {
    document.querySelector('[value="settings"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Risk Management
          </h1>
          <p className="text-muted-foreground">
            Configure and monitor your trading risk parameters
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Calculator</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <QuickTip storageKey="risk-daily-limit">
              Your daily loss limit protects your capital. When you reach 100%, 
              new trades will be blocked until the next trading day. This is your 
              most important safeguard against overtrading.
            </QuickTip>
            
            <DailyLossTracker />
            
            <div className="grid gap-6 lg:grid-cols-2">
              <RiskProfileSummaryCard 
                riskProfile={riskProfile} 
                onConfigureClick={navigateToSettings} 
              />

              {/* Risk Alerts */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Risk Alerts
                  </CardTitle>
                  <CardDescription>
                    Recent risk events and warnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={Shield}
                    title="All Clear"
                    description="No active risk alerts. Your trading is within defined parameters."
                  />
                </CardContent>
              </Card>
            </div>

            <CorrelationMatrix />
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator">
            <PositionSizeCalculator accountBalance={10000} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <RiskSettingsForm
              riskPerTrade={riskPerTrade}
              maxDailyLoss={maxDailyLoss}
              maxWeeklyDrawdown={maxWeeklyDrawdown}
              maxPositionSize={maxPositionSize}
              maxConcurrentPositions={maxConcurrentPositions}
              onRiskPerTradeChange={setRiskPerTrade}
              onMaxDailyLossChange={setMaxDailyLoss}
              onMaxWeeklyDrawdownChange={setMaxWeeklyDrawdown}
              onMaxPositionSizeChange={setMaxPositionSize}
              onMaxConcurrentPositionsChange={setMaxConcurrentPositions}
              onSave={handleSaveProfile}
              isSaving={upsertProfile.isPending}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <RiskEventLog />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
