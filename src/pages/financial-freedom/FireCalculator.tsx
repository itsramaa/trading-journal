import { useState, useMemo } from "react";
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
  HelpCircle
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
import { cn } from "@/lib/utils";

export default function FireCalculator() {
  const { currency } = useAppStore();
  
  // Input state
  const [inputs, setInputs] = useState<FireInputs>({
    currentAge: 30,
    targetRetirementAge: 45,
    currentSavings: currency === 'IDR' ? 500_000_000 : 50_000,
    monthlyExpenses: currency === 'IDR' ? 15_000_000 : 3_000,
    monthlyIncome: currency === 'IDR' ? 30_000_000 : 6_000,
    expectedAnnualReturn: 8,
    inflationRate: 3,
    safeWithdrawalRate: 4,
  });

  const updateInput = <K extends keyof FireInputs>(key: K, value: FireInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // Calculate FIRE metrics
  const results = useMemo(() => {
    try {
      return calculateFire(inputs);
    } catch (error) {
      return null;
    }
  }, [inputs]);

  const formatCurrency = (value: number) => formatFireCurrency(value, currency);

  // Scenario colors
  const scenarioColors = {
    pessimistic: 'text-loss',
    realistic: 'text-primary',
    optimistic: 'text-profit',
  };

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
              <div className="space-y-2">
                <Label>Current Age: {inputs.currentAge}</Label>
                <Slider
                  value={[inputs.currentAge]}
                  onValueChange={([v]) => updateInput('currentAge', v)}
                  min={18}
                  max={65}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Target Retirement Age: {inputs.targetRetirementAge}</Label>
                <Slider
                  value={[inputs.targetRetirementAge]}
                  onValueChange={([v]) => updateInput('targetRetirementAge', v)}
                  min={inputs.currentAge + 1}
                  max={80}
                  step={1}
                />
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

              <div className="space-y-2">
                <Label>Expected Return: {inputs.expectedAnnualReturn}%</Label>
                <Slider
                  value={[inputs.expectedAnnualReturn]}
                  onValueChange={([v]) => updateInput('expectedAnnualReturn', v)}
                  min={1}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <Label>Inflation Rate: {inputs.inflationRate}%</Label>
                <Slider
                  value={[inputs.inflationRate]}
                  onValueChange={([v]) => updateInput('inflationRate', v)}
                  min={1}
                  max={10}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <Label>Safe Withdrawal Rate: {inputs.safeWithdrawalRate}%</Label>
                <Slider
                  value={[inputs.safeWithdrawalRate]}
                  onValueChange={([v]) => updateInput('safeWithdrawalRate', v)}
                  min={2}
                  max={6}
                  step={0.25}
                />
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
