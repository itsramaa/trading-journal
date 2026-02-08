import { AppSidebar } from "./AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation, Link } from "react-router-dom";
import {
  ThemeToggle,
  NotificationToggle,
} from "./HeaderControls";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { RiskAlertBanner } from "@/components/risk/RiskAlertBanner";
import { useNavigationShortcuts, Kbd } from "@/components/ui/keyboard-shortcut";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { useSidebarPersistence } from "@/hooks/use-sidebar-persistence";
import { useNotificationsRealtime } from "@/hooks/use-notifications";
import { useNotificationTriggers } from "@/hooks/use-notification-triggers";
import { useBinanceBackgroundSync } from "@/hooks/use-binance-background-sync";
import { GlobalSyncIndicator } from "./GlobalSyncIndicator";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Route hierarchy: domain -> pages
interface RouteInfo {
  title: string;
  domain?: string;
  domainPath?: string;
}

const routeHierarchy: Record<string, RouteInfo> = {
  "/": { title: "Dashboard" },
  
  // Market domain - Market Data is primary entry point
  "/market-data": { title: "Market Data", domain: "Market", domainPath: "/market-data" },
  "/calendar": { title: "Economic Calendar", domain: "Market", domainPath: "/market-data" },
  "/market": { title: "AI Analysis", domain: "Market", domainPath: "/market-data" },
  
  // Journal domain
  "/trading": { title: "Trade Entry", domain: "Journal", domainPath: "/trading" },
  "/history": { title: "Trade History", domain: "Journal", domainPath: "/trading" },
  
  // Risk domain
  "/risk": { title: "Risk Overview", domain: "Risk", domainPath: "/risk" },
  "/calculator": { title: "Position Calculator", domain: "Risk", domainPath: "/risk" },
  
  // Strategy domain
  "/strategies": { title: "My Strategies", domain: "Strategy", domainPath: "/strategies" },
  "/backtest": { title: "Backtest", domain: "Strategy", domainPath: "/strategies" },
  
  // Analytics domain
  "/performance": { title: "Performance Overview", domain: "Analytics", domainPath: "/performance" },
  "/daily-pnl": { title: "Daily P&L", domain: "Analytics", domainPath: "/performance" },
  "/heatmap": { title: "Heatmap", domain: "Analytics", domainPath: "/performance" },
  "/ai-insights": { title: "AI Insights", domain: "Analytics", domainPath: "/performance" },
  
  // Accounts domain
  "/accounts": { title: "Account List", domain: "Accounts", domainPath: "/accounts" },
  
  // Settings domain
  "/settings": { title: "Settings", domain: "Settings", domainPath: "/settings" },
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const routeInfo = routeHierarchy[location.pathname] || { title: "Page" };
  
  // Enable keyboard shortcuts
  useNavigationShortcuts();
  
  // Command palette state
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  
  // Persistent sidebar state
  const { sidebarOpen, setSidebarOpen } = useSidebarPersistence(true);
  
  // Enable realtime notifications
  useNotificationsRealtime();
  
  // Enable automatic notification triggers (trade closed, risk warnings, market alerts)
  useNotificationTriggers({
    enableTradeNotifications: true,
    enableRiskNotifications: true,
    enableMarketAlerts: true,
  });
  
  // Enable Binance background sync (runs based on user settings)
  useBinanceBackgroundSync();

  return (
    <SidebarProvider 
      defaultOpen={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      
      {/* Skip to main content link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>
      <AppSidebar />
      <SidebarInset>
        {/* Global Risk Alert Banner */}
        <RiskAlertBanner />
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {routeInfo.domain ? (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink asChild>
                        <Link to={routeInfo.domainPath || "/"}>
                          {routeInfo.domain}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{routeInfo.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage>{routeInfo.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: Global Sync Indicator + Command Palette trigger + Controls */}
          <div className="flex items-center gap-2 pr-4">
            {/* Global Sync Progress Indicator */}
            <GlobalSyncIndicator />
            
            {/* Command Palette Button */}
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex items-center gap-2 text-muted-foreground h-8 px-2"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search...</span>
              <Kbd keys={["⌘", "K"]} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
            
            <CurrencyDisplay />
            <NotificationToggle />
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

