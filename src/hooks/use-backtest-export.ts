import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { BacktestResult, BacktestTrade, BacktestMetrics } from '@/types/backtest';

/**
 * Hook for exporting backtest results to CSV and PDF
 */
export function useBacktestExport() {
  
  const exportToCSV = (result: BacktestResult) => {
    const { metrics, trades } = result;
    
    // Build CSV content
    let csv = '';
    
    // Header section
    csv += 'BACKTEST REPORT\n';
    csv += `Strategy,${result.strategyName}\n`;
    csv += `Pair,${result.pair}/USDT\n`;
    csv += `Period,${format(new Date(result.periodStart), 'yyyy-MM-dd')} to ${format(new Date(result.periodEnd), 'yyyy-MM-dd')}\n`;
    csv += `Initial Capital,$${result.initialCapital.toFixed(2)}\n`;
    csv += `Final Capital,$${result.finalCapital.toFixed(2)}\n`;
    csv += '\n';
    
    // Metrics section
    csv += 'PERFORMANCE METRICS\n';
    csv += `Total Return,${metrics.totalReturn.toFixed(2)}%\n`;
    csv += `Total Return Amount,$${metrics.totalReturnAmount.toFixed(2)}\n`;
    csv += `Win Rate,${(metrics.winRate * 100).toFixed(1)}%\n`;
    csv += `Total Trades,${metrics.totalTrades}\n`;
    csv += `Winning Trades,${metrics.winningTrades}\n`;
    csv += `Losing Trades,${metrics.losingTrades}\n`;
    csv += `Avg Win,$${metrics.avgWin.toFixed(2)}\n`;
    csv += `Avg Loss,$${metrics.avgLoss.toFixed(2)}\n`;
    csv += `Avg Win %,${metrics.avgWinPercent.toFixed(2)}%\n`;
    csv += `Avg Loss %,${metrics.avgLossPercent.toFixed(2)}%\n`;
    csv += `Profit Factor,${metrics.profitFactor === Infinity ? 'Infinity' : metrics.profitFactor.toFixed(2)}\n`;
    csv += `Max Drawdown,${metrics.maxDrawdown.toFixed(2)}%\n`;
    csv += `Max Drawdown Amount,$${metrics.maxDrawdownAmount.toFixed(2)}\n`;
    csv += `Sharpe Ratio,${metrics.sharpeRatio.toFixed(2)}\n`;
    csv += `Consecutive Wins,${metrics.consecutiveWins}\n`;
    csv += `Consecutive Losses,${metrics.consecutiveLosses}\n`;
    csv += `Avg Risk/Reward,${metrics.avgRiskReward.toFixed(2)}\n`;
    csv += `Avg Holding Period,${metrics.holdingPeriodAvg.toFixed(1)} hours\n`;
    csv += '\n';
    
    // Trades section
    csv += 'TRADE LIST\n';
    csv += 'Entry Time,Exit Time,Direction,Entry Price,Exit Price,Quantity,P&L ($),P&L (%),Commission,Exit Type\n';
    
    trades.forEach((trade) => {
      csv += `${format(new Date(trade.entryTime), 'yyyy-MM-dd HH:mm')},`;
      csv += `${format(new Date(trade.exitTime), 'yyyy-MM-dd HH:mm')},`;
      csv += `${trade.direction},`;
      csv += `${trade.entryPrice.toFixed(2)},`;
      csv += `${trade.exitPrice.toFixed(2)},`;
      csv += `${trade.quantity.toFixed(4)},`;
      csv += `${trade.pnl.toFixed(2)},`;
      csv += `${trade.pnlPercent.toFixed(2)}%,`;
      csv += `${trade.commission.toFixed(4)},`;
      csv += `${trade.exitType}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `backtest_${result.strategyName}_${result.pair}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const exportToPDF = (result: BacktestResult) => {
    const { metrics, trades } = result;
    const doc = new jsPDF();
    const isProfit = metrics.totalReturn > 0;
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Backtest Report', 105, 20, { align: 'center' });
    
    // Strategy info
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`Strategy: ${result.strategyName}`, 14, 35);
    doc.text(`Pair: ${result.pair}/USDT`, 14, 42);
    doc.text(`Period: ${format(new Date(result.periodStart), 'MMM d, yyyy')} - ${format(new Date(result.periodEnd), 'MMM d, yyyy')}`, 14, 49);
    
    // Capital info
    doc.text(`Initial Capital: $${result.initialCapital.toFixed(2)}`, 120, 35);
    doc.text(`Final Capital: $${result.finalCapital.toFixed(2)}`, 120, 42);
    doc.setTextColor(isProfit ? 34 : 220, isProfit ? 139 : 53, isProfit ? 34 : 69);
    doc.text(`Total Return: ${isProfit ? '+' : ''}${metrics.totalReturn.toFixed(2)}%`, 120, 49);
    
    // Metrics table
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text('Performance Metrics', 14, 65);
    
    autoTable(doc, {
      startY: 70,
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: [
        ['Win Rate', `${(metrics.winRate * 100).toFixed(1)}%`, 'Profit Factor', metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)],
        ['Total Trades', metrics.totalTrades.toString(), 'Sharpe Ratio', metrics.sharpeRatio.toFixed(2)],
        ['Winning Trades', metrics.winningTrades.toString(), 'Max Drawdown', `${metrics.maxDrawdown.toFixed(2)}%`],
        ['Losing Trades', metrics.losingTrades.toString(), 'Drawdown Amount', `$${metrics.maxDrawdownAmount.toFixed(2)}`],
        ['Avg Win', `$${metrics.avgWin.toFixed(2)}`, 'Consec. Wins', metrics.consecutiveWins.toString()],
        ['Avg Loss', `$${metrics.avgLoss.toFixed(2)}`, 'Consec. Losses', metrics.consecutiveLosses.toString()],
        ['Avg Win %', `${metrics.avgWinPercent.toFixed(2)}%`, 'Avg R:R', metrics.avgRiskReward.toFixed(2)],
        ['Avg Loss %', `${metrics.avgLossPercent.toFixed(2)}%`, 'Avg Holding', `${metrics.holdingPeriodAvg.toFixed(1)}h`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
    
    // Trade list
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(14);
    doc.text('Trade History', 14, finalY + 15);
    
    const tradeData = trades.map((trade, index) => [
      (index + 1).toString(),
      format(new Date(trade.entryTime), 'MM/dd HH:mm'),
      trade.direction.toUpperCase(),
      `$${trade.entryPrice.toFixed(2)}`,
      `$${trade.exitPrice.toFixed(2)}`,
      trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`,
      `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%`,
      trade.exitType.replace('_', ' '),
    ]);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['#', 'Entry', 'Dir', 'Entry $', 'Exit $', 'P&L', 'P&L %', 'Exit Type']],
      body: tradeData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        5: { fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Color P&L cells
        if (data.section === 'body' && (data.column.index === 5 || data.column.index === 6)) {
          const value = data.cell.text[0];
          if (value.startsWith('+')) {
            data.cell.styles.textColor = [34, 139, 34];
          } else if (value.startsWith('-')) {
            data.cell.styles.textColor = [220, 53, 69];
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
        `Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')} | Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Save
    doc.save(`backtest_${result.strategyName}_${result.pair}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };
  
  return { exportToCSV, exportToPDF };
}
