/**
 * Command Palette Component - Quick navigation and global search
 * Triggered by ⌘K (Mac) or Ctrl+K (Windows)
 * Features: Page navigation, Recent pages, Global data search
 */
import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  BarChart3,
  Notebook,
  History,
  Shield,
  Calculator,
  Lightbulb,
  Play,
  LineChart,
  DollarSign,
  Grid3X3,
  Brain,
  Building2,
  Settings,
  Clock,
  ArrowUpDown,
  Wallet,
  FileText,
  Flame,
  Download,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/keyboard-shortcut";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// All navigable pages with their shortcuts
const PAGES = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, shortcut: "D", domain: null },
  { title: "AI Analysis", url: "/market", icon: TrendingUp, shortcut: "M", domain: "Market" },
  { title: "Economic Calendar", url: "/calendar", icon: Calendar, shortcut: "C", domain: "Market" },
  { title: "Market Data", url: "/market-data", icon: BarChart3, shortcut: "V", domain: "Market" },
  { title: "Top Movers", url: "/top-movers", icon: Flame, shortcut: "O", domain: "Market" },
  { title: "Trading Journal", url: "/trading", icon: Notebook, shortcut: "T", domain: "Journal" },
  { title: "Closed Trades", url: "/trading?tab=closed", icon: History, shortcut: null, domain: "Journal" },
  { title: "Import & Sync", url: "/import", icon: Download, shortcut: "N", domain: "Journal" },
  { title: "Risk Overview", url: "/risk", icon: Shield, shortcut: "R", domain: "Risk" },
  { title: "Position Calculator", url: "/calculator", icon: Calculator, shortcut: "X", domain: "Risk" },
  { title: "My Strategies", url: "/strategies", icon: Lightbulb, shortcut: "S", domain: "Strategy" },
  { title: "Backtest", url: "/backtest", icon: Play, shortcut: "B", domain: "Strategy" },
  { title: "Performance Overview", url: "/performance", icon: LineChart, shortcut: "P", domain: "Analytics" },
  { title: "Daily P&L", url: "/daily-pnl", icon: DollarSign, shortcut: "L", domain: "Analytics" },
  { title: "Heatmap", url: "/heatmap", icon: Grid3X3, shortcut: "E", domain: "Analytics" },
  { title: "AI Insights", url: "/ai-insights", icon: Brain, shortcut: "I", domain: "Analytics" },
  { title: "Account List", url: "/accounts", icon: Building2, shortcut: "A", domain: "Accounts" },
  { title: "Bulk Export", url: "/export", icon: Download, shortcut: "W", domain: "Tools" },
  { title: "Settings", url: "/settings", icon: Settings, shortcut: ",", domain: "Settings" },
];

// Recent pages storage key
const RECENT_PAGES_KEY = "trading-journey-recent-pages";
const MAX_RECENT_PAGES = 5;

// Hook for managing recent pages
function useRecentPages() {
  const [recentPages, setRecentPages] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const addRecentPage = React.useCallback((url: string) => {
    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p !== url);
      const updated = [url, ...filtered].slice(0, MAX_RECENT_PAGES);
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { recentPages, addRecentPage };
}

// Get pages grouped by domain
function getGroupedPages() {
  const standalone = PAGES.filter((p) => !p.domain);
  const grouped = PAGES.filter((p) => p.domain).reduce(
    (acc, page) => {
      const domain = page.domain!;
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(page);
      return acc;
    },
    {} as Record<string, typeof PAGES>
  );

  return { standalone, grouped };
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { standalone, grouped } = getGroupedPages();
  const { recentPages, addRecentPage } = useRecentPages();
  const [searchQuery, setSearchQuery] = React.useState("");

  // Track current page as recent
  React.useEffect(() => {
    if (location.pathname !== "/") {
      addRecentPage(location.pathname);
    }
  }, [location.pathname, addRecentPage]);

  // Search trades query
  const { data: trades = [] } = useQuery({
    queryKey: ["command-search-trades", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("trade_entries")
        .select("id, pair, direction, pnl, trade_date, status")
        .or(`pair.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`)
        .order("trade_date", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: open && searchQuery.length >= 2,
  });

  // Search strategies query
  const { data: strategies = [] } = useQuery({
    queryKey: ["command-search-strategies", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("trading_strategies")
        .select("id, name, description, status, timeframe")
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(5);
      return data || [];
    },
    enabled: open && searchQuery.length >= 2,
  });

  // Search accounts query
  const { data: accounts = [] } = useQuery({
    queryKey: ["command-search-accounts", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const { data } = await supabase
        .from("accounts")
        .select("id, name, account_type, balance, currency")
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(5);
      return data || [];
    },
    enabled: open && searchQuery.length >= 2,
  });

  const handleSelect = (url: string) => {
    addRecentPage(url);
    navigate(url);
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleTradeSelect = (tradeId: string) => {
    navigate(`/trading/${tradeId}`);
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleStrategySelect = (strategyId: string) => {
    navigate(`/strategies?strategy=${strategyId}`);
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleAccountSelect = (accountId: string) => {
    navigate(`/accounts/${accountId}`);
    onOpenChange(false);
    setSearchQuery("");
  };

  // Get recent pages with their info
  const recentPagesInfo = recentPages
    .map((url) => PAGES.find((p) => p.url === url))
    .filter(Boolean) as typeof PAGES;

  const hasDataResults = trades.length > 0 || strategies.length > 0 || accounts.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, trades, strategies, accounts..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Data Search Results */}
        {hasDataResults && (
          <>
            {/* Trades */}
            {trades.length > 0 && (
              <CommandGroup heading="Trades">
                {trades.map((trade) => (
                  <CommandItem
                    key={trade.id}
                    value={`trade ${trade.pair} ${trade.direction}`}
                    onSelect={() => handleTradeSelect(trade.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="font-medium">{trade.pair}</span>
                      <Badge
                        variant={trade.direction === "long" ? "default" : "destructive"}
                        className="text-[10px] px-1 py-0"
                      >
                        {trade.direction?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={
                          (trade.pnl || 0) >= 0 ? "text-profit" : "text-loss"
                        }
                      >
                        {(trade.pnl || 0) >= 0 ? "+" : ""}
                        {trade.pnl?.toFixed(2)}
                      </span>
                      <span>{format(new Date(trade.trade_date), "MMM d")}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Strategies */}
            {strategies.length > 0 && (
              <CommandGroup heading="Strategies">
                {strategies.map((strategy) => (
                  <CommandItem
                    key={strategy.id}
                    value={`strategy ${strategy.name}`}
                    onSelect={() => handleStrategySelect(strategy.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{strategy.name}</span>
                      {strategy.timeframe && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {strategy.timeframe}
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant={strategy.status === "active" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {strategy.status}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Accounts */}
            {accounts.length > 0 && (
              <CommandGroup heading="Accounts">
                {accounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={`account ${account.name}`}
                    onSelect={() => handleAccountSelect(account.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <span>{account.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {account.account_type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {account.balance?.toLocaleString()} {account.currency}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />
          </>
        )}

        {/* Recent Pages */}
        {recentPagesInfo.length > 0 && searchQuery.length === 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentPagesInfo.map((page) => (
                <CommandItem
                  key={`recent-${page.url}`}
                  value={`recent ${page.title}`}
                  onSelect={() => handleSelect(page.url)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <page.icon className="h-4 w-4" />
                    <span>{page.title}</span>
                  </div>
                  {page.shortcut && <Kbd keys={["G", page.shortcut]} className="opacity-60" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Standalone items (Dashboard) */}
        <CommandGroup>
          {standalone.map((page) => (
            <CommandItem
              key={page.url}
              value={page.title}
              onSelect={() => handleSelect(page.url)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <page.icon className="h-4 w-4" />
                <span>{page.title}</span>
              </div>
              {page.shortcut && <Kbd keys={["G", page.shortcut]} className="opacity-60" />}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Grouped items by domain */}
        {Object.entries(grouped).map(([domain, pages]) => (
          <CommandGroup key={domain} heading={domain}>
            {pages.map((page) => (
              <CommandItem
                key={page.url}
                value={`${domain} ${page.title}`}
                onSelect={() => handleSelect(page.url)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <page.icon className="h-4 w-4" />
                  <span>{page.title}</span>
                </div>
                {page.shortcut && <Kbd keys={["G", page.shortcut]} className="opacity-60" />}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook to manage command palette state and keyboard shortcut
 */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

// Export pages for use in sidebar
export { PAGES };
