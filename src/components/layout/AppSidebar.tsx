/**
 * AppSidebar Component - shadcn sidebar-08 pattern
 * Grouped navigation with collapsible sections
 */
import * as React from "react";
import {
  LayoutDashboard,
  Notebook,
  Building2,
  Lightbulb,
  Shield,
  TrendingUp,
  LineChart,
  Settings,
  CandlestickChart,
  ChartBar,
  Target,
  Cog,
  ChartCandlestick,
} from "lucide-react";
import { Link } from "react-router-dom";
import { NavUser } from "./NavUser";
import { NavGroup } from "./NavGroup";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

// Navigation structure: 4 groups with 8 items total
const navigationGroups = [
  {
    title: "Trading Fundamentals",
    icon: ChartBar,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Market Insight", url: "/market", icon: TrendingUp },
      { title: "Accounts", url: "/accounts", icon: Building2 },
    ],
  },
  {
    title: "Execution & Management",
    icon: Target,
    items: [
      { title: "Trading Journal", url: "/trading", icon: Notebook },
      { title: "Risk Management", url: "/risk", icon: Shield },
    ],
  },
  {
    title: "Strategy & Analysis",
    icon: ChartCandlestick,
    items: [
      { title: "Strategies", url: "/strategies", icon: Lightbulb },
      { title: "Performance", url: "/performance", icon: LineChart },
    ],
  },
  {
    title: "Tools & Settings",
    icon: Cog,
    items: [{ title: "Settings", url: "/settings", icon: Settings }],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Trading Journey"
            >
              <Link to="/" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CandlestickChart className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Trading Journey</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Journal & Analytics
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => (
          <NavGroup
            key={group.title}
            title={group.title}
            icon={group.icon}
            items={group.items}
            defaultOpen={true}
          />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
