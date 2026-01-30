import { Bell, Palette, Bot, Link, Settings as SettingsIcon } from "lucide-react";
import { AISettingsTab } from "@/components/settings/AISettingsTab";
import { BinanceApiSettings } from "@/components/settings/BinanceApiSettings";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  const { data: settings, isLoading: settingsLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    await updateSettings.mutateAsync({ theme });
    toast.success(`Theme changed to ${theme}`);
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    await updateSettings.mutateAsync({ [key]: value });
    toast.success("Notification preference updated");
  };

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground">Manage your app preferences.</p>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your app preferences.</p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Theme</span>
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
                      <p className="text-sm text-muted-foreground">Daily summary of your portfolio.</p>
                    </div>
                    <Switch
                      checked={settings?.notify_portfolio_updates ?? true}
                      onCheckedChange={(checked) => handleNotificationChange('notify_portfolio_updates', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Report</Label>
                      <p className="text-sm text-muted-foreground">Weekly performance report.</p>
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
                      <p className="text-sm text-muted-foreground">Receive push notifications on this device.</p>
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

          <TabsContent value="appearance" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={settings?.theme === 'light' ? "default" : "outline"}
                      className="h-auto flex-col gap-2 p-4"
                      onClick={() => handleThemeChange('light')}
                    >
                      <div className="h-12 w-full rounded-md bg-muted border" />
                      <span className="text-sm">Light</span>
                    </Button>
                    <Button
                      variant={settings?.theme === 'dark' ? "default" : "outline"}
                      className="h-auto flex-col gap-2 p-4"
                      onClick={() => handleThemeChange('dark')}
                    >
                      <div className="h-12 w-full rounded-md bg-primary" />
                      <span className="text-sm">Dark</span>
                    </Button>
                    <Button
                      variant={settings?.theme === 'system' ? "default" : "outline"}
                      className="h-auto flex-col gap-2 p-4"
                      onClick={() => handleThemeChange('system')}
                    >
                      <div className="h-12 w-full rounded-md bg-gradient-to-r from-muted to-primary" />
                      <span className="text-sm">System</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exchange" className="space-y-4">
            <BinanceApiSettings />
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <AISettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
