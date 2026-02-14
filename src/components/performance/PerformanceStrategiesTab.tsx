/**
 * Performance Strategies Tab - Strategy performance table and comparison chart
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { formatWinRate, formatRatio } from "@/lib/formatters";
import { getQualityScoreLabel } from "@/hooks/use-strategy-performance";

interface StrategyPerf {
  strategy: { id: string; name: string };
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  avgRR: number;
  avgPnl: number;
  wins: number;
  losses: number;
  contribution: number;
}

interface PerformanceStrategiesTabProps {
  strategies: { id: string; name: string }[];
  strategyPerformance: StrategyPerf[];
  strategyPerformanceMap: Map<string, { aiQualityScore: number }>;
  formatCurrency: (v: number) => string;
}

export function PerformanceStrategiesTab({
  strategies,
  strategyPerformance,
  strategyPerformanceMap,
  formatCurrency,
}: PerformanceStrategiesTabProps) {
  if (strategies.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No strategies defined"
        description="Create trading strategies and assign them to your trades to see performance breakdowns here."
      />
    );
  }

  const activeStrategies = strategyPerformance.filter(sp => sp.totalTrades > 0);

  return (
    <div className="space-y-8">
      {/* Strategy Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Strategy Performance
          </CardTitle>
          <CardDescription>Performance breakdown by trading strategy with AI Quality Score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeStrategies.map((sp) => {
              const aiPerf = strategyPerformanceMap.get(sp.strategy.id);
              const qualityLabel = aiPerf ? getQualityScoreLabel(aiPerf.aiQualityScore) : null;
              
              return (
                <div key={sp.strategy.id} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-semibold">
                        {sp.strategy.name}
                      </Badge>
                      {qualityLabel && (
                        <Badge className={qualityLabel.colorClass}>
                          AI: {aiPerf?.aiQualityScore ?? 0} - {qualityLabel.label}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {sp.totalTrades} trades
                      </span>
                    </div>
                    <div className={`font-bold ${sp.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {sp.totalPnl >= 0 ? '+' : ''}{formatCurrency(sp.totalPnl)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Win Rate</span>
                      <div className="font-medium">{formatWinRate(sp.winRate)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg R:R</span>
                      <div className="font-medium">{formatRatio(sp.avgRR)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg P&L</span>
                      <div className="font-medium">{formatCurrency(sp.avgPnl)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">W/L</span>
                      <div className="font-medium">{sp.wins}/{sp.losses}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contribution</span>
                      <div className="font-medium">{formatWinRate(sp.contribution)}</div>
                    </div>
                  </div>
                  
                  <Progress value={sp.winRate} className="h-2" />
                </div>
              );
            })}

            {activeStrategies.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No strategy data available. Assign strategies to your trades to see performance here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Comparison</CardTitle>
          <CardDescription>P&L contribution by strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {activeStrategies.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeStrategies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="strategy.name" width={100} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="totalPnl" radius={4}>
                    {activeStrategies.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.totalPnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--loss))'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No strategy data to display
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
