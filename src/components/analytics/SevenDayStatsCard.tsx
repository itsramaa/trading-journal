/**
 * SevenDayStatsCard - 7-Day trading stats widget
 * Moved from Dashboard to Performance page per UX audit
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Flame,
  Activity,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

export function SevenDayStatsCard() {
  const { data: trades = [] } = useModeFilteredTrades();
  const { formatPnl } = useCurrencyConversion();

  // 7-Day Quick Stats
  const sevenDayStats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTrades = (trades || [])
      .filter(t => t.status === 'closed' && new Date(t.trade_date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
    
    // Calculate streak (consecutive wins or losses from most recent)
    let streak = { type: 'win' as 'win' | 'loss', count: 0 };
    if (recentTrades.length > 0) {
      const firstResult = recentTrades[0].result;
      streak.type = firstResult === 'win' ? 'win' : 'loss';
      for (const trade of recentTrades) {
        if (trade.result === streak.type) {
          streak.count++;
        } else {
          break;
        }
      }
    }
    
    // Calculate best/worst day
    const byDay = recentTrades.reduce((acc, t) => {
      const day = new Date(t.trade_date).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + (t.realized_pnl || 0);
      return acc;
    }, {} as Record<string, number>);
    
    const days = Object.entries(byDay).sort((a, b) => b[1] - a[1]);
    const bestDay = days[0] ? { date: days[0][0], pnl: days[0][1] } : { date: '', pnl: 0 };
    const worstDay = days[days.length - 1] ? { date: days[days.length - 1][0], pnl: days[days.length - 1][1] } : { date: '', pnl: 0 };
    
    return { streak, bestDay, worstDay, trades7d: recentTrades.length };
  }, [trades]);

  const hasTrades = trades.filter(t => t.status === 'closed').length > 0;

  if (!hasTrades) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">7-Day Stats</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4" role="group" aria-label="7-day trading statistics summary">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className={`text-2xl font-bold ${sevenDayStats.streak.type === 'win' ? 'text-profit' : 'text-loss'}`}>
                  {sevenDayStats.streak.count} {sevenDayStats.streak.type === 'win' ? 'W' : 'L'}
                </p>
              </div>
              <Flame className={`h-8 w-8 ${sevenDayStats.streak.type === 'win' ? 'text-profit' : 'text-loss'}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trades (7D)</p>
                <p className="text-2xl font-bold">{sevenDayStats.trades7d}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Day</p>
                <p className={`text-2xl font-bold ${sevenDayStats.bestDay.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPnl(sevenDayStats.bestDay.pnl)}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-profit" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Worst Day</p>
                <p className={`text-2xl font-bold ${sevenDayStats.worstDay.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatPnl(sevenDayStats.worstDay.pnl)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-loss" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
