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
  Building2,
  Edit,
  Trash2,
  Loader2,
  Receipt
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccounts } from "@/hooks/use-accounts";
import { useAuth } from "@/hooks/use-auth";
import { 
  useBudgetCategories, 
  useCreateBudgetCategory, 
  useUpdateBudgetCategory,
  useDeleteBudgetCategory,
  useAddBudgetTransaction,
  type BudgetCategory
} from "@/hooks/use-budget";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { formatCurrency } from "@/lib/formatters";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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

const categoryColors: Record<string, string> = {
  housing: "bg-chart-1",
  food: "bg-profit",
  transportation: "bg-chart-4",
  utilities: "bg-chart-3",
  shopping: "bg-chart-5",
  health: "bg-destructive",
  education: "bg-primary",
  travel: "bg-chart-2",
  internet: "bg-muted-foreground",
  other: "bg-muted-foreground",
};

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  icon: z.string().min(1, "Icon is required"),
  budgeted_amount: z.coerce.number().min(0, "Budget must be positive"),
  account_id: z.string().optional(),
});

const expenseSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().max(200).optional(),
  account_id: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function Budget() {
  const { user } = useAuth();
  const { data: categories, isLoading } = useBudgetCategories();
  const { data: accounts } = useAccounts();
  const createCategory = useCreateBudgetCategory();
  const updateCategory = useUpdateBudgetCategory();
  const deleteCategory = useDeleteBudgetCategory();
  const addExpense = useAddBudgetTransaction();

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      icon: "other",
      budgeted_amount: 0,
    },
  });

  const editCategoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category_id: "",
      amount: 0,
      description: "",
    },
  });

  const formatCurrencyLocal = (value: number) => {
    return `Rp${(value / 1000000).toFixed(1)}jt`;
  };

  // Calculate totals
  const totalBudgeted = categories?.reduce((sum, c) => sum + Number(c.budgeted_amount), 0) || 0;
  const totalSpent = categories?.reduce((sum, c) => sum + Number(c.spent_amount), 0) || 0;
  const budgetRemaining = totalBudgeted - totalSpent;

  // Calculate total from linked accounts
  const totalAccountBalance = accounts?.reduce((sum, acc) => {
    if (acc.currency === 'IDR') return sum + Number(acc.balance);
    return sum;
  }, 0) || 0;

  const handleAddCategory = async (values: CategoryFormValues) => {
    await createCategory.mutateAsync({
      name: values.name,
      icon: values.icon,
      color: categoryColors[values.icon] || "bg-muted-foreground",
      budgeted_amount: values.budgeted_amount,
      account_id: values.account_id || null,
    });
    setIsAddCategoryOpen(false);
    categoryForm.reset();
  };

  const handleEditCategory = async (values: CategoryFormValues) => {
    if (!selectedCategory) return;
    await updateCategory.mutateAsync({
      id: selectedCategory.id,
      name: values.name,
      icon: values.icon,
      color: categoryColors[values.icon] || "bg-muted-foreground",
      budgeted_amount: values.budgeted_amount,
      account_id: values.account_id || null,
    });
    setIsEditCategoryOpen(false);
    setSelectedCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory.mutateAsync(id);
  };

  const handleAddExpense = async (values: ExpenseFormValues) => {
    await addExpense.mutateAsync({
      category_id: values.category_id,
      amount: values.amount,
      description: values.description,
      account_id: values.account_id || null,
    });
    setIsAddExpenseOpen(false);
    expenseForm.reset();
  };

  const openEditCategory = (category: BudgetCategory) => {
    setSelectedCategory(category);
    editCategoryForm.reset({
      name: category.name,
      icon: category.icon || "other",
      budgeted_amount: Number(category.budgeted_amount),
      account_id: category.account_id || undefined,
    });
    setIsEditCategoryOpen(true);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Please log in to view your budget.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div><h1 className="text-3xl font-bold tracking-tight">Budget Management</h1></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budget Management</h1>
            <p className="text-muted-foreground">Track your monthly spending against your budget</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddExpenseOpen(true)} disabled={!categories?.length}>
              <Receipt className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
            <Button onClick={() => setIsAddCategoryOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
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
              <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyLocal(totalBudgeted)}</div>
              <p className="text-xs text-muted-foreground">Across {categories?.length || 0} categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrencyLocal(totalSpent)}</div>
              <p className={`text-xs ${budgetRemaining >= 0 ? "text-profit" : "text-destructive"}`}>
                {budgetRemaining >= 0 ? `${formatCurrencyLocal(budgetRemaining)} under budget` : `${formatCurrencyLocal(Math.abs(budgetRemaining))} over budget`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(0) : 0}%
              </div>
              <Progress value={totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card className="border-profit/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              <Badge variant="secondary" className={budgetRemaining >= 0 ? "bg-profit/10 text-profit" : "bg-destructive/10 text-destructive"}>
                {budgetRemaining >= 0 ? "On Track" : "Over"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${budgetRemaining >= 0 ? "text-profit" : "text-destructive"}`}>
                {formatCurrencyLocal(Math.abs(budgetRemaining))}
              </div>
              <p className="text-xs text-muted-foreground">{budgetRemaining >= 0 ? "Left to spend" : "Over budget"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Categories */}
        {categories && categories.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Budget Categories</CardTitle>
              <CardDescription>Track spending by category for this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories.map((category) => {
                  const Icon = categoryIcons[category.icon || "other"] || MoreHorizontal;
                  const percentage = Number(category.budgeted_amount) > 0 
                    ? (Number(category.spent_amount) / Number(category.budgeted_amount)) * 100 
                    : 0;
                  const isOverBudget = Number(category.spent_amount) > Number(category.budgeted_amount);
                  const remaining = Number(category.budgeted_amount) - Number(category.spent_amount);
                  const colorClass = category.color || categoryColors[category.icon || "other"] || "bg-muted-foreground";

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}/10`}>
                            <Icon className={`h-4 w-4 ${colorClass.replace("bg-", "text-")}`} />
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrencyLocal(Number(category.spent_amount))} of {formatCurrencyLocal(Number(category.budgeted_amount))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-medium ${isOverBudget ? "text-destructive" : "text-profit"}`}>
                              {isOverBudget ? `-${formatCurrencyLocal(Math.abs(remaining))}` : `+${formatCurrencyLocal(remaining)}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {percentage.toFixed(0)}% used
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                expenseForm.setValue("category_id", category.id);
                                setIsAddExpenseOpen(true);
                              }}>
                                <Receipt className="mr-2 h-4 w-4" />
                                Add Expense
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditCategory(category)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={PieChart}
                title="No budget categories"
                description="Create budget categories to start tracking your spending and stay on top of your finances."
                action={{
                  label: "Add Category",
                  onClick: () => setIsAddCategoryOpen(true),
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Category</DialogTitle>
            <DialogDescription>Create a new budget category to track your spending.</DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleAddCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Entertainment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="housing">🏠 Housing</SelectItem>
                        <SelectItem value="food">🍔 Food & Dining</SelectItem>
                        <SelectItem value="transportation">🚗 Transportation</SelectItem>
                        <SelectItem value="utilities">⚡ Utilities</SelectItem>
                        <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                        <SelectItem value="health">❤️ Health</SelectItem>
                        <SelectItem value="education">🎓 Education</SelectItem>
                        <SelectItem value="travel">✈️ Travel</SelectItem>
                        <SelectItem value="internet">📶 Internet</SelectItem>
                        <SelectItem value="other">📌 Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="budgeted_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Budget (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {accounts && accounts.length > 0 && (
                <FormField
                  control={categoryForm.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Account (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.filter(a => a.is_active).map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createCategory.isPending}>
                  {createCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget Category</DialogTitle>
            <DialogDescription>Update your budget category.</DialogDescription>
          </DialogHeader>
          <Form {...editCategoryForm}>
            <form onSubmit={editCategoryForm.handleSubmit(handleEditCategory)} className="space-y-4">
              <FormField
                control={editCategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editCategoryForm.control}
                name="budgeted_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Budget (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditCategoryOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateCategory.isPending}>
                  {updateCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a new expense to track against your budget.</DialogDescription>
          </DialogHeader>
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(handleAddExpense)} className="space-y-4">
              <FormField
                control={expenseForm.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="150000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lunch at restaurant" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {accounts && accounts.length > 0 && (
                <FormField
                  control={expenseForm.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Account (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.filter(a => a.is_active).map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} - {formatCurrency(Number(account.balance), account.currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addExpense.isPending}>
                  {addExpense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Expense
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
