/**
 * Heatmap CSV Export - Reusable heatmap grid export logic
 */

interface HeatmapTrade {
  trade_date: string;
  realized_pnl?: number | null;
  pnl?: number | null;
}

export function exportHeatmapCSV(trades: HeatmapTrade[], options?: { dateRange?: string; pair?: string }) {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = [0, 4, 8, 12, 16, 20];

  const grid = new Map<string, { trades: number; wins: number; pnl: number }>();

  trades.forEach(trade => {
    const d = new Date(trade.trade_date);
    const day = d.getDay();
    const hour = Math.floor(d.getHours() / 4) * 4;
    const key = `${day}-${hour}`;

    const existing = grid.get(key) || { trades: 0, wins: 0, pnl: 0 };
    existing.trades++;
    const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
    existing.pnl += pnl;
    if (pnl > 0) existing.wins++;
    grid.set(key, existing);
  });

  const rows = ['Day,Time,Trades,Wins,WinRate,TotalPNL'];

  DAYS.forEach((dayName, dayIdx) => {
    HOURS.forEach(hour => {
      const data = grid.get(`${dayIdx}-${hour}`);
      const tradeCount = data?.trades || 0;
      const wins = data?.wins || 0;
      const winRate = tradeCount > 0 ? ((wins / tradeCount) * 100).toFixed(1) : '0.0';
      const pnl = data?.pnl?.toFixed(2) || '0.00';
      rows.push(`${dayName},${hour.toString().padStart(2, '0')}:00,${tradeCount},${wins},${winRate}%,${pnl}`);
    });
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading-heatmap-${options?.dateRange || 'all'}-${options?.pair || 'all'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
