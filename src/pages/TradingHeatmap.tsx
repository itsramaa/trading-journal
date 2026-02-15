/**
 * Trading Heatmap Page - Advanced analytics for time-based performance
 * Features: Filters, Session Breakdown, Streak Analysis, Export
 */
import { useState, useMemo } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { 
  Grid3X3, TrendingUp, TrendingDown, Download, Sun, Moon, Sunrise,
  Flame, Snowflake
} from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { MetricsGridSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { TradingHeatmap } from "@/components/analytics/charts/TradingHeatmap";
import { formatWinRate } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { getTradeSession, formatSessionTimeLocal, SESSION_LABELS, type TradingSession } from "@/lib/session-utils";
import { Link } from "react-router-dom";

type DateRangeOption = '7d' | '30d' | '90d' | 'all';

interface SessionStats {
  trades: number;
  pnl: number;
  wins: number;
  winRate: number;
}

type SessionStatsMap = Record<TradingSession, SessionStats>;

interface StreakData {
  longestWin: number;
  longestLoss: number;
  currentStreak: number;
  isWinning: boolean;
}

// Session card config — module-level constant for render stability
const SESSION_CONFIG = [
  { key: 'sydney' as const, icon: Moon, colorClass: 'text-[hsl(var(--chart-3))]' },
  { key: 'tokyo' as const, icon: Moon, colorClass: 'text-[hsl(var(--chart-5))]' },
  { key: 'london' as const, icon: Sunrise, colorClass: 'text-[hsl(var(--chart-4))]' },
  { key: 'new_york' as const, icon: Sun, colorClass: 'text-[hsl(var(--chart-2))]' },
];

// Session tooltip descriptions (UTC hours)
const SESSION_TOOLTIPS: Record<string, string> = {
  sydney: "Trades executed during the Sydney session (21:00–06:00 UTC). Time shown in your local timezone.",
  tokyo: "Trades executed during the Tokyo session (00:00–09:00 UTC). Time shown in your local timezone.",
  london: "Trades executed during the London session (08:00–17:00 UTC). Time shown in your local timezone.",
  new_york: "Trades executed during the New York session (13:00–22:00 UTC). Time shown in your local timezone.",
};

export default function TradingHeatmapPage() {
  const { data: trades, isLoading } = useModeFilteredTrades();
  const { formatPnl } = useCurrencyConversion();
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [selectedPair, setSelectedPair] = useState<string>('all');

  // Get unique pairs from trades
  const availablePairs = useMemo(() => {
    if (!trades) return ['all'];
    const pairs = new Set(trades.filter(t => t.pair).map(t => t.pair!));
    return ['all', ...Array.from(pairs).sort()];
  }, [trades]);

  // Filter trades by date range and pair
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    
    let result = trades.filter(t => t.status === 'closed');
    
    // Date filter
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(t => new Date(t.trade_date) >= cutoff);
    }
    
    // Pair filter
    if (selectedPair !== 'all') {
      result = result.filter(t => t.pair === selectedPair);
    }
    
    return result;
  }, [trades, dateRange, selectedPair]);

  // Session stats - uses UTC-based session detection aligned with DB
  const sessionStats = useMemo((): SessionStatsMap => {
    const sessions: SessionStatsMap = {
      sydney: { trades: 0, pnl: 0, wins: 0, winRate: 0 },
      tokyo: { trades: 0, pnl: 0, wins: 0, winRate: 0 },
      london: { trades: 0, pnl: 0, wins: 0, winRate: 0 },
      new_york: { trades: 0, pnl: 0, wins: 0, winRate: 0 },
      other: { trades: 0, pnl: 0, wins: 0, winRate: 0 },
    };
    
    filteredTrades.forEach(trade => {
      const session = getTradeSession(trade);
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      
      sessions[session].trades++;
      sessions[session].pnl += pnl;
      if (pnl > 0) sessions[session].wins++;
    });
    
    // Calculate win rates
    Object.values(sessions).forEach(s => {
      s.winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
    });
    
    return sessions;
  }, [filteredTrades]);

  // Streak analysis
  const streakData = useMemo((): StreakData => {
    if (filteredTrades.length === 0) {
      return { longestWin: 0, longestLoss: 0, currentStreak: 0, isWinning: true };
    }
    
    // Sort trades by date
    const sorted = [...filteredTrades].sort((a, b) => 
      new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );
    
    let longestWin = 0;
    let longestLoss = 0;
    let currentWin = 0;
    let currentLoss = 0;
    
    sorted.forEach(trade => {
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      if (pnl > 0) {
        currentWin++;
        currentLoss = 0;
        longestWin = Math.max(longestWin, currentWin);
      } else {
        currentLoss++;
        currentWin = 0;
        longestLoss = Math.max(longestLoss, currentLoss);
      }
    });
    
    return {
      longestWin,
      longestLoss,
      currentStreak: currentWin > 0 ? currentWin : -currentLoss,
      isWinning: currentWin > 0,
    };
  }, [filteredTrades]);

  // Best and worst hours
  const hourlyStats = useMemo(() => {
    const hourMap = new Map<number, { trades: number; pnl: number; wins: number }>();
    
    filteredTrades.forEach(trade => {
      const hour = new Date(trade.trade_date).getHours();
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      const existing = hourMap.get(hour) || { trades: 0, pnl: 0, wins: 0 };
      
      existing.trades++;
      existing.pnl += pnl;
      if (pnl > 0) existing.wins++;
      
      hourMap.set(hour, existing);
    });
    
    const hours = Array.from(hourMap.entries())
      .filter(([_, v]) => v.trades >= 2) // Min 2 trades
      .map(([hour, data]) => ({
        hour,
        ...data,
        winRate: (data.wins / data.trades) * 100,
      }));
    
    const best = hours.length > 0 
      ? hours.reduce((a, b) => a.pnl > b.pnl ? a : b)
      : null;
    const worst = hours.length > 0 
      ? hours.reduce((a, b) => a.pnl < b.pnl ? a : b)
      : null;
    
    return { best, worst };
  }, [filteredTrades]);

  // Memoize total P&L to avoid duplicate reduce calls in footer
  const totalFilteredPnl = useMemo(() => {
    return filteredTrades.reduce((sum, t) => sum + (t.realized_pnl ?? t.pnl ?? 0), 0);
  }, [filteredTrades]);

  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Grid3X3}
          title="Trading Heatmap"
          description="Analyze your trading performance by time of day and day of week"
        />
        <MetricsGridSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const closedTrades = trades?.filter(t => t.status === 'closed') || [];

  return (
    <ErrorBoundary title="Trading Heatmap failed to load">
      <div className="space-y-6" role="region" aria-label="Trading Heatmap Analytics">
        {/* Page Header with Filters */}
        <TooltipProvider>
          <PageHeader
            icon={Grid3X3}
            title="Trading Heatmap"
            description="Analyze your trading performance by time of day and day of week"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent>Filter heatmap and all stats by time period.</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePairs.map(pair => (
                        <SelectItem key={pair} value={pair}>
                          {pair === 'all' ? 'All Pairs' : pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent>Filter by trading pair. Only pairs with closed trades are shown.</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  asChild
                >
                  <Link to="/export?tab=analytics">
                    <Download className="h-4 w-4" />
                    Export
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export heatmap data to CSV or PDF from the Export page.</TooltipContent>
            </Tooltip>
          </PageHeader>
        </TooltipProvider>

          {closedTrades.length === 0 ? (
            <EmptyState
              icon={Grid3X3}
              title="No trade data"
              description="Complete some trades to see your trading heatmap."
            />
          ) : (
            <>
              {/* Session Performance Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                {SESSION_CONFIG.map(({ key, icon: Icon, colorClass }) => {
                  const s = sessionStats[key];
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${colorClass}`} />
                          {SESSION_LABELS[key]}
                          <InfoTooltip content={SESSION_TOOLTIPS[key]} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="ml-auto text-xs">{formatSessionTimeLocal(key)}</Badge>
                            </TooltipTrigger>
                            <TooltipContent>Session hours converted to your local timezone.</TooltipContent>
                          </Tooltip>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-xl font-bold font-mono-numbers ${s.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatPnl(s.pnl)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-mono-numbers">{s.trades}</span> trades • <span className="font-mono-numbers">{formatWinRate(s.winRate)}</span> win rate
                          {s.trades > 0 && s.trades < 10 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs opacity-60 ml-1 cursor-help">(low sample)</span>
                              </TooltipTrigger>
                              <TooltipContent>Fewer than 10 trades. Statistics may not be reliable.</TooltipContent>
                            </Tooltip>
                          )}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Main Heatmap */}
              <TradingHeatmap trades={filteredTrades} />

              {/* Stats Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Best Hour */}
                {(() => {
                  const bestLabel = hourlyStats.best
                    ? (hourlyStats.best.pnl < 0 ? 'Least Loss Hour' : 'Best Hour')
                    : 'Best Hour';
                  const worstLabel = hourlyStats.worst
                    ? (hourlyStats.worst.pnl > 0 ? 'Smallest Gain Hour' : 'Worst Hour')
                    : 'Worst Hour';
                  const showWorst = !hourlyStats.best || !hourlyStats.worst
                    || hourlyStats.best.hour !== hourlyStats.worst.hour;
                  
                  return (
                    <>
                      <Card className="border-profit/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-profit" />
                            {bestLabel}
                            <InfoTooltip content="The 1-hour block with the highest total P&L (minimum 2 trades required)." />
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {hourlyStats.best ? (
                            <>
                              <div className="text-lg font-bold font-mono-numbers">{formatHour(hourlyStats.best.hour)}</div>
                              <p className={`text-sm font-mono-numbers ${hourlyStats.best.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {formatPnl(hourlyStats.best.pnl)} ({hourlyStats.best.trades} trades)
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not enough data</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border-loss/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-loss" />
                            {worstLabel}
                            <InfoTooltip content="The 1-hour block with the lowest total P&L (minimum 2 trades required)." />
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {showWorst && hourlyStats.worst ? (
                            <>
                              <div className="text-lg font-bold font-mono-numbers">{formatHour(hourlyStats.worst.hour)}</div>
                              <p className={`text-sm font-mono-numbers ${hourlyStats.worst.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {formatPnl(hourlyStats.worst.pnl)} ({hourlyStats.worst.trades} trades)
                              </p>
                            </>
                          ) : !showWorst ? (
                            <p className="text-sm text-muted-foreground">Same as {bestLabel.toLowerCase()}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not enough data</p>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}

                {/* Longest Win Streak */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Flame className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                      Longest Win Streak
                      <InfoTooltip content="Maximum consecutive profitable trades in the selected period." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {streakData.longestWin === 0 ? (
                      <>
                        <div className="text-lg font-bold text-muted-foreground">--</div>
                        <p className="text-sm text-muted-foreground">No winning trades in selected period</p>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-bold font-mono-numbers">{streakData.longestWin} {streakData.longestWin === 1 ? 'trade' : 'trades'}</div>
                        <p className="text-sm text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">Current:</span>
                            </TooltipTrigger>
                            <TooltipContent>Your active streak as of the most recent trade.</TooltipContent>
                          </Tooltip>
                          {' '}
                          <span className="font-mono-numbers">
                            {streakData.currentStreak > 0 ? `${streakData.currentStreak} ${streakData.currentStreak === 1 ? 'win' : 'wins'}` : 'N/A'}
                          </span>
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Longest Loss Streak */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Snowflake className="h-4 w-4 text-[hsl(var(--chart-5))]" />
                      Longest Loss Streak
                      <InfoTooltip content="Maximum consecutive losing trades in the selected period." />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {streakData.longestLoss === 0 ? (
                      <>
                        <div className="text-lg font-bold text-muted-foreground">--</div>
                        <p className="text-sm text-muted-foreground">No losing trades in selected period</p>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-bold font-mono-numbers">{streakData.longestLoss} {streakData.longestLoss === 1 ? 'trade' : 'trades'}</div>
                        <p className="text-sm text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">Current:</span>
                            </TooltipTrigger>
                            <TooltipContent>Your active streak as of the most recent trade.</TooltipContent>
                          </Tooltip>
                          {' '}
                          <span className="font-mono-numbers">
                            {streakData.currentStreak < 0 ? `${Math.abs(streakData.currentStreak)} ${Math.abs(streakData.currentStreak) === 1 ? 'loss' : 'losses'}` : 'N/A'}
                          </span>
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                <span>
                  Showing <span className="font-mono-numbers">{filteredTrades.length}</span> closed trades
                  {selectedPair !== 'all' && ` for ${selectedPair}`}
                  {dateRange !== 'all' && ` in last ${dateRange.replace('d', ' days')}`}
                  {filteredTrades.length < 20 && filteredTrades.length > 0 && (
                    <span className="ml-1 opacity-60">— Sample size is limited</span>
                  )}
                </span>
                <span>
                  Total P&L: <span className={`font-mono-numbers ${totalFilteredPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(totalFilteredPnl)}
                  </span>
                </span>
              </div>
            </>
          )}
      </div>
    </ErrorBoundary>
  );
}
