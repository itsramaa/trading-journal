import { useState, useMemo, useEffect } from "react";
import { 
  Flame, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Target, 
  Wallet,
  Percent,
  Clock,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Save,
  Loader2
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  calculateFire, 
  formatFireCurrency,
  type FireInputs 
} from "@/lib/fire-calculations";
import { useAppStore } from "@/store/app-store";
import { useFireSettings, useUpsertFireSettings } from "@/hooks/use-fire-settings";
import { useHoldings, useDefaultPortfolio } from "@/hooks/use-portfolio";
import { useAccounts } from "@/hooks/use-accounts";
import { transformHoldings } from "@/lib/data-transformers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FireCalculator() {
  const { currency } = useAppStore();
  
  // Fetch persisted data
  const { data: fireSettings, isLoading: settingsLoading } = useFireSettings();
  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: dbHoldings = [] } = useHoldings(defaultPortfolio?.id);
  const { data: accounts = [] } = useAccounts();
  const upsertSettings = useUpsertFireSettings();
  
  // Calculate current savings from portfolio + accounts
  const currentSavingsFromData = useMemo(() => {
    const holdings = transformHoldings(dbHoldings);
    const portfolioValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const accountBalance = accounts.reduce((sum, acc) => {
      if (acc.currency === 'IDR') return sum + Number(acc.balance);
      return sum + Number(acc.balance) * 15800;
    }, 0);
    return portfolioValue + accountBalance;
  }, [dbHoldings, accounts]);
  
  // Manual FIRE number toggle
  const [useManualFireNumber, setUseManualFireNumber] = useState(false);
  
  // Input state - initialized from persisted settings or defaults
  const [inputs, setInputs] = useState<FireInputs>({
    currentAge: 30,
    targetRetirementAge: 45,
    currentSavings: currency === 'IDR' ? 500_000_000 : 50_000,
    monthlyExpenses: currency === 'IDR' ? 15_000_000 : 3_000,
    monthlyIncome: currency === 'IDR' ? 30_000_000 : 6_000,
    expectedAnnualReturn: 8,
    inflationRate: 3,
    safeWithdrawalRate: 4,
    customFireNumber: currency === 'IDR' ? 5_000_000_000 : 1_000_000,
  });
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Load persisted settings when available
  useEffect(() => {
    if (fireSettings) {
      setInputs(prev => ({
        ...prev,
        currentAge: fireSettings.current_age,
        targetRetirementAge: fireSettings.target_retirement_age,
        monthlyExpenses: Number(fireSettings.monthly_expenses),
        monthlyIncome: Number(fireSettings.monthly_income),
        expectedAnnualReturn: Number(fireSettings.expected_annual_return),
        inflationRate: Number(fireSettings.inflation_rate),
        safeWithdrawalRate: Number(fireSettings.safe_withdrawal_rate),
        customFireNumber: fireSettings.custom_fire_number ? Number(fireSettings.custom_fire_number) : undefined,
      }));
      setUseManualFireNumber(!!fireSettings.custom_fire_number);
    }
  }, [fireSettings]);
  
  // Update current savings from real data
  useEffect(() => {
    if (currentSavingsFromData > 0) {
      setInputs(prev => ({
        ...prev,
        currentSavings: currentSavingsFromData,
      }));
    }
  }, [currentSavingsFromData]);

  const updateInput = <K extends keyof FireInputs>(key: K, value: FireInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };
  
  const handleSaveSettings = async () => {
    try {
      await upsertSettings.mutateAsync({
        current_age: inputs.currentAge,
        target_retirement_age: inputs.targetRetirementAge,
        monthly_income: inputs.monthlyIncome,
        monthly_expenses: inputs.monthlyExpenses,
        expected_annual_return: inputs.expectedAnnualReturn,
        inflation_rate: inputs.inflationRate,
        safe_withdrawal_rate: inputs.safeWithdrawalRate,
        custom_fire_number: useManualFireNumber ? inputs.customFireNumber : null,
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  // Calculate FIRE metrics
  const results = useMemo(() => {
    try {
      const inputsToUse = useManualFireNumber 
        ? inputs 
        : { ...inputs, customFireNumber: undefined };
      return calculateFire(inputsToUse);
    } catch (error) {
      return null;
    }
  }, [inputs, useManualFireNumber]);

  const formatCurrency = (value: number) => formatFireCurrency(value, currency);

  // Scenario colors
  const scenarioColors = {
    pessimistic: 'text-loss',
    realistic: 'text-primary',
    optimistic: 'text-profit',
  };

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!results) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Please enter valid inputs</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
              <Flame className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FIRE Calculator</h1>
              <p className="text-muted-foreground">
                Calculate your path to Financial Independence, Retire Early
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSaveSettings} 
            disabled={upsertSettings.isPending || !hasUnsavedChanges}
            className="gap-2"
          >
            {upsertSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>

        {/* Key Results */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">FIRE Number</p>
                  <p className="text-2xl font-bold">{formatCurrency(results.fireNumber)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Years to FIRE</p>
                  <p className="text-2xl font-bold">{results.yearsToFire}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">FIRE Age</p>
                  <p className="text-2xl font-bold">{results.fireAge}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-profit-muted">
                  <Flame className="h-5 w-5 text-profit" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{results.currentProgress.toFixed(1)}%</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-3/10">
                  <TrendingUp className="h-5 w-5 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Parameters */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Parameters
                <UITooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Adjust these values to calculate your personalized FIRE timeline.</p>
                  </TooltipContent>
                </UITooltip>
              </CardTitle>
              <CardDescription>Adjust your FIRE calculation inputs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Age inputs using Select dropdowns */}
              <div className="space-y-2">
                <Label>Current Age</Label>
                <Select
                  value={inputs.currentAge.toString()}
                  onValueChange={(v) => updateInput('currentAge', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 48 }, (_, i) => i + 18).map((age) => (
                      <SelectItem key={age} value={age.toString()}>
                        {age} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Retirement Age</Label>
                <Select
                  value={inputs.targetRetirementAge.toString()}
                  onValueChange={(v) => updateInput('targetRetirementAge', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 80 - inputs.currentAge }, (_, i) => i + inputs.currentAge + 1).map((age) => (
                      <SelectItem key={age} value={age.toString()}>
                        {age} years
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Savings</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={inputs.currentSavings}
                    onChange={(e) => updateInput('currentSavings', Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monthly Income</Label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={inputs.monthlyIncome}
                    onChange={(e) => updateInput('monthlyIncome', Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monthly Expenses</Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={inputs.monthlyExpenses}
                    onChange={(e) => updateInput('monthlyExpenses', Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Rate inputs using Select dropdowns */}
              <div className="space-y-2">
                <Label>Expected Annual Return</Label>
                <Select
                  value={inputs.expectedAnnualReturn.toString()}
                  onValueChange={(v) => updateInput('expectedAnnualReturn', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 29 }, (_, i) => (i + 2) * 0.5).map((rate) => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Inflation Rate</Label>
                <Select
                  value={inputs.inflationRate.toString()}
                  onValueChange={(v) => updateInput('inflationRate', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 19 }, (_, i) => (i + 2) * 0.5).map((rate) => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Safe Withdrawal Rate (SWR)</Label>
                <Select
                  value={inputs.safeWithdrawalRate.toString()}
                  onValueChange={(v) => updateInput('safeWithdrawalRate', Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 17 }, (_, i) => 2 + i * 0.25).map((rate) => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manual FIRE Number Toggle */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label htmlFor="manual-fire" className="flex flex-col">
                    <span>Custom FIRE Number</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Override calculated target
                    </span>
                  </Label>
                  <Switch
                    id="manual-fire"
                    checked={useManualFireNumber}
                    onCheckedChange={setUseManualFireNumber}
                  />
                </div>
                
                {useManualFireNumber && (
                  <div className="space-y-2">
                    <Label>FIRE Number Target</Label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        value={inputs.customFireNumber || 0}
                        onChange={(e) => updateInput('customFireNumber', Number(e.target.value))}
                        className="pl-9"
                        placeholder="Enter your target FIRE number"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the amount you need to achieve financial independence
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Projection Chart & Scenarios */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Wealth Projection</CardTitle>
              <CardDescription>
                Your projected path to financial independence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="chart" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="chart">Projection</TabsTrigger>
                  <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>

                <TabsContent value="chart">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results.projectionData}>
                        <defs>
                          <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--profit))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--profit))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="age"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          label={{ value: "Age", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                                  <p className="text-sm text-muted-foreground">Age {data.age}</p>
                                  <p className={cn(
                                    "text-lg font-bold",
                                    data.isFireReached ? "text-profit" : "text-foreground"
                                  )}>
                                    {formatCurrency(data.savings)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Target: {formatCurrency(data.fireTarget)}
                                  </p>
                                  {data.isFireReached && (
                                    <Badge variant="secondary" className="mt-1 bg-profit/10 text-profit">
                                      FIRE Reached!
                                    </Badge>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          y={results.fireNumber}
                          stroke="hsl(var(--primary))"
                          strokeDasharray="5 5"
                          label={{
                            value: "FIRE Target",
                            position: "right",
                            fill: "hsl(var(--primary))",
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="savings"
                          stroke="hsl(var(--profit))"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorWealth)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="scenarios">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Compare different scenarios based on market conditions
                    </p>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Pessimistic */}
                      <Card className="border-loss/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ArrowDown className="h-4 w-4 text-loss" />
                            Pessimistic
                          </CardTitle>
                          <CardDescription className="text-xs">
                            -2% return, +1% inflation
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Years to FIRE</p>
                            <p className="text-xl font-bold text-loss">{results.scenarios.pessimistic.yearsToFire}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">FIRE Age</p>
                            <p className="font-medium">{results.scenarios.pessimistic.fireAge}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Saving Needed</p>
                            <p className="font-medium">{formatCurrency(results.scenarios.pessimistic.requiredMonthlySaving)}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Realistic */}
                      <Card className="border-primary/30 bg-primary/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Realistic
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Base assumptions
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Years to FIRE</p>
                            <p className="text-xl font-bold text-primary">{results.scenarios.realistic.yearsToFire}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">FIRE Age</p>
                            <p className="font-medium">{results.scenarios.realistic.fireAge}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Saving Needed</p>
                            <p className="font-medium">{formatCurrency(results.scenarios.realistic.requiredMonthlySaving)}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Optimistic */}
                      <Card className="border-profit/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ArrowUp className="h-4 w-4 text-profit" />
                            Optimistic
                          </CardTitle>
                          <CardDescription className="text-xs">
                            +2% return, -0.5% inflation
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Years to FIRE</p>
                            <p className="text-xl font-bold text-profit">{results.scenarios.optimistic.yearsToFire}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">FIRE Age</p>
                            <p className="font-medium">{results.scenarios.optimistic.fireAge}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Saving Needed</p>
                            <p className="font-medium">{formatCurrency(results.scenarios.optimistic.requiredMonthlySaving)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="recommendations">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Personalized recommendations to accelerate your FIRE journey
                    </p>
                    
                    <div className="space-y-3">
                      {/* Savings Rate Recommendation */}
                      {results.savingsRate < 50 && (
                        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Wallet className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Increase Your Savings Rate</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your current savings rate is {results.savingsRate.toFixed(1)}%. Aim for 50%+ to reach FIRE faster.
                              {results.savingsRate < 30 && " Consider cutting expenses or increasing income."}
                            </p>
                            <div className="mt-2">
                              <Badge variant="secondary">
                                +10% savings rate = ~{Math.round(results.yearsToFire * 0.15)} years faster
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expense Reduction */}
                      {inputs.monthlyExpenses > inputs.monthlyIncome * 0.5 && (
                        <div className="flex items-start gap-3 rounded-lg border border-chart-3/30 bg-chart-3/5 p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-3/10">
                            <ArrowDown className="h-4 w-4 text-chart-3" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Review Your Expenses</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your expenses are {((inputs.monthlyExpenses / inputs.monthlyIncome) * 100).toFixed(0)}% of income.
                              Reducing by {formatCurrency(inputs.monthlyExpenses * 0.1)}/month could save you {Math.round(results.yearsToFire * 0.12)} years.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Investment Returns */}
                      {inputs.expectedAnnualReturn < 8 && (
                        <div className="flex items-start gap-3 rounded-lg border border-profit/30 bg-profit/5 p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-profit/10">
                            <TrendingUp className="h-4 w-4 text-profit" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Optimize Investment Returns</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your expected return is {inputs.expectedAnnualReturn}%. Consider low-cost index funds that historically return 7-10% annually.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Side Income */}
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Consider Additional Income</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            An extra {formatCurrency(inputs.monthlyIncome * 0.2)}/month from side income could cut your FIRE timeline by ~{Math.round(results.yearsToFire * 0.18)} years.
                          </p>
                        </div>
                      </div>

                      {/* Good Progress */}
                      {results.currentProgress >= 25 && (
                        <div className="flex items-start gap-3 rounded-lg border border-profit/30 bg-profit/5 p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-profit/10">
                            <Target className="h-4 w-4 text-profit" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Great Progress!</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              You're {results.currentProgress.toFixed(1)}% of the way to your FIRE goal. Keep up the consistent saving and investing!
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Progress & Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Your FIRE Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Current: {formatCurrency(inputs.currentSavings)}</span>
              <span>Target: {formatCurrency(results.fireNumber)}</span>
            </div>
            <Progress value={results.currentProgress} className="h-3" />
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Monthly Passive Income</p>
                <p className="text-xl font-bold">{formatCurrency(results.monthlyPassiveIncome)}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Required Monthly Saving</p>
                <p className="text-xl font-bold">{formatCurrency(results.requiredMonthlySaving)}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Savings Rate</p>
                <p className="text-xl font-bold">{results.savingsRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Current Monthly Savings</p>
                <p className="text-xl font-bold">{formatCurrency(inputs.monthlyIncome - inputs.monthlyExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
