/**
 * AppSidebar Component - Domain-based flat navigation
 * Dashboard standalone at top, 7 domain groups
 * Includes keyboard shortcut indicators
 */
import * as React from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  BarChart3,
  Notebook,
  Shield,
  Calculator,
  Lightbulb,
  Play,
  LineChart,
  DollarSign,
  Grid3X3,
  Brain,
  Building2,
  Settings,
  CandlestickChart,
  Flame,
  Download,
} from "lucide-react";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { Link, useLocation } from "react-router-dom";
import { NavUser } from "./NavUser";
import { NavGroup, ROUTE_SHORTCUTS } from "./NavGroup";
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
import { Kbd } from "@/components/ui/keyboard-shortcut";

// Navigation structure: Dashboard & Accounts standalone at top, then domain groups
const navigationGroups = [
  {
    title: "Research",
    items: [
      { title: "Economic Calendar", url: "/calendar", icon: Calendar },
      { title: "Top Movers", url: "/top-movers", icon: Flame },
      { title: "Flow & Liquidity", url: "/market-data", icon: BarChart3 },
      { title: "Market Bias", url: "/market", icon: TrendingUp },
    ],
  },
  {
    title: "Trade",
    items: [
      { title: "Trading Journal", url: "/trading", icon: Notebook },
      { title: "Import & Sync", url: "/import", icon: Download },
      { title: "Risk Calculator", url: "/calculator", icon: Calculator },
    ],
  },
  {
    title: "Analyze",
    items: [
      { title: "Performance", url: "/performance", icon: LineChart },
      { title: "Risk Analytics", url: "/risk", icon: Shield },
      { title: "Daily P&L", url: "/daily-pnl", icon: DollarSign },
      { title: "Heatmap", url: "/heatmap", icon: Grid3X3 },
      { title: "AI Insights", url: "/ai-insights", icon: Brain },
    ],
  },
  {
    title: "Strategy",
    items: [
      { title: "My Strategies", url: "/strategies", icon: Lightbulb },
      { title: "Backtest", url: "/backtest", icon: Play },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile, isMobile, state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isDashboardActive = location.pathname === "/";
  const dashboardShortcut = ROUTE_SHORTCUTS["/"];

  // Tooltip for collapsed mode with shortcut
  const getDashboardTooltip = () => {
    if (dashboardShortcut) {
      return (
        <div className="flex items-center gap-2">
          <span>Dashboard</span>
          <Kbd keys={["G", dashboardShortcut]} className="ml-1" />
        </div>
      );
    }
    return "Dashboard";
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Deriverse"
            >
              <Link to="/" onClick={handleNavClick}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CandlestickChart className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                  <span className="truncate font-semibold">Deriverse</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Trading Analytics
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard - Standalone at top */}
        <SidebarMenu className="px-2 pt-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isDashboardActive}
              tooltip={isCollapsed ? { children: getDashboardTooltip() } : undefined}
              size="default"
              className="group/nav-item"
            >
              <Link to="/" onClick={handleNavClick} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </div>
                {!isCollapsed && dashboardShortcut && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground opacity-0 group-hover/nav-item:opacity-100 transition-opacity">
                    G {dashboardShortcut}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Domain Groups */}
        {navigationGroups.map((group) => (
          <NavGroup
            key={group.title}
            title={group.title}
            items={group.items}
            defaultOpen={group.title !== "Strategy"}
          />
        ))}

        {/* Bottom standalone: Accounts, Export, Settings */}
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/accounts" || location.pathname.startsWith("/accounts/")}
              tooltip={isCollapsed ? { children: (
                <div className="flex items-center gap-2">
                  <span>Accounts</span>
                  <Kbd keys={["G", "A"]} className="ml-1" />
                </div>
              ) } : undefined}
              size="default"
              className="group/nav-item"
            >
              <Link to="/accounts" onClick={handleNavClick} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Accounts</span>
                </div>
                {!isCollapsed && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground opacity-0 group-hover/nav-item:opacity-100 transition-opacity">
                    G A
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/export"}
              tooltip={isCollapsed ? { children: (
                <div className="flex items-center gap-2">
                  <span>Bulk Export</span>
                  <Kbd keys={["G", "W"]} className="ml-1" />
                </div>
              ) } : undefined}
              size="default"
              className="group/nav-item"
            >
              <Link to="/export" onClick={handleNavClick} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Bulk Export</span>
                </div>
                {!isCollapsed && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground opacity-0 group-hover/nav-item:opacity-100 transition-opacity">
                    G W
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/settings"}
              tooltip={isCollapsed ? { children: (
                <div className="flex items-center gap-2">
                  <span>Settings</span>
                  <Kbd keys={["G", ","]} className="ml-1" />
                </div>
              ) } : undefined}
              size="default"
              className="group/nav-item"
            >
              <Link to="/settings" onClick={handleNavClick} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
                {!isCollapsed && (
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground opacity-0 group-hover/nav-item:opacity-100 transition-opacity">
                    G ,
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-2">
          <WalletConnectButton className="w-full justify-start" />
        </div>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

