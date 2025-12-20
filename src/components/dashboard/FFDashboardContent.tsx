/**
 * Financial Freedom Dashboard Content for unified dashboard
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  ArrowUpRight
} from "lucide-react";
import { useEmergencyFund } from "@/hooks/use-emergency-fund";
import { useDebts } from "@/hooks/use-debts";
import { useGoals } from "@/hooks/use-goals";
import { useFireSettings } from "@/hooks/use-fire-settings";
import { useUserSettings } from "@/hooks/use-user-settings";

const levels = [
  { level: 1, name: "Survival", icon: Shield, color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/50" },
  { level: 2, name: "Stability", icon: Target, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/50" },
  { level: 3, name: "Independence", icon: TrendingUp, color: "text-yellow-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/50" },
  { level: 4, name: "Freedom", icon: Crown, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/50" },
  { level: 5, name: "Purpose", icon: Heart, color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/50" },
];

export default function FFDashboardContent() {
  const { t } = useTranslation();
  const { data: settings } = useUserSettings();
  const { data: emergencyFund } = useEmergencyFund();
  const { data: debts = [] } = useDebts();
  const { data: goals = [] } = useGoals();
  const { data: fireSettings } = useFireSettings();

  const currency = settings?.default_currency || 'USD';
  const isIDR = currency === 'IDR';

  // Calculate actual metrics from real data
  const metrics = useMemo(() => {
    const totalEmergencyFund = emergencyFund ? Number(emergencyFund.current_balance) : 0;
    const monthlyExpenses = fireSettings?.monthly_expenses || 15000000;
    const monthlyIncome = fireSettings?.monthly_income || 25000000;
    const emergencyFundMonths = monthlyExpenses > 0 ? totalEmergencyFund / monthlyExpenses : 0;
    
    const totalDebt = debts.filter(d => d.is_active).reduce((sum, d) => sum + Number(d.current_balance), 0);
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;
    
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    
    // Determine level based on metrics
    let currentLevel = 1;
    if (emergencyFundMonths >= 6 && debtToIncomeRatio < 30) currentLevel = 2;
    if (emergencyFundMonths >= 12 && debtToIncomeRatio < 20) currentLevel = 3;
    
    // Calculate progress to next level
    let levelProgress = 0;
    if (currentLevel === 1) {
      levelProgress = Math.min(100, (emergencyFundMonths / 3) * 50 + (Math.max(0, 30 - debtToIncomeRatio) / 30) * 50);
    } else if (currentLevel === 2) {
      levelProgress = Math.min(100, (emergencyFundMonths / 12) * 50 + (Math.max(0, 20 - debtToIncomeRatio) / 20) * 50);
    }

    return {
      currentLevel,
      levelProgress,
      savingsRate,
      emergencyFundMonths,
      debtToIncomeRatio,
      totalDebt,
      monthlyExpenses,
      monthlyIncome,
      totalEmergencyFund,
    };
  }, [emergencyFund, debts, fireSettings]);

  const currentLevelData = levels[metrics.currentLevel - 1];
  const nextLevelData = levels[metrics.currentLevel];

  const formatCurrency = (value: number) => {
    if (isIDR) {
      if (value >= 1000000000) return `Rp${(value / 1000000000).toFixed(1)}M`;
      if (value >= 1000000) return `Rp${(value / 1000000).toFixed(0)}jt`;
      return `Rp${value.toLocaleString()}`;
    }
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const keyMetrics = [
    {
      label: t('ff.savingsRate'),
      value: `${metrics.savingsRate.toFixed(1)}%`,
      target: "50-80%",
      icon: PiggyBank,
      status: metrics.savingsRate >= 50 ? "success" : metrics.savingsRate >= 30 ? "warning" : "danger",
    },
    {
      label: t('ff.emergencyFundMonths'),
      value: `${metrics.emergencyFundMonths.toFixed(1)} months`,
      target: "6-12 months",
      icon: Shield,
      status: metrics.emergencyFundMonths >= 6 ? "success" : metrics.emergencyFundMonths >= 3 ? "warning" : "danger",
    },
    {
      label: t('ff.debtToIncome'),
      value: `${metrics.debtToIncomeRatio.toFixed(1)}%`,
      target: "<30%",
      icon: CreditCard,
      status: metrics.debtToIncomeRatio <= 20 ? "success" : metrics.debtToIncomeRatio <= 30 ? "warning" : "danger",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current Level Card */}
      <Card className={`${currentLevelData.borderColor} border-2`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${currentLevelData.bgColor}`}>
                <currentLevelData.icon className={`h-6 w-6 ${currentLevelData.color}`} />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {t('ff.level')} {currentLevelData.level}: {currentLevelData.name}
                </CardTitle>
              </div>
            </div>
            <Badge variant="outline" className={currentLevelData.color}>
              {t('subscription.currentPlan')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to Level {metrics.currentLevel + 1}</span>
                <span className="font-medium">{metrics.levelProgress.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.levelProgress} className="h-3" />
            </div>
            {nextLevelData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpRight className="h-4 w-4" />
                <span>Next: {nextLevelData.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {keyMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">Target: {metric.target}</p>
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
            <CardTitle className="text-sm font-medium">{t('ff.emergencyFundMonths')}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalEmergencyFund)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.emergencyFundMonths.toFixed(1)} months coverage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ff.monthlyIncome')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              +{formatCurrency(metrics.monthlyIncome - metrics.monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly savings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(metrics.totalDebt)}</div>
            <p className="text-xs text-muted-foreground">
              {debts.filter(d => d.is_active).length} active debts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
