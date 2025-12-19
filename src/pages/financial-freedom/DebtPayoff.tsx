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
  ArrowRight,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  Loader2
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebts, useCreateDebt, useUpdateDebt, useDeleteDebt, useMakePayment, type Debt } from "@/hooks/use-debts";
import { useAuth } from "@/hooks/use-auth";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const debtIcons: Record<string, any> = {
  credit_card: CreditCard,
  mortgage: Home,
  car_loan: Car,
  student_loan: GraduationCap,
  other: CreditCard,
};

const debtTypeLabels: Record<string, string> = {
  credit_card: "Credit Card",
  mortgage: "Mortgage",
  car_loan: "Car Loan",
  student_loan: "Student Loan",
  other: "Other",
};

// Zod schema for form validation
const debtSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  debt_type: z.string().min(1, "Type is required"),
  original_balance: z.coerce.number().positive("Original balance must be positive"),
  current_balance: z.coerce.number().min(0, "Current balance cannot be negative"),
  interest_rate: z.coerce.number().min(0, "Interest rate cannot be negative").max(100, "Interest rate cannot exceed 100%"),
  minimum_payment: z.coerce.number().min(0, "Minimum payment cannot be negative"),
  monthly_payment: z.coerce.number().min(0, "Monthly payment cannot be negative"),
  due_date: z.coerce.number().min(1).max(31).optional().nullable(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional().nullable(),
});

type DebtFormValues = z.infer<typeof debtSchema>;

export default function DebtPayoff() {
  const { user } = useAuth();
  const { data: debts, isLoading } = useDebts();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();
  const makePayment = useMakePayment();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      name: "",
      debt_type: "credit_card",
      original_balance: 0,
      current_balance: 0,
      interest_rate: 0,
      minimum_payment: 0,
      monthly_payment: 0,
      due_date: null,
      notes: "",
    },
  });

  const editForm = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `Rp${(value / 1000000).toFixed(1)}jt`;
    }
    return `Rp${value.toLocaleString()}`;
  };

  const totalDebt = useMemo(() => 
    debts?.reduce((sum, d) => sum + Number(d.current_balance), 0) || 0, 
  [debts]);
  
  const totalOriginal = useMemo(() => 
    debts?.reduce((sum, d) => sum + Number(d.original_balance), 0) || 0, 
  [debts]);
  
  const totalPaid = totalOriginal - totalDebt;
  const overallProgress = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

  // Sort debts based on strategy
  const sortedDebts = useMemo(() => {
    if (!debts) return [];
    return [...debts].sort((a, b) => {
      if (strategy === "avalanche") {
        return Number(b.interest_rate) - Number(a.interest_rate);
      } else {
        return Number(a.current_balance) - Number(b.current_balance);
      }
    });
  }, [debts, strategy]);

  // Calculate payoff projection
  const projectedPayoffMonths = useMemo(() => {
    if (!debts || debts.length === 0) return 0;
    const totalMonthlyPayment = debts.reduce((sum, d) => sum + Number(d.monthly_payment), 0);
    if (totalMonthlyPayment === 0) return 0;
    return Math.ceil(totalDebt / totalMonthlyPayment);
  }, [debts, totalDebt]);

  const avgInterestRate = useMemo(() => {
    if (!debts || debts.length === 0) return 0;
    return debts.reduce((sum, d) => sum + Number(d.interest_rate), 0) / debts.length;
  }, [debts]);

  const handleAddDebt = async (values: DebtFormValues) => {
    await createDebt.mutateAsync({
      name: values.name,
      debt_type: values.debt_type,
      original_balance: values.original_balance,
      current_balance: values.current_balance,
      interest_rate: values.interest_rate,
      minimum_payment: values.minimum_payment,
      monthly_payment: values.monthly_payment,
      due_date: values.due_date,
      notes: values.notes,
    });
    form.reset();
    setIsAddDialogOpen(false);
  };

  const handleEditDebt = async (values: DebtFormValues) => {
    if (!selectedDebt) return;
    await updateDebt.mutateAsync({
      id: selectedDebt.id,
      ...values,
    });
    setIsEditDialogOpen(false);
    setSelectedDebt(null);
  };

  const handleDeleteDebt = async (id: string) => {
    await deleteDebt.mutateAsync(id);
  };

  const handleMakePayment = async () => {
    if (!selectedDebt || !paymentAmount) return;
    await makePayment.mutateAsync({
      id: selectedDebt.id,
      amount: Number(paymentAmount),
    });
    setIsPaymentDialogOpen(false);
    setSelectedDebt(null);
    setPaymentAmount("");
  };

  const openEditDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    editForm.reset({
      name: debt.name,
      debt_type: debt.debt_type,
      original_balance: Number(debt.original_balance),
      current_balance: Number(debt.current_balance),
      interest_rate: Number(debt.interest_rate),
      minimum_payment: Number(debt.minimum_payment),
      monthly_payment: Number(debt.monthly_payment),
      due_date: debt.due_date,
      notes: debt.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openPaymentDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount(String(debt.monthly_payment));
    setIsPaymentDialogOpen(true);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Please log in to view your debts.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Debt Payoff Tracker</h1>
              <p className="text-muted-foreground">Manage and track your debt repayment journey</p>
            </div>
          </div>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Debt</DialogTitle>
                <DialogDescription>
                  Add a new debt to track your repayment progress.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddDebt)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Debt Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Credit Card A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="debt_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="car_loan">Car Loan</SelectItem>
                            <SelectItem value="mortgage">Mortgage</SelectItem>
                            <SelectItem value="student_loan">Student Loan</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="original_balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Original Balance</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="25000000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="current_balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Balance</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="15000000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="interest_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="18" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date (Day)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              placeholder="15" 
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minimum_payment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Payment</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="500000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="monthly_payment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Payment</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500000" {...field} />
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
                    <Button type="submit" disabled={createDebt.isPending}>
                      {createDebt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Debt
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalDebt)}</div>
              <p className="text-xs text-muted-foreground">Across {debts?.length || 0} accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid Off</CardTitle>
              <Target className="h-4 w-4 text-profit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-profit">{formatCurrency(totalPaid)}</div>
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
              <div className="text-2xl font-bold">{avgInterestRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Weighted average</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        {debts && debts.length > 0 && (
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
        )}

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
                  <Flame className="h-5 w-5 text-chart-4" />
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
                  <Snowflake className="h-5 w-5 text-chart-1" />
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
        {sortedDebts.length > 0 ? (
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
                  const Icon = debtIcons[debt.debt_type] || CreditCard;
                  const progress = ((Number(debt.original_balance) - Number(debt.current_balance)) / Number(debt.original_balance)) * 100;
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
                              {Number(debt.interest_rate).toFixed(1)}% APR
                              {debt.due_date && ` • Due on ${debt.due_date}th`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="text-xl font-bold text-destructive">{formatCurrency(Number(debt.current_balance))}</p>
                            <p className="text-sm text-muted-foreground">
                              of {formatCurrency(Number(debt.original_balance))}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPaymentDialog(debt)}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Make Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(debt)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteDebt(debt.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{progress.toFixed(1)}% paid off</span>
                          <span>Monthly: {formatCurrency(Number(debt.monthly_payment))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="No debts tracked"
            description="Start tracking your debts to see your payoff progress and strategy recommendations."
            action={{
              label: "Add Your First Debt",
              onClick: () => setIsAddDialogOpen(true),
            }}
          />
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Debt</DialogTitle>
            <DialogDescription>Update your debt information.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditDebt)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debt Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="debt_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="car_loan">Car Loan</SelectItem>
                        <SelectItem value="mortgage">Mortgage</SelectItem>
                        <SelectItem value="student_loan">Student Loan</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="current_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="interest_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="minimum_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Payment</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="monthly_payment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Payment</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateDebt.isPending}>
                  {updateDebt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedDebt?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            {selectedDebt && (
              <p className="text-sm text-muted-foreground">
                Current balance: {formatCurrency(Number(selectedDebt.current_balance))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMakePayment} disabled={makePayment.isPending || !paymentAmount}>
              {makePayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
