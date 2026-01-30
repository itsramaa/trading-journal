/**
 * NavGroup Component - Collapsible group with emoji icons
 * Fixed overflow-x with proper width constraints
 */
import * as React from "react";
import { ChevronDown } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavGroupProps {
  icon: string;
  label: string;
  colorClass?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function NavGroup({
  icon,
  label,
  colorClass = "text-muted-foreground",
  children,
  defaultOpen = true,
}: NavGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  // When sidebar is collapsed (icon-only mode), show items without group wrapper
  if (isCollapsed && !isMobile) {
    return (
      <SidebarGroup className="py-1">
        <SidebarGroupContent>
          <SidebarMenu>{children}</SidebarMenu>
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
      <SidebarGroup className="py-0">
        <SidebarGroupLabel
          asChild
          className="group/label h-8 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-2 transition-colors overflow-hidden">
            <span className={cn("text-base leading-none shrink-0", colorClass)} aria-hidden="true">
              {icon}
            </span>
            <span className="flex-1 min-w-0 text-left text-xs font-semibold uppercase tracking-wider truncate">
              {label}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent className="pl-1">
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
