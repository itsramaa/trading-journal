/**
 * Contextual Analytics Export Hook
 * Export contextual performance data (Fear/Greed, Volatility, Event Days) as PDF
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { 
  ContextualAnalyticsResult, 
  FearGreedZone, 
  VolatilityLevel,
  ContextualInsight,
} from '@/hooks/use-contextual-analytics';

const FEAR_GREED_LABELS: Record<FearGreedZone, string> = {
  extremeFear: 'Extreme Fear (0-20)',
  fear: 'Fear (21-40)',
  neutral: 'Neutral (41-60)',
  greed: 'Greed (61-80)',
  extremeGreed: 'Extreme Greed (81-100)',
};

const VOLATILITY_LABELS: Record<VolatilityLevel, string> = {
  low: 'Low Volatility',
  medium: 'Medium Volatility',
  high: 'High Volatility',
};

export function useContextualExport() {
  
  const exportContextualPDF = (data: ContextualAnalyticsResult) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Contextual Analytics Report', 105, 20, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 105, 28, { align: 'center' });
    doc.text(`Data Quality: ${data.tradesWithContext} of ${data.totalAnalyzedTrades} trades analyzed (${data.dataQualityPercent.toFixed(0)}%)`, 105, 34, { align: 'center' });
    
    // =====================
    // Fear & Greed Section
    // =====================
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Performance by Fear & Greed Index', 14, 48);
    
    const fearGreedRows = (Object.keys(FEAR_GREED_LABELS) as FearGreedZone[]).map(zone => {
      const metrics = data.byFearGreed[zone];
      return [
        FEAR_GREED_LABELS[zone],
        metrics.trades.toString(),
        `${metrics.winRate.toFixed(1)}%`,
        `$${metrics.totalPnl.toFixed(2)}`,
        `$${metrics.avgPnl.toFixed(2)}`,
        metrics.profitFactor === 0 ? 'N/A' : metrics.profitFactor.toFixed(2),
      ];
    });
    
    autoTable(doc, {
      startY: 53,
      head: [['Zone', 'Trades', 'Win Rate', 'Total P&L', 'Avg P&L', 'Profit Factor']],
      body: fearGreedRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      didParseCell: (cellData) => {
        if (cellData.section === 'body') {
          // Color win rate
          if (cellData.column.index === 2) {
            const value = parseFloat(cellData.cell.text[0]);
            if (value >= 50) {
              cellData.cell.styles.textColor = [34, 139, 34];
            } else if (value < 50 && cellData.cell.text[0] !== '0.0%') {
              cellData.cell.styles.textColor = [220, 53, 69];
            }
          }
          // Color P&L columns
          if (cellData.column.index === 3 || cellData.column.index === 4) {
            const value = parseFloat(cellData.cell.text[0].replace('$', ''));
            if (value > 0) {
              cellData.cell.styles.textColor = [34, 139, 34];
            } else if (value < 0) {
              cellData.cell.styles.textColor = [220, 53, 69];
            }
          }
        }
      },
    });
    
    let currentY = (doc as any).lastAutoTable.finalY + 12;
    
    // =====================
    // Volatility Section
    // =====================
    doc.setFontSize(14);
    doc.text('Performance by Volatility Level', 14, currentY);
    
    const volatilityRows = (Object.keys(VOLATILITY_LABELS) as VolatilityLevel[]).map(level => {
      const metrics = data.byVolatility[level];
      return [
        VOLATILITY_LABELS[level],
        metrics.trades.toString(),
        `${metrics.winRate.toFixed(1)}%`,
        `$${metrics.totalPnl.toFixed(2)}`,
        `$${metrics.avgPnl.toFixed(2)}`,
        metrics.profitFactor === 0 ? 'N/A' : metrics.profitFactor.toFixed(2),
      ];
    });
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Level', 'Trades', 'Win Rate', 'Total P&L', 'Avg P&L', 'Profit Factor']],
      body: volatilityRows,
      theme: 'striped',
      headStyles: { fillColor: [147, 51, 234] },
      styles: { fontSize: 9 },
      didParseCell: (cellData) => {
        if (cellData.section === 'body') {
          if (cellData.column.index === 2) {
            const value = parseFloat(cellData.cell.text[0]);
            if (value >= 50) {
              cellData.cell.styles.textColor = [34, 139, 34];
            } else if (value < 50 && cellData.cell.text[0] !== '0.0%') {
              cellData.cell.styles.textColor = [220, 53, 69];
            }
          }
          if (cellData.column.index === 3 || cellData.column.index === 4) {
            const value = parseFloat(cellData.cell.text[0].replace('$', ''));
            if (value > 0) {
              cellData.cell.styles.textColor = [34, 139, 34];
            } else if (value < 0) {
              cellData.cell.styles.textColor = [220, 53, 69];
            }
          }
        }
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 12;
    
    // =====================
    // Event Days Section
    // =====================
    doc.setFontSize(14);
    doc.text('Performance by Event Days', 14, currentY);
    
    const eventRows = [
      ['Event Day (FOMC, CPI, etc.)', data.byEventProximity.eventDay],
      ['Normal Day', data.byEventProximity.normalDay],
    ].map(([label, metrics]: any) => [
      label,
      metrics.trades.toString(),
      `${metrics.winRate.toFixed(1)}%`,
      `$${metrics.totalPnl.toFixed(2)}`,
      `$${metrics.avgPnl.toFixed(2)}`,
      metrics.profitFactor === 0 ? 'N/A' : metrics.profitFactor.toFixed(2),
    ]);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Day Type', 'Trades', 'Win Rate', 'Total P&L', 'Avg P&L', 'Profit Factor']],
      body: eventRows,
      theme: 'striped',
      headStyles: { fillColor: [234, 179, 8] },
      styles: { fontSize: 9 },
      didParseCell: (cellData) => {
        if (cellData.section === 'body') {
          if (cellData.column.index === 2) {
            const value = parseFloat(cellData.cell.text[0]);
            if (value >= 50) {
              cellData.cell.styles.textColor = [34, 139, 34];
            } else if (value < 50 && cellData.cell.text[0] !== '0.0%') {
              cellData.cell.styles.textColor = [220, 53, 69];
            }
          }
          if (cellData.column.index === 3 || cellData.column.index === 4) {
            const value = parseFloat(cellData.cell.text[0].replace('$', ''));
            if (value > 0) {
              cellData.cell.styles.textColor = [34, 139, 34];
            } else if (value < 0) {
              cellData.cell.styles.textColor = [220, 53, 69];
            }
          }
        }
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 12;
    
    // =====================
    // Correlation Section
    // =====================
    doc.setFontSize(14);
    doc.text('Correlation Analysis', 14, currentY);
    
    const correlationRows = [
      ['Volatility vs Win Rate', data.correlations.volatilityVsWinRate.toFixed(3), getCorrelationInterpretation(data.correlations.volatilityVsWinRate)],
      ['Fear/Greed vs Win Rate', data.correlations.fearGreedVsWinRate.toFixed(3), getCorrelationInterpretation(data.correlations.fearGreedVsWinRate)],
      ['Event Day vs P&L', data.correlations.eventDayVsPnl.toFixed(3), getCorrelationInterpretation(data.correlations.eventDayVsPnl)],
    ];
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Metric', 'Correlation', 'Interpretation']],
      body: correlationRows,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] },
      styles: { fontSize: 9 },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 1) {
          const value = parseFloat(cellData.cell.text[0]);
          if (value > 0.2) {
            cellData.cell.styles.textColor = [34, 139, 34];
          } else if (value < -0.2) {
            cellData.cell.styles.textColor = [220, 53, 69];
          }
        }
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 12;
    
    // =====================
    // Insights Section
    // =====================
    if (data.insights.length > 0) {
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('AI-Generated Insights', 14, currentY);
      
      const insightRows = data.insights.map(insight => [
        insight.type.toUpperCase(),
        insight.title,
        insight.recommendation,
      ]);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Type', 'Insight', 'Recommendation']],
        body: insightRows,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8, cellWidth: 'wrap' },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 60 },
          2: { cellWidth: 'auto' },
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 0) {
            const type = cellData.cell.text[0];
            if (type === 'OPPORTUNITY') {
              cellData.cell.styles.textColor = [34, 139, 34];
            } else if (type === 'WARNING') {
              cellData.cell.styles.textColor = [220, 53, 69];
            } else {
              cellData.cell.styles.textColor = [59, 130, 246];
            }
          }
        },
      });
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Contextual Analytics Report | Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Save
    doc.save(`contextual_analytics_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };
  
  return { exportContextualPDF };
}

function getCorrelationInterpretation(value: number): string {
  const abs = Math.abs(value);
  const direction = value > 0 ? 'Positive' : value < 0 ? 'Negative' : 'None';
  
  if (abs < 0.1) return 'Very weak / No correlation';
  if (abs < 0.3) return `Weak ${direction}`;
  if (abs < 0.5) return `Moderate ${direction}`;
  if (abs < 0.7) return `Strong ${direction}`;
  return `Very Strong ${direction}`;
}
