import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Target, 
  Home, 
  Car, 
  Plane, 
  GraduationCap,
  Wallet,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const goalIcons: Record<string, any> = {
  house: Home,
  car: Car,
  travel: Plane,
  education: GraduationCap,
  investment: TrendingUp,
  other: Target,
};

// Demo goals data
const demoGoals = [
  {
    id: "1",
    name: "Down Payment for House",
    icon: "house",
    targetAmount: 500000000,
    currentAmount: 175000000,
    deadline: "2026-12-31",
    monthlyContribution: 8000000,
    priority: "high",
    color: "blue",
  },
  {
    id: "2",
    name: "New Car",
    icon: "car",
    targetAmount: 300000000,
    currentAmount: 90000000,
    deadline: "2025-06-30",
    monthlyContribution: 10000000,
    priority: "medium",
    color: "green",
  },
  {
    id: "3",
    name: "Japan Trip",
    icon: "travel",
    targetAmount: 50000000,
    currentAmount: 35000000,
    deadline: "2024-12-01",
    monthlyContribution: 3000000,
    priority: "low",
    color: "purple",
  },
  {
    id: "4",
    name: "Investment Fund",
    icon: "investment",
    targetAmount: 1000000000,
    currentAmount: 250000000,
    deadline: "2030-01-01",
    monthlyContribution: 10000000,
    priority: "high",
    color: "orange",
  },
];

export default function Goals() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `Rp${(value / 1000000000).toFixed(1)}M`;
    }
    if (value >= 1000000) {
      return `Rp${(value / 1000000).toFixed(0)}jt`;
    }
    return `Rp${value.toLocaleString()}`;
  };

  const calculateMonthsRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const months = (deadlineDate.getFullYear() - today.getFullYear()) * 12 + 
                   (deadlineDate.getMonth() - today.getMonth());
    return Math.max(0, months);
  };

  const totalSaved = demoGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = demoGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalMonthlyContribution = demoGoals.reduce((sum, g) => sum + g.monthlyContribution, 0);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High Priority</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
            <p className="text-muted-foreground">Track and manage your savings goals</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <DialogDescription>
                  Set up a new financial goal to track your progress.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Goal Name</Label>
                  <Input id="name" placeholder="e.g., Down Payment for House" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select icon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="target">Target Amount</Label>
                    <Input id="target" type="number" placeholder="500000000" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="current">Current Amount</Label>
                    <Input id="current" type="number" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deadline">Target Date</Label>
                    <Input id="deadline" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="monthly">Monthly Contribution</Label>
                    <Input id="monthly" type="number" placeholder="5000000" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>Create Goal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{demoGoals.length}</div>
              <p className="text-xs text-muted-foreground">Active goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(totalSaved)}</div>
              <p className="text-xs text-muted-foreground">
                {((totalSaved / totalTarget) * 100).toFixed(1)}% of target
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Target</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalTarget)}</div>
              <p className="text-xs text-muted-foreground">Across all goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthlyContribution)}</div>
              <p className="text-xs text-muted-foreground">Total contributions</p>
            </CardContent>
          </Card>
        </div>

        {/* Goals Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {demoGoals.map((goal) => {
            const Icon = goalIcons[goal.icon] || Target;
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const monthsRemaining = calculateMonthsRemaining(goal.deadline);
            const remaining = goal.targetAmount - goal.currentAmount;
            const onTrack = monthsRemaining > 0 && 
                           (remaining / monthsRemaining) <= goal.monthlyContribution;

            return (
              <Card key={goal.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${goal.color}-500/10`}>
                        <Icon className={`h-5 w-5 text-${goal.color}-500`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <CardDescription>
                          Target: {new Date(goal.deadline).toLocaleDateString("id-ID", {
                            month: "long",
                            year: "numeric"
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(goal.priority)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Funds
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{formatCurrency(goal.currentAmount)}</span>
                      <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {progress.toFixed(1)}% complete
                      </span>
                      <span className={`text-xs ${onTrack ? "text-green-500" : "text-red-500"}`}>
                        {onTrack ? "On track" : "Behind schedule"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <div>
                      <p className="text-muted-foreground">Monthly</p>
                      <p className="font-medium">{formatCurrency(goal.monthlyContribution)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-medium">{formatCurrency(remaining)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Time Left</p>
                      <p className="font-medium">{monthsRemaining} months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
