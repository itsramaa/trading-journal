import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Brain, Target, TrendingUp, Shield, Lightbulb } from "lucide-react";

const competenceAreas = [
  { name: "Cryptocurrency", allocation: 45, competence: 85, performance: 28.5, inCircle: true },
  { name: "US Tech Stocks", allocation: 25, competence: 70, performance: 15.2, inCircle: true },
  { name: "Indonesian Stocks", allocation: 15, competence: 40, performance: -5.3, inCircle: false },
  { name: "Bonds", allocation: 10, competence: 30, performance: 4.1, inCircle: false },
  { name: "REITs", allocation: 5, competence: 25, performance: 2.8, inCircle: false },
];

export default function PMDashboard() {
  const focusScore = competenceAreas.filter(a => a.inCircle).reduce((sum, a) => sum + a.allocation, 0);
  const outsideCircle = 100 - focusScore;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
          <p className="text-muted-foreground">Focus is the key to success - be world-class in one area</p>
        </div>

        {/* Focus Score Alert */}
        {outsideCircle > 30 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="font-semibold text-red-500">Warning: Outside Circle of Competence</p>
                <p className="text-sm text-muted-foreground">
                  {outsideCircle}% of your portfolio is invested outside your high-competence areas. Target: &lt;30%
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{focusScore}%</div>
              <p className="text-xs text-muted-foreground">Target: &gt;70%</p>
              <Progress value={focusScore} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Competence Areas</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{competenceAreas.filter(a => a.inCircle).length}</div>
              <p className="text-xs text-muted-foreground">High competence areas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">+18.5%</div>
              <p className="text-xs text-muted-foreground">In-circle assets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outside Circle</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${outsideCircle > 30 ? "text-red-500" : "text-green-500"}`}>
                {outsideCircle}%
              </div>
              <p className="text-xs text-muted-foreground">Max allowed: 30%</p>
            </CardContent>
          </Card>
        </div>

        {/* Competence Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Circle of Competence</CardTitle>
            <CardDescription>Only invest in areas you understand deeply</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {competenceAreas.map((area) => (
              <div key={area.name} className={`p-4 rounded-lg border ${area.inCircle ? "border-green-500/50 bg-green-500/5" : "border-muted"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{area.name}</span>
                    <Badge variant={area.inCircle ? "default" : "secondary"}>
                      {area.inCircle ? "In Circle" : "Outside"}
                    </Badge>
                  </div>
                  <span className={area.performance >= 0 ? "text-green-500" : "text-red-500"}>
                    {area.performance >= 0 ? "+" : ""}{area.performance}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Allocation: {area.allocation}%</p>
                    <Progress value={area.allocation} className="h-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Competence: {area.competence}%</p>
                    <Progress value={area.competence} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Recommendation */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Consider reducing your Indonesian Stocks and Bonds allocation. Your performance in these areas (-5.3% and +4.1%) 
              is significantly lower than your high-competence areas (+28.5% and +15.2%). Reallocating to Cryptocurrency 
              or US Tech would improve both focus score and expected returns.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
