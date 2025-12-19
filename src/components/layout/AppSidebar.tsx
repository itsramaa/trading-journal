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
  Flame,
  Building2,
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
  items?: {
    title: string;
    url: string;
  }[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// All navigation groups unified - Accounts as the base/central feature
const navigationGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { 
        title: "Accounts", 
        url: "/accounts", 
        icon: Building2,
        items: [
          { title: "All Accounts", url: "/accounts" },
          { title: "Transactions", url: "/accounts?tab=transactions" },
        ],
      },
    ],
  },
  {
    label: "Portfolio Management",
    items: [
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
      { title: "Journal", url: "/trading/journal", icon: Notebook },
      { title: "Sessions", url: "/trading/sessions", icon: Clock },
      { title: "Performance", url: "/trading/performance", icon: LineChart },
      { title: "AI Insights", url: "/trading/insights", icon: Lightbulb },
    ],
  },
];

// Dummy user data
const dummyUser = {
  name: "John Doe",
  email: "john@example.com",
  avatar: "",
};

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
                const isActive = location.pathname === item.url || 
                  item.items?.some(sub => location.pathname === sub.url || location.pathname + location.search === sub.url);
                
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
                                  isActive={location.pathname === subItem.url || location.pathname + location.search === subItem.url}
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
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();

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

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location.pathname === "/settings"}
                  tooltip="Settings"
                >
                  <Link to="/settings">
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
