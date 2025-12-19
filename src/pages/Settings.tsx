import { useState, useEffect } from "react";
import { User, Bell, Shield, Palette, LogOut, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/hooks/use-auth";
import {
  useUserSettings,
  useUpdateUserSettings,
  useUserProfile,
  useUpdateUserProfile,
  useUpdatePassword,
} from "@/hooks/use-user-settings";
import type { Currency } from "@/types/portfolio";

const Settings = () => {
  const { currency, setCurrency } = useAppStore();
  const { user, signOut } = useAuth();
  
  const { data: userSettings, isLoading: settingsLoading } = useUserSettings();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const updateSettings = useUpdateUserSettings();
  const updateProfile = useUpdateUserProfile();
  const updatePassword = useUpdatePassword();

  const [fullname, setFullname] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("utc+7");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    portfolioUpdates: true,
    weeklyReport: false,
    marketNews: true,
  });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    if (userProfile) {
      setFullname(userProfile.fullname || "");
      setBio(userProfile.bio || "");
    }
  }, [userProfile]);

  useEffect(() => {
    if (userSettings) {
      setTimezone(userSettings.timezone || "utc+7");
      setCurrency(userSettings.default_currency as Currency);
      setNotifications(prev => ({
        ...prev,
        priceAlerts: userSettings.notifications_enabled ?? true,
      }));
    }
  }, [userSettings, setCurrency]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({ fullname, bio });
      await updateSettings.mutateAsync({ timezone });
      toast.success("Profile saved successfully");
    } catch (error) {
      toast.error("Failed to save profile");
    }
  };

  const handleCurrencyChange = async (value: string) => {
    setCurrency(value as Currency);
    try {
      await updateSettings.mutateAsync({ default_currency: value });
      toast.success(`Currency changed to ${value}`);
    } catch (error) {
      toast.error("Failed to update currency");
    }
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        setIsDark(true);
      } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
      }
    }
    
    try {
      await updateSettings.mutateAsync({ theme });
      toast.success(`Theme changed to ${theme}`);
    } catch (error) {
      // Theme still works locally
    }
  };

  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    
    if (key === 'priceAlerts') {
      try {
        await updateSettings.mutateAsync({ notifications_enabled: value });
      } catch (error) {
        // Silently fail
      }
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await updatePassword.mutateAsync({ newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await signOut();
      toast.success("Account deletion requested. Please contact support to complete.");
    } catch (error) {
      toast.error("Failed to process request");
    }
  };

  const isLoading = settingsLoading || profileLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={userProfile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {fullname?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" disabled>
                          Change Avatar
                        </Button>
                        <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullname">Full Name</Label>
                        <Input
                          id="fullname"
                          value={fullname}
                          onChange={(e) => setFullname(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ""}
                          disabled
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Input
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Default Currency</Label>
                        <Select value={currency} onValueChange={handleCurrencyChange}>
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                          <SelectTrigger id="timezone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                            <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                            <SelectItem value="utc+7">Jakarta (UTC+7)</SelectItem>
                            <SelectItem value="utc+0">London (UTC+0)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending || updateSettings.isPending}
                      >
                        {(updateProfile.isPending || updateSettings.isPending) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what alerts you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Price Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when assets hit target prices.</p>
                  </div>
                  <Switch
                    checked={notifications.priceAlerts}
                    onCheckedChange={(checked) => handleNotificationChange('priceAlerts', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Portfolio Updates</Label>
                    <p className="text-sm text-muted-foreground">Daily summary of your portfolio.</p>
                  </div>
                  <Switch
                    checked={notifications.portfolioUpdates}
                    onCheckedChange={(checked) => handleNotificationChange('portfolioUpdates', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Report</Label>
                    <p className="text-sm text-muted-foreground">Weekly performance report.</p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReport}
                    onCheckedChange={(checked) => handleNotificationChange('weeklyReport', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Market News</Label>
                    <p className="text-sm text-muted-foreground">Important market updates.</p>
                  </div>
                  <Switch
                    checked={notifications.marketNews}
                    onCheckedChange={(checked) => handleNotificationChange('marketNews', checked)}
                  />
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
                      variant={!isDark ? "default" : "outline"}
                      className="h-auto flex-col gap-2 p-4"
                      onClick={() => handleThemeChange('light')}
                    >
                      <div className="h-12 w-full rounded-md bg-muted border" />
                      <span className="text-sm">Light</span>
                    </Button>
                    <Button
                      variant={isDark ? "default" : "outline"}
                      className="h-auto flex-col gap-2 p-4"
                      onClick={() => handleThemeChange('dark')}
                    >
                      <div className="h-12 w-full rounded-md bg-primary" />
                      <span className="text-sm">Dark</span>
                    </Button>
                    <Button
                      variant="outline"
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

          <TabsContent value="security" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Change Password</Label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handlePasswordChange}
                    disabled={updatePassword.isPending || !newPassword || !confirmPassword}
                  >
                    {updatePassword.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add extra security to your account.</p>
                  </div>
                  <Button variant="outline" disabled>Enable 2FA</Button>
                </div>

                <Separator />

                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium text-destructive">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently delete your account.</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
