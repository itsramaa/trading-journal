import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile, Meh, Frown, Clock, TrendingUp, TrendingDown, Activity, Sun, Sunset, Moon, Cloud, CloudRain, Zap } from "lucide-react";
import { useTradingSessions, TradingSessionWithStats } from "@/hooks/use-trading-sessions";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

interface AnalyticsData {
  byMood: { mood: string; sessions: number; pnl: number; winRate: number; avgRating: number }[];
  byTimeOfDay: { period: string; sessions: number; pnl: number; winRate: number }[];
  byMarketCondition: { condition: string; sessions: number; pnl: number; winRate: number }[];
  correlations: { factor: string; impact: string; recommendation: string }[];
}

export function SessionAnalytics() {
  const { data: sessions = [], isLoading: sessionsLoading } = useTradingSessions();
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();

  const analytics = useMemo<AnalyticsData>(() => {
    if (sessions.length === 0) {
      return {
        byMood: [],
        byTimeOfDay: [],
        byMarketCondition: [],
        correlations: [],
      };
    }

    // Helper to get session stats
    const getSessionStats = (sessionList: TradingSessionWithStats[]) => {
      const totalSessions = sessionList.length;
      const totalPnl = sessionList.reduce((sum, s) => sum + (s.calculated_pnl || 0), 0);
      const winningCount = sessionList.filter((s) => (s.calculated_pnl || 0) > 0).length;
      const winRate = totalSessions > 0 ? (winningCount / totalSessions) * 100 : 0;
      const avgRating = totalSessions > 0
        ? sessionList.reduce((sum, s) => sum + Number(s.rating), 0) / totalSessions
        : 0;
      return { sessions: totalSessions, pnl: totalPnl, winRate, avgRating };
    };

    // Group by mood
    const moodGroups = new Map<string, TradingSessionWithStats[]>();
    sessions.forEach((s) => {
      const list = moodGroups.get(s.mood) || [];
      list.push(s);
      moodGroups.set(s.mood, list);
    });

    const byMood = Array.from(moodGroups.entries()).map(([mood, list]) => ({
      mood,
      ...getSessionStats(list),
    }));

    // Group by time of day
    const getTimeOfDay = (time: string) => {
      const hour = parseInt(time.split(":")[0], 10);
      if (hour >= 5 && hour < 12) return "Morning (5-12)";
      if (hour >= 12 && hour < 17) return "Afternoon (12-17)";
      if (hour >= 17 && hour < 21) return "Evening (17-21)";
      return "Night (21-5)";
    };

    const timeGroups = new Map<string, TradingSessionWithStats[]>();
    sessions.forEach((s) => {
      const period = getTimeOfDay(s.start_time);
      const list = timeGroups.get(period) || [];
      list.push(s);
      timeGroups.set(period, list);
    });

    const timeOrder = ["Morning (5-12)", "Afternoon (12-17)", "Evening (17-21)", "Night (21-5)"];
    const byTimeOfDay = timeOrder
      .filter((period) => timeGroups.has(period))
      .map((period) => ({
        period,
        ...getSessionStats(timeGroups.get(period)!),
      }));

    // Group by market condition
    const conditionGroups = new Map<string, TradingSessionWithStats[]>();
    sessions.forEach((s) => {
      const condition = s.market_condition || "Unknown";
      const list = conditionGroups.get(condition) || [];
      list.push(s);
      conditionGroups.set(condition, list);
    });

    const byMarketCondition = Array.from(conditionGroups.entries()).map(([condition, list]) => ({
      condition,
      ...getSessionStats(list),
    }));

    // Generate correlations/insights
    const correlations: { factor: string; impact: string; recommendation: string }[] = [];

    // Best mood for trading
    const bestMood = byMood.sort((a, b) => b.winRate - a.winRate)[0];
    if (bestMood && byMood.length > 1) {
      correlations.push({
        factor: "Mood",
        impact: `${bestMood.mood.charAt(0).toUpperCase() + bestMood.mood.slice(1)} mood has ${bestMood.winRate.toFixed(0)}% win rate`,
        recommendation: `You perform best when feeling ${bestMood.mood}. Consider only trading when in this mental state.`,
      });
    }

    // Best time of day
    const bestTime = byTimeOfDay.sort((a, b) => b.winRate - a.winRate)[0];
    if (bestTime && byTimeOfDay.length > 1) {
      correlations.push({
        factor: "Time of Day",
        impact: `${bestTime.period} shows ${bestTime.winRate.toFixed(0)}% win rate with ${bestTime.pnl >= 0 ? "+" : ""}$${bestTime.pnl.toFixed(2)} P&L`,
        recommendation: `Focus your trading during ${bestTime.period.toLowerCase()} for optimal results.`,
      });
    }

    // Best market condition
    const bestCondition = byMarketCondition.filter((c) => c.condition !== "Unknown").sort((a, b) => b.winRate - a.winRate)[0];
    if (bestCondition && byMarketCondition.length > 1) {
      correlations.push({
        factor: "Market Condition",
        impact: `${bestCondition.condition} markets yield ${bestCondition.winRate.toFixed(0)}% win rate`,
        recommendation: `Your strategy works best in ${bestCondition.condition.toLowerCase()} markets. Consider reducing size in other conditions.`,
      });
    }

    // Mood vs Rating correlation
    const avgRatingByMood = byMood.map((m) => ({ mood: m.mood, avgRating: m.avgRating }));
    const highRatedMood = avgRatingByMood.sort((a, b) => b.avgRating - a.avgRating)[0];
    if (highRatedMood) {
      correlations.push({
        factor: "Self-Assessment",
        impact: `You rate sessions ${highRatedMood.avgRating.toFixed(1)}/5 on average when ${highRatedMood.mood}`,
        recommendation: "Your self-ratings correlate with mood. Use this awareness to improve consistency.",
      });
    }

    return { byMood, byTimeOfDay, byMarketCondition, correlations };
  }, [sessions]);

  const isLoading = sessionsLoading || tradesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Session Analytics
          </CardTitle>
          <CardDescription>
            Performance breakdown by mood, time, and market conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No session data available yet.</p>
            <p className="text-sm">Start logging trading sessions to see analytics.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const moodColors: Record<string, string> = {
    positive: "hsl(var(--chart-2))",
    neutral: "hsl(var(--chart-3))",
    negative: "hsl(var(--destructive))",
  };

  const moodIcons: Record<string, React.ReactNode> = {
    positive: <Smile className="h-4 w-4 text-green-500" />,
    neutral: <Meh className="h-4 w-4 text-yellow-500" />,
    negative: <Frown className="h-4 w-4 text-destructive" />,
  };

  const timeIcons: Record<string, React.ReactNode> = {
    "Morning (5-12)": <Sun className="h-4 w-4 text-yellow-500" />,
    "Afternoon (12-17)": <Sun className="h-4 w-4 text-orange-500" />,
    "Evening (17-21)": <Sunset className="h-4 w-4 text-orange-600" />,
    "Night (21-5)": <Moon className="h-4 w-4 text-blue-500" />,
  };

  const conditionIcons: Record<string, React.ReactNode> = {
    trending: <TrendingUp className="h-4 w-4 text-green-500" />,
    ranging: <Activity className="h-4 w-4 text-yellow-500" />,
    volatile: <Zap className="h-4 w-4 text-orange-500" />,
    choppy: <CloudRain className="h-4 w-4 text-destructive" />,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Session Analytics
        </CardTitle>
        <CardDescription>
          Performance breakdown by mood, time, and market conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mood" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mood">By Mood</TabsTrigger>
            <TabsTrigger value="time">By Time</TabsTrigger>
            <TabsTrigger value="market">By Market</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="mood" className="space-y-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byMood}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mood" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "pnl" ? `$${value.toFixed(2)}` : `${value.toFixed(1)}%`,
                      name === "pnl" ? "P&L" : "Win Rate",
                    ]}
                  />
                  <Bar dataKey="winRate" name="Win Rate" radius={[4, 4, 0, 0]}>
                    {analytics.byMood.map((entry) => (
                      <Cell key={entry.mood} fill={moodColors[entry.mood] || "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {analytics.byMood.map((item) => (
                <Card key={item.mood} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {moodIcons[item.mood]}
                    <span className="font-medium capitalize">{item.mood}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessions</span>
                      <span>{item.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className={item.winRate >= 50 ? "text-green-500" : "text-destructive"}>
                        {item.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className={item.pnl >= 0 ? "text-green-500" : "text-destructive"}>
                        {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byTimeOfDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="period" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="pnl" name="P&L" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {analytics.byTimeOfDay.map((entry) => (
                      <Cell 
                        key={entry.period} 
                        fill={entry.pnl >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {analytics.byTimeOfDay.map((item) => (
                <Card key={item.period} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {timeIcons[item.period] || <Clock className="h-4 w-4" />}
                    <span className="font-medium text-sm">{item.period.split(" ")[0]}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessions</span>
                      <span>{item.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span>{item.winRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className={item.pnl >= 0 ? "text-green-500" : "text-destructive"}>
                        {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.byMarketCondition}
                    dataKey="sessions"
                    nameKey="condition"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ condition, sessions }) => `${condition}: ${sessions}`}
                  >
                    {analytics.byMarketCondition.map((entry, index) => (
                      <Cell 
                        key={entry.condition} 
                        fill={`hsl(var(--chart-${(index % 5) + 1}))`} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {analytics.byMarketCondition.map((item) => (
                <Card key={item.condition} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {conditionIcons[item.condition.toLowerCase()] || <Cloud className="h-4 w-4" />}
                    <span className="font-medium">{item.condition}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sessions</span>
                      <span>{item.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className={item.winRate >= 50 ? "text-green-500" : "text-destructive"}>
                        {item.winRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className={item.pnl >= 0 ? "text-green-500" : "text-destructive"}>
                        {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {analytics.correlations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Need more session data to generate insights.</p>
                <p className="text-sm">Log at least 5 sessions with varied conditions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.correlations.map((insight, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{insight.factor}</Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{insight.impact}</p>
                        <p className="text-sm text-muted-foreground">{insight.recommendation}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
