import { useSearchParams } from "react-router-dom";
import { Bell, Bot, Link, Settings as SettingsIcon, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AISettingsTab } from "@/components/settings/AISettingsTab";
import { BinanceApiSettings } from "@/components/settings/BinanceApiSettings";
import { ComingSoonExchangeCard } from "@/components/settings/ComingSoonExchangeCard";
import { TradingConfigTab } from "@/components/settings/TradingConfigTab";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  useUserSettings,
  useUpdateUserSettings,
} from "@/hooks/use-user-settings";
import { Skeleton } from "@/components/ui/skeleton";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'trading';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  
  const { data: settings, isLoading: settingsLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();


  const handleNotificationChange = async (key: string, value: boolean) => {
    await updateSettings.mutateAsync({ [key]: value });
    toast.success("Notification preference updated");
  };

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={SettingsIcon}
          title="Settings"
          description="Manage your app preferences."
        />
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
          icon={SettingsIcon}
          title="Settings"
          description="Manage your app preferences."
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="trading" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trading</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="exchange" className="gap-2">
              <Link className="h-4 w-4" />
              <span className="hidden sm:inline">Exchange</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="space-y-4">
            <TradingConfigTab />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle>Notification Preferences</CardTitle>
                </div>
                <CardDescription>Choose what alerts you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trading Alerts Group */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Trading Alerts</h4>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Price Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when assets hit target prices.</p>
                    </div>
                    <Switch
                      checked={settings?.notify_price_alerts ?? true}
                      onCheckedChange={(checked) => handleNotificationChange('notify_price_alerts', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Market News</Label>
                      <p className="text-sm text-muted-foreground">Important market updates.</p>
                    </div>
                    <Switch
                      checked={settings?.notify_market_news ?? true}
                      onCheckedChange={(checked) => handleNotificationChange('notify_market_news', checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Reports Group */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Reports</h4>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Portfolio Updates</Label>
                      <p className="text-sm text-muted-foreground">Daily summary of your portfolio. Sent at 00:00 UTC.</p>
                    </div>
                    <Switch
                      checked={settings?.notify_portfolio_updates ?? true}
                      onCheckedChange={(checked) => handleNotificationChange('notify_portfolio_updates', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Report</Label>
                      <p className="text-sm text-muted-foreground">Weekly performance report. Sent every Monday at 00:00 UTC.</p>
                    </div>
                    <Switch
                      checked={settings?.notify_weekly_report ?? false}
                      onCheckedChange={(checked) => handleNotificationChange('notify_weekly_report', checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Channels Group */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Channels</h4>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive alerts via email.</p>
                    </div>
                    <Switch
                      checked={settings?.notify_email_enabled ?? true}
                      onCheckedChange={(checked) => handleNotificationChange('notify_email_enabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Enabled for this browser/device only. Other devices require separate activation.</p>
                    </div>
                    <Switch
                      checked={settings?.notify_push_enabled ?? false}
                      onCheckedChange={(checked) => handleNotificationChange('notify_push_enabled', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="exchange" className="space-y-4">
            <BinanceApiSettings />
            <ComingSoonExchangeCard exchange="bybit" />
            <ComingSoonExchangeCard exchange="okx" />
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <AISettingsTab />
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default Settings;
