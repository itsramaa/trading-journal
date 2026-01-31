/**
 * FinancialSummaryCard - Displays Fee/Funding/Rebate breakdown from Binance income
 * 
 * IMPORTANT: This component displays NON-TRADE income types.
 * Trade P&L (REALIZED_PNL) is shown in Trade History, NOT here.
 * 
 * Income Types Displayed:
 * - COMMISSION: Trading fees paid (maker/taker)
 * - FUNDING_FEE: Funding rate payments (can be positive or negative)
 * - COMMISSION_REBATE: Fee rebates received
 * - API_REBATE: API trading rebates
 */
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { 
  Calendar, 
  CircleDollarSign,
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  Coins,
  Percent,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBinanceAllIncome } from "@/features/binance";
import { getIncomeTypeCategory, type BinanceIncome } from "@/features/binance/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  className?: string;
  defaultDays?: number;
  showDetails?: boolean;
}

/**
 * Get user-friendly label for income type
 */
function getIncomeTypeLabel(type: string): string {
  switch (type) {
    case 'COMMISSION': return 'Trading Fee';
    case 'FUNDING_FEE': return 'Funding Rate';
    case 'COMMISSION_REBATE': return 'Fee Rebate';
    case 'API_REBATE': return 'API Rebate';
    case 'WELCOME_BONUS': return 'Bonus';
    case 'REFERRAL_KICKBACK': return 'Referral';
    default: return type.replace(/_/g, ' ');
  }
}

/**
 * Get badge variant based on value (positive/negative)
 */
function getValueVariant(value: number): 'default' | 'destructive' | 'secondary' {
  if (value > 0) return 'default';
  if (value < 0) return 'destructive';
  return 'secondary';
}

export function FinancialSummaryCard({ 
  className,
  defaultDays = 30,
  showDetails = true,
}: FinancialSummaryCardProps) {
  const [days, setDays] = useState<number>(defaultDays);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const { data: allIncome, isLoading, refetch } = useBinanceAllIncome(days, 1000);

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
      bySymbol: {} as Record<string, { fees: number; funding: number }>,
    };

    financialIncome.forEach((item: BinanceIncome) => {
      const symbol = item.symbol || 'GENERAL';
      
      if (!result.bySymbol[symbol]) {
        result.bySymbol[symbol] = { fees: 0, funding: 0 };
      }

      switch (item.incomeType) {
        case 'COMMISSION':
          result.totalFees += item.income; // Usually negative
          result.feeCount++;
          result.bySymbol[symbol].fees += item.income;
          break;
        case 'FUNDING_FEE':
          result.totalFunding += item.income;
          result.fundingCount++;
          result.bySymbol[symbol].funding += item.income;
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
              <SelectTrigger className="w-[120px]">
                <Calendar className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
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

            {/* Detailed Breakdown (Collapsible) */}
            {showDetails && financialIncome.length > 0 && (
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="text-sm">View Details ({financialIncome.length} records)</span>
                    {isDetailsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="rounded-md border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Symbol</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialIncome
                          .sort((a, b) => b.time - a.time)
                          .slice(0, 100)
                          .map((item: BinanceIncome) => (
                            <TableRow key={item.tranId}>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(item.time), "MMM dd HH:mm")}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={getValueVariant(item.income)}
                                  className="text-xs"
                                >
                                  {getIncomeTypeLabel(item.incomeType)}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {item.symbol || '-'}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-mono",
                                item.income >= 0 ? "text-profit" : "text-loss"
                              )}>
                                {item.income >= 0 ? '+' : ''}{formatCurrency(item.income, 'USD')}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  {financialIncome.length > 100 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Showing 100 of {financialIncome.length} records
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Symbol Breakdown */}
            {Object.keys(summary.bySymbol).length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Cost by Symbol (Top 5)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary.bySymbol)
                    .filter(([symbol]) => symbol !== 'GENERAL')
                    .sort((a, b) => Math.abs(b[1].fees) - Math.abs(a[1].fees))
                    .slice(0, 5)
                    .map(([symbol, data]) => (
                      <Badge key={symbol} variant="outline" className="text-xs">
                        {symbol}: {formatCurrency(Math.abs(data.fees), 'USD')} fees
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
