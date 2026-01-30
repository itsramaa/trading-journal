import { AppSidebar } from "./AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useLocation } from "react-router-dom";
import {
  ThemeToggle,
  NotificationToggle,
} from "./HeaderControls";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { RiskAlertBanner } from "@/components/risk/RiskAlertBanner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/accounts": "Accounts",
  "/trading": "Trading Journal",
  "/strategies": "Strategies",
  "/performance": "Performance",
  "/risk": "Risk Management",
  "/market": "Market Insight",
  "/settings": "Settings",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const pageTitle = routeTitles[location.pathname] || "Page";

  return (
    <SidebarProvider>
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
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side: Controls */}
          <div className="flex items-center gap-1 pr-4">
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
