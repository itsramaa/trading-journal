import { useState, useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
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
import { useLocation, Link, Outlet } from "react-router-dom";
import {
  ThemeToggle,
  NotificationToggle,
} from "./HeaderControls";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { TradeModeSelector } from "./TradeModeSelector";
import { SimulationBanner } from "./SimulationBanner";
import { SessionContextModal } from "./SessionContextModal";
import { RiskAlertBanner } from "@/components/risk/RiskAlertBanner";
import { LivePriceTicker } from "./LivePriceTicker";
import { useNavigationShortcuts, Kbd } from "@/components/ui/keyboard-shortcut";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { useSidebarPersistence } from "@/hooks/use-sidebar-persistence";
import { useNotificationsRealtime } from "@/hooks/use-notifications";
import { useNotificationTriggers } from "@/hooks/use-notification-triggers";
import { useBinanceBackgroundSync } from "@/hooks/use-binance-background-sync";
import { GlobalSyncIndicator } from "./GlobalSyncIndicator";
import { ExchangeOnboardingModal, useExchangeOnboarding } from "./ExchangeOnboardingModal";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useExchangeCredentials } from "@/hooks/use-exchange-credentials";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

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
  "/market": { title: "Market Bias", domain: "Market", domainPath: "/market-data" },
  
  // Journal domain
  "/trading": { title: "Trading Journal", domain: "Journal", domainPath: "/trading" },
  
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
  
  // Tools domain
  "/top-movers": { title: "Top Movers", domain: "Market", domainPath: "/market-data" },
  "/import": { title: "Import & Sync", domain: "Journal", domainPath: "/trading" },
  "/export": { title: "Bulk Export", domain: "Tools", domainPath: "/export" },
  
  // Settings domain
  "/settings": { title: "Settings", domain: "Settings", domainPath: "/settings" },
};

export function DashboardLayout() {
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

  // H-04: Session Context Modal — show if user has never explicitly chosen mode
  const { data: userSettings, isLoading: settingsLoading } = useUserSettings();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  
  // Exchange onboarding - show after session modal
  const { shouldShow: shouldShowExchangeOnboarding } = useExchangeOnboarding();
  const { credential } = useExchangeCredentials();
  const [showExchangeOnboarding, setShowExchangeOnboarding] = useState(false);

  useEffect(() => {
    if (settingsLoading || sessionDismissed) return;
    const hasExplicitlySelected = localStorage.getItem('session_context_selected');
    if (userSettings && !hasExplicitlySelected) {
      setShowSessionModal(true);
    }
  }, [userSettings, settingsLoading, sessionDismissed]);

  // Show exchange onboarding after session modal is dismissed, if no credentials exist
  useEffect(() => {
    if (sessionDismissed && shouldShowExchangeOnboarding && !credential?.id) {
      setShowExchangeOnboarding(true);
    }
  }, [sessionDismissed, shouldShowExchangeOnboarding, credential?.id]);

  const handleSessionComplete = () => {
    localStorage.setItem('session_context_selected', 'true');
    setShowSessionModal(false);
    setSessionDismissed(true);
  };

  return (
    <SidebarProvider 
      open={sidebarOpen}
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
        {/* Live Price Ticker */}
        <LivePriceTicker />
        {/* H-03: SIMULATION Banner (Paper mode only) */}
        <SimulationBanner />
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
            {/* Global Trading Mode Selector */}
            <TradeModeSelector />
            
            {/* Global Sync Progress Indicator */}
            <GlobalSyncIndicator />
            
            <CurrencyDisplay />
            
            <div className="hidden sm:block h-4 w-px bg-border" />
            
            {/* Command Palette Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCommandOpen(true)}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
            <NotificationToggle />
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Suspense fallback={
            <div className="flex flex-1 items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>

      {/* H-04: Session Context Modal (first visit only) */}
      <SessionContextModal
        open={showSessionModal}
        onComplete={handleSessionComplete}
      />

      {/* Exchange Onboarding (after session modal, if no credentials) */}
      <ExchangeOnboardingModal
        open={showExchangeOnboarding}
        onComplete={() => setShowExchangeOnboarding(false)}
      />
    </SidebarProvider>
  );
}

