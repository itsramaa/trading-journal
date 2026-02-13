/**
 * Reconciliation Report Export Hook
 * Exports sync reconciliation data as CSV or PDF
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { AggregationResult } from '@/services/binance/types';

export function useReconciliationExport() {

  const exportReconciliationCSV = (result: AggregationResult) => {
    const { stats, reconciliation, trades } = result;
    const rows: string[] = [];

    // Summary section
    rows.push('=== Sync Reconciliation Report ===');
    rows.push(`Generated,${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    rows.push('');
    rows.push('=== Summary ===');
    rows.push(`Valid Trades,${stats.validTrades}`);
    rows.push(`Invalid Trades,${stats.invalidTrades}`);
    rows.push(`Warning Trades,${stats.warningTrades}`);
    rows.push(`Total Lifecycles,${stats.totalLifecycles}`);
    rows.push(`Complete Lifecycles,${stats.completeLifecycles}`);
    rows.push(`Incomplete Lifecycles,${stats.incompleteLifecycles}`);
    rows.push('');

    // Reconciliation section
    rows.push('=== P&L Reconciliation ===');
    rows.push(`Aggregated P&L,${reconciliation.aggregatedTotalPnl.toFixed(4)}`);
    rows.push(`Matched Income P&L,${reconciliation.matchedIncomePnl.toFixed(4)}`);
    rows.push(`Binance Total P&L,${reconciliation.binanceTotalPnl.toFixed(4)}`);
    rows.push(`Difference,${reconciliation.difference.toFixed(4)}`);
    rows.push(`Difference %,${reconciliation.differencePercent.toFixed(4)}%`);
    rows.push(`Reconciled,${reconciliation.isReconciled ? 'Yes' : 'No'}`);
    rows.push('');

    // Trade details
    rows.push('=== Trade Details ===');
    rows.push('Pair,Direction,Entry Price,Exit Price,Quantity,Realized PnL,Fees,Funding,Duration,Result');
    trades.forEach(trade => {
      rows.push([
        trade.pair,
        trade.direction,
        trade.entry_price.toFixed(4),
        trade.exit_price.toFixed(4),
        trade.quantity.toFixed(6),
        trade.realized_pnl.toFixed(4),
        trade.fees.toFixed(4),
        trade.funding_fees.toFixed(4),
        `${trade.hold_time_minutes}m`,
        trade.result,
      ].join(','));
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync_reconciliation_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportReconciliationPDF = (result: AggregationResult) => {
    const { stats, reconciliation, trades } = result;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Sync Reconciliation Report', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 105, 28, { align: 'center' });

    // Summary table
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary', 14, 42);

    autoTable(doc, {
      startY: 47,
      head: [['Metric', 'Value']],
      body: [
        ['Valid Trades', stats.validTrades.toString()],
        ['Invalid Trades', stats.invalidTrades.toString()],
        ['Warning Trades', stats.warningTrades.toString()],
        ['Lifecycles (Complete/Total)', `${stats.completeLifecycles}/${stats.totalLifecycles}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12;

    // Reconciliation table
    doc.setFontSize(14);
    doc.text('P&L Reconciliation', 14, currentY);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Metric', 'Value']],
      body: [
        ['Aggregated P&L', `$${reconciliation.aggregatedTotalPnl.toFixed(4)}`],
        ['Matched Income P&L', `$${reconciliation.matchedIncomePnl.toFixed(4)}`],
        ['Binance Total P&L', `$${reconciliation.binanceTotalPnl.toFixed(4)}`],
        ['Difference', `$${reconciliation.difference.toFixed(4)} (${reconciliation.differencePercent.toFixed(4)}%)`],
        ['Status', reconciliation.isReconciled ? '✓ Matched' : '✗ Mismatch'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [147, 51, 234] },
      styles: { fontSize: 9 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Trade details (top 30)
    if (currentY > 220) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14);
    doc.text('Trade Details', 14, currentY);

    const tradeRows = trades.slice(0, 30).map(t => [
      t.pair,
      t.direction,
      `$${t.entry_price.toFixed(2)}`,
      `$${t.exit_price.toFixed(2)}`,
      `$${t.realized_pnl.toFixed(2)}`,
      t.result,
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Pair', 'Dir', 'Entry', 'Exit', 'P&L', 'Result']],
      body: tradeRows,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 4) {
          const value = parseFloat(cellData.cell.text[0].replace('$', ''));
          if (value > 0) cellData.cell.styles.textColor = [34, 139, 34];
          else if (value < 0) cellData.cell.styles.textColor = [220, 53, 69];
        }
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Sync Reconciliation Report | Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`sync_reconciliation_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };

  return { exportReconciliationCSV, exportReconciliationPDF };
}
