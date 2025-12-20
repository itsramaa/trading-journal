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
  Crown,
  Lock,
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
  items: NavItem[];
  minTier?: SubscriptionTier;
}

const navigationGroups: NavGroup[] = [
  {
    label: "General",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Accounts", url: "/accounts", icon: Building2, feature: FEATURES.ACCOUNTS_VIEW },
    ],
  },
  {
    label: "Portfolio Management",
    items: [
      { title: "Portfolio", url: "/portfolio", icon: Wallet, feature: FEATURES.PORTFOLIO_VIEW },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight, feature: FEATURES.TRANSACTIONS_VIEW },
      { title: "Analytics", url: "/analytics", icon: BarChart3, feature: FEATURES.ANALYTICS_ADVANCED, minTier: 'pro' },
    ],
  },
  {
    label: "Financial Freedom",
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
    label: "Trading Journey",
    minTier: 'pro',
    items: [
      { title: "Summary", url: "/trading", icon: Activity, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
      { title: "Sessions", url: "/trading/sessions", icon: Clock, feature: FEATURES.TRADING_SESSIONS, minTier: 'pro' },
      { title: "Journal", url: "/trading/journal", icon: Notebook, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
      { title: "Strategies", url: "/trading/strategies", icon: Lightbulb, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
      { title: "Performance", url: "/trading/performance", icon: LineChart, feature: FEATURES.TRADING_JOURNAL, minTier: 'pro' },
    ],
  },
];

function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation();
  const { hasPermission, hasSubscription, isAdmin, subscription } = usePermissions();
  
  return (
    <>
      {groups.map((group) => {
        // Check if the whole group requires a tier the user doesn't have
        const groupRequiresUpgrade = group.minTier && !isAdmin() && !hasSubscription(group.minTier);
        
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
                  
                  // Check if user has permission for this item
                  const hasAccess = !item.feature || isAdmin() || hasPermission(item.feature);
                  const requiresUpgrade = item.minTier && !isAdmin() && !hasSubscription(item.minTier);
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isActive} 
                        tooltip={item.title}
                        className={cn(
                          !hasAccess && "opacity-60"
                        )}
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
