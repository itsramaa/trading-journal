/**
 * Weekly Report Export Hook
 * Generate and download weekly trading performance report as PDF
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { useState } from 'react';

interface WeeklyStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  grossPnl: number;
  totalFees: number;
  netPnl: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  topPairs: { pair: string; pnl: number; trades: number }[];
  tradingDays: number;
}

interface DailyPnL {
  date: string;
  pnl: number;
  trades: number;
}

export function useWeeklyReportExport() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const calculateWeeklyStats = async (
    weekStart: Date,
    weekEnd: Date
  ): Promise<{ stats: WeeklyStats; dailyPnl: DailyPnL[] } | null> => {
    if (!user) return null;

    // Get active trade mode for mode isolation (M-31)
    const { data: settings } = await supabase
      .from('user_settings')
      .select('active_trade_mode')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const activeMode = settings?.active_trade_mode || 'live';

    const { data: trades, error } = await supabase
      .from('trade_entries')
      .select('realized_pnl, commission, pair, trade_date, direction')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .eq('trade_mode', activeMode)
      .gte('trade_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('trade_date', format(weekEnd, 'yyyy-MM-dd'));

    if (error || !trades || trades.length === 0) {
      return null;
    }

    const winningTrades = trades.filter((t) => (t.realized_pnl || 0) > 0);
    const losingTrades = trades.filter((t) => (t.realized_pnl || 0) < 0);
    const breakevenTrades = trades.filter((t) => (t.realized_pnl || 0) === 0);

    const grossPnl = trades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const totalFees = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    const netPnl = grossPnl - totalFees;

    const totalWins = winningTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0));

    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map((t) => t.realized_pnl || 0))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map((t) => t.realized_pnl || 0))
      : 0;

    // Calculate top pairs
    const pairStats = new Map<string, { pnl: number; trades: number }>();
    trades.forEach((t) => {
      const current = pairStats.get(t.pair) || { pnl: 0, trades: 0 };
      current.pnl += t.realized_pnl || 0;
      current.trades += 1;
      pairStats.set(t.pair, current);
    });

    const topPairs = Array.from(pairStats.entries())
      .map(([pair, stats]) => ({ pair, ...stats }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    // Unique trading days
    const uniqueDays = new Set(trades.map((t) => t.trade_date.split('T')[0]));

    // Daily PnL breakdown
    const dailyMap = new Map<string, { pnl: number; trades: number }>();
    trades.forEach((t) => {
      const date = t.trade_date.split('T')[0];
      const current = dailyMap.get(date) || { pnl: 0, trades: 0 };
      current.pnl += t.realized_pnl || 0;
      current.trades += 1;
      dailyMap.set(date, current);
    });

    const dailyPnl = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      stats: {
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        breakevenTrades: breakevenTrades.length,
        grossPnl,
        totalFees,
        netPnl,
        winRate: (winningTrades.length / trades.length) * 100,
        avgWin,
        avgLoss,
        profitFactor,
        largestWin,
        largestLoss,
        topPairs,
        tradingDays: uniqueDays.size,
      },
      dailyPnl,
    };
  };

  const generatePDF = (
    stats: WeeklyStats,
    dailyPnl: DailyPnL[],
    weekStart: Date,
    weekEnd: Date
  ): void => {
    const doc = new jsPDF();
    const isProfit = stats.netPnl >= 0;

    // Header with dark theme style
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, 210, 45, 'F');

    // Title
    doc.setFontSize(22);
    doc.setTextColor(250, 250, 250);
    doc.text('📊 Weekly Trading Report', 105, 18, { align: 'center' });

    // Week range
    doc.setFontSize(11);
    doc.setTextColor(161, 161, 170); // zinc-400
    doc.text(
      `${format(weekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`,
      105,
      28,
      { align: 'center' }
    );

    // Generated date
    doc.setFontSize(9);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 105, 36, { align: 'center' });

    // Net P&L Hero Section
    doc.setFillColor(39, 39, 42); // zinc-800
    doc.rect(14, 50, 182, 30, 'F');

    doc.setFontSize(12);
    doc.setTextColor(161, 161, 170);
    doc.text('Net P&L', 105, 60, { align: 'center' });

    doc.setFontSize(28);
    doc.setTextColor(isProfit ? 34 : 239, isProfit ? 197 : 68, isProfit ? 94 : 68);
    const pnlSign = stats.netPnl >= 0 ? '+' : '';
    doc.text(`${pnlSign}$${stats.netPnl.toFixed(2)}`, 105, 74, { align: 'center' });

    // Key Metrics Grid
    let currentY = 90;

    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: [
        ['Total Trades', stats.totalTrades.toString(), 'Win Rate', `${stats.winRate.toFixed(1)}%`],
        ['Winning', `🟢 ${stats.winningTrades}`, 'Losing', `🔴 ${stats.losingTrades}`],
        ['Profit Factor', stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), 'Trading Days', stats.tradingDays.toString()],
        ['Avg Win', `$${stats.avgWin.toFixed(2)}`, 'Avg Loss', `-$${stats.avgLoss.toFixed(2)}`],
        ['Largest Win', `$${stats.largestWin.toFixed(2)}`, 'Largest Loss', `$${stats.largestLoss.toFixed(2)}`],
        ['Gross P&L', `$${stats.grossPnl.toFixed(2)}`, 'Total Fees', `$${stats.totalFees.toFixed(2)}`],
      ],
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Daily P&L Breakdown
    if (dailyPnl.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Daily P&L Breakdown', 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'P&L', 'Trades']],
        body: dailyPnl.map((day) => [
          format(new Date(day.date), 'EEE, MMM d'),
          `${day.pnl >= 0 ? '+' : ''}$${day.pnl.toFixed(2)}`,
          day.trades.toString(),
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 30, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const value = parseFloat(data.cell.text[0].replace(/[+$]/g, ''));
            if (value >= 0) {
              data.cell.styles.textColor = [34, 197, 94];
            } else {
              data.cell.styles.textColor = [239, 68, 68];
            }
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Top Pairs
    if (stats.topPairs.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Top Performing Pairs', 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Pair', 'P&L', 'Trades']],
        body: stats.topPairs.map((p) => [
          p.pair,
          `${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)}`,
          p.trades.toString(),
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [147, 51, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 30, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const value = parseFloat(data.cell.text[0].replace(/[+$]/g, ''));
            if (value >= 0) {
              data.cell.styles.textColor = [34, 197, 94];
            } else {
              data.cell.styles.textColor = [239, 68, 68];
            }
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Deriverse Weekly Report | Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save
    const filename = `weekly_report_${format(weekStart, 'yyyyMMdd')}_${format(weekEnd, 'yyyyMMdd')}.pdf`;
    doc.save(filename);
  };

  const exportCurrentWeek = async () => {
    if (!user) {
      toast.error('Please login to export report');
      return;
    }

    setIsGenerating(true);
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const result = await calculateWeeklyStats(weekStart, weekEnd);

      if (!result || result.stats.totalTrades === 0) {
        toast.info('No trades found for this week');
        return;
      }

      generatePDF(result.stats, result.dailyPnl, weekStart, weekEnd);
      toast.success('Weekly report downloaded');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportLastWeek = async () => {
    if (!user) {
      toast.error('Please login to export report');
      return;
    }

    setIsGenerating(true);
    try {
      const lastWeekDate = subWeeks(new Date(), 1);
      const weekStart = startOfWeek(lastWeekDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(lastWeekDate, { weekStartsOn: 1 });

      const result = await calculateWeeklyStats(weekStart, weekEnd);

      if (!result || result.stats.totalTrades === 0) {
        toast.info('No trades found for last week');
        return;
      }

      generatePDF(result.stats, result.dailyPnl, weekStart, weekEnd);
      toast.success('Weekly report downloaded');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportCustomWeek = async (weekStart: Date, weekEnd: Date) => {
    if (!user) {
      toast.error('Please login to export report');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await calculateWeeklyStats(weekStart, weekEnd);

      if (!result || result.stats.totalTrades === 0) {
        toast.info('No trades found for selected period');
        return;
      }

      generatePDF(result.stats, result.dailyPnl, weekStart, weekEnd);
      toast.success('Weekly report downloaded');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    exportCurrentWeek,
    exportLastWeek,
    exportCustomWeek,
    isGenerating,
  };
}
