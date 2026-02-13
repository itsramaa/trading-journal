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
import { 
  Grid3X3, TrendingUp, TrendingDown, Clock, Download, Sun, Moon, Sunrise,
  Trophy, AlertTriangle, Flame, Snowflake
} from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { TradingHeatmap } from "@/components/analytics/TradingHeatmap";
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
      const pnl = trade.realized_pnl || trade.pnl || 0;
      
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
      const pnl = trade.realized_pnl || trade.pnl || 0;
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
      const pnl = trade.realized_pnl || trade.pnl || 0;
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

  // Export to CSV
  const exportToCSV = () => {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const HOURS = [0, 4, 8, 12, 16, 20];
    
    // Build grid data
    const grid = new Map<string, { trades: number; wins: number; pnl: number }>();
    
    filteredTrades.forEach(trade => {
      const d = new Date(trade.trade_date);
      const day = d.getDay();
      const hour = Math.floor(d.getHours() / 4) * 4;
      const key = `${day}-${hour}`;
      
      const existing = grid.get(key) || { trades: 0, wins: 0, pnl: 0 };
      existing.trades++;
      const pnl = trade.realized_pnl || trade.pnl || 0;
      existing.pnl += pnl;
      if (pnl > 0) existing.wins++;
      grid.set(key, existing);
    });
    
    // Build CSV
    const rows = ['Day,Time,Trades,Wins,WinRate,TotalPNL'];
    
    DAYS.forEach((dayName, dayIdx) => {
      HOURS.forEach(hour => {
        const data = grid.get(`${dayIdx}-${hour}`);
        const trades = data?.trades || 0;
        const wins = data?.wins || 0;
        const winRate = trades > 0 ? ((wins / trades) * 100).toFixed(1) : '0.0';
        const pnl = data?.pnl?.toFixed(2) || '0.00';
        rows.push(`${dayName},${hour.toString().padStart(2, '0')}:00,${trades},${wins},${winRate}%,$${pnl}`);
      });
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-heatmap-${dateRange}-${selectedPair}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Grid3X3}
          title="Trading Heatmap"
          description="Loading..."
        />
      </div>
    );
  }

  const closedTrades = trades?.filter(t => t.status === 'closed') || [];

  return (
    <div className="space-y-6">
      {/* Page Header with Filters */}
        <PageHeader
          icon={Grid3X3}
          title="Trading Heatmap"
          description="Analyze your trading performance by time of day and day of week"
        >
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
        </PageHeader>

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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4 text-purple-500" />
                    {SESSION_LABELS.sydney}
                    <Badge variant="outline" className="ml-auto text-xs">{formatSessionTimeLocal('sydney')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${sessionStats.sydney.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(sessionStats.sydney.pnl)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sessionStats.sydney.trades} trades • {formatWinRate(sessionStats.sydney.winRate)} win rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4 text-blue-500" />
                    {SESSION_LABELS.tokyo}
                    <Badge variant="outline" className="ml-auto text-xs">{formatSessionTimeLocal('tokyo')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${sessionStats.tokyo.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(sessionStats.tokyo.pnl)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sessionStats.tokyo.trades} trades • {formatWinRate(sessionStats.tokyo.winRate)} win rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sunrise className="h-4 w-4 text-orange-500" />
                    {SESSION_LABELS.london}
                    <Badge variant="outline" className="ml-auto text-xs">{formatSessionTimeLocal('london')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${sessionStats.london.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(sessionStats.london.pnl)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sessionStats.london.trades} trades • {formatWinRate(sessionStats.london.winRate)} win rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sun className="h-4 w-4 text-yellow-500" />
                    {SESSION_LABELS.new_york}
                    <Badge variant="outline" className="ml-auto text-xs">{formatSessionTimeLocal('new_york')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${sessionStats.new_york.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(sessionStats.new_york.pnl)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sessionStats.new_york.trades} trades • {formatWinRate(sessionStats.new_york.winRate)} win rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Heatmap */}
            <TradingHeatmap trades={filteredTrades} />

            {/* Stats Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Best Hour */}
              <Card className="border-profit/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-profit" />
                    Best Hour
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hourlyStats.best ? (
                    <>
                      <div className="text-lg font-bold">{formatHour(hourlyStats.best.hour)}</div>
                      <p className="text-sm text-profit">
                        {formatPnl(hourlyStats.best.pnl)} ({hourlyStats.best.trades} trades)
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not enough data</p>
                  )}
                </CardContent>
              </Card>

              {/* Worst Hour */}
              <Card className="border-loss/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-loss" />
                    Worst Hour
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hourlyStats.worst ? (
                    <>
                      <div className="text-lg font-bold">{formatHour(hourlyStats.worst.hour)}</div>
                      <p className="text-sm text-loss">
                        {formatPnl(hourlyStats.worst.pnl)} ({hourlyStats.worst.trades} trades)
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not enough data</p>
                  )}
                </CardContent>
              </Card>

              {/* Longest Win Streak */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Longest Win Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{streakData.longestWin} trades</div>
                  <p className="text-sm text-muted-foreground">
                    Current: {streakData.currentStreak > 0 ? `${streakData.currentStreak} wins` : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              {/* Longest Loss Streak */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-blue-500" />
                    Longest Loss Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{streakData.longestLoss} trades</div>
                  <p className="text-sm text-muted-foreground">
                    Current: {streakData.currentStreak < 0 ? `${Math.abs(streakData.currentStreak)} losses` : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Summary Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
              <span>
                Showing {filteredTrades.length} closed trades
                {selectedPair !== 'all' && ` for ${selectedPair}`}
                {dateRange !== 'all' && ` in last ${dateRange.replace('d', ' days')}`}
              </span>
              <span>
                Total P&L: <span className={filteredTrades.reduce((sum, t) => sum + (t.realized_pnl || t.pnl || 0), 0) >= 0 ? 'text-profit' : 'text-loss'}>
                  {formatPnl(filteredTrades.reduce((sum, t) => sum + (t.realized_pnl || t.pnl || 0), 0))}
                </span>
              </span>
            </div>
          </>
        )}
    </div>
  );
}
