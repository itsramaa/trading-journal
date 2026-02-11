/**
 * Performance Export Hook
 * Export P&L reports as CSV or PDF
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { DateRange } from '@/components/trading/DateRangeFilter';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface TradeData {
  id: string;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  trade_date: string;
  status: string;
  fees?: number | null;
}

interface PerformanceStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  avgRR: number;
  expectancy: number;
}

interface SymbolBreakdown {
  symbol: string;
  trades: number;
  pnl: number;
  fees: number;
  funding: number;
  net: number;
}

interface ExportData {
  trades: TradeData[];
  stats: PerformanceStats;
  dateRange: DateRange;
  symbolBreakdown?: SymbolBreakdown[];
  weeklyData?: { date: string; grossPnl: number; netPnl: number; trades: number }[];
}

export function usePerformanceExport() {
  
  const exportToCSV = (data: ExportData) => {
    const { trades, stats, dateRange, symbolBreakdown, weeklyData } = data;
    
    let csv = '';
    
    // Header
    csv += 'PERFORMANCE REPORT\n';
    csv += `Generated,${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
    if (dateRange.from) {
      csv += `Period Start,${format(dateRange.from, 'yyyy-MM-dd')}\n`;
    }
    if (dateRange.to) {
      csv += `Period End,${format(dateRange.to, 'yyyy-MM-dd')}\n`;
    }
    csv += '\n';
    
    // Performance Summary
    csv += 'PERFORMANCE SUMMARY\n';
    csv += `Total Trades,${stats.totalTrades}\n`;
    csv += `Win Rate,${stats.winRate.toFixed(1)}%\n`;
    csv += `Profit Factor,${stats.profitFactor === Infinity ? 'Infinity' : stats.profitFactor.toFixed(2)}\n`;
    csv += `Total P&L,$${stats.totalPnl.toFixed(2)}\n`;
    csv += `Avg Win,$${stats.avgWin.toFixed(2)}\n`;
    csv += `Avg Loss,$${stats.avgLoss.toFixed(2)}\n`;
    csv += `Max Drawdown,${stats.maxDrawdownPercent.toFixed(2)}%\n`;
    csv += `Sharpe Ratio,${stats.sharpeRatio.toFixed(2)}\n`;
    csv += `Avg R:R,${stats.avgRR.toFixed(2)}\n`;
    csv += `Expectancy,$${stats.expectancy.toFixed(2)}\n`;
    csv += '\n';
    
    // Weekly Data (if available)
    if (weeklyData && weeklyData.length > 0) {
      csv += 'WEEKLY P&L\n';
      csv += 'Date,Gross P&L,Net P&L,Trades\n';
      weeklyData.forEach(day => {
        csv += `${day.date},$${day.grossPnl.toFixed(2)},$${day.netPnl.toFixed(2)},${day.trades}\n`;
      });
      csv += '\n';
    }
    
    // Symbol Breakdown (if available)
    if (symbolBreakdown && symbolBreakdown.length > 0) {
      csv += 'SYMBOL BREAKDOWN\n';
      csv += 'Symbol,Trades,P&L,Fees,Funding,Net\n';
      symbolBreakdown.forEach(s => {
        csv += `${s.symbol},${s.trades},$${s.pnl.toFixed(2)},$${s.fees.toFixed(2)},$${s.funding.toFixed(2)},$${s.net.toFixed(2)}\n`;
      });
      csv += '\n';
    }
    
    // Trade History
    csv += 'TRADE HISTORY\n';
    csv += 'Date,Pair,Direction,Entry,Exit,Qty,P&L,Status\n';
    trades.forEach(trade => {
      csv += `${trade.trade_date},`;
      csv += `${trade.pair},`;
      csv += `${trade.direction},`;
      csv += `$${trade.entry_price.toFixed(2)},`;
      csv += `${trade.exit_price ? '$' + trade.exit_price.toFixed(2) : '-'},`;
      csv += `${trade.quantity},`;
      csv += `${trade.pnl !== null ? '$' + trade.pnl.toFixed(2) : '-'},`;
      csv += `${trade.status}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `performance_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToPDF = (data: ExportData) => {
    const { trades, stats, dateRange, symbolBreakdown, weeklyData } = data;
    const doc = new jsPDF();
    const isProfit = stats.totalPnl > 0;
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Performance Report', 105, 20, { align: 'center' });
    
    // Date info
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 105, 28, { align: 'center' });
    if (dateRange.from || dateRange.to) {
      const periodText = `Period: ${dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Start'} - ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Now'}`;
      doc.text(periodText, 105, 34, { align: 'center' });
    }
    
    // Performance Summary
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Performance Summary', 14, 48);
    
    autoTable(doc, {
      startY: 53,
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: [
        ['Total Trades', stats.totalTrades.toString(), 'Win Rate', `${stats.winRate.toFixed(1)}%`],
        ['Total P&L', `$${stats.totalPnl.toFixed(2)}`, 'Profit Factor', stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)],
        ['Avg Win', `$${stats.avgWin.toFixed(2)}`, 'Avg Loss', `$${stats.avgLoss.toFixed(2)}`],
        ['Max Drawdown', `${stats.maxDrawdownPercent.toFixed(2)}%`, 'Sharpe Ratio', stats.sharpeRatio.toFixed(2)],
        ['Avg R:R', `${stats.avgRR.toFixed(2)}:1`, 'Expectancy', `$${stats.expectancy.toFixed(2)}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
    
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    
    // Weekly Data (if available)
    if (weeklyData && weeklyData.length > 0) {
      doc.setFontSize(12);
      doc.text('7-Day P&L', 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Gross P&L', 'Net P&L', 'Trades']],
        body: weeklyData.map(day => [
          format(new Date(day.date), 'MMM dd'),
          `$${day.grossPnl.toFixed(2)}`,
          `$${day.netPnl.toFixed(2)}`,
          day.trades.toString(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [34, 139, 34] },
        styles: { fontSize: 8 },
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 1 || data.column.index === 2)) {
            const value = parseFloat(data.cell.text[0].replace('$', ''));
            if (value >= 0) {
              data.cell.styles.textColor = [34, 139, 34];
            } else {
              data.cell.styles.textColor = [220, 53, 69];
            }
          }
        },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Symbol Breakdown (if available)
    if (symbolBreakdown && symbolBreakdown.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.text('Symbol Breakdown', 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Symbol', 'Trades', 'P&L', 'Fees', 'Net']],
        body: symbolBreakdown.slice(0, 10).map(s => [
          s.symbol,
          s.trades.toString(),
          `$${s.pnl.toFixed(2)}`,
          `$${s.fees.toFixed(2)}`,
          `$${s.net.toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234] },
        styles: { fontSize: 8 },
        didParseCell: (data) => {
          if (data.section === 'body' && (data.column.index === 2 || data.column.index === 4)) {
            const value = parseFloat(data.cell.text[0].replace('$', ''));
            if (value >= 0) {
              data.cell.styles.textColor = [34, 139, 34];
            } else {
              data.cell.styles.textColor = [220, 53, 69];
            }
          }
        },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Trade History
    if (currentY > 180) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.text('Recent Trades', 14, currentY);
    
    const tradeRows = trades.slice(0, 20).map(trade => [
      trade.trade_date,
      trade.pair,
      trade.direction.toUpperCase(),
      `$${trade.entry_price.toFixed(2)}`,
      trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-',
      trade.pnl !== null ? `$${trade.pnl.toFixed(2)}` : '-',
    ]);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Date', 'Pair', 'Dir', 'Entry', 'Exit', 'P&L']],
      body: tradeRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const text = data.cell.text[0];
          if (text !== '-') {
            const value = parseFloat(text.replace('$', ''));
            if (value >= 0) {
              data.cell.styles.textColor = [34, 139, 34];
            } else {
              data.cell.styles.textColor = [220, 53, 69];
            }
          }
        }
      },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Deriverse Performance Report | Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Save
    doc.save(`performance_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };
  
  return { exportToCSV, exportToPDF };
}
