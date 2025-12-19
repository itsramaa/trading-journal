import { useState, useMemo } from "react";
import { Flame, TrendingUp, Calendar, DollarSign, Target, Wallet } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

const FireCalculator = () => {
  const [currentAge, setCurrentAge] = useState(30);
  const [currentSavings, setCurrentSavings] = useState(100000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(5000);
  const [monthlySavings, setMonthlySavings] = useState(3000);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [inflationRate, setInflationRate] = useState(3);

  const calculations = useMemo(() => {
    const annualExpenses = monthlyExpenses * 12;
    const fireNumber = annualExpenses / (withdrawalRate / 100);
    const realReturn = (expectedReturn - inflationRate) / 100;
    const annualSavings = monthlySavings * 12;

    // Calculate years to FIRE
    let years = 0;
    let currentValue = currentSavings;
    const projectionData = [];

    while (currentValue < fireNumber && years < 50) {
      projectionData.push({
        age: currentAge + years,
        value: Math.round(currentValue),
        fireTarget: Math.round(fireNumber),
      });
      currentValue = currentValue * (1 + realReturn) + annualSavings;
      years++;
    }

    // Add final point
    projectionData.push({
      age: currentAge + years,
      value: Math.round(currentValue),
      fireTarget: Math.round(fireNumber),
    });

    const fireAge = currentAge + years;
    const progress = (currentSavings / fireNumber) * 100;

    return {
      fireNumber,
      yearsToFire: years,
      fireAge,
      progress: Math.min(progress, 100),
      projectionData,
      annualExpenses,
    };
  }, [currentAge, currentSavings, monthlyExpenses, monthlySavings, expectedReturn, withdrawalRate, inflationRate]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

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
              Calculate your path to Financial Independence, Retire Early.
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
                  <p className="text-2xl font-bold">{formatCurrency(calculations.fireNumber)}</p>
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
                  <p className="text-2xl font-bold">{calculations.yearsToFire}</p>
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
                  <p className="text-2xl font-bold">{calculations.fireAge}</p>
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
                  <p className="text-2xl font-bold">{calculations.progress.toFixed(1)}%</p>
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
              <CardTitle>Parameters</CardTitle>
              <CardDescription>Adjust your FIRE calculation inputs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Current Age: {currentAge}</Label>
                <Slider
                  value={[currentAge]}
                  onValueChange={([v]) => setCurrentAge(v)}
                  min={18}
                  max={65}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Savings</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={currentSavings}
                    onChange={(e) => setCurrentSavings(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monthly Expenses</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Monthly Savings</Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    value={monthlySavings}
                    onChange={(e) => setMonthlySavings(Number(e.target.value))}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expected Return: {expectedReturn}%</Label>
                <Slider
                  value={[expectedReturn]}
                  onValueChange={([v]) => setExpectedReturn(v)}
                  min={1}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <Label>Withdrawal Rate: {withdrawalRate}%</Label>
                <Slider
                  value={[withdrawalRate]}
                  onValueChange={([v]) => setWithdrawalRate(v)}
                  min={2}
                  max={6}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <Label>Inflation Rate: {inflationRate}%</Label>
                <Slider
                  value={[inflationRate]}
                  onValueChange={([v]) => setInflationRate(v)}
                  min={1}
                  max={8}
                  step={0.5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Projection Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Wealth Projection</CardTitle>
              <CardDescription>
                Your projected path to financial independence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculations.projectionData}>
                    <defs>
                      <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
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
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                              <p className="text-sm text-muted-foreground">
                                Age {payload[0].payload.age}
                              </p>
                              <p className="text-lg font-bold text-profit">
                                {formatCurrency(payload[0].value as number)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Target: {formatCurrency(payload[0].payload.fireTarget)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={calculations.fireNumber}
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
                      dataKey="value"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorWealth)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Section */}
        <Card>
          <CardHeader>
            <CardTitle>Your FIRE Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Current: {formatCurrency(currentSavings)}</span>
              <span>Target: {formatCurrency(calculations.fireNumber)}</span>
            </div>
            <Progress value={calculations.progress} className="h-3" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Annual Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(calculations.annualExpenses)}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Annual Savings</p>
                <p className="text-xl font-bold">{formatCurrency(monthlySavings * 12)}</p>
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Savings Rate</p>
                <p className="text-xl font-bold">
                  {((monthlySavings / (monthlyExpenses + monthlySavings)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FireCalculator;
