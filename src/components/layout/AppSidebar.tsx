import * as React from "react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Notebook,
  LineChart,
  Activity,
  Clock,
  Building2,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
  CandlestickChart,
  Shield,
  Brain,
  BarChart3,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  key: string;
  items: NavItem[];
  collapsible?: boolean;
}

// Navigation structure per Trading Journey Markdown spec
const navigationGroups: NavGroup[] = [
  {
    label: "General",
    key: "general",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Accounts", url: "/accounts", icon: Building2 },
    ],
  },
  {
    label: "Trading Journey",
    key: "trading",
    collapsible: true,
    items: [
      { title: "Summary", url: "/trading", icon: Activity },
      { title: "Journal", url: "/trading/journal", icon: Notebook },
      { title: "Sessions", url: "/trading/sessions", icon: Clock },
      { title: "Analytics", url: "/trading/performance", icon: BarChart3 },
      { title: "Strategies", url: "/trading/strategies", icon: Lightbulb },
      { title: "AI Insights", url: "/trading/insights", icon: Brain },
    ],
  },
  {
    label: "Risk Management",
    key: "risk",
    items: [
      { title: "Risk Dashboard", url: "/risk", icon: Shield },
    ],
  },
];

const COLLAPSED_GROUPS_KEY = 'sidebar-collapsed-groups';

function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation();
  
  // Initialize collapsed state from localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_GROUPS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Check if any item in the group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.url);
  };
  
  return (
    <>
      {groups.map((group) => {
        const isCollapsed = collapsedGroups[group.key] ?? false;
        const hasActiveItem = isGroupActive(group);
        
        if (group.collapsible) {
          return (
            <SidebarGroup key={group.label}>
              <Collapsible open={!isCollapsed} onOpenChange={() => toggleGroup(group.key)}>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5 transition-colors w-full">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className={cn(hasActiveItem && isCollapsed && "text-primary font-medium")}>
                        {group.label}
                      </span>
                    </div>
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.url;
                        
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                              asChild 
                              isActive={isActive} 
                              tooltip={item.title}
                            >
                              <Link to={item.url}>
                                <item.icon />
                                <span className="flex-1">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        }
        
        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>
              <span>{group.label}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        tooltip={item.title}
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span className="flex-1">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
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
        <NavMain groups={navigationGroups} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}