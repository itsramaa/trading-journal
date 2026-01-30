import { useState } from "react";
import { Bell, BellOff, Check, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  read: boolean;
  timestamp: string;
}

const dummyNotifications: Notification[] = [
  {
    id: "1",
    title: "Price Alert Triggered",
    message: "BTC has reached your target price of $95,000",
    type: "success",
    read: false,
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    title: "Portfolio Update",
    message: "Your portfolio value increased by 5.2% this week",
    type: "info",
    read: false,
    timestamp: "1 day ago",
  },
  {
    id: "3",
    title: "Market Alert",
    message: "High volatility detected in crypto markets",
    type: "warning",
    read: true,
    timestamp: "2 days ago",
  },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>(dummyNotifications);
  const [settings, setSettings] = useState({
    priceAlerts: true,
    portfolioUpdates: true,
    marketNews: false,
    weeklyDigest: true,
    emailNotifications: true,
    pushNotifications: false,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-profit/10 text-profit";
      case "warning":
        return "bg-warning/10 text-warning";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={notification.read ? "opacity-60" : ""}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getTypeColor(notification.type)}`}
                    >
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.read && (
                          <Badge variant="default" className="h-2 w-2 rounded-full p-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.timestamp}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BellOff className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-muted-foreground">No notifications</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {notifications.filter((n) => !n.read).length > 0 ? (
              notifications
                .filter((n) => !n.read)
                .map((notification) => (
                  <Card key={notification.id}>
                    <CardContent className="flex items-start gap-4 p-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getTypeColor(notification.type)}`}
                      >
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.timestamp}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Check className="h-12 w-12 text-profit" />
                  <p className="mt-4 text-muted-foreground">All caught up!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}
