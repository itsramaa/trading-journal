import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Home, 
  Car, 
  Utensils, 
  Zap, 
  Wifi, 
  ShoppingBag,
  Heart,
  GraduationCap,
  Plane,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  PieChart,
  Building2
} from "lucide-react";
import { useState } from "react";
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
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/formatters";

const categoryIcons: Record<string, any> = {
  housing: Home,
  transportation: Car,
  food: Utensils,
  utilities: Zap,
  internet: Wifi,
  shopping: ShoppingBag,
  health: Heart,
  education: GraduationCap,
  travel: Plane,
  other: MoreHorizontal,
};

// Demo budget data
const demoBudgets = [
  { id: "1", category: "housing", name: "Housing & Rent", budgeted: 5000000, spent: 5000000, color: "bg-blue-500" },
  { id: "2", category: "food", name: "Food & Dining", budgeted: 3000000, spent: 2750000, color: "bg-green-500" },
  { id: "3", category: "transportation", name: "Transportation", budgeted: 1500000, spent: 1200000, color: "bg-yellow-500" },
  { id: "4", category: "utilities", name: "Utilities", budgeted: 800000, spent: 750000, color: "bg-orange-500" },
  { id: "5", category: "shopping", name: "Shopping", budgeted: 2000000, spent: 2500000, color: "bg-pink-500" },
  { id: "6", category: "health", name: "Health & Fitness", budgeted: 500000, spent: 300000, color: "bg-red-500" },
  { id: "7", category: "education", name: "Education", budgeted: 1000000, spent: 500000, color: "bg-purple-500" },
  { id: "8", category: "other", name: "Other", budgeted: 1200000, spent: 800000, color: "bg-gray-500" },
];

const demoSummary = {
  totalIncome: 25000000,
  totalBudgeted: 15000000,
  totalSpent: 13800000,
  savingsTarget: 10000000,
  actualSavings: 11200000,
};

export default function Budget() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const { data: accounts, isLoading: accountsLoading } = useAccounts();

  const formatCurrencyLocal = (value: number) => {
    return `Rp${(value / 1000000).toFixed(1)}jt`;
  };

  const budgetRemaining = demoSummary.totalBudgeted - demoSummary.totalSpent;
  const savingsRate = ((demoSummary.actualSavings / demoSummary.totalIncome) * 100).toFixed(1);

  // Calculate total from linked accounts
  const totalAccountBalance = accounts?.reduce((sum, acc) => {
    if (acc.currency === 'IDR') return sum + Number(acc.balance);
    return sum;
  }, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Management</h1>
            <p className="text-muted-foreground">Track your monthly spending against your budget</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Category</DialogTitle>
                <DialogDescription>
                  Create a new budget category to track your spending.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Category Name</Label>
                  <Input id="name" placeholder="e.g., Entertainment" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budget">Monthly Budget</Label>
                  <Input id="budget" type="number" placeholder="1000000" />
                </div>
                {/* Account Selection */}
                <div className="grid gap-2">
                  <Label>Link to Account (Optional)</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={accountsLoading ? "Loading..." : "Select account"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No account linked</SelectItem>
                      {accounts?.filter(a => a.is_active).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatCurrency(Number(account.balance), account.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Expenses will be tracked from this account
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Add Category</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Account Summary */}
        {accounts && accounts.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Linked Accounts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {accounts.filter(a => a.is_active).slice(0, 4).map((account) => (
                  <div key={account.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                    <span className="text-sm font-medium">{account.name}</span>
                    <Badge variant="secondary">
                      {formatCurrency(Number(account.balance), account.currency)}
                    </Badge>
                  </div>
                ))}
                {accounts.length > 4 && (
                  <Badge variant="outline">+{accounts.length - 4} more</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyLocal(demoSummary.totalIncome)}</div>
              <p className="text-xs text-muted-foreground">After tax income</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyLocal(demoSummary.totalBudgeted)}</div>
              <p className="text-xs text-muted-foreground">
                {((demoSummary.totalBudgeted / demoSummary.totalIncome) * 100).toFixed(0)}% of income
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyLocal(demoSummary.totalSpent)}</div>
              <p className={`text-xs ${budgetRemaining >= 0 ? "text-green-500" : "text-red-500"}`}>
                {budgetRemaining >= 0 ? `${formatCurrencyLocal(budgetRemaining)} under budget` : `${formatCurrencyLocal(Math.abs(budgetRemaining))} over budget`}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">{savingsRate}%</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrencyLocal(demoSummary.actualSavings)}</div>
              <p className="text-xs text-muted-foreground">Target: 50-80%</p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Categories</CardTitle>
            <CardDescription>Track spending by category for this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {demoBudgets.map((budget) => {
                const Icon = categoryIcons[budget.category] || MoreHorizontal;
                const percentage = (budget.spent / budget.budgeted) * 100;
                const isOverBudget = budget.spent > budget.budgeted;
                const remaining = budget.budgeted - budget.spent;

                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${budget.color}/10`}>
                          <Icon className={`h-4 w-4 ${budget.color.replace("bg-", "text-")}`} />
                        </div>
                        <div>
                          <p className="font-medium">{budget.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrencyLocal(budget.spent)} of {formatCurrencyLocal(budget.budgeted)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${isOverBudget ? "text-red-500" : "text-green-500"}`}>
                          {isOverBudget ? `-${formatCurrencyLocal(Math.abs(remaining))}` : `+${formatCurrencyLocal(remaining)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {percentage.toFixed(0)}% used
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : ""}`}
                    />
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
