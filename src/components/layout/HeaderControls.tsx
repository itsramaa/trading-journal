import { useEffect, useCallback } from "react";
import { Moon, Sun, Bell, Search } from "lucide-react";
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
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAppStore } from "@/store/app-store";
import { demoAssets, demoHoldings, demoTransactions } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";

// Command Search with enhanced features
export function HeaderSearch() {
  const navigate = useNavigate();
  const { isSearchOpen, setSearchOpen } = useAppStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isSearchOpen, setSearchOpen]);

  const handleSelect = useCallback((value: string) => {
    setSearchOpen(false);
    
    if (value.startsWith("asset:")) {
      const symbol = value.replace("asset:", "");
      navigate(`/asset/${symbol}`);
    } else if (value.startsWith("page:")) {
      const path = value.replace("page:", "");
      navigate(path);
    } else if (value.startsWith("tx:")) {
      navigate("/transactions");
    }
  }, [navigate, setSearchOpen]);

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:w-64 md:w-80"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search assets, transactions...</span>
        <span className="lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      <CommandDialog open={isSearchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search assets, transactions, pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Holdings">
            {demoHoldings.slice(0, 5).map((holding) => (
              <CommandItem
                key={holding.id}
                value={`asset:${holding.asset.symbol}`}
                onSelect={handleSelect}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {holding.asset.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{holding.asset.symbol}</p>
                    <p className="text-xs text-muted-foreground">{holding.asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono-numbers">{formatCurrency(holding.value)}</p>
                    <p className={cn(
                      "text-xs font-mono-numbers",
                      holding.profitLossPercent >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {holding.profitLossPercent >= 0 ? "+" : ""}{holding.profitLossPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Recent Transactions">
            {demoTransactions.slice(0, 3).map((tx) => (
              <CommandItem
                key={tx.id}
                value={`tx:${tx.id}`}
                onSelect={handleSelect}
              >
                <div className="flex items-center gap-3 w-full">
                  <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                  <span className="font-medium">{tx.assetSymbol}</span>
                  <span className="text-muted-foreground text-sm">{tx.quantity} @ {formatCurrency(tx.price)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Pages">
            <CommandItem value="page:/" onSelect={handleSelect}>
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem value="page:/portfolio" onSelect={handleSelect}>
              <span>Portfolio</span>
            </CommandItem>
            <CommandItem value="page:/transactions" onSelect={handleSelect}>
              <span>Transactions</span>
            </CommandItem>
            <CommandItem value="page:/analytics" onSelect={handleSelect}>
              <span>Analytics</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

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
