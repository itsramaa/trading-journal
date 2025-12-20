import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Shield, 
  Target, 
  Crown, 
  Heart,
  Wallet,
  PiggyBank,
  CreditCard,
  ArrowUpRight,
  Flame,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFFProgressData } from "@/hooks/use-ff-progress";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";

// Level icons mapping
const levelIcons = {
  1: Shield,
  2: Target,
  3: TrendingUp,
  4: Crown,
  5: Heart,
};

const levelColors = {
  1: { color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/50" },
  2: { color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/50" },
  3: { color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/50" },
  4: { color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/50" },
  5: { color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/50" },
};

const formatCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `Rp${(value / 1000000000).toFixed(1)}M`;
  }
  if (value >= 1000000) {
    return `Rp${(value / 1000000).toFixed(0)}jt`;
  }
  return `Rp${value.toLocaleString()}`;
};

export default function FFProgress() {
  const { metrics, levels, isLoading, hasData } = useFFProgressData();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Financial Freedom Progress</h1>
              <p className="text-muted-foreground">Track your progress through the 5 levels of financial freedom</p>
            </div>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Financial Freedom Progress</h1>
              <p className="text-muted-foreground">Track your progress through the 5 levels of financial freedom</p>
            </div>
            <Button asChild>
              <Link to="/ff/fire-calculator">
                <Flame className="mr-2 h-4 w-4" />
                FIRE Calculator
              </Link>
            </Button>
          </div>
          <EmptyState
            icon={Target}
            title="Start Your Financial Freedom Journey"
            description="Add your portfolio holdings, set up your emergency fund, or configure your budget to begin tracking your progress."
          />
        </div>
      </DashboardLayout>
    );
  }

  const currentLevelData = levels[metrics.currentLevel - 1];
  const nextLevelData = metrics.currentLevel < 5 ? levels[metrics.currentLevel] : null;
  const CurrentLevelIcon = levelIcons[metrics.currentLevel as keyof typeof levelIcons];
  const currentColors = levelColors[metrics.currentLevel as keyof typeof levelColors];

  const keyMetrics = [
    {
      label: "Savings Rate",
      value: `${metrics.savingsRate.toFixed(1)}%`,
      target: "50-80%",
      icon: PiggyBank,
      status: metrics.savingsRate >= 50 ? "success" : metrics.savingsRate >= 30 ? "warning" : "danger",
    },
    {
      label: "CAGR",
      value: `${metrics.cagr.toFixed(1)}%`,
      target: ">15%",
      icon: TrendingUp,
      status: metrics.cagr >= 15 ? "success" : metrics.cagr >= 10 ? "warning" : "danger",
    },
    {
      label: "Emergency Fund",
      value: `${metrics.emergencyFundMonths.toFixed(1)} months`,
      target: "6-12 months",
      icon: Shield,
      status: metrics.emergencyFundMonths >= 6 ? "success" : metrics.emergencyFundMonths >= 3 ? "warning" : "danger",
    },
    {
      label: "Debt-to-Income",
      value: `${metrics.debtToIncomeRatio.toFixed(1)}%`,
      target: "<30%",
      icon: CreditCard,
      status: metrics.debtToIncomeRatio <= 20 ? "success" : metrics.debtToIncomeRatio <= 30 ? "warning" : "danger",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Freedom Progress</h1>
            <p className="text-muted-foreground">Track your progress through the 5 levels of financial freedom</p>
          </div>
          <Button asChild>
            <Link to="/ff/fire-calculator">
              <Flame className="mr-2 h-4 w-4" />
              FIRE Calculator
            </Link>
          </Button>
        </div>

        {/* Current Level Card */}
        <Card className={`${currentColors.borderColor} border-2`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${currentColors.bgColor}`}>
                  <CurrentLevelIcon className={`h-6 w-6 ${currentColors.color}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">Level {currentLevelData.level}: {currentLevelData.name}</CardTitle>
                  <CardDescription>{currentLevelData.description}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className={currentColors.color}>
                Current Level
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to Level {Math.min(metrics.currentLevel + 1, 5)}</span>
                  <span className="font-medium">{metrics.levelProgress.toFixed(0)}%</span>
                </div>
                <Progress value={metrics.levelProgress} className="h-3" />
              </div>
              {nextLevelData && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Next: {nextLevelData.name} - {nextLevelData.description}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {keyMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground">
                  Target: {metric.target}
                </p>
                <div className={`mt-2 h-1.5 rounded-full ${
                  metric.status === "success" ? "bg-green-500" : 
                  metric.status === "warning" ? "bg-yellow-500" : "bg-red-500"
                }`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Financial Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalAssets)}</div>
              <p className="text-xs text-muted-foreground">
                Portfolio: {formatCurrency(metrics.totalPortfolioValue)} • Accounts: {formatCurrency(metrics.totalAccountBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Cash Flow</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.monthlySavings >= 0 ? "text-green-500" : "text-red-500"}`}>
                {metrics.monthlySavings >= 0 ? '+' : ''}{formatCurrency(metrics.monthlySavings)}
              </div>
              <p className="text-xs text-muted-foreground">
                Income: {formatCurrency(metrics.monthlyIncome)} • Expenses: {formatCurrency(metrics.monthlyExpenses)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.totalDebt > 0 ? "text-red-500" : "text-green-500"}`}>
                {formatCurrency(metrics.totalDebt)}
              </div>
              <p className="text-xs text-muted-foreground">
                DTI Ratio: {metrics.debtToIncomeRatio.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FIRE Progress */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              FIRE Progress
            </CardTitle>
            <CardDescription>Your journey to Financial Independence, Retire Early</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">FIRE Number</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.fireNumber)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Years to FIRE</p>
                <p className="text-2xl font-bold">
                  {metrics.yearsToFire > 100 ? "∞" : metrics.yearsToFire.toFixed(0)}
                </p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span className="font-medium">{Math.min(metrics.fireProgress, 100).toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(metrics.fireProgress, 100)} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Level Progress Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Levels</h2>
          <div className="grid gap-4 md:grid-cols-5">
            {levels.map((level) => {
              const LevelIcon = levelIcons[level.level as keyof typeof levelIcons];
              const colors = levelColors[level.level as keyof typeof levelColors];
              const isLocked = level.level > metrics.currentLevel;

              return (
                <Card 
                  key={level.level} 
                  className={`${level.isCurrent ? colors.borderColor + " border-2" : ""} ${isLocked ? "opacity-50" : ""}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${colors.bgColor}`}>
                        <LevelIcon className={`h-5 w-5 ${colors.color}`} />
                      </div>
                      {level.isCompleted && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          ✓
                        </Badge>
                      )}
                      {level.isCurrent && (
                        <Badge variant="secondary">Current</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold">L{level.level}: {level.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {level.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
