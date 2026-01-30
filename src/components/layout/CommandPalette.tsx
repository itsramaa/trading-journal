/**
 * Command Palette Component - Quick navigation and search
 * Triggered by ⌘K (Mac) or Ctrl+K (Windows)
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
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

// All navigable pages with their shortcuts
const PAGES = [
  // Dashboard
  { title: "Dashboard", url: "/", icon: LayoutDashboard, shortcut: "D", domain: null },
  
  // Market domain
  { title: "AI Analysis", url: "/market", icon: TrendingUp, shortcut: "M", domain: "Market" },
  { title: "Economic Calendar", url: "/calendar", icon: Calendar, shortcut: "C", domain: "Market" },
  { title: "Market Data", url: "/market-data", icon: BarChart3, shortcut: "V", domain: "Market" },
  
  // Journal domain
  { title: "Trade Entry", url: "/trading", icon: Notebook, shortcut: "T", domain: "Journal" },
  { title: "Trade History", url: "/history", icon: History, shortcut: "H", domain: "Journal" },
  
  // Risk domain
  { title: "Risk Overview", url: "/risk", icon: Shield, shortcut: "R", domain: "Risk" },
  { title: "Position Calculator", url: "/calculator", icon: Calculator, shortcut: "X", domain: "Risk" },
  
  // Strategy domain
  { title: "My Strategies", url: "/strategies", icon: Lightbulb, shortcut: "S", domain: "Strategy" },
  { title: "Backtest", url: "/backtest", icon: Play, shortcut: "B", domain: "Strategy" },
  
  // Analytics domain
  { title: "Performance Overview", url: "/performance", icon: LineChart, shortcut: "P", domain: "Analytics" },
  { title: "Daily P&L", url: "/daily-pnl", icon: DollarSign, shortcut: "L", domain: "Analytics" },
  { title: "Heatmap", url: "/heatmap", icon: Grid3X3, shortcut: "E", domain: "Analytics" },
  { title: "AI Insights", url: "/ai-insights", icon: Brain, shortcut: "I", domain: "Analytics" },
  
  // Accounts domain
  { title: "Account List", url: "/accounts", icon: Building2, shortcut: "A", domain: "Accounts" },
  
  // Settings domain
  { title: "Settings", url: "/settings", icon: Settings, shortcut: ",", domain: "Settings" },
];

// Get pages grouped by domain
function getGroupedPages() {
  const standalone = PAGES.filter(p => !p.domain);
  const grouped = PAGES.filter(p => p.domain).reduce((acc, page) => {
    const domain = page.domain!;
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(page);
    return acc;
  }, {} as Record<string, typeof PAGES>);
  
  return { standalone, grouped };
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { standalone, grouped } = getGroupedPages();

  const handleSelect = (url: string) => {
    navigate(url);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages or type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
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
              <Kbd keys={["G", page.shortcut]} className="opacity-60" />
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
                <Kbd keys={["G", page.shortcut]} className="opacity-60" />
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
