import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  CreditCard, 
  Home, 
  Car, 
  GraduationCap,
  TrendingDown,
  Calendar,
  Target,
  Flame,
  Snowflake,
  ArrowRight
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const debtIcons: Record<string, any> = {
  credit_card: CreditCard,
  mortgage: Home,
  car_loan: Car,
  student_loan: GraduationCap,
  other: CreditCard,
};

// Demo debt data
const demoDebts = [
  { 
    id: "1", 
    type: "credit_card", 
    name: "Credit Card A", 
    balance: 15000000, 
    originalBalance: 25000000,
    interestRate: 24,
    minimumPayment: 500000,
    monthlyPayment: 1500000,
    dueDate: 15,
  },
  { 
    id: "2", 
    type: "car_loan", 
    name: "Car Loan", 
    balance: 85000000, 
    originalBalance: 150000000,
    interestRate: 8.5,
    minimumPayment: 3500000,
    monthlyPayment: 4000000,
    dueDate: 25,
  },
  { 
    id: "3", 
    type: "credit_card", 
    name: "Credit Card B", 
    balance: 8000000, 
    originalBalance: 10000000,
    interestRate: 18,
    minimumPayment: 200000,
    monthlyPayment: 800000,
    dueDate: 20,
  },
];

export default function DebtPayoff() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `Rp${(value / 1000000).toFixed(1)}jt`;
    }
    return `Rp${value.toLocaleString()}`;
  };

  const totalDebt = useMemo(() => demoDebts.reduce((sum, d) => sum + d.balance, 0), []);
  const totalOriginal = useMemo(() => demoDebts.reduce((sum, d) => sum + d.originalBalance, 0), []);
  const totalPaid = totalOriginal - totalDebt;
  const overallProgress = (totalPaid / totalOriginal) * 100;

  // Sort debts based on strategy
  const sortedDebts = useMemo(() => {
    return [...demoDebts].sort((a, b) => {
      if (strategy === "avalanche") {
        return b.interestRate - a.interestRate; // Highest interest first
      } else {
        return a.balance - b.balance; // Lowest balance first
      }
    });
  }, [strategy]);

  // Calculate payoff projection
  const projectedPayoffMonths = useMemo(() => {
    const totalMonthlyPayment = demoDebts.reduce((sum, d) => sum + d.monthlyPayment, 0);
    // Simplified calculation - in reality would need to account for interest
    return Math.ceil(totalDebt / totalMonthlyPayment);
  }, [totalDebt]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Debt Payoff Tracker</h1>
            <p className="text-muted-foreground">Manage and track your debt repayment journey</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Debt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Debt</DialogTitle>
                <DialogDescription>
                  Add a new debt to track your repayment progress.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Debt Name</Label>
                  <Input id="name" placeholder="e.g., Credit Card A" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="car_loan">Car Loan</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="student_loan">Student Loan</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="balance">Current Balance</Label>
                    <Input id="balance" type="number" placeholder="15000000" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="interest">Interest Rate (%)</Label>
                    <Input id="interest" type="number" placeholder="18" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment">Monthly Payment</Label>
                  <Input id="payment" type="number" placeholder="1500000" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Add Debt</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-red-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{formatCurrency(totalDebt)}</div>
              <p className="text-xs text-muted-foreground">Across {demoDebts.length} accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid Off</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">{overallProgress.toFixed(1)}% complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Est. Payoff</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectedPayoffMonths} months</div>
              <p className="text-xs text-muted-foreground">At current payment rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Interest Rate</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(demoDebts.reduce((sum, d) => sum + d.interestRate, 0) / demoDebts.length).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Weighted average</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>Your journey to becoming debt-free</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Paid: {formatCurrency(totalPaid)}</span>
                <span>Remaining: {formatCurrency(totalDebt)}</span>
              </div>
              <Progress value={overallProgress} className="h-4" />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {overallProgress.toFixed(1)}% of total debt paid off
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Selector */}
        <Tabs value={strategy} onValueChange={(v) => setStrategy(v as "avalanche" | "snowball")}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="avalanche" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Avalanche
            </TabsTrigger>
            <TabsTrigger value="snowball" className="flex items-center gap-2">
              <Snowflake className="h-4 w-4" />
              Snowball
            </TabsTrigger>
          </TabsList>
          <TabsContent value="avalanche" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Debt Avalanche Method
                </CardTitle>
                <CardDescription>
                  Pay off debts with the highest interest rate first. This saves you the most money in interest over time.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          <TabsContent value="snowball" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Snowflake className="h-5 w-5 text-blue-500" />
                  Debt Snowball Method
                </CardTitle>
                <CardDescription>
                  Pay off debts with the smallest balance first. This provides quick wins and psychological motivation.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Debt List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Debts</CardTitle>
            <CardDescription>
              Ordered by {strategy === "avalanche" ? "highest interest rate" : "lowest balance"} first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sortedDebts.map((debt, index) => {
                const Icon = debtIcons[debt.type] || CreditCard;
                const progress = ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100;
                const isPriority = index === 0;

                return (
                  <div key={debt.id} className={`p-4 rounded-lg border ${isPriority ? "border-primary bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isPriority ? "bg-primary/10" : "bg-muted"}`}>
                          <Icon className={`h-5 w-5 ${isPriority ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{debt.name}</p>
                            {isPriority && (
                              <Badge variant="default" className="text-xs">
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Pay First
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {debt.interestRate}% APR • Due on {debt.dueDate}th
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-500">{formatCurrency(debt.balance)}</p>
                        <p className="text-sm text-muted-foreground">
                          of {formatCurrency(debt.originalBalance)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{progress.toFixed(1)}% paid off</span>
                        <span>Monthly: {formatCurrency(debt.monthlyPayment)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
