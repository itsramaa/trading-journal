import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Target,
  FileText,
  PieChart,
  TrendingUp,
  Calculator,
  Goal,
  BookOpen,
  Notebook,
  LineChart,
  Activity,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AppSwitcher } from "./AppSwitcher";
import { NavUser } from "./NavUser";
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

// Navigation items organized by app
const portfolioItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Wallet, label: "Portfolio", href: "/portfolio" },
  { icon: ArrowLeftRight, label: "Transactions", href: "/transactions" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
];

const financialFreedomItems = [
  { icon: Target, label: "FIRE Calculator", href: "/fire" },
  { icon: Goal, label: "Goals", href: "/goals" },
  { icon: Calculator, label: "Projections", href: "/projections" },
];

const tradingJourneyItems = [
  { icon: Notebook, label: "Journal", href: "/journal" },
  { icon: LineChart, label: "Performance", href: "/performance" },
  { icon: Activity, label: "Insights", href: "/insights" },
];

const settingsItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

// Dummy user data
const dummyUser = {
  name: "John Doe",
  email: "john@example.com",
  avatar: "",
};

export function AppSidebar() {
  const location = useLocation();

  const renderNavItems = (items: typeof portfolioItems) => (
    <SidebarMenu>
      {items.map((item) => {
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
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AppSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {/* Portfolio Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Portfolio Management</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNavItems(portfolioItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Financial Freedom */}
        <SidebarGroup>
          <SidebarGroupLabel>Financial Freedom</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNavItems(financialFreedomItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Trading Journey */}
        <SidebarGroup>
          <SidebarGroupLabel>Trading Journey</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNavItems(tradingJourneyItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            {renderNavItems(settingsItems)}
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
