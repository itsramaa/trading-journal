import * as React from "react";
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
  Notebook,
  LineChart,
  Activity,
  Clock,
  Flame,
  Building2,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
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

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Accounts", url: "/accounts", icon: Building2 },
    ],
  },
  {
    label: "Portfolio Management",
    items: [
      { title: "Portfolio", url: "/portfolio", icon: Wallet },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Financial Freedom",
    items: [
      { title: "Progress", url: "/ff", icon: Target },
      { title: "FIRE Calculator", url: "/ff/fire-calculator", icon: Flame },
      { title: "Budget", url: "/ff/budget", icon: PiggyBank },
      { title: "Debt Payoff", url: "/ff/debt", icon: CreditCard },
      { title: "Emergency Fund", url: "/ff/emergency", icon: Shield },
      { title: "Goals", url: "/ff/goals", icon: Goal },
    ],
  },
  {
    label: "Trading Journey",
    items: [
      { title: "Summary", url: "/trading", icon: Activity },
      { title: "Sessions", url: "/trading/sessions", icon: Clock },
      { title: "Journal", url: "/trading/journal", icon: Notebook },
      { title: "Strategies", url: "/trading/strategies", icon: Lightbulb },
      { title: "Performance", url: "/trading/performance", icon: LineChart },
    ],
  },
];

function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation();
  
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = location.pathname === item.url;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Wallet className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Portfolio Assets</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={navigationGroups} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
