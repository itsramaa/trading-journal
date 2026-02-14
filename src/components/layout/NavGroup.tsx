/**
 * NavGroup Component - Domain-based navigation group
 * Includes keyboard shortcut indicators in tooltips
 * Persists collapse state to localStorage per group
 */
import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Kbd } from "@/components/ui/keyboard-shortcut";

// localStorage key for sidebar group states
const SIDEBAR_GROUPS_KEY = "trading-journey-sidebar-groups";

// Helper to get group states from localStorage
function getGroupStates(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Helper to set a single group state
function setGroupState(groupTitle: string, isOpen: boolean) {
  const states = getGroupStates();
  states[groupTitle] = isOpen;
  localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(states));
}

// Keyboard shortcut mapping for each route
const ROUTE_SHORTCUTS: Record<string, string> = {
  "/": "D",
  "/market": "M",
  "/calendar": "C",
  "/market-data": "V",
  "/trading": "T",
  "/risk": "R",
  "/calculator": "X",
  "/strategies": "S",
  "/backtest": "B",
  "/performance": "P",
  "/daily-pnl": "L",
  "/heatmap": "E",
  "/ai-insights": "I",
  "/top-movers": "O",
  "/accounts": "A",
  "/import": "N",
  "/export": "W",
  "/settings": ",",
};

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavGroupProps {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

export function NavGroup({
  title,
  items,
  defaultOpen = true,
}: NavGroupProps) {
  // Initialize from localStorage, fallback to defaultOpen
  const [isOpen, setIsOpen] = React.useState(() => {
    const states = getGroupStates();
    return states[title] !== undefined ? states[title] : defaultOpen;
  });
  
  // Handler that persists state to localStorage
  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    setGroupState(title, open);
  }, [title]);
  
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const isActive = (url: string) => {
    if (url === "/") {
      return location.pathname === "/";
    }
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  // Check if any item in this group is active
  const hasActiveItem = items.some((item) => isActive(item.url));

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Get tooltip content with shortcut
  const getTooltip = (item: NavItem) => {
    const shortcut = ROUTE_SHORTCUTS[item.url];
    if (shortcut) {
      return (
        <div className="flex items-center gap-2">
          <span>{item.title}</span>
          <Kbd keys={["G", shortcut]} className="ml-1" />
        </div>
      );
    }
    return item.title;
  };

  // When sidebar is collapsed (icon-only mode), render flat items with tooltips
  if (isCollapsed && !isMobile) {
    return (
      <SidebarGroup className="py-0 min-w-0">
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={{
                    children: getTooltip(item),
                  }}
                  isActive={isActive(item.url)}
                >
                  <Link to={item.url} onClick={handleNavClick}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className="group/collapsible"
    >
      <SidebarGroup className="py-0 min-w-0">
        <SidebarGroupLabel
          asChild
          className="group/label h-8 text-xs uppercase tracking-wider text-muted-foreground hover:bg-sidebar-accent"
        >
          <CollapsibleTrigger className="flex w-full items-center px-2">
            <span className={cn(
              "flex-1 text-left truncate transition-colors",
              hasActiveItem 
                ? "text-primary font-medium group-hover/label:text-primary" 
                : "group-hover/label:text-sidebar-accent-foreground"
            )}>{title}</span>
            <ChevronRight
              className={cn(
                "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen && "rotate-90"
              )}
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="pl-2 min-w-0">
              {items.map((item) => {
                const shortcut = ROUTE_SHORTCUTS[item.url];
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="h-8 group/nav-item"
                    >
                      <Link to={item.url} onClick={handleNavClick} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </div>
                        {shortcut && (
                          <span className="ml-auto text-[10px] font-mono text-muted-foreground opacity-0 group-hover/nav-item:opacity-100 transition-opacity shrink-0">
                            G {shortcut}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export { ROUTE_SHORTCUTS };

