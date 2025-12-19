import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Target,
  Calculator,
  Goal,
  Notebook,
  LineChart,
  Activity,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AppSwitcher } from "./AppSwitcher";
import { NavUser } from "./NavUser";
import { useAppStore, type AppType } from "@/store/app-store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Navigation items for each app
const appNavigation: Record<AppType, { label: string; items: { icon: any; label: string; href: string }[] }> = {
  portfolio: {
    label: "Portfolio Management",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/" },
      { icon: Wallet, label: "Portfolio", href: "/portfolio" },
      { icon: ArrowLeftRight, label: "Transactions", href: "/transactions" },
      { icon: BarChart3, label: "Analytics", href: "/analytics" },
    ],
  },
  "financial-freedom": {
    label: "Financial Freedom",
    items: [
      { icon: Target, label: "FIRE Calculator", href: "/fire" },
      { icon: Goal, label: "Goals", href: "/goals" },
      { icon: Calculator, label: "Projections", href: "/projections" },
    ],
  },
  "trading-journey": {
    label: "Trading Journey",
    items: [
      { icon: Notebook, label: "Journal", href: "/journal" },
      { icon: LineChart, label: "Performance", href: "/performance" },
      { icon: Activity, label: "Insights", href: "/insights" },
    ],
  },
};

// Dummy user data
const dummyUser = {
  name: "John Doe",
  email: "john@example.com",
  avatar: "",
};

export function AppSidebar() {
  const location = useLocation();
  const { activeApp } = useAppStore();
  
  const currentNavigation = appNavigation[activeApp];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AppSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{currentNavigation.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentNavigation.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={dummyUser} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
