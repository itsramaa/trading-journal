import * as React from "react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
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
import { Button } from "@/components/ui/button";
import { Search, GripVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  
  // Market domain
  "/market": { title: "AI Analysis", domain: "Market", domainPath: "/market" },
  "/calendar": { title: "Economic Calendar", domain: "Market", domainPath: "/market" },
  "/market-data": { title: "Market Data", domain: "Market", domainPath: "/market" },
  
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

// Sidebar width constants (in pixels)
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_WIDTH_STORAGE_KEY = "trading-journey-sidebar-width";

// Custom hook for resizable sidebar width
function useSidebarWidth() {
  const [width, setWidth] = React.useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= SIDEBAR_MIN_WIDTH && parsed <= SIDEBAR_MAX_WIDTH) {
        return parsed;
      }
    }
    return SIDEBAR_DEFAULT_WIDTH;
  });

  const setAndSaveWidth = React.useCallback((newWidth: number) => {
    const clampedWidth = Math.min(Math.max(newWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
    setWidth(clampedWidth);
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clampedWidth));
  }, []);

  return { width, setWidth: setAndSaveWidth };
}

// Resizable handle component
function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const [isDragging, setIsDragging] = React.useState(false);
  const startXRef = React.useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onResize]);

  return (
    <div
      className={`absolute right-0 top-0 z-20 flex h-full w-4 -translate-x-1/2 cursor-col-resize items-center justify-center transition-colors hover:bg-border/50 ${
        isDragging ? "bg-border" : ""
      }`}
      onMouseDown={handleMouseDown}
    >
      <div className="flex h-8 w-3 items-center justify-center rounded-sm border bg-border opacity-0 hover:opacity-100 transition-opacity">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}

// Inner content component that uses sidebar context
function DashboardContent({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const routeInfo = routeHierarchy[location.pathname] || { title: "Page" };
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  const { width, setWidth } = useSidebarWidth();
  const isCollapsed = state === "collapsed";

  const handleResize = React.useCallback((delta: number) => {
    setWidth(width + delta);
  }, [width, setWidth]);

  // Apply custom width to sidebar via CSS variable
  React.useEffect(() => {
    if (!isCollapsed && !isMobile) {
      document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
    }
    return () => {
      document.documentElement.style.removeProperty("--sidebar-width");
    };
  }, [width, isCollapsed, isMobile]);

  return (
    <>
      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      
      {/* Skip to main content link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>
      
      {/* Sidebar with resize handle */}
      <div className="relative">
        <AppSidebar />
        {!isCollapsed && !isMobile && (
          <ResizeHandle onResize={handleResize} />
        )}
      </div>
      
      {/* Main content area */}
      <main className="relative flex min-h-svh flex-1 flex-col bg-background peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow">
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

          {/* Right side: Command Palette trigger + Controls */}
          <div className="flex items-center gap-1 pr-4">
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
        <div id="main-content" className="flex flex-1 flex-col gap-4 p-4 pt-4">
          {children}
        </div>
      </main>
    </>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Enable keyboard shortcuts
  useNavigationShortcuts();
  
  // Persistent sidebar collapsed/expanded state
  const { sidebarOpen, setSidebarOpen } = useSidebarPersistence(true);

  return (
    <SidebarProvider 
      defaultOpen={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}

