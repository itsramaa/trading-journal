import * as React from "react";
import { useState, useEffect } from "react";
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
  Crown,
  Lock,
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
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
import { usePermissions, FeatureKey, FEATURES, SubscriptionTier } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  feature?: FeatureKey;
  minTier?: SubscriptionTier;
}

interface NavGroup {
  label: string;
  key: string;
  items: NavItem[];
  minTier?: SubscriptionTier;
  collapsible?: boolean;
}

const navigationGroups: NavGroup[] = [
  {
    label: "General",
    key: "general",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Accounts", url: "/accounts", icon: Building2, feature: FEATURES.ACCOUNTS_VIEW },
    ],
  },
  {
    label: "Portfolio Management",
    key: "portfolio",
    collapsible: true,
    items: [
      { title: "Portfolio", url: "/portfolio", icon: Wallet, feature: FEATURES.PORTFOLIO_VIEW },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight, feature: FEATURES.TRANSACTIONS_VIEW },
      { title: "Analytics", url: "/analytics", icon: BarChart3, feature: FEATURES.ANALYTICS_ADVANCED, minTier: 'pro' },
    ],
  },
  {
    label: "Trading Journey",
    key: "trading",
    collapsible: true,
    minTier: 'pro',
    items: [
      { title: "Summary", url: "/trading", icon: Activity, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
      { title: "Sessions", url: "/trading/sessions", icon: Clock, feature: FEATURES.TRADING_SESSIONS, minTier: 'pro' },
      { title: "Journal", url: "/trading/journal", icon: Notebook, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
      { title: "Strategies", url: "/trading/strategies", icon: Lightbulb, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
      { title: "Performance", url: "/trading/performance", icon: LineChart, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
    ],
  },
  {
    label: "Financial Freedom",
    key: "financial-freedom",
    collapsible: true,
    minTier: 'pro',
    items: [
      { title: "Progress", url: "/ff", icon: Target, feature: FEATURES.FIRE_CALCULATOR, minTier: 'pro' },
      { title: "FIRE Calculator", url: "/ff/fire-calculator", icon: Flame, feature: FEATURES.FIRE_CALCULATOR, minTier: 'pro' },
      { title: "Budget", url: "/ff/budget", icon: PiggyBank, feature: FEATURES.FIRE_BUDGET, minTier: 'pro' },
      { title: "Debt Payoff", url: "/ff/debt", icon: CreditCard, feature: FEATURES.FIRE_GOALS, minTier: 'pro' },
      { title: "Emergency Fund", url: "/ff/emergency", icon: Shield, feature: FEATURES.FIRE_GOALS, minTier: 'pro' },
      { title: "Goals", url: "/ff/goals", icon: Goal, feature: FEATURES.FIRE_GOALS, minTier: 'pro' },
    ],
  },
  {
    label: "Administration",
    key: "admin",
    collapsible: true,
    items: [
      { title: "Admin Panel", url: "/admin", icon: Settings, feature: FEATURES.ADMIN_USERS },
      { title: "User Management", url: "/admin/users", icon: Users, feature: FEATURES.ADMIN_USERS },
    ],
  },
];

const COLLAPSED_GROUPS_KEY = 'sidebar-collapsed-groups';

function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation();
  const { hasPermission, hasSubscription, isAdmin } = usePermissions();
  
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
        const groupRequiresUpgrade = group.minTier && !isAdmin() && !hasSubscription(group.minTier);
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
                    {groupRequiresUpgrade && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        <Crown className="h-3 w-3 mr-0.5" />
                        Pro
                      </Badge>
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.url;
                        const hasAccess = !item.feature || isAdmin() || hasPermission(item.feature);
                        const requiresUpgrade = item.minTier && !isAdmin() && !hasSubscription(item.minTier);
                        
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                              asChild 
                              isActive={isActive} 
                              tooltip={item.title}
                              className={cn(!hasAccess && "opacity-60")}
                            >
                              <Link to={item.url}>
                                <item.icon />
                                <span className="flex-1">{item.title}</span>
                                {requiresUpgrade && !hasAccess && (
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                )}
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
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>{group.label}</span>
              {groupRequiresUpgrade && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Crown className="h-3 w-3 mr-0.5" />
                  Pro
                </Badge>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  const hasAccess = !item.feature || isAdmin() || hasPermission(item.feature);
                  const requiresUpgrade = item.minTier && !isAdmin() && !hasSubscription(item.minTier);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        tooltip={item.title}
                        className={cn(!hasAccess && "opacity-60")}
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span className="flex-1">{item.title}</span>
                          {requiresUpgrade && !hasAccess && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
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
