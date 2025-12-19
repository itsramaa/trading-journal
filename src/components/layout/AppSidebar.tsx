import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Target,
  PiggyBank,
  CreditCard,
  Shield,
  Goal,
  Brain,
  BookOpen,
  Notebook,
  LineChart,
  Activity,
  Lightbulb,
  Clock,
  Settings,
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
  SidebarSeparator,
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
      { icon: Brain, label: "Circle of Competence", href: "/competence" },
      { icon: BookOpen, label: "Learning Path", href: "/learning" },
    ],
  },
  "financial-freedom": {
    label: "Financial Freedom",
    items: [
      { icon: Target, label: "Dashboard", href: "/ff" },
      { icon: PiggyBank, label: "Budget", href: "/ff/budget" },
      { icon: CreditCard, label: "Debt Payoff", href: "/ff/debt" },
      { icon: Shield, label: "Emergency Fund", href: "/ff/emergency" },
      { icon: Goal, label: "Goals", href: "/ff/goals" },
    ],
  },
  "trading-journey": {
    label: "Trading Journey",
    items: [
      { icon: Activity, label: "Summary", href: "/trading" },
      { icon: Notebook, label: "Journal", href: "/trading/journal" },
      { icon: Clock, label: "Sessions", href: "/trading/sessions" },
      { icon: LineChart, label: "Performance", href: "/trading/performance" },
      { icon: Lightbulb, label: "AI Insights", href: "/trading/insights" },
    ],
  },
};

// Settings page for each app (app-specific config, not account settings)
const appSettings: Record<AppType, string> = {
  portfolio: "/settings/portfolio",
  "financial-freedom": "/settings/ff",
  "trading-journey": "/settings/trading",
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
  const settingsPath = appSettings[activeApp];

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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === settingsPath}
                  tooltip="Settings"
                >
                  <Link to={settingsPath}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
