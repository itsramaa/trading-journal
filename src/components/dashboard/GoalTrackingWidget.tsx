import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Target, TrendingUp, Shield, Pencil, Trophy, AlertTriangle } from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useUnifiedPortfolioData } from "@/hooks/use-unified-portfolio-data";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface Goals {
  monthlyPnl: number;
  winRate: number;
  maxDrawdown: number;
  minTrades: number;
}

const DEFAULT_GOALS: Goals = {
  monthlyPnl: 500,
  winRate: 55,
  maxDrawdown: 5,
  minTrades: 20,
};

const STORAGE_KEY = "trading_goals";

function loadGoals(): Goals {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_GOALS, ...JSON.parse(saved) } : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

export function GoalTrackingWidget({ className }: { className?: string }) {
  const [goals, setGoals] = useState<Goals>(loadGoals);
  const [editGoals, setEditGoals] = useState<Goals>(goals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: trades = [] } = useModeFilteredTrades();
  const { format: formatCurrency } = useCurrencyConversion();
  const portfolio = useUnifiedPortfolioData();

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthTrades = trades.filter(
      (t) =>
        t.status === "closed" &&
        isWithinInterval(new Date(t.trade_date), { start: monthStart, end: monthEnd })
    );

    const totalPnl = monthTrades.reduce((sum, t) => sum + (t.realized_pnl ?? t.pnl ?? 0), 0);
    // Exclude breakeven from win rate denominator
    const decisiveTrades = monthTrades.filter(t => (t.realized_pnl ?? t.pnl ?? 0) !== 0);
    const wins = decisiveTrades.filter((t) => (t.realized_pnl ?? t.pnl ?? 0) > 0).length;
    const winRate = decisiveTrades.length > 0 ? (wins / decisiveTrades.length) * 100 : 0;

    // Monthly drawdown calc — uses absolute loss as % of total if peak stays at 0
    let peak = 0;
    let balance = 0;
    let maxDd = 0;
    monthTrades
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime())
      .forEach((t) => {
        balance += t.realized_pnl ?? t.pnl ?? 0;
        if (balance > peak) peak = balance;
        if (peak > 0) {
          const dd = ((peak - balance) / peak) * 100;
          if (dd > maxDd) maxDd = dd;
        } else if (balance < 0 && portfolio.totalCapital > 0) {
          // All losses, no peak — use account balance as denominator
          const dd = (Math.abs(balance) / portfolio.totalCapital) * 100;
          if (dd > maxDd) maxDd = Math.min(dd, 100);
        }
      });

    return { totalPnl, winRate, maxDrawdown: maxDd, totalTrades: monthTrades.length };
  }, [trades, portfolio.totalCapital]);

  const saveGoals = () => {
    setGoals(editGoals);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(editGoals));
    setDialogOpen(false);
  };

  const goalItems = [
    {
      icon: TrendingUp,
      label: "Monthly P&L",
      current: stats.totalPnl,
      target: goals.monthlyPnl,
      format: (v: number) => formatCurrency(v),
      progress: goals.monthlyPnl > 0 ? Math.min((stats.totalPnl / goals.monthlyPnl) * 100, 100) : 0,
      hit: stats.totalPnl >= goals.monthlyPnl,
    },
    {
      icon: Target,
      label: "Win Rate",
      current: stats.winRate,
      target: goals.winRate,
      format: (v: number) => `${v.toFixed(1)}%`,
      progress: goals.winRate > 0 ? Math.min((stats.winRate / goals.winRate) * 100, 100) : 0,
      hit: stats.winRate >= goals.winRate,
    },
    {
      icon: Shield,
      label: "Monthly Max DD",
      current: stats.maxDrawdown,
      target: goals.maxDrawdown,
      format: (v: number) => `${v.toFixed(1)}%`,
      // Inverse: lower is better
      progress: goals.maxDrawdown > 0 ? Math.max(100 - (stats.maxDrawdown / goals.maxDrawdown) * 100, 0) : 100,
      hit: stats.maxDrawdown <= goals.maxDrawdown,
      inverse: true,
    },
    {
      icon: Trophy,
      label: "Min Trades",
      current: stats.totalTrades,
      target: goals.minTrades,
      format: (v: number) => `${v}`,
      progress: goals.minTrades > 0 ? Math.min((stats.totalTrades / goals.minTrades) * 100, 100) : 0,
      hit: stats.totalTrades >= goals.minTrades,
    },
  ];

  const goalsHit = goalItems.filter((g) => g.hit).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              Monthly Goals
              <Badge variant="outline" className="text-xs ml-1">Monthly</Badge>
              <Badge variant={goalsHit === goalItems.length ? "default" : "secondary"} className="text-xs">
                {goalsHit}/{goalItems.length}
              </Badge>
            </CardTitle>
            <CardDescription>Track your trading targets</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditGoals(goals)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Monthly Goals</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Monthly P&L Target ($)</Label>
                  <Input
                    type="number"
                    value={editGoals.monthlyPnl}
                    onChange={(e) => setEditGoals({ ...editGoals, monthlyPnl: +e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Win Rate Target (%)</Label>
                  <Input
                    type="number"
                    value={editGoals.winRate}
                    onChange={(e) => setEditGoals({ ...editGoals, winRate: +e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max Drawdown Limit (%)</Label>
                  <Input
                    type="number"
                    value={editGoals.maxDrawdown}
                    onChange={(e) => setEditGoals({ ...editGoals, maxDrawdown: +e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Min Trades per Month</Label>
                  <Input
                    type="number"
                    value={editGoals.minTrades}
                    onChange={(e) => setEditGoals({ ...editGoals, minTrades: +e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={saveGoals}>Save Goals</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goalItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    {item.label === 'Monthly Max DD' && (
                      <InfoTooltip content="Drawdown from this month's closed trades only, calculated as percentage of your total account balance." />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono-numbers text-xs ${item.hit ? "text-profit" : "text-muted-foreground"}`}>
                      {item.format(item.current)}
                    </span>
                    <span className="text-xs text-muted-foreground">/</span>
                    <span className="font-mono-numbers text-xs text-muted-foreground">
                      {item.format(item.target)}
                    </span>
                    {item.hit ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">✓</Badge>
                    ) : item.inverse && item.current > item.target ? (
                      <AlertTriangle className="h-3 w-3 text-loss" />
                    ) : null}
                  </div>
                </div>
                <Progress
                  value={item.progress}
                  className="h-2"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
