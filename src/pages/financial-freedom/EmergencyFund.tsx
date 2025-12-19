import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  Plus,
  Target,
  TrendingUp,
  Calendar,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight
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

// Demo emergency fund data
const demoData = {
  currentBalance: 45000000, // 45 juta
  monthlyExpenses: 15000000, // 15 juta
  monthlyContribution: 3000000, // 3 juta
  targetMonths: 6,
  accounts: [
    { id: "1", name: "High-Yield Savings", balance: 30000000, interestRate: 4.5 },
    { id: "2", name: "Money Market", balance: 10000000, interestRate: 5.0 },
    { id: "3", name: "Emergency Cash", balance: 5000000, interestRate: 0 },
  ],
  recentTransactions: [
    { id: "1", date: "2024-01-15", type: "deposit", amount: 3000000, description: "Monthly contribution" },
    { id: "2", date: "2024-01-10", type: "interest", amount: 125000, description: "Interest earned" },
    { id: "3", date: "2023-12-15", type: "deposit", amount: 3000000, description: "Monthly contribution" },
    { id: "4", date: "2023-12-05", type: "withdrawal", amount: 2000000, description: "Car repair" },
  ],
};

export default function EmergencyFund() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `Rp${(value / 1000000).toFixed(1)}jt`;
    }
    return `Rp${value.toLocaleString()}`;
  };

  const targetAmount = demoData.monthlyExpenses * demoData.targetMonths;
  const currentMonths = demoData.currentBalance / demoData.monthlyExpenses;
  const progress = (demoData.currentBalance / targetAmount) * 100;
  const monthsToGoal = (targetAmount - demoData.currentBalance) / demoData.monthlyContribution;

  const status = useMemo(() => {
    if (currentMonths >= 12) return { level: "excellent", color: "green", label: "Excellent" };
    if (currentMonths >= 6) return { level: "good", color: "blue", label: "Good" };
    if (currentMonths >= 3) return { level: "building", color: "yellow", label: "Building" };
    return { level: "critical", color: "red", label: "Critical" };
  }, [currentMonths]);

  const milestones = [
    { months: 1, label: "1 Month", reached: currentMonths >= 1 },
    { months: 3, label: "3 Months", reached: currentMonths >= 3 },
    { months: 6, label: "6 Months", reached: currentMonths >= 6 },
    { months: 12, label: "12 Months", reached: currentMonths >= 12 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Emergency Fund</h1>
            <p className="text-muted-foreground">Build your financial safety net</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Contribution
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contribution</DialogTitle>
                <DialogDescription>
                  Add money to your emergency fund.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" placeholder="1000000" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account">Account</Label>
                  <select id="account" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {demoData.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Input id="note" placeholder="Monthly contribution" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Add Contribution</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Status Card */}
        <Card className={`border-${status.color}-500/50 border-2`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg bg-${status.color}-500/10`}>
                  <Shield className={`h-6 w-6 text-${status.color}-500`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">{formatCurrency(demoData.currentBalance)}</CardTitle>
                  <CardDescription>
                    {currentMonths.toFixed(1)} months of expenses covered
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={`text-${status.color}-500 border-${status.color}-500`}
              >
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to {demoData.targetMonths} months</span>
                <span className="font-medium">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-3" />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Current: {formatCurrency(demoData.currentBalance)}</span>
              <span>Target: {formatCurrency(targetAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(demoData.monthlyExpenses)}</div>
              <p className="text-xs text-muted-foreground">Average monthly spend</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Contribution</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(demoData.monthlyContribution)}</div>
              <p className="text-xs text-muted-foreground">Auto-save enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Months Covered</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonths.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Target: 6-12 months</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time to Goal</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthsToGoal > 0 ? `${Math.ceil(monthsToGoal)} months` : "Goal reached!"}
              </div>
              <p className="text-xs text-muted-foreground">At current rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>Track your emergency fund milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              {milestones.map((milestone, index) => (
                <div key={milestone.months} className="flex-1">
                  <div className={`flex items-center justify-center h-12 w-12 mx-auto rounded-full mb-2 ${
                    milestone.reached ? "bg-green-500/10" : "bg-muted"
                  }`}>
                    {milestone.reached ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Target className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className={`text-center text-sm font-medium ${
                    milestone.reached ? "text-green-500" : "text-muted-foreground"
                  }`}>
                    {milestone.label}
                  </p>
                  <p className="text-center text-xs text-muted-foreground">
                    {formatCurrency(demoData.monthlyExpenses * milestone.months)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accounts & Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Where your emergency fund is stored</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoData.accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.interestRate > 0 ? `${account.interestRate}% APY` : "No interest"}
                      </p>
                    </div>
                    <p className="font-bold">{formatCurrency(account.balance)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demoData.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === "deposit" ? "bg-green-500/10" : 
                        tx.type === "interest" ? "bg-blue-500/10" : "bg-red-500/10"
                      }`}>
                        {tx.type === "deposit" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : tx.type === "interest" ? (
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      tx.type === "withdrawal" ? "text-red-500" : "text-green-500"
                    }`}>
                      {tx.type === "withdrawal" ? "-" : "+"}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
