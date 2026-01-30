import * as React from "react";
import { ChevronRight } from "lucide-react";
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
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // When sidebar is collapsed, don't show group structure
  if (isCollapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>{children}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel
            className={cn(
              "cursor-pointer select-none transition-colors hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5",
              colorClass
            )}
          >
            <span className="mr-2 text-base">{icon}</span>
            <span className="flex-1 text-xs font-semibold uppercase tracking-wider">
              {label}
            </span>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                isOpen && "rotate-90"
              )}
            />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
