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
  Trash2,
  Loader2
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
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useAddFundsToGoal, FinancialGoal, CreateGoalInput } from "@/hooks/use-goals";
import { useAccounts } from "@/hooks/use-accounts";
import { Building2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const goalIcons: Record<string, any> = {
  house: Home,
  car: Car,
  travel: Plane,
  education: GraduationCap,
  investment: TrendingUp,
  other: Target,
};

const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100),
  icon: z.string().min(1, "Icon is required"),
  priority: z.string().min(1, "Priority is required"),
  target_amount: z.coerce.number().min(1, "Target amount must be greater than 0"),
  current_amount: z.coerce.number().min(0, "Current amount cannot be negative"),
  deadline: z.string().min(1, "Deadline is required"),
  monthly_contribution: z.coerce.number().min(0, "Monthly contribution cannot be negative"),
  color: z.string().optional(),
  notes: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

const addFundsSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
});

export default function Goals() {
  const { data: goals = [], isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const addFunds = useAddFundsToGoal();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<FinancialGoal | null>(null);
  const [addFundsGoal, setAddFundsGoal] = useState<FinancialGoal | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [addFundsAccountId, setAddFundsAccountId] = useState<string>("");
  
  const { data: accounts } = useAccounts();

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: "",
      icon: "other",
      priority: "medium",
      target_amount: 0,
      current_amount: 0,
      deadline: "",
      monthly_contribution: 0,
      color: "blue",
      notes: "",
    },
  });

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

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalMonthlyContribution = goals.reduce((sum, g) => sum + Number(g.monthly_contribution), 0);

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

  const handleOpenAddDialog = () => {
    form.reset({
      name: "",
      icon: "other",
      priority: "medium",
      target_amount: 0,
      current_amount: 0,
      deadline: "",
      monthly_contribution: 0,
      color: "blue",
      notes: "",
    });
    setEditingGoal(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (goal: FinancialGoal) => {
    form.reset({
      name: goal.name,
      icon: goal.icon,
      priority: goal.priority,
      target_amount: Number(goal.target_amount),
      current_amount: Number(goal.current_amount),
      deadline: goal.deadline,
      monthly_contribution: Number(goal.monthly_contribution),
      color: goal.color || "blue",
      notes: goal.notes || "",
    });
    setEditingGoal(goal);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (values: GoalFormValues) => {
    if (editingGoal) {
      await updateGoal.mutateAsync({
        id: editingGoal.id,
        ...values,
      });
    } else {
      await createGoal.mutateAsync(values as CreateGoalInput);
    }
    setIsAddDialogOpen(false);
    setEditingGoal(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (deletingGoal) {
      await deleteGoal.mutateAsync(deletingGoal.id);
      setDeletingGoal(null);
    }
  };

  const handleAddFunds = async () => {
    if (addFundsGoal && addFundsAmount) {
      await addFunds.mutateAsync({
        id: addFundsGoal.id,
        amount: Number(addFundsAmount),
        accountId: addFundsAccountId || undefined,
      });
      setAddFundsGoal(null);
      setAddFundsAmount("");
      setAddFundsAccountId("");
    }
  };
  
  const selectedFundAccount = accounts?.find(a => a.id === addFundsAccountId);

  if (isLoading) {
    return (
      <DashboardLayout>
        <MetricsGridSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
            <p className="text-muted-foreground">Track and manage your savings goals</p>
          </div>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Goal
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goals.length}</div>
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
                {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}% of target
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
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No financial goals yet"
            description="Start tracking your savings by adding your first financial goal."
            action={{
              label: "Add Goal",
              onClick: handleOpenAddDialog,
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => {
              const Icon = goalIcons[goal.icon] || Target;
              const progress = Number(goal.target_amount) > 0 
                ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 
                : 0;
              const monthsRemaining = calculateMonthsRemaining(goal.deadline);
              const remaining = Number(goal.target_amount) - Number(goal.current_amount);
              const onTrack = monthsRemaining > 0 && 
                             (remaining / monthsRemaining) <= Number(goal.monthly_contribution);

              return (
                <Card key={goal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
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
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(goal)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAddFundsGoal(goal)}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Funds
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeletingGoal(goal)}
                            >
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
                        <span className="font-medium">{formatCurrency(Number(goal.current_amount))}</span>
                        <span className="text-muted-foreground">{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {progress.toFixed(1)}% complete
                        </span>
                        <span className={`text-xs ${onTrack ? "text-green-500" : "text-destructive"}`}>
                          {onTrack ? "On track" : "Behind schedule"}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <div>
                        <p className="text-muted-foreground">Monthly</p>
                        <p className="font-medium">{formatCurrency(Number(goal.monthly_contribution))}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Remaining</p>
                        <p className="font-medium">{formatCurrency(Math.max(0, remaining))}</p>
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
        )}

        {/* Add/Edit Goal Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
              <DialogDescription>
                {editingGoal ? "Update your financial goal details." : "Set up a new financial goal to track your progress."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Down Payment for House" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select icon" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="car">Car</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="education">Education</SelectItem>
                            <SelectItem value="investment">Investment</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="target_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="current_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthly_contribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Contribution</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createGoal.isPending || updateGoal.isPending}>
                    {(createGoal.isPending || updateGoal.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingGoal ? "Save Changes" : "Create Goal"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Add Funds Dialog */}
        <Dialog open={!!addFundsGoal} onOpenChange={() => setAddFundsGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Funds to {addFundsGoal?.name}</DialogTitle>
              <DialogDescription>
                Current: {formatCurrency(Number(addFundsGoal?.current_amount || 0))} / 
                Target: {formatCurrency(Number(addFundsGoal?.target_amount || 0))}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fund-account">Source Account (Optional)</Label>
                <Select value={addFundsAccountId} onValueChange={setAddFundsAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No account linked</SelectItem>
                    {accounts?.filter(a => a.is_active).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{account.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatCurrency(Number(account.balance))}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount to Add</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                />
              </div>
              {selectedFundAccount && (
                <p className={`text-sm ${Number(selectedFundAccount.balance) >= Number(addFundsAmount) ? "text-green-500" : "text-destructive"}`}>
                  Account balance: {formatCurrency(Number(selectedFundAccount.balance))}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddFundsGoal(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddFunds} 
                disabled={!addFundsAmount || addFunds.isPending}
              >
                {addFunds.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Funds
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingGoal}
          onOpenChange={() => setDeletingGoal(null)}
          title="Delete Goal"
          description={`Are you sure you want to delete "${deletingGoal?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
}
