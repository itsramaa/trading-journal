/**
 * FinancialSummaryCard - Displays Fee/Funding/Rebate summary from Binance income
 * 
 * IMPORTANT: This component displays NON-TRADE income types (summary only).
 * Trade P&L (REALIZED_PNL) is shown in Trade History, NOT here.
 * Detailed breakdown is available in Trade History -> Fees & Funding tabs.
 * 
 * Income Types Displayed:
 * - COMMISSION: Trading fees paid (maker/taker)
 * - FUNDING_FEE: Funding rate payments (can be positive or negative)
 * - COMMISSION_REBATE: Fee rebates received
 * - API_REBATE: API trading rebates
 */
import { useState, useMemo } from "react";
import { 
  Calendar, 
  CircleDollarSign,
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  Coins,
  Percent,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBinanceAllIncome, useBinanceConnectionStatus } from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import { getIncomeTypeCategory, type BinanceIncome } from "@/features/binance/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  className?: string;
  defaultDays?: number;
}

export function FinancialSummaryCard({ 
  className,
  defaultDays = 30,
}: FinancialSummaryCardProps) {
  const [days, setDays] = useState<number>(defaultDays);
  
  // All hooks MUST be called before any conditional returns
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: allIncome, isLoading, refetch } = useBinanceAllIncome(days, 1000);
  
  const isConnected = connectionStatus?.isConnected ?? false;

  // Filter to only non-trade income types
  const financialIncome = useMemo(() => {
    if (!allIncome) return [];
    return allIncome.filter((item: BinanceIncome) => {
      const category = getIncomeTypeCategory(item.incomeType);
      // Exclude 'pnl' (trades) and 'transfers' (shown in Transactions tab)
      return category === 'fees' || category === 'funding' || category === 'rewards';
    });
  }, [allIncome]);

  // Calculate aggregated summary
  const summary = useMemo(() => {
    if (!financialIncome.length) return null;

    const result = {
      totalFees: 0,
      totalFunding: 0,
      fundingPaid: 0,
      fundingReceived: 0,
      totalRebates: 0,
      feeCount: 0,
      fundingCount: 0,
      rebateCount: 0,
    };

    financialIncome.forEach((item: BinanceIncome) => {
      switch (item.incomeType) {
        case 'COMMISSION':
          result.totalFees += item.income; // Usually negative
          result.feeCount++;
          break;
        case 'FUNDING_FEE':
          result.totalFunding += item.income;
          result.fundingCount++;
          if (item.income < 0) {
            result.fundingPaid += Math.abs(item.income);
          } else {
            result.fundingReceived += item.income;
          }
          break;
        case 'COMMISSION_REBATE':
        case 'API_REBATE':
          result.totalRebates += item.income; // Usually positive
          result.rebateCount++;
          break;
      }
    });

    return result;
  }, [financialIncome]);

  // Net cost = Fees + Funding (negative) - Rebates (positive)
  const netCost = summary 
    ? Math.abs(summary.totalFees) + Math.abs(summary.fundingPaid) - summary.fundingReceived - summary.totalRebates
    : 0;

  // Guard: show empty state if not connected (AFTER all hooks)
  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            Financial Summary
          </CardTitle>
          <CardDescription>
            Trading fees, funding rates, and rebates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BinanceNotConfiguredState
            title="Financial Data Requires Exchange"
            description="Connect your Binance API to view trading fees, funding rates, and rebates."
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              Financial Summary
            </CardTitle>
            <CardDescription>
              Trading fees, funding rates, and rebates (not trade P&L)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">6 months</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No fee or funding data found for the selected period.</p>
          </div>
        ) : (
          <>
            {/* Summary Cards Grid */}
            <div className="grid gap-4 md:grid-cols-4">
              {/* Trading Fees */}
              <Card className="border-muted">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Trading Fees</p>
                      <p className="text-xl font-bold text-loss">
                        -{formatCurrency(Math.abs(summary.totalFees), 'USD')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary.feeCount} transactions
                      </p>
                    </div>
                    <Percent className="h-6 w-6 text-loss opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* Funding Paid */}
              <Card className="border-muted">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Funding Paid</p>
                      <p className="text-xl font-bold text-loss">
                        -{formatCurrency(summary.fundingPaid, 'USD')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        When holding longs in contango
                      </p>
                    </div>
                    <TrendingDown className="h-6 w-6 text-loss opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* Funding Received */}
              <Card className="border-muted">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Funding Received</p>
                      <p className="text-xl font-bold text-profit">
                        +{formatCurrency(summary.fundingReceived, 'USD')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        When holding shorts in contango
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-profit opacity-50" />
                  </div>
                </CardContent>
              </Card>

              {/* Rebates */}
              <Card className="border-muted">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Fee Rebates</p>
                      <p className="text-xl font-bold text-profit">
                        +{formatCurrency(summary.totalRebates, 'USD')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {summary.rebateCount} rebates
                      </p>
                    </div>
                    <Coins className="h-6 w-6 text-profit opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Net Trading Cost */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Net Trading Cost</span>
              </div>
              <div className={cn(
                "text-xl font-bold",
                netCost > 0 ? "text-loss" : "text-profit"
              )}>
                {netCost > 0 ? '-' : '+'}{formatCurrency(Math.abs(netCost), 'USD')}
              </div>
            </div>

            {/* View Details link to Trade History */}
            <div className="flex items-center justify-center p-3 rounded-lg bg-muted/30 border border-dashed">
              <p className="text-sm text-muted-foreground">
                View detailed breakdown in{' '}
                <a href="/trade-history" className="text-primary hover:underline">
                  Trade History → Fees & Funding tabs
                </a>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
