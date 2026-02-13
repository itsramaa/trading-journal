/**
 * BacktestComparison - Compare multiple backtest results side-by-side
 * Per plan for Strategy Management enhancement
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Trophy, BarChart3, FileDown, Check, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useBacktestHistory } from '@/hooks/use-backtest';
import { useBacktestExport } from '@/hooks/use-backtest-export';
import type { BacktestResult } from '@/types/backtest';
import { COMPARISON_CONFIG, METRICS_CONFIG, type MetricConfig } from '@/lib/constants/backtest-config';

const CHART_COLORS = COMPARISON_CONFIG.CHART_COLORS;
const COLOR_CLASSES = COMPARISON_CONFIG.COLOR_CLASSES;

export function BacktestComparison() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: backtestHistory, isLoading } = useBacktestHistory();
  const { exportComparisonToPDF } = useBacktestExport();

  const selectedResults = useMemo(() => {
    return (backtestHistory || []).filter((r) => selectedIds.includes(r.id));
  }, [backtestHistory, selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= COMPARISON_CONFIG.MAX_SELECTIONS) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const getWinnerIndex = (metricConfig: MetricConfig): number => {
    if (selectedResults.length < 2) return -1;
    
    let bestIdx = 0;
    let bestValue = metricConfig.key === 'finalCapital' 
      ? selectedResults[0].finalCapital 
      : selectedResults[0].metrics[metricConfig.key as keyof BacktestResult['metrics']] as number;
    
    for (let i = 1; i < selectedResults.length; i++) {
      const value = metricConfig.key === 'finalCapital'
        ? selectedResults[i].finalCapital
        : selectedResults[i].metrics[metricConfig.key as keyof BacktestResult['metrics']] as number;
      
      const isBetter = metricConfig.higherIsBetter 
        ? value > bestValue 
        : value < bestValue;
      
      if (isBetter) {
        bestIdx = i;
        bestValue = value;
      }
    }
    
    return bestIdx;
  };

  // Build overlay equity curve data
  const equityCurveData = useMemo(() => {
    if (selectedResults.length === 0) return [];
    
    // Get all unique timestamps
    const allTimestamps = new Set<string>();
    selectedResults.forEach((r) => {
      r.equityCurve.forEach((p) => allTimestamps.add(p.timestamp));
    });
    
    const sortedTimestamps = Array.from(allTimestamps).sort();
    
    return sortedTimestamps.map((ts) => {
      const point: Record<string, number | string> = { timestamp: ts };
      selectedResults.forEach((r, idx) => {
        const match = r.equityCurve.find((p) => p.timestamp === ts);
        if (match) {
          point[`strategy${idx}`] = match.balance;
        }
      });
      return point;
    });
  }, [selectedResults]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!backtestHistory || backtestHistory.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No backtest results"
        description="Run some backtests first to compare their performance."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Compare Backtest Results
          </CardTitle>
          <CardDescription>
            Select 2-4 backtest results to compare their performance metrics side-by-side
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-2">
              {backtestHistory.map((result) => {
                const isSelected = selectedIds.includes(result.id);
                const returnValue = result.metrics.totalReturn;
                const isProfit = returnValue >= 0;
                
                return (
                  <div
                    key={result.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                    onClick={() => toggleSelection(result.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={!isSelected && selectedIds.length >= 4}
                      onCheckedChange={() => toggleSelection(result.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {result.strategyName || 'Unknown Strategy'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {result.pair}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(result.periodStart), 'MMM d, yyyy')} - {format(new Date(result.periodEnd), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <Badge className={isProfit ? 'bg-profit-muted text-profit' : 'bg-loss-muted text-loss'}>
                      {isProfit ? '+' : ''}{returnValue.toFixed(2)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {selectedIds.length} of 4 selected
            </div>
            {selectedIds.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportComparisonToPDF(selectedResults)}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export Comparison
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {selectedResults.length >= 2 ? (
        <>
          {/* Strategy Legend */}
          <div className="flex flex-wrap gap-2">
            {selectedResults.map((result, idx) => (
              <Badge key={result.id} className={COLOR_CLASSES[idx]}>
                {result.strategyName || `Strategy ${idx + 1}`} - {result.pair}
              </Badge>
            ))}
          </div>

          {/* Metrics Comparison Table - Enhanced with better styling */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Metric</TableHead>
                      {selectedResults.map((result, idx) => (
                        <TableHead key={result.id} className="text-center min-w-[120px]">
                          <div className="flex items-center justify-center gap-1">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CHART_COLORS[idx] }}
                            />
                            <span className="truncate max-w-[100px]">
                              {result.strategyName || `Strategy ${idx + 1}`}
                            </span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {METRICS_CONFIG.map((metric) => {
                      const winnerIdx = getWinnerIndex(metric);
                      
                      return (
                        <TableRow key={metric.key}>
                          <TableCell className="font-medium">{metric.label}</TableCell>
                          {selectedResults.map((result, idx) => {
                            const value = metric.key === 'finalCapital'
                              ? result.finalCapital
                              : result.metrics[metric.key as keyof BacktestResult['metrics']] as number;
                            const isWinner = idx === winnerIdx;
                            
                            return (
                              <TableCell key={result.id} className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <span className={cn(
                                    "font-mono",
                                    isWinner && "font-bold text-primary"
                                  )}>
                                    {metric.format(value)}
                                  </span>
                                  {isWinner && (
                                    <Trophy className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Equity Curves Overlay Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Equity Curves Comparison</CardTitle>
              <CardDescription>
                Overlay of portfolio balance over time for each strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurveData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'MMM d')}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        const idx = parseInt(name.replace('strategy', ''));
                        const strategyName = selectedResults[idx]?.strategyName || `Strategy ${idx + 1}`;
                        return [`$${value.toFixed(2)}`, strategyName];
                      }}
                      labelFormatter={(ts) => format(new Date(ts as string), 'MMM d, yyyy')}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend 
                      formatter={(value: string) => {
                        const idx = parseInt(value.replace('strategy', ''));
                        return selectedResults[idx]?.strategyName || `Strategy ${idx + 1}`;
                      }}
                    />
                    {selectedResults.map((_, idx) => (
                      <Line
                        key={idx}
                        type="monotone"
                        dataKey={`strategy${idx}`}
                        stroke={CHART_COLORS[idx]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Winner Summary - Enhanced with design tokens */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-[hsl(var(--chart-4))]" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {['totalReturn', 'winRate', 'sharpeRatio', 'maxDrawdown'].map((key) => {
                  const metric = METRICS_CONFIG.find((m) => m.key === key)!;
                  const winnerIdx = getWinnerIndex(metric);
                  const winner = selectedResults[winnerIdx];
                  const value = winner?.metrics[key as keyof BacktestResult['metrics']] as number;
                  
                  return (
                    <div key={key} className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="text-sm text-muted-foreground">{metric.label}</div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[winnerIdx] }}
                        />
                        <span className="font-bold">{winner?.strategyName}</span>
                      </div>
                      <div className="text-xl font-bold">{metric.format(value)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      ) : selectedIds.length === 1 ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>Select at least 2 backtest results to compare</span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
