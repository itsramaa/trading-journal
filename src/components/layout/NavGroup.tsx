/**
 * NavGroup Component - Domain-based navigation group
 * Simplified without group icon, just label + chevron
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
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
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
                  tooltip={item.title}
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
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarGroup className="py-0 min-w-0">
        <SidebarGroupLabel
          asChild
          className="group/label h-8 text-xs uppercase tracking-wider text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <CollapsibleTrigger className="flex w-full items-center px-2">
            <span className={cn(
              "flex-1 text-left truncate",
              hasActiveItem && "text-primary font-medium"
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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="h-8"
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
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
