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
  ArrowUpRight,
  ArrowDownRight,
  Settings,
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
import { useAuth } from "@/hooks/use-auth";
import { useAccounts } from "@/hooks/use-accounts";
import { 
  useEmergencyFund, 
  useCreateEmergencyFund, 
  useUpdateEmergencyFund,
  useEmergencyFundTransactions,
  useAddContribution 
} from "@/hooks/use-emergency-fund";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { formatCurrency } from "@/lib/formatters";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const setupSchema = z.object({
  monthly_expenses: z.coerce.number().positive("Monthly expenses must be positive"),
  monthly_contribution: z.coerce.number().min(0, "Contribution cannot be negative"),
  target_months: z.coerce.number().min(1).max(24),
  current_balance: z.coerce.number().min(0, "Balance cannot be negative").optional(),
});

const contributionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  transaction_type: z.enum(["deposit", "withdrawal", "interest"]),
  description: z.string().max(200).optional(),
  account_id: z.string().optional(),
});

type SetupFormValues = z.infer<typeof setupSchema>;
type ContributionFormValues = z.infer<typeof contributionSchema>;

export default function EmergencyFund() {
  const { user } = useAuth();
  const { data: fund, isLoading } = useEmergencyFund();
  const { data: transactions } = useEmergencyFundTransactions(fund?.id);
  const { data: accounts } = useAccounts();
  const createFund = useCreateEmergencyFund();
  const updateFund = useUpdateEmergencyFund();
  const addContribution = useAddContribution();

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const setupForm = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      monthly_expenses: 15000000,
      monthly_contribution: 3000000,
      target_months: 6,
      current_balance: 0,
    },
  });

  const contributionForm = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      amount: 0,
      transaction_type: "deposit",
      description: "",
    },
  });

  const settingsForm = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
  });

  const formatCurrencyLocal = (value: number) => {
    if (value >= 1000000) {
      return `Rp${(value / 1000000).toFixed(1)}jt`;
    }
    return `Rp${value.toLocaleString()}`;
  };

  const targetAmount = fund ? Number(fund.monthly_expenses) * fund.target_months : 0;
  const currentMonths = fund && Number(fund.monthly_expenses) > 0 
    ? Number(fund.current_balance) / Number(fund.monthly_expenses) 
    : 0;
  const progress = targetAmount > 0 ? (Number(fund?.current_balance || 0) / targetAmount) * 100 : 0;
  const monthsToGoal = fund && Number(fund.monthly_contribution) > 0
    ? Math.max(0, (targetAmount - Number(fund.current_balance)) / Number(fund.monthly_contribution))
    : 0;

  const status = useMemo(() => {
    if (currentMonths >= 12) return { level: "excellent", color: "text-profit", bgColor: "bg-profit/10", label: "Excellent" };
    if (currentMonths >= 6) return { level: "good", color: "text-chart-1", bgColor: "bg-chart-1/10", label: "Good" };
    if (currentMonths >= 3) return { level: "building", color: "text-chart-4", bgColor: "bg-chart-4/10", label: "Building" };
    return { level: "critical", color: "text-destructive", bgColor: "bg-destructive/10", label: "Critical" };
  }, [currentMonths]);

  const milestones = [
    { months: 1, label: "1 Month", reached: currentMonths >= 1 },
    { months: 3, label: "3 Months", reached: currentMonths >= 3 },
    { months: 6, label: "6 Months", reached: currentMonths >= 6 },
    { months: 12, label: "12 Months", reached: currentMonths >= 12 },
  ];

  const handleSetup = async (values: SetupFormValues) => {
    await createFund.mutateAsync({
      monthly_expenses: values.monthly_expenses,
      monthly_contribution: values.monthly_contribution,
      target_months: values.target_months,
      current_balance: values.current_balance,
    });
    setIsSetupOpen(false);
    setupForm.reset();
  };

  const handleContribution = async (values: ContributionFormValues) => {
    if (!fund) return;
    await addContribution.mutateAsync({
      emergency_fund_id: fund.id,
      transaction_type: values.transaction_type,
      amount: values.amount,
      description: values.description,
      account_id: values.account_id || null,
    });
    setIsContributionOpen(false);
    contributionForm.reset();
  };

  const handleUpdateSettings = async (values: SetupFormValues) => {
    if (!fund) return;
    await updateFund.mutateAsync({
      id: fund.id,
      monthly_expenses: values.monthly_expenses,
      monthly_contribution: values.monthly_contribution,
      target_months: values.target_months,
    });
    setIsSettingsOpen(false);
  };

  const openSettings = () => {
    if (fund) {
      settingsForm.reset({
        monthly_expenses: Number(fund.monthly_expenses),
        monthly_contribution: Number(fund.monthly_contribution),
        target_months: fund.target_months,
      });
    }
    setIsSettingsOpen(true);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Please log in to view your emergency fund.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div><h1 className="text-3xl font-bold tracking-tight">Emergency Fund</h1></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!fund) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Emergency Fund</h1>
            <p className="text-muted-foreground">Build your financial safety net</p>
          </div>
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={Shield}
                title="Set Up Your Emergency Fund"
                description="An emergency fund covers unexpected expenses like medical bills, car repairs, or job loss. Experts recommend saving 3-6 months of expenses."
                action={{
                  label: "Get Started",
                  onClick: () => setIsSetupOpen(true),
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Setup Dialog */}
        <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Up Emergency Fund</DialogTitle>
              <DialogDescription>
                Configure your emergency fund goals and tracking.
              </DialogDescription>
            </DialogHeader>
            <Form {...setupForm}>
              <form onSubmit={setupForm.handleSubmit(handleSetup)} className="space-y-4">
                <FormField
                  control={setupForm.control}
                  name="monthly_expenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Expenses (IDR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="15000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={setupForm.control}
                    name="target_months"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Months</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[3, 6, 9, 12].map((m) => (
                              <SelectItem key={m} value={String(m)}>{m} months</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={setupForm.control}
                    name="monthly_contribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Contribution</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="3000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={setupForm.control}
                  name="current_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Balance (if any)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsSetupOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createFund.isPending}>
                    {createFund.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Fund
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Emergency Fund</h1>
            <p className="text-muted-foreground">Build your financial safety net</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={openSettings}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsContributionOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contribution
            </Button>
          </div>
        </div>

        {/* Main Status Card */}
        <Card className="border-2" style={{ borderColor: `hsl(var(--${status.level === 'excellent' ? 'profit' : status.level === 'good' ? 'chart-1' : status.level === 'building' ? 'chart-4' : 'destructive'}) / 0.5)` }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${status.bgColor}`}>
                  <Shield className={`h-6 w-6 ${status.color}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">{formatCurrencyLocal(Number(fund.current_balance))}</CardTitle>
                  <CardDescription>
                    {currentMonths.toFixed(1)} months of expenses covered
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress to {fund.target_months} months</span>
                <span className="font-medium">{Math.min(progress, 100).toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-3" />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Current: {formatCurrencyLocal(Number(fund.current_balance))}</span>
              <span>Target: {formatCurrencyLocal(targetAmount)}</span>
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
              <div className="text-2xl font-bold">{formatCurrencyLocal(Number(fund.monthly_expenses))}</div>
              <p className="text-xs text-muted-foreground">Average monthly spend</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Contribution</CardTitle>
              <TrendingUp className="h-4 w-4 text-profit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-profit">{formatCurrencyLocal(Number(fund.monthly_contribution))}</div>
              <p className="text-xs text-muted-foreground">Target savings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Months Covered</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonths.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Target: {fund.target_months} months</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time to Goal</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {progress >= 100 ? "Goal reached!" : `${Math.ceil(monthsToGoal)} months`}
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
              {milestones.map((milestone) => (
                <div key={milestone.months} className="flex-1">
                  <div className={`flex items-center justify-center h-12 w-12 mx-auto rounded-full mb-2 ${
                    milestone.reached ? "bg-profit/10" : "bg-muted"
                  }`}>
                    {milestone.reached ? (
                      <CheckCircle2 className="h-6 w-6 text-profit" />
                    ) : (
                      <Target className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className={`text-center text-sm font-medium ${
                    milestone.reached ? "text-profit" : "text-muted-foreground"
                  }`}>
                    {milestone.label}
                  </p>
                  <p className="text-center text-xs text-muted-foreground">
                    {formatCurrencyLocal(Number(fund.monthly_expenses) * milestone.months)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.transaction_type === "deposit" ? "bg-profit/10" : 
                        tx.transaction_type === "interest" ? "bg-chart-1/10" : "bg-destructive/10"
                      }`}>
                        {tx.transaction_type === "deposit" ? (
                          <ArrowUpRight className="h-4 w-4 text-profit" />
                        ) : tx.transaction_type === "interest" ? (
                          <TrendingUp className="h-4 w-4 text-chart-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || tx.transaction_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      tx.transaction_type === "withdrawal" ? "text-destructive" : "text-profit"
                    }`}>
                      {tx.transaction_type === "withdrawal" ? "-" : "+"}{formatCurrencyLocal(Number(tx.amount))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contribution Dialog */}
      <Dialog open={isContributionOpen} onOpenChange={setIsContributionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Add a contribution, withdrawal, or interest to your emergency fund.</DialogDescription>
          </DialogHeader>
          <Form {...contributionForm}>
            <form onSubmit={contributionForm.handleSubmit(handleContribution)} className="space-y-4">
              <FormField
                control={contributionForm.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="withdrawal">Withdrawal</SelectItem>
                        <SelectItem value="interest">Interest Earned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contributionForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contributionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Monthly contribution" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {accounts && accounts.length > 0 && (
                <FormField
                  control={contributionForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsContributionOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addContribution.isPending}>
                  {addContribution.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Transaction
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emergency Fund Settings</DialogTitle>
            <DialogDescription>Update your emergency fund configuration.</DialogDescription>
          </DialogHeader>
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(handleUpdateSettings)} className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="monthly_expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Expenses (IDR)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={settingsForm.control}
                  name="target_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Months</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[3, 6, 9, 12].map((m) => (
                            <SelectItem key={m} value={String(m)}>{m} months</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={settingsForm.control}
                  name="monthly_contribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Contribution</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={updateFund.isPending}>
                  {updateFund.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
