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
  Brain,
  BookOpen,
  Notebook,
  LineChart,
  Activity,
  Lightbulb,
  Clock,
  Settings,
  ChevronRight,
  type LucideIcon,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

// Navigation items for each app - with collapsible groups
const appNavigation: Record<AppType, { label: string; items: NavItem[] }> = {
  portfolio: {
    label: "Portfolio Management",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { 
        title: "Portfolio", 
        url: "/portfolio", 
        icon: Wallet,
        items: [
          { title: "Holdings", url: "/portfolio" },
          { title: "Allocation", url: "/portfolio?view=allocation" },
        ],
      },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Circle of Competence", url: "/competence", icon: Brain },
      { title: "Learning Path", url: "/learning", icon: BookOpen },
    ],
  },
  "financial-freedom": {
    label: "Financial Freedom",
    items: [
      { title: "Progress", url: "/ff", icon: Target },
      { title: "FIRE Calculator", url: "/ff/fire-calculator", icon: Activity },
      { title: "Budget", url: "/ff/budget", icon: PiggyBank },
      { title: "Debt Payoff", url: "/ff/debt", icon: CreditCard },
      { title: "Emergency Fund", url: "/ff/emergency", icon: Shield },
      { title: "Goals", url: "/ff/goals", icon: Goal },
    ],
  },
  "trading-journey": {
    label: "Trading Journey",
    items: [
      { title: "Summary", url: "/trading", icon: Activity },
      { title: "Journal", url: "/trading/journal", icon: Notebook },
      { title: "Sessions", url: "/trading/sessions", icon: Clock },
      { title: "Performance", url: "/trading/performance", icon: LineChart },
      { title: "AI Insights", url: "/trading/insights", icon: Lightbulb },
    ],
  },
};

// Settings page for each app (app-specific config)
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

function NavMain({ items }: { items: NavItem[] }) {
  const location = useLocation();
  
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = location.pathname === item.url || 
          item.items?.some(sub => location.pathname === sub.url);
        
        if (item.items) {
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    <item.icon />
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          asChild
                          isActive={location.pathname === subItem.url}
                        >
                          <Link to={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }
        
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
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { activeApp } = useAppStore();
  
  const currentNavigation = appNavigation[activeApp];
  const settingsPath = appSettings[activeApp];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{currentNavigation.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMain items={currentNavigation.items} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
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
