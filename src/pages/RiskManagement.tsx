/**
 * Risk Management Page - Per Trading Journey Markdown spec
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Shield, Calculator, Settings, TrendingDown, AlertTriangle, History } from "lucide-react";
import { DailyLossTracker } from "@/components/risk/DailyLossTracker";
import { PositionSizeCalculator } from "@/components/risk/PositionSizeCalculator";
import { RiskEventLog } from "@/components/risk/RiskEventLog";
import { useRiskProfile, useUpsertRiskProfile } from "@/hooks/use-risk-profile";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Management</h1>
          <p className="text-muted-foreground">
            Configure and monitor your trading risk parameters
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <Shield className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Position Calculator
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <History className="h-4 w-4" />
              Event Log
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <DailyLossTracker />
              
              {/* Risk Profile Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Profile
                  </CardTitle>
                  <CardDescription>
                    Your current risk management parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {riskProfile ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Risk per Trade</p>
                          <p className="text-lg font-semibold">{riskProfile.risk_per_trade_percent}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Max Daily Loss</p>
                          <p className="text-lg font-semibold">{riskProfile.max_daily_loss_percent}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Max Position Size</p>
                          <p className="text-lg font-semibold">{riskProfile.max_position_size_percent}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Max Positions</p>
                          <p className="text-lg font-semibold">{riskProfile.max_concurrent_positions}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No risk profile configured yet
                      </p>
                      <Button variant="outline">
                        Configure Risk Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Risk Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Alerts
                </CardTitle>
                <CardDescription>
                  Recent risk events and warnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No risk alerts at this time
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator">
            <PositionSizeCalculator accountBalance={10000} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Profile Settings</CardTitle>
                <CardDescription>
                  Configure your risk management parameters. These will be used for position sizing and trade validation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Risk per Trade */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Risk per Trade</Label>
                    <span className="font-medium">{riskPerTrade}%</span>
                  </div>
                  <Slider
                    value={[riskPerTrade]}
                    onValueChange={([value]) => setRiskPerTrade(value)}
                    min={0.5}
                    max={10}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum percentage of account to risk on a single trade
                  </p>
                </div>

                {/* Max Daily Loss */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max Daily Loss</Label>
                    <span className="font-medium">{maxDailyLoss}%</span>
                  </div>
                  <Slider
                    value={[maxDailyLoss]}
                    onValueChange={([value]) => setMaxDailyLoss(value)}
                    min={1}
                    max={20}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stop trading for the day when this loss limit is reached
                  </p>
                </div>

                {/* Max Weekly Drawdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max Weekly Drawdown</Label>
                    <span className="font-medium">{maxWeeklyDrawdown}%</span>
                  </div>
                  <Slider
                    value={[maxWeeklyDrawdown]}
                    onValueChange={([value]) => setMaxWeeklyDrawdown(value)}
                    min={5}
                    max={30}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum drawdown allowed per week before reducing position sizes
                  </p>
                </div>

                {/* Max Position Size */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max Position Size</Label>
                    <span className="font-medium">{maxPositionSize}%</span>
                  </div>
                  <Slider
                    value={[maxPositionSize]}
                    onValueChange={([value]) => setMaxPositionSize(value)}
                    min={10}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum percentage of capital to deploy in a single position
                  </p>
                </div>

                {/* Max Concurrent Positions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max Concurrent Positions</Label>
                    <span className="font-medium">{maxConcurrentPositions}</span>
                  </div>
                  <Slider
                    value={[maxConcurrentPositions]}
                    onValueChange={([value]) => setMaxConcurrentPositions(value)}
                    min={1}
                    max={10}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of open positions allowed at the same time
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={upsertProfile.isPending}
                  >
                    {upsertProfile.isPending ? 'Saving...' : 'Save Risk Profile'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Log Tab */}
          <TabsContent value="events">
            <RiskEventLog />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
