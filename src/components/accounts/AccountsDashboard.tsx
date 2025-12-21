import { Wallet, Building2, Smartphone, Briefcase, Banknote, WalletCards, TrendingUp, TrendingDown, PiggyBank, Shield, Target, CandlestickChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAccountsSummary } from "@/hooks/use-accounts";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatters";
import type { AccountType } from "@/types/account";

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: React.ElementType; color: string }> = {
  bank: { label: "Bank", icon: Building2, color: "text-blue-500" },
  ewallet: { label: "E-Wallet", icon: Smartphone, color: "text-green-500" },
  broker: { label: "Broker", icon: Briefcase, color: "text-purple-500" },
  cash: { label: "Cash", icon: Banknote, color: "text-yellow-500" },
  soft_wallet: { label: "Soft Wallet", icon: WalletCards, color: "text-pink-500" },
  investment: { label: "Investment", icon: PiggyBank, color: "text-indigo-500" },
  emergency: { label: "Emergency", icon: Shield, color: "text-orange-500" },
  goal_savings: { label: "Goal Savings", icon: Target, color: "text-teal-500" },
  trading: { label: "Trading", icon: CandlestickChart, color: "text-cyan-500" },
};

export function AccountsDashboard() {
  const { accounts, totalBalance, byCurrency, byType, isLoading } = useAccountsSummary();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeAccounts = accounts?.filter(a => a.is_active).length || 0;
  const totalAccounts = accounts?.length || 0;
  const currencies = Object.keys(byCurrency);
  const accountTypes = Object.keys(byType) as AccountType[];

  // Calculate the largest balance for progress bar scaling
  const maxCurrencyBalance = Math.max(...Object.values(byCurrency), 1);
  const maxTypeBalance = Math.max(...Object.values(byType), 1);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Balance Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers">
              {formatCompactCurrency(totalBalance, 'IDR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeAccounts} active of {totalAccounts} accounts
            </p>
          </CardContent>
        </Card>

        {/* Currency Balance Cards - show top 3 */}
        {currencies.slice(0, 3).map((currency) => (
          <Card key={currency}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{currency}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {((byCurrency[currency] / totalBalance) * 100).toFixed(1)}%
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono-numbers">
                {formatCompactCurrency(byCurrency[currency], currency)}
              </div>
              <Progress 
                value={(byCurrency[currency] / maxCurrencyBalance) * 100} 
                className="mt-2 h-1" 
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Balance by Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance by Currency</CardTitle>
            <CardDescription>Distribution across {currencies.length} currencies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currencies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No accounts yet
              </p>
            ) : (
              currencies.map((currency) => {
                const balance = byCurrency[currency];
                const percentage = totalBalance > 0 ? (balance / totalBalance) * 100 : 0;
                
                return (
                  <div key={currency} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{currency}</span>
                      <span className="font-mono-numbers text-muted-foreground">
                        {formatCurrency(balance, currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Balance by Account Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance by Account Type</CardTitle>
            <CardDescription>Distribution across {accountTypes.length} account types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No accounts yet
              </p>
            ) : (
              accountTypes.map((type) => {
                const config = ACCOUNT_TYPE_CONFIG[type];
                const balance = byType[type];
                const percentage = totalBalance > 0 ? (balance / totalBalance) * 100 : 0;
                const Icon = config.icon;
                
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <span className="font-mono-numbers text-muted-foreground">
                        {formatCompactCurrency(balance, 'IDR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
