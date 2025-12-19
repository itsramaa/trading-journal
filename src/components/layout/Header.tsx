import { useState, useEffect, useRef } from "react";
import { Bell, Search, Moon, Sun, X, DollarSign, Trash2, LogOut, User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore, type Notification } from "@/store/app-store";
import { useAuth } from "@/hooks/use-auth";
import { demoAssets } from "@/lib/demo-data";
import { formatRelativeTime } from "@/lib/formatters";

export function Header() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { 
    currency, 
    setCurrency, 
    notifications, 
    markAsRead, 
    markAllAsRead,
    clearNotifications 
  } = useAppStore();
  
  const { user, signOut } = useAuth();
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const userInitials = user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 
                       user?.email?.slice(0, 2).toUpperCase() || 
                       'U';

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const toggleCurrency = () => {
    setCurrency(currency === 'USD' ? 'IDR' : 'USD');
  };

  // Search results
  const searchResults = searchQuery.length > 0 ? [
    ...demoAssets.filter(a => 
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5),
  ] : [];

  const handleSelectAsset = (symbol: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(`/asset/${symbol}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search assets...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleCurrency}
            className="gap-1.5 text-xs font-medium"
          >
            <DollarSign className="h-4 w-4" />
            {currency}
          </Button>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-[300px]">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification}
                      onRead={() => markAsRead(notification.id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearNotifications} className="justify-center text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 border-l border-border/50 pl-2 ml-1 h-8 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search assets, transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSearchQuery("")}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {searchResults.length > 0 ? (
              <div className="p-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">Assets</p>
                {searchResults.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleSelectAsset(asset.symbol)}
                    className="flex items-center gap-3 w-full rounded-lg px-2 py-2 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{asset.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{asset.market}</Badge>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Start typing to search</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer",
        !notification.read && "bg-primary/5"
      )}
      onClick={onRead}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs",
        notification.type === 'price_alert' && "bg-chart-1/10 text-chart-1",
        notification.type === 'transaction' && "bg-profit/10 text-profit",
        notification.type === 'system' && "bg-chart-4/10 text-chart-4"
      )}>
        {notification.assetSymbol ? notification.assetSymbol.slice(0, 2) : '!'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </div>
  );
}
