/**
 * Sync Reconciliation Report - Displays detailed sync results
 * Shows: Stats, Validation errors/warnings, P&L reconciliation, Failed lifecycles
 * 
 * Exports:
 * - SyncReconciliationReport: Dialog-wrapped version (for SyncStatusBadge click)
 * - SyncReconciliationReportInline: Inline version (for Import page)
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  BarChart3, 
  Scale, 
  FileWarning,
  ChevronRight,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { AggregationResult, AggregatedTrade, ValidationError, ValidationWarning } from "@/services/binance/types";
import { format } from "date-fns";

// =============================================================================
// Shared report content (used by both Dialog and Inline versions)
// =============================================================================

interface ReportContentProps {
  result: AggregationResult;
}

function ReportContent({ result }: ReportContentProps) {
  const { stats, reconciliation, failures, trades } = result;
  
  const totalPnL = trades.reduce((sum, t) => sum + t.realized_pnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const winCount = trades.filter(t => t.result === 'win').length;
  const lossCount = trades.filter(t => t.result === 'loss').length;
  const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;

  const allWarnings: Array<{ trade: AggregatedTrade; warning: ValidationWarning }> = [];
  trades.forEach(trade => {
    trade._validation.warnings.forEach(warning => {
      allWarnings.push({ trade, warning });
    });
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={Activity}
          label="Total Trades"
          value={stats.validTrades.toString()}
          subtitle={`${stats.invalidTrades} invalid`}
          variant={stats.invalidTrades > 0 ? 'warning' : 'default'}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          subtitle={`${winCount}W / ${lossCount}L`}
          variant={winRate >= 50 ? 'success' : 'default'}
        />
        <SummaryCard
          icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
          label="Total P&L"
          value={formatCurrency(totalPnL)}
          subtitle={`Fees: ${formatCurrency(totalFees)}`}
          variant={totalPnL >= 0 ? 'success' : 'danger'}
        />
        <SummaryCard
          icon={Scale}
          label="Reconciliation"
          value={reconciliation.isReconciled ? 'Matched' : 'Mismatch'}
          subtitle={`${reconciliation.differencePercent.toFixed(3)}% diff`}
          variant={reconciliation.isReconciled ? 'success' : 'warning'}
        />
      </div>

      <ReconciliationSection reconciliation={reconciliation} />
      <LifecycleStatsSection stats={stats} />

      {allWarnings.length > 0 && (
        <ValidationWarningsSection warnings={allWarnings} />
      )}

      {failures.length > 0 && (
        <FailedLifecyclesSection failures={failures} />
      )}

      <TradeDetailsSection trades={trades.slice(0, 20)} totalCount={trades.length} />
    </div>
  );
}

// =============================================================================
// Dialog version (backward compatible)
// =============================================================================

interface SyncReconciliationReportProps {
  result: AggregationResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncReconciliationReport({ 
  result, 
  open, 
  onOpenChange 
}: SyncReconciliationReportProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Sync Reconciliation Report
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of aggregated trades and data validation
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="pb-4">
            <ReportContent result={result} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Inline version (no Dialog wrapper)
// =============================================================================

interface SyncReconciliationReportInlineProps {
  result: AggregationResult;
  className?: string;
}

export function SyncReconciliationReportInline({ result, className = '' }: SyncReconciliationReportInlineProps) {
  return (
    <div className={className}>
      <ReportContent result={result} />
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function SummaryCard({ icon: Icon, label, value, subtitle, variant = 'default' }: SummaryCardProps) {
  const variantStyles = {
    default: 'bg-muted/50',
    success: 'bg-profit/10 border-profit/20',
    warning: 'bg-warning/10 border-warning/20',
    danger: 'bg-loss/10 border-loss/20',
  };
  
  const valueStyles = {
    default: '',
    success: 'text-profit',
    warning: 'text-warning',
    danger: 'text-loss',
  };

  return (
    <div className={`rounded-lg border p-3 ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`text-lg font-bold ${valueStyles[variant]}`}>{value}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
  );
}

function ReconciliationSection({ reconciliation }: { reconciliation: AggregationResult['reconciliation'] }) {
  const diffPercent = Math.abs(reconciliation.differencePercent);
  const progressValue = Math.max(0, 100 - (diffPercent * 100));
  
  const matchedPnl = reconciliation.matchedIncomePnl;
  const unmatchedPnl = reconciliation.unmatchedIncomePnl;
  const incompleteNote = reconciliation.incompletePositionsNote;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4" />
          P&L Reconciliation
          {reconciliation.isReconciled ? (
            <Badge variant="outline" className="text-profit ml-auto">
              <CheckCircle className="h-3 w-3 mr-1" />
              Matched
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Mismatch
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Aggregated P&L</div>
            <div className="font-mono font-medium">
              {formatCurrency(reconciliation.aggregatedTotalPnl)}
            </div>
            <div className="text-xs text-muted-foreground">From completed trades</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Matched Income</div>
            <div className="font-mono font-medium">
              {formatCurrency(matchedPnl)}
            </div>
            <div className="text-xs text-muted-foreground">Binance REALIZED_PNL</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Difference</div>
            <div className={`font-mono font-medium ${Math.abs(reconciliation.difference) > 0.01 ? 'text-warning' : 'text-muted-foreground'}`}>
              {formatCurrency(reconciliation.difference)}
            </div>
            <div className="text-xs text-muted-foreground">{diffPercent.toFixed(4)}%</div>
          </div>
        </div>
        
        {unmatchedPnl !== 0 && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Unmatched P&L: {formatCurrency(unmatchedPnl)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {incompleteNote || 'P&L from open or incomplete positions not included in aggregated trades.'}
            </p>
            <div className="text-xs text-muted-foreground">
              Total Binance P&L: {formatCurrency(reconciliation.binanceTotalPnl)}
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Accuracy</span>
            <span className={reconciliation.isReconciled ? 'text-profit' : 'text-warning'}>
              {(100 - diffPercent).toFixed(3)}%
            </span>
          </div>
          <Progress 
            value={progressValue} 
            className={`h-2 ${reconciliation.isReconciled ? '[&>div]:bg-profit' : '[&>div]:bg-warning'}`}
          />
          <div className="text-xs text-muted-foreground">
            Tolerance: ±0.1% • Actual difference: {reconciliation.differencePercent.toFixed(4)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LifecycleStatsSection({ stats }: { stats: AggregationResult['stats'] }) {
  const completionRate = stats.totalLifecycles > 0 
    ? (stats.completeLifecycles / stats.totalLifecycles) * 100 
    : 0;
  
  const validationRate = (stats.validTrades + stats.invalidTrades) > 0
    ? (stats.validTrades / (stats.validTrades + stats.invalidTrades)) * 100
    : 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Processing Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Position Lifecycles</span>
              <span className="font-medium">{stats.totalLifecycles}</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={completionRate} className="h-2" />
              <span className="text-xs text-muted-foreground w-12">
                {completionRate.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.completeLifecycles} complete</span>
              <span>{stats.incompleteLifecycles} incomplete</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Validation Rate</span>
              <span className="font-medium">{stats.validTrades} valid</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={validationRate} 
                className={`h-2 ${validationRate === 100 ? '[&>div]:bg-profit' : ''}`}
              />
              <span className="text-xs text-muted-foreground w-12">
                {validationRate.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stats.invalidTrades} invalid</span>
              <span>{stats.warningTrades} warnings</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationWarningsSection({ 
  warnings 
}: { 
  warnings: Array<{ trade: AggregatedTrade; warning: ValidationWarning }> 
}) {
  const [expanded, setExpanded] = useState(false);
  const displayWarnings = expanded ? warnings : warnings.slice(0, 5);

  return (
    <Card className="border-warning/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          Validation Warnings
          <Badge variant="secondary" className="ml-auto">{warnings.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayWarnings.map((item, idx) => (
            <div key={idx} className="text-sm flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">{item.trade.pair}</span>
                <span className="text-muted-foreground mx-1">•</span>
                <span className="text-muted-foreground">{item.warning.field}:</span>
                <span className="ml-1">{item.warning.message}</span>
              </div>
            </div>
          ))}
          
          {warnings.length > 5 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(!expanded)}
              className="w-full"
            >
              {expanded ? 'Show less' : `Show ${warnings.length - 5} more`}
              <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FailedLifecyclesSection({ 
  failures 
}: { 
  failures: AggregationResult['failures'] 
}) {
  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <XCircle className="h-4 w-4" />
          Failed Aggregations
          <Badge variant="destructive" className="ml-auto">{failures.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {failures.map((failure, idx) => (
            <div key={idx} className="text-sm flex items-start gap-2 p-2 rounded-md bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-xs">{failure.lifecycleId}</span>
                <p className="text-muted-foreground">{failure.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TradeDetailsSection({ 
  trades, 
  totalCount 
}: { 
  trades: AggregatedTrade[]; 
  totalCount: number;
}) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="trades" className="border rounded-lg">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            <span>Trade Details</span>
            <Badge variant="secondary">{totalCount}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Pair</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Exit</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{trade.pair}</TableCell>
                    <TableCell>
                      <Badge variant={trade.direction === 'LONG' ? 'default' : 'destructive'} className="text-xs">
                        {trade.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      ${trade.entry_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      ${trade.exit_price.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${trade.realized_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatCurrency(trade.realized_pnl)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {trade.hold_time_minutes < 60 
                        ? `${trade.hold_time_minutes}m` 
                        : `${Math.round(trade.hold_time_minutes / 60)}h`
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalCount > 20 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing first 20 of {totalCount} trades
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
