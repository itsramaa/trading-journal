import { Moon, Sun, Bell, BellOff, ExternalLink } from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/store/app-store";
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useUnreadCount } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getNotificationConfig } from "@/lib/constants/notification-config";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden="true" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden="true" />
      <span className="sr-only">{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
    </Button>
  );
}

export function NotificationToggle() {
  const { data: notifications = [] } = useNotifications();
  const count = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 relative"
          aria-label={count > 0 ? `View ${count} notifications` : "View notifications"}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              aria-hidden="true"
            >
              {count > 9 ? "9+" : count}
            </Badge>
          )}
          <span className="sr-only">{count > 0 ? `${count} unread notifications` : "No notifications"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover" align="end" aria-label="Notifications panel">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
          {count > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground gap-3 px-6">
              <BellOff className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-center text-muted-foreground/70">
                You'll get notified when trades close, risk limits are hit, or market conditions change.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notification) => {
                const typeConfig = getNotificationConfig(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      !notification.read && "bg-muted/30"
                    )}
                    onClick={() => !notification.read && markAsRead.mutate(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 mt-1.5 rounded-full shrink-0",
                          !notification.read ? "bg-primary" : "bg-transparent"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => navigate('/notifications')}
            >
              View all notifications
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Currency toggle as a simple button that cycles through currencies
export function CurrencyToggle() {
  const { currency, setCurrency } = useAppStore();

  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'IDR' : 'USD');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCurrency}
      className="h-9 min-w-[60px] font-medium"
    >
      {currency}
    </Button>
  );
}
