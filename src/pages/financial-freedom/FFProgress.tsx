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
  Flame
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Financial Freedom Levels
const levels = [
  {
    level: 1,
    name: "Survival",
    icon: Shield,
    description: "Budget management, debt payoff, emergency fund 1-3 months",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/50",
    requirements: [
      { label: "Monthly Budget Tracked", target: true },
      { label: "Emergency Fund", target: "1-3 months" },
      { label: "High-Interest Debt", target: "Reducing" },
    ],
  },
  {
    level: 2,
    name: "Stability",
    icon: Target,
    description: "Emergency fund 6-12 months, no high-interest debt",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/50",
    requirements: [
      { label: "Emergency Fund", target: "6-12 months" },
      { label: "High-Interest Debt", target: "None" },
      { label: "Debt-to-Income Ratio", target: "<30%" },
    ],
  },
  {
    level: 3,
    name: "Independence",
    icon: TrendingUp,
    description: "Rp15B assets, 4% withdrawal = Rp60M/month",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/50",
    requirements: [
      { label: "Total Assets", target: "Rp15 Miliar" },
      { label: "CAGR", target: ">15%" },
      { label: "Savings Rate", target: "50-80%" },
      { label: "Withdrawal Rate", target: "4%" },
    ],
  },
  {
    level: 4,
    name: "Freedom",
    icon: Crown,
    description: "Rp150B assets, complete time & location freedom",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/50",
    requirements: [
      { label: "Total Assets", target: "Rp150 Miliar" },
      { label: "Passive Income", target: ">Monthly Expenses" },
      { label: "Time Freedom", target: "100%" },
    ],
  },
  {
    level: 5,
    name: "Purpose",
    icon: Heart,
    description: "Focus on serving others, impossible ventures, legacy building",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/50",
    requirements: [
      { label: "Legacy Projects", target: "Active" },
      { label: "Philanthropy", target: "Ongoing" },
      { label: "Impact Score", target: "High" },
    ],
  },
];

// Demo data - will be replaced with real data
const demoMetrics = {
  currentLevel: 2,
  levelProgress: 65,
  savingsRate: 35,
  cagr: 12.5,
  withdrawalRate: 0,
  emergencyFundMonths: 4,
  debtToIncomeRatio: 25,
  totalAssets: 850000000, // 850 juta IDR
  monthlyExpenses: 15000000, // 15 juta IDR
  monthlyIncome: 25000000, // 25 juta IDR
  totalDebt: 50000000, // 50 juta IDR
};

export default function FFProgress() {
  const currentLevelData = levels[demoMetrics.currentLevel - 1];
  const nextLevelData = levels[demoMetrics.currentLevel];

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp${(value / 1000000000).toFixed(1)}M`;
    }
    if (value >= 1000000) {
      return `Rp${(value / 1000000).toFixed(0)}jt`;
    }
    return `Rp${value.toLocaleString()}`;
  };

  const keyMetrics = useMemo(() => [
    {
      label: "Savings Rate",
      value: `${demoMetrics.savingsRate}%`,
      target: "50-80%",
      icon: PiggyBank,
      status: demoMetrics.savingsRate >= 50 ? "success" : demoMetrics.savingsRate >= 30 ? "warning" : "danger",
    },
    {
      label: "CAGR",
      value: `${demoMetrics.cagr}%`,
      target: ">15%",
      icon: TrendingUp,
      status: demoMetrics.cagr >= 15 ? "success" : demoMetrics.cagr >= 10 ? "warning" : "danger",
    },
    {
      label: "Emergency Fund",
      value: `${demoMetrics.emergencyFundMonths} months`,
      target: "6-12 months",
      icon: Shield,
      status: demoMetrics.emergencyFundMonths >= 6 ? "success" : demoMetrics.emergencyFundMonths >= 3 ? "warning" : "danger",
    },
    {
      label: "Debt-to-Income",
      value: `${demoMetrics.debtToIncomeRatio}%`,
      target: "<30%",
      icon: CreditCard,
      status: demoMetrics.debtToIncomeRatio <= 20 ? "success" : demoMetrics.debtToIncomeRatio <= 30 ? "warning" : "danger",
    },
  ], []);

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
        <Card className={`${currentLevelData.borderColor} border-2`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${currentLevelData.bgColor}`}>
                  <currentLevelData.icon className={`h-6 w-6 ${currentLevelData.color}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">Level {currentLevelData.level}: {currentLevelData.name}</CardTitle>
                  <CardDescription>{currentLevelData.description}</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className={currentLevelData.color}>
                Current Level
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to Level {demoMetrics.currentLevel + 1}</span>
                  <span className="font-medium">{demoMetrics.levelProgress}%</span>
                </div>
                <Progress value={demoMetrics.levelProgress} className="h-3" />
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
              <div className="text-2xl font-bold">{formatCurrency(demoMetrics.totalAssets)}</div>
              <p className="text-xs text-muted-foreground">
                Target L3: Rp15M • Target L4: Rp150M
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Cash Flow</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                +{formatCurrency(demoMetrics.monthlyIncome - demoMetrics.monthlyExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Income: {formatCurrency(demoMetrics.monthlyIncome)} • Expenses: {formatCurrency(demoMetrics.monthlyExpenses)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrency(demoMetrics.totalDebt)}</div>
              <p className="text-xs text-muted-foreground">
                Debt-to-Income: {demoMetrics.debtToIncomeRatio}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Levels</h2>
          <div className="grid gap-4 md:grid-cols-5">
            {levels.map((level) => {
              const isCompleted = level.level < demoMetrics.currentLevel;
              const isCurrent = level.level === demoMetrics.currentLevel;
              const isLocked = level.level > demoMetrics.currentLevel;

              return (
                <Card 
                  key={level.level} 
                  className={`${isCurrent ? level.borderColor + " border-2" : ""} ${isLocked ? "opacity-50" : ""}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${level.bgColor}`}>
                        <level.icon className={`h-5 w-5 ${level.color}`} />
                      </div>
                      {isCompleted && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          ✓
                        </Badge>
                      )}
                      {isCurrent && (
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
