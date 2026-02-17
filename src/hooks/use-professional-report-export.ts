/**
 * Professional Report Export Hook
 * Generates a branded, multi-section PDF report with logo, 
 * executive summary, key metrics, equity curve data, and trade breakdown.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { DateRange } from '@/components/trading/DateRangeFilter';
import type { TradingStats } from '@/lib/trading-calculations';
import type { TradeEntry } from '@/hooks/use-trade-entries';

// ============================================================================
// TYPES
// ============================================================================

interface SymbolBreakdown {
  symbol: string;
  trades: number;
  pnl: number;
  winRate: number;
}

interface ReportData {
  stats: TradingStats;
  trades: TradeEntry[];
  dateRange: DateRange;
  analyticsLevel: string;
  equityData?: { date: string; balance: number }[];
}

// ============================================================================
// COLOR PALETTE
// ============================================================================

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],     // blue-600
  success: [22, 163, 74] as [number, number, number],      // green-600
  danger: [220, 38, 38] as [number, number, number],       // red-600
  dark: [15, 23, 42] as [number, number, number],          // slate-900
  muted: [100, 116, 139] as [number, number, number],      // slate-500
  light: [241, 245, 249] as [number, number, number],      // slate-100
  white: [255, 255, 255] as [number, number, number],
  accent: [124, 58, 237] as [number, number, number],      // violet-600
};

// ============================================================================
// HELPERS
// ============================================================================

function getTradeNetPnl(t: TradeEntry): number {
  return (t as any).realized_pnl ?? t.pnl ?? 0;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number, color = COLORS.primary): number {
  doc.setFillColor(...color);
  doc.roundedRect(14, y, 182, 8, 1, 1, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  doc.text(title.toUpperCase(), 18, y + 5.5);
  doc.setTextColor(...COLORS.dark);
  return y + 14;
}

function drawMetricBox(
  doc: jsPDF,
  x: number, y: number,
  w: number, h: number,
  label: string,
  value: string,
  valueColor: [number, number, number] = COLORS.dark,
) {
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(label, x + w / 2, y + 8, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(...valueColor);
  doc.text(value, x + w / 2, y + 18, { align: 'center' });
}

function checkPageBreak(doc: jsPDF, currentY: number, needed: number): number {
  if (currentY + needed > doc.internal.pageSize.height - 20) {
    doc.addPage();
    return 20;
  }
  return currentY;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function useProfessionalReportExport() {

  const exportProfessionalPDF = (data: ReportData) => {
    const { stats, trades, dateRange, analyticsLevel } = data;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.width;
    const isProfit = stats.totalPnl >= 0;
    const now = new Date();

    // ─── COVER / HEADER ───────────────────────────────────────────────
    // Top bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageW, 40, 'F');

    // Brand name
    doc.setFontSize(22);
    doc.setTextColor(...COLORS.white);
    doc.text('DERIVERSE', 14, 18);

    doc.setFontSize(10);
    doc.text('Professional Trading Report', 14, 27);

    // Date & scope
    doc.setFontSize(8);
    const periodStr = dateRange.from || dateRange.to
      ? `${dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Start'} – ${dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Present'}`
      : 'All Time';
    doc.text(`Period: ${periodStr}  |  Scope: ${analyticsLevel}  |  Generated: ${format(now, 'MMM d, yyyy HH:mm')}`, 14, 35);

    // ─── EXECUTIVE SUMMARY ────────────────────────────────────────────
    let y = 50;

    // Verdict banner
    const verdict = getVerdict(stats);
    doc.setFillColor(...(isProfit ? COLORS.success : COLORS.danger));
    doc.roundedRect(14, y, 182, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.white);
    doc.text(verdict, 105, y + 8, { align: 'center' });
    y += 20;

    // Key metric boxes (4 across)
    const boxW = 42;
    const boxH = 24;
    const gap = 4;
    const startX = 14;

    drawMetricBox(doc, startX, y, boxW, boxH, 'Total P&L',
      `$${stats.totalPnl.toFixed(2)}`, isProfit ? COLORS.success : COLORS.danger);
    drawMetricBox(doc, startX + boxW + gap, y, boxW, boxH, 'Win Rate',
      `${stats.winRate.toFixed(1)}%`, stats.winRate >= 50 ? COLORS.success : COLORS.danger);
    drawMetricBox(doc, startX + 2 * (boxW + gap), y, boxW, boxH, 'Profit Factor',
      stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2),
      stats.profitFactor >= 1 ? COLORS.success : COLORS.danger);
    drawMetricBox(doc, startX + 3 * (boxW + gap), y, boxW, boxH, 'Total Trades',
      stats.totalTrades.toString(), COLORS.dark);
    y += boxH + 10;

    // ─── DETAILED METRICS TABLE ───────────────────────────────────────
    y = drawSectionHeader(doc, 'Performance Metrics', y);

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value', 'Metric', 'Value']],
      body: [
        ['Avg Win', `$${stats.avgWin.toFixed(2)}`, 'Avg Loss', `$${stats.avgLoss.toFixed(2)}`],
        ['Max Drawdown', `${stats.maxDrawdownPercent.toFixed(2)}%`, 'Sharpe Ratio', stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : 'N/A'],
        ['Avg R:R', stats.avgRR !== null ? `${stats.avgRR.toFixed(2)}:1` : 'N/A', 'Expectancy', `$${stats.expectancy.toFixed(2)}`],
        ['Largest Win', `$${stats.largestWin.toFixed(2)}`, 'Largest Loss', `$${stats.largestLoss.toFixed(2)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: COLORS.light },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // ─── SYMBOL BREAKDOWN ─────────────────────────────────────────────
    const symbolMap = new Map<string, { trades: number; totalPnl: number; wins: number }>();
    trades.filter(t => t.status === 'closed').forEach(t => {
      const pnl = getTradeNetPnl(t);
      const existing = symbolMap.get(t.pair) || { trades: 0, totalPnl: 0, wins: 0 };
      existing.trades++;
      existing.totalPnl += pnl;
      if (pnl > 0) existing.wins++;
      symbolMap.set(t.pair, existing);
    });

    const symbolBreakdown: SymbolBreakdown[] = Array.from(symbolMap.entries())
      .map(([symbol, d]) => ({ symbol, trades: d.trades, pnl: d.totalPnl, winRate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0 }))
      .sort((a, b) => b.pnl - a.pnl);

    if (symbolBreakdown.length > 0) {
      y = checkPageBreak(doc, y, 60);
      y = drawSectionHeader(doc, 'Symbol Breakdown', y, COLORS.accent);

      autoTable(doc, {
        startY: y,
        head: [['Symbol', 'Trades', 'Win Rate', 'P&L']],
        body: symbolBreakdown.slice(0, 15).map(s => [
          s.symbol,
          s.trades.toString(),
          `${s.winRate.toFixed(1)}%`,
          `$${s.pnl.toFixed(2)}`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: COLORS.accent, textColor: COLORS.white, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: COLORS.light },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const val = parseFloat(data.cell.text[0].replace('$', ''));
            data.cell.styles.textColor = val >= 0 ? COLORS.success : COLORS.danger;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 12;
    }

    // ─── RECENT TRADES ────────────────────────────────────────────────
    const closedTrades = trades.filter(t => t.status === 'closed').slice(0, 25);
    if (closedTrades.length > 0) {
      y = checkPageBreak(doc, y, 40);
      y = drawSectionHeader(doc, `Recent Trades (${closedTrades.length} shown)`, y);

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Pair', 'Dir', 'Entry', 'Exit', 'P&L']],
        body: closedTrades.map(t => [
          format(new Date(t.trade_date), 'MMM dd'),
          t.pair,
          t.direction.toUpperCase(),
          `$${t.entry_price.toFixed(4)}`,
          t.exit_price ? `$${t.exit_price.toFixed(4)}` : '–',
          `$${getTradeNetPnl(t).toFixed(2)}`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: COLORS.light },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const val = parseFloat(data.cell.text[0].replace('$', ''));
            data.cell.styles.textColor = val >= 0 ? COLORS.success : COLORS.danger;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 12;
    }

    // ─── RISK SUMMARY ─────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 50);
    y = drawSectionHeader(doc, 'Risk Assessment', y, COLORS.danger);

    const riskLevel = getRiskLevel(stats);
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dark);
    doc.text(`Risk Level: ${riskLevel.level}`, 18, y + 2);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(riskLevel.description, 18, y + 9);
    y += 18;

    // ─── FOOTER (all pages) ───────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pH = doc.internal.pageSize.height;

      // Footer bar
      doc.setFillColor(...COLORS.dark);
      doc.rect(0, pH - 14, pageW, 14, 'F');

      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.text('Confidential — For personal use only', 14, pH - 5);

      doc.setTextColor(180, 180, 180);
      doc.text(`Deriverse Professional Report  •  Page ${i} of ${pageCount}`, pageW - 14, pH - 5, { align: 'right' });
    }

    doc.save(`deriverse_report_${format(now, 'yyyyMMdd_HHmmss')}.pdf`);
  };

  return { exportProfessionalPDF };
}

// ============================================================================
// VERDICT & RISK HELPERS
// ============================================================================

function getVerdict(stats: TradingStats): string {
  if (stats.totalTrades < 10) return '📊 Insufficient data — keep trading to build reliable statistics';
  if (stats.profitFactor >= 2 && stats.winRate >= 55) return '🏆 Excellent — Consistent edge with strong risk management';
  if (stats.profitFactor >= 1.5 && stats.winRate >= 50) return '✅ Solid — Profitable trading with room to optimize';
  if (stats.profitFactor >= 1) return '⚠️ Thin Edge — Marginally profitable, review risk parameters';
  return '🔴 Unprofitable — Review strategy and risk management urgently';
}

function getRiskLevel(stats: TradingStats): { level: string; description: string } {
  const dd = stats.maxDrawdownPercent;
  if (dd <= 5) return { level: '🟢 Low', description: `Max drawdown ${dd.toFixed(1)}% — well within acceptable limits. Position sizing is disciplined.` };
  if (dd <= 15) return { level: '🟡 Moderate', description: `Max drawdown ${dd.toFixed(1)}% — manageable but monitor closely during losing streaks.` };
  if (dd <= 30) return { level: '🟠 Elevated', description: `Max drawdown ${dd.toFixed(1)}% — consider reducing position sizes or tightening stop losses.` };
  return { level: '🔴 High', description: `Max drawdown ${dd.toFixed(1)}% — significant capital risk. Immediate review of risk parameters recommended.` };
}
