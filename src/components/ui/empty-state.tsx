/**
 * Empty State Component for Nielsen Heuristic #1: Visibility of System Status
 * Shows meaningful empty states with actionable guidance
 * Enhanced with JTBD (Jobs To Be Done) framework messaging
 */

import { LucideIcon, Inbox, FileText, TrendingUp, Wallet, Target, BarChart3, BookOpen, Brain, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function EmptyTransactions({ onAddTransaction }: { onAddTransaction?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No transactions yet"
      description="Start tracking your investments by adding your first transaction. You can record buys, sells, dividends, and transfers."
      action={onAddTransaction ? { label: "Add Transaction", onClick: onAddTransaction } : undefined}
    />
  );
}

export function EmptyHoldings({ onAddTransaction }: { onAddTransaction?: () => void }) {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No holdings found"
      description="Your portfolio is empty. Add transactions to start building your portfolio and track your investments."
      action={onAddTransaction ? { label: "Add Transaction", onClick: onAddTransaction } : undefined}
    />
  );
}

export function EmptyAccounts({ onAddAccount }: { onAddAccount?: () => void }) {
  return (
    <EmptyState
      icon={Wallet}
      title="No accounts set up"
      description="Create your first account to start tracking your cash flow and link transactions to specific accounts."
      action={onAddAccount ? { label: "Add Account", onClick: onAddAccount } : undefined}
    />
  );
}

export function EmptyGoals({ onAddGoal }: { onAddGoal?: () => void }) {
  return (
    <EmptyState
      icon={Target}
      title="No financial goals"
      description="Set up your first financial goal to track your progress towards financial freedom."
      action={onAddGoal ? { label: "Create Goal", onClick: onAddGoal } : undefined}
    />
  );
}

export function EmptySearchResults({ onClearSearch }: { onClearSearch?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No results found"
      description="Try adjusting your search or filter criteria to find what you're looking for."
      action={onClearSearch ? { label: "Clear Search", onClick: onClearSearch } : undefined}
    />
  );
}

export function EmptyAnalytics() {
  return (
    <EmptyState
      icon={BarChart3}
      title="Not enough data"
      description="Add more transactions to see analytics and insights about your portfolio performance."
    />
  );
}

// JTBD-focused empty states for Trading Journey
export function EmptyTrades({ onAddTrade }: { onAddTrade?: () => void }) {
  return (
    <EmptyState
      icon={BookOpen}
      title="Your trading journal awaits"
      description="Record your first trade to start uncovering patterns and improving your win rate."
      action={onAddTrade ? { label: "Log First Trade", onClick: onAddTrade } : undefined}
    />
  );
}

export function EmptyInsights() {
  return (
    <EmptyState
      icon={Brain}
      title="AI insights coming soon"
      description="Complete 5 or more trades to unlock personalized AI recommendations based on your trading patterns."
    />
  );
}

export function EmptySessions({ onStartSession }: { onStartSession?: () => void }) {
  return (
    <EmptyState
      icon={LineChart}
      title="No trading sessions yet"
      description="Start your first session to track your trading performance and emotional state throughout the day."
      action={onStartSession ? { label: "Start Session", onClick: onStartSession } : undefined}
    />
  );
}

export function EmptyStrategies({ onCreateStrategy }: { onCreateStrategy?: () => void }) {
  return (
    <EmptyState
      icon={Target}
      title="Define your edge"
      description="Create your first strategy with clear entry rules and risk parameters to trade consistently."
      action={onCreateStrategy ? { label: "Create Strategy", onClick: onCreateStrategy } : undefined}
    />
  );
}
