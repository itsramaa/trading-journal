import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, Target, Brain, Sparkles } from "lucide-react";

const insights = [
  {
    id: "1",
    type: "pattern",
    title: "High Win Rate on Tuesdays",
    description: "Your win rate on Tuesdays is 78% compared to 55% average. Consider focusing more trades on this day.",
    impact: "high",
    icon: TrendingUp,
  },
  {
    id: "2",
    type: "warning",
    title: "Overtrading on Fridays",
    description: "Friday trades show -12% average return. Consider reducing position sizes or skipping Fridays.",
    impact: "high",
    icon: AlertTriangle,
  },
  {
    id: "3",
    type: "optimization",
    title: "Optimal R:R is 2.5:1",
    description: "Trades with 2.5:1 R:R show best risk-adjusted returns. Current average is 1.9:1.",
    impact: "medium",
    icon: Target,
  },
  {
    id: "4",
    type: "pattern",
    title: "BTC Trades Outperform",
    description: "Your BTC/USDT trades have 72% win rate vs 58% for altcoins. Consider specializing.",
    impact: "medium",
    icon: Sparkles,
  },
];

const recommendations = [
  "Focus on confluence scores 7+ for entries - these show 85% win rate",
  "Reduce position size by 50% during high volatility periods",
  "Your best entries are at London-NY overlap (13:00-17:00 WIB)",
  "Consider adding trailing stops - could increase avg wins by 23%",
];

export default function Insights() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground">AI-powered analysis and optimization suggestions</p>
        </div>

        {/* AI Summary */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Based on your last 450 trades, you show strong performance in trend-following strategies with BTC. 
              Your main edge is patience in waiting for high-confluence setups. Areas for improvement: 
              reducing overtrading on low-volatility days and improving exit management on winning trades.
            </p>
          </CardContent>
        </Card>

        {/* Insights Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight) => (
            <Card key={insight.id} className={insight.type === "warning" ? "border-red-500/50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <insight.icon className={`h-5 w-5 ${
                      insight.type === "warning" ? "text-red-500" : 
                      insight.type === "pattern" ? "text-green-500" : "text-primary"
                    }`} />
                    <CardTitle className="text-base">{insight.title}</CardTitle>
                  </div>
                  <Badge variant={insight.impact === "high" ? "destructive" : "secondary"}>
                    {insight.impact} impact
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Actionable Recommendations
            </CardTitle>
            <CardDescription>Steps to improve your trading performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
