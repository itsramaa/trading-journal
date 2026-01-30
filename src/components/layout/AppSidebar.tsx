/**
 * AppSidebar Component - Grouped navigation with emoji icons
 * Fixed overflow with proper width constraints
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
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

// Navigation structure: 4 groups with 8 items total
const navigationGroups = [
  {
    icon: "📊",
    label: "Trading Fundamentals",
    colorClass: "text-blue-500",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Market Insight", url: "/market", icon: TrendingUp },
      { title: "Accounts", url: "/accounts", icon: Building2 },
    ],
  },
  {
    icon: "🎯",
    label: "Execution & Management",
    colorClass: "text-green-500",
    items: [
      { title: "Trading Journal", url: "/trading", icon: Notebook },
      { title: "Risk Management", url: "/risk", icon: Shield },
    ],
  },
  {
    icon: "📈",
    label: "Strategy & Analysis",
    colorClass: "text-purple-500",
    items: [
      { title: "Strategies", url: "/strategies", icon: Lightbulb },
      { title: "Performance", url: "/performance", icon: LineChart },
    ],
  },
  {
    icon: "⚙️",
    label: "Tools & Settings",
    colorClass: "text-muted-foreground",
    items: [{ title: "Settings", url: "/settings", icon: Settings }],
  },
];

function NavItems({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  const isActive = (url: string) => {
    if (url === "/") {
      return location.pathname === "/";
    }
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.url)}
            tooltip={item.title}
          >
            <Link to={item.url} onClick={handleClick} className="overflow-hidden">
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLogoClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
              <Link to="/" onClick={handleLogoClick} className="overflow-hidden">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                  <CandlestickChart className="size-4" />
                </div>
                <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
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

      <SidebarContent className="overflow-x-hidden">
        {navigationGroups.map((group, index) => (
          <React.Fragment key={group.label}>
            {index > 0 && <SidebarSeparator className="mx-2 my-2" />}
            <NavGroup
              icon={group.icon}
              label={group.label}
              colorClass={group.colorClass}
              defaultOpen={true}
            >
              <NavItems items={group.items} />
            </NavGroup>
          </React.Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
