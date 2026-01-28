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
  "/trading": "Trade Management",
  "/strategies": "Strategy & Rules",
  "/analytics": "Analytics",
  "/sessions": "Sessions",
  "/risk": "Risk Management",
  "/market": "Calendar & Market",
  "/ai": "AI Assistant",
  "/settings": "Settings",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const pageTitle = routeTitles[location.pathname] || "Page";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Global Risk Alert Banner */}
        <RiskAlertBanner />
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
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
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
