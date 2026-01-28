import * as React from "react";
import {
  LayoutDashboard,
  Notebook,
  BarChart3,
  Building2,
  Lightbulb,
  Shield,
  Calendar,
  Bot,
  Settings,
  CandlestickChart,
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

// Navigation structure per Trading Journey Markdown spec (flat 9-item menu)
const navigationItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Trade Management", url: "/trading", icon: Notebook },
  { title: "Strategy & Rules", url: "/strategies", icon: Lightbulb },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Risk Management", url: "/risk", icon: Shield },
  { title: "Calendar & Market", url: "/market", icon: Calendar },
  { title: "Accounts", url: "/accounts", icon: Building2 },
  { title: "AI Assistant", url: "/ai", icon: Bot },
  { title: "Settings", url: "/settings", icon: Settings },
];

function NavMain({ items }: { items: NavItem[] }) {
  const location = useLocation();

  // Check if current path matches item or is a sub-route
  const isActive = (url: string) => {
    if (url === "/") {
      return location.pathname === "/";
    }
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
              >
                <Link to={item.url}>
                  <item.icon />
                  <span className="flex-1">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
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
                  <CandlestickChart className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Trading Journey</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Journal & Analytics
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
