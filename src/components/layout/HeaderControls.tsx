import { Moon, Sun, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

// Re-export GlobalSearch for backward compatibility
export { GlobalSearch as HeaderSearch } from "@/components/search/GlobalSearch";

// ThemeToggle, NotificationToggle, CurrencyToggle remain below

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function NotificationToggle() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useAppStore();
  const count = unreadCount();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {count > 9 ? "9+" : count}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
          {count > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    !notification.read && "bg-muted/30"
                  )}
                  onClick={() => markAsRead(notification.id)}
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
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
