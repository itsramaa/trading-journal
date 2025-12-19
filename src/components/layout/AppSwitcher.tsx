import * as React from "react";
import { ChevronsUpDown, Wallet, Target, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAppStore, type AppType } from "@/store/app-store";

const apps = [
  {
    id: "portfolio" as AppType,
    name: "Portfolio Management",
    icon: Wallet,
    description: "Track & manage investments",
  },
  {
    id: "financial-freedom" as AppType,
    name: "Financial Freedom",
    icon: Target,
    description: "FIRE calculator & goals",
  },
  {
    id: "trading-journey" as AppType,
    name: "Trading Journey",
    icon: BookOpen,
    description: "Journal & analytics",
  },
];

export function AppSwitcher() {
  const { isMobile } = useSidebar();
  const { activeApp, setActiveApp } = useAppStore();
  
  const currentApp = apps.find(app => app.id === activeApp) || apps[0];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <currentApp.icon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{currentApp.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {currentApp.description}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-popover"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch App
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {apps.map((app) => (
              <DropdownMenuItem
                key={app.id}
                onClick={() => setActiveApp(app.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                  <app.icon className="size-4 shrink-0" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{app.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {app.description}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
