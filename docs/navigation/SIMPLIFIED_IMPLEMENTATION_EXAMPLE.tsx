/**
 * SIMPLIFIED SIDEBAR IMPLEMENTATION EXAMPLE
 * Group-based navigation dengan progressive disclosure
 */

// ============================================================================
// 1. NavGroup.tsx - Container untuk group navigasi
// ============================================================================

import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface NavGroupProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function NavGroup({
  icon,
  label,
  children,
  defaultOpen = true,
}: NavGroupProps) {
  return (
    <div className="space-y-2">
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors">
          <span className="flex items-center gap-2 flex-1">
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {label}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============================================================================
// 2. NavItem.tsx - Individual navigation item
// ============================================================================

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  badge?: string | number;
  children?: React.ReactNode; // untuk sub-menu
}

export function NavItem({
  icon,
  label,
  href,
  isActive = false,
  badge,
  children,
}: NavItemProps) {
  const [open, setOpen] = React.useState(false);

  if (children) {
    // Item dengan sub-menu
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className={cn(
            "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-foreground"
          )}>
            <span className="flex items-center gap-2 flex-1">
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </span>
            {badge && (
              <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                {badge}
              </span>
            )}
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              open && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pl-4">
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Regular item tanpa sub-menu
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "hover:bg-accent text-foreground"
      )}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
    </a>
  );
}

// ============================================================================
// 3. AppSidebar.tsx - BARU dengan 4 groups
// ============================================================================

import { useLocation } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Zap,
  Settings,
  Eye,
  Calendar,
  Brain,
  Wallet,
  Target,
  AreaChart,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { NavUser } from './nav-user';

export function AppSidebar() {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            🕯️
          </div>
          <div className="hidden group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold">Trading Journey</p>
            <p className="text-xs text-muted-foreground">Journal & Analytics</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="space-y-6">
        {/* GROUP 1: TRADING FUNDAMENTALS */}
        <NavGroup
          icon="📊"
          label="Trading Fundamentals"
          defaultOpen={true}
        >
          <NavItem
            icon={<BarChart3 className="h-4 w-4" />}
            label="Dashboard"
            href="/"
            isActive={isActive('/')}
          />

          {/* Market Insight dengan sub-menu */}
          <NavItem
            icon={<Eye className="h-4 w-4" />}
            label="Market Insight"
            href="/market"
            isActive={isActive('/market')}
          >
            <NavItem
              icon={<Brain className="h-4 w-4" />}
              label="AI Analysis"
              href="/market?tab=analysis"
              isActive={location.pathname === '/market' && new URLSearchParams(location.search).get('tab') === 'analysis'}
            />
            <NavItem
              icon={<Calendar className="h-4 w-4" />}
              label="Economic Calendar"
              href="/market?tab=calendar"
              isActive={location.pathname === '/market' && new URLSearchParams(location.search).get('tab') === 'calendar'}
            />
            <NavItem
              icon={<TrendingUp className="h-4 w-4" />}
              label="Market Data"
              href="/market?tab=data"
              isActive={location.pathname === '/market' && new URLSearchParams(location.search).get('tab') === 'data'}
            />
          </NavItem>

          <NavItem
            icon={<Wallet className="h-4 w-4" />}
            label="Accounts"
            href="/accounts"
            isActive={isActive('/accounts')}
          />
        </NavGroup>

        <Separator />

        {/* GROUP 2: EXECUTION & MANAGEMENT */}
        <NavGroup
          icon="🎯"
          label="Execution & Management"
          defaultOpen={true}
        >
          {/* Trading Journal dengan sub-menu */}
          <NavItem
            icon={<Zap className="h-4 w-4" />}
            label="Trading Journal"
            href="/trading"
            isActive={isActive('/trading')}
          >
            <NavItem
              icon={<Target className="h-4 w-4" />}
              label="Entry Setup"
              href="/trading?tab=setup"
              isActive={location.pathname === '/trading' && new URLSearchParams(location.search).get('tab') === 'setup'}
            />
            <NavItem
              icon={<TrendingUp className="h-4 w-4" />}
              label="Active Positions"
              href="/trading?tab=active"
              isActive={location.pathname === '/trading' && new URLSearchParams(location.search).get('tab') === 'active'}
              badge={3} // Contoh badge
            />
            <NavItem
              icon={<BarChart3 className="h-4 w-4" />}
              label="Journal History"
              href="/trading?tab=history"
              isActive={location.pathname === '/trading' && new URLSearchParams(location.search).get('tab') === 'history'}
            />
          </NavItem>

          <NavItem
            icon={<Target className="h-4 w-4" />}
            label="Risk Management"
            href="/risk"
            isActive={isActive('/risk')}
          />
        </NavGroup>

        <Separator />

        {/* GROUP 3: STRATEGY & ANALYSIS */}
        <NavGroup
          icon="📈"
          label="Strategy & Analysis"
          defaultOpen={true}
        >
          {/* Strategies dengan sub-menu */}
          <NavItem
            icon={<Target className="h-4 w-4" />}
            label="Strategies"
            href="/strategies"
            isActive={isActive('/strategies')}
          >
            <NavItem
              icon={<BarChart3 className="h-4 w-4" />}
              label="My Strategies"
              href="/strategies?tab=list"
              isActive={location.pathname === '/strategies' && new URLSearchParams(location.search).get('tab') === 'list'}
            />
            <NavItem
              icon={<TrendingUp className="h-4 w-4" />}
              label="Backtest"
              href="/strategies?tab=backtest"
              isActive={location.pathname === '/strategies' && new URLSearchParams(location.search).get('tab') === 'backtest'}
            />
            <NavItem
              icon={<Brain className="h-4 w-4" />}
              label="Import New"
              href="/strategies?tab=import"
              isActive={location.pathname === '/strategies' && new URLSearchParams(location.search).get('tab') === 'import'}
            />
          </NavItem>

          <NavItem
            icon={<AreaChart className="h-4 w-4" />}
            label="Performance"
            href="/performance"
            isActive={isActive('/performance')}
          />
        </NavGroup>

        <Separator />

        {/* GROUP 4: TOOLS & SETTINGS */}
        <NavGroup
          icon="⚙️"
          label="Tools & Settings"
          defaultOpen={false}
        >
          <NavItem
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
            href="/settings"
            isActive={isActive('/settings')}
          />
        </NavGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

// ============================================================================
// 4. TradingJournal.tsx - Contoh page dengan progressive disclosure
// ============================================================================

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function TradingJournal() {
  const activeTab = new URLSearchParams(location.search).get('tab') || 'setup';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Journal</h1>
          <p className="text-muted-foreground">
            Manage your trades, journal entries, and risk assessments
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Trade
        </Button>
      </div>

      {/* MAIN CONTENT dengan Accordion untuk reduce clutter */}
      <Accordion type="single" value={activeTab} defaultValue="setup">
        {/* SECTION 1: Entry Setup */}
        <AccordionItem value="setup">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Start New Trade
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Trade Entry Wizard</CardTitle>
              </CardHeader>
              <CardContent>
                {/* TradeEntryWizard component here */}
                <div className="text-muted-foreground">
                  Step 1: Select Account
                  <br />
                  Step 2: Choose Pair & Direction
                  <br />
                  Step 3: Position Sizing
                  <br />
                  Step 4: Final Check
                  <br />
                  Step 5: Confirm & Execute
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 2: Active Positions */}
        <AccordionItem value="active">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Active Positions
              <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-2">
                3
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Hardcoded example - replace with real data */}
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">BTCUSDT - Long</CardTitle>
                      <span className="text-xs text-success">+2.45%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Entry: $42,500</span>
                      <span>SL: $41,000</span>
                      <span>TP: $45,000</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        Modify
                      </Button>
                      <Button size="sm" variant="destructive">
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 3: Journal History */}
        <AccordionItem value="history">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Journal History
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Past trades list - replace with real data */}
              <div className="text-muted-foreground">
                Closed trades with P&L, entry/exit prices, and journal notes
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 4: Risk Checklist (collapsible) */}
        <AccordionItem value="risk">
          <AccordionTrigger className="text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-warning" />
              Pre-Trade Risk Checklist
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Daily Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="check1" defaultChecked />
                  <label htmlFor="check1" className="text-sm">
                    Daily loss limit not exceeded (Current: 2.5% / 5%)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="check2" defaultChecked />
                  <label htmlFor="check2" className="text-sm">
                    Account in healthy condition
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="check3" />
                  <label htmlFor="check3" className="text-sm">
                    Emotional state is clear & focused
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="check4" defaultChecked />
                  <label htmlFor="check4" className="text-sm">
                    Risk/Reward ratio acceptable (Min 1:2)
                  </label>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// ============================================================================
// 5. MarketInsight.tsx - Contoh dengan tabs instead of accordion
// ============================================================================

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function MarketInsight() {
  const activeTab = new URLSearchParams(location.search).get('tab') || 'analysis';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Market Insight</h1>
        <p className="text-muted-foreground">
          AI-powered market analysis, economic calendar & sentiment tracking
        </p>
      </div>

      {/* TABS untuk organize content */}
      <Tabs value={activeTab} defaultValue="analysis">
        <TabsList>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="calendar">Economic Calendar</TabsTrigger>
          <TabsTrigger value="data">Market Data</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          {/* AI Market Analysis Content */}
          <Card>
            <CardHeader>
              <CardTitle>AI Sentiment & Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Content here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          {/* Economic Calendar Content */}
          <Card>
            <CardHeader>
              <CardTitle>Economic Events Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Content here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          {/* Market Data Content */}
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Market Data</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Content here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
