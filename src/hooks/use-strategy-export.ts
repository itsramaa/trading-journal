/**
 * useStrategyExport - Export strategy details to PDF
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { TradingStrategy } from '@/hooks/use-trading-strategies';
import type { StrategyPerformance } from '@/hooks/use-strategy-performance';
import type { 
  MarketFit, 
  StrategyPerformanceData, 
  PairRecommendation 
} from '@/hooks/use-strategy-context';

interface StrategyExportData {
  strategy: TradingStrategy;
  performance?: StrategyPerformance;
  marketFit?: MarketFit;
  strategyPerformance?: StrategyPerformanceData;
  recommendations?: {
    bestPairs: PairRecommendation[];
    avoidPairs: PairRecommendation[];
    currentPairScore: number | null;
  };
  validityReasons?: string[];
  isValidForCurrentConditions?: boolean;
}

export function useStrategyExport() {
  
  const exportToPDF = (data: StrategyExportData) => {
    const { 
      strategy, 
      performance, 
      marketFit, 
      strategyPerformance,
      recommendations,
      validityReasons,
      isValidForCurrentConditions
    } = data;
    
    const doc = new jsPDF();
    let currentY = 20;
    
    // Colors
    const primaryColor: [number, number, number] = [59, 130, 246];
    const profitColor: [number, number, number] = [34, 139, 34];
    const lossColor: [number, number, number] = [220, 53, 69];
    const warningColor: [number, number, number] = [255, 165, 0];
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Strategy Report', 105, currentY, { align: 'center' });
    currentY += 12;
    
    // Strategy name
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text(strategy.name, 105, currentY, { align: 'center' });
    currentY += 10;
    
    // Generated date
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 105, currentY, { align: 'center' });
    currentY += 15;
    
    // Strategy Details Section
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Strategy Details', 14, currentY);
    currentY += 5;
    
    const strategyDetails = [
      ['Description', strategy.description || 'No description'],
      ['Timeframe', strategy.timeframe || 'Not specified'],
      ['Market Type', strategy.market_type || 'spot'],
      ['Min Confluences', String(strategy.min_confluences || 4)],
      ['Min R:R Ratio', `${strategy.min_rr || 1.5}:1`],
      ['Status', strategy.status || 'active'],
      ['Created', format(new Date(strategy.created_at), 'MMM d, yyyy')],
    ];
    
    if (strategy.tags && strategy.tags.length > 0) {
      strategyDetails.push(['Tags', strategy.tags.join(', ')]);
    }
    
    if (strategy.valid_pairs && strategy.valid_pairs.length > 0) {
      strategyDetails.push(['Valid Pairs', strategy.valid_pairs.join(', ')]);
    }
    
    autoTable(doc, {
      startY: currentY,
      head: [['Property', 'Value']],
      body: strategyDetails,
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
    
    // AI Quality Score Section
    if (performance && performance.totalTrades > 0) {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('AI Quality Score', 14, currentY);
      currentY += 5;
      
      const qualityData = [
        ['AI Score', `${performance.aiQualityScore || 0}%`],
        ['Win Rate', `${(performance.winRate * 100).toFixed(1)}%`],
        ['Total Trades', String(performance.totalTrades)],
        ['Wins / Losses', `${performance.wins} / ${performance.losses}`],
        ['Profit Factor', performance.profitFactor.toFixed(2)],
      ];
      
      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: qualityData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === 0) {
            const score = performance.aiQualityScore || 0;
            if (score >= 70) data.cell.styles.textColor = profitColor;
            else if (score < 50) data.cell.styles.textColor = lossColor;
          }
        },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Market Fit Analysis Section
    if (marketFit) {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Market Fit Analysis', 14, currentY);
      currentY += 5;
      
      const fitData = [
        ['Overall Fit Score', `${marketFit.fitScore}% - ${marketFit.overallFit.toUpperCase()}`],
        ['Volatility Match', marketFit.volatilityMatch.charAt(0).toUpperCase() + marketFit.volatilityMatch.slice(1)],
        ['Trend Alignment', marketFit.trendAlignment.charAt(0).toUpperCase() + marketFit.trendAlignment.slice(1)],
        ['Session Status', marketFit.sessionMatch === 'active' ? 'Active Hours' : 'Off Hours'],
        ['Event Risk', marketFit.eventRisk.charAt(0).toUpperCase() + marketFit.eventRisk.slice(1)],
      ];
      
      autoTable(doc, {
        startY: currentY,
        head: [['Factor', 'Status']],
        body: fitData,
        theme: 'striped',
        headStyles: { fillColor: [75, 85, 99] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const value = data.cell.text[0].toLowerCase();
            if (value.includes('optimal') || value.includes('aligned') || value.includes('clear') || value.includes('active')) {
              data.cell.styles.textColor = profitColor;
            } else if (value.includes('poor') || value.includes('counter') || value.includes('avoid')) {
              data.cell.styles.textColor = lossColor;
            } else if (value.includes('caution')) {
              data.cell.styles.textColor = warningColor;
            }
          }
        },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Current Conditions Section
    if (validityReasons && validityReasons.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Current Market Conditions', 14, currentY);
      currentY += 5;
      
      const statusColor = isValidForCurrentConditions ? profitColor : lossColor;
      doc.setFontSize(10);
      doc.setTextColor(...statusColor);
      doc.text(isValidForCurrentConditions ? '✓ Valid for current conditions' : '✗ Not recommended for current conditions', 14, currentY + 5);
      currentY += 10;
      
      const reasonsData = validityReasons.map(reason => [reason]);
      
      autoTable(doc, {
        startY: currentY,
        head: [['Condition Notes']],
        body: reasonsData,
        theme: 'plain',
        headStyles: { fillColor: statusColor },
        styles: { fontSize: 9 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const text = data.cell.text[0].toLowerCase();
            if (text.includes('optimal') || text.includes('strong')) {
              data.cell.styles.textColor = profitColor;
            } else if (text.includes('poor') || text.includes('waiting') || text.includes('consider')) {
              data.cell.styles.textColor = lossColor;
            }
          }
        },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Check if we need a new page
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    // Pair Recommendations Section
    if (recommendations && (recommendations.bestPairs.length > 0 || recommendations.avoidPairs.length > 0)) {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Pair Recommendations', 14, currentY);
      currentY += 5;
      
      // Best Pairs
      if (recommendations.bestPairs.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(...profitColor);
        doc.text('Best Performing Pairs', 14, currentY + 5);
        currentY += 8;
        
        const bestData = recommendations.bestPairs.map((p, i) => [
          `#${i + 1}`,
          p.pair,
          `${p.winRate.toFixed(0)}%`,
          String(p.trades),
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [['Rank', 'Pair', 'Win Rate', 'Trades']],
          body: bestData,
          theme: 'striped',
          headStyles: { fillColor: profitColor },
          styles: { fontSize: 9 },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 8;
      }
      
      // Avoid Pairs
      if (recommendations.avoidPairs.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(...lossColor);
        doc.text('Consider Avoiding', 14, currentY + 3);
        currentY += 6;
        
        const avoidData = recommendations.avoidPairs.map(p => [
          p.pair,
          `${p.winRate.toFixed(0)}%`,
          String(p.trades),
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [['Pair', 'Win Rate', 'Trades']],
          body: avoidData,
          theme: 'striped',
          headStyles: { fillColor: lossColor },
          styles: { fontSize: 9 },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
    }
    
    // Historical Insights Section
    if (strategyPerformance && strategyPerformance.totalTrades > 0) {
      // Check if we need a new page
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Historical Insights', 14, currentY);
      currentY += 5;
      
      const insightsData: string[][] = [
        ['Overall Win Rate', `${strategyPerformance.overallWinRate.toFixed(1)}%`],
        ['Total Historical Trades', String(strategyPerformance.totalTrades)],
      ];
      
      if (strategyPerformance.bestTimeframe) {
        insightsData.push(['Most Used Timeframe', strategyPerformance.bestTimeframe]);
      }
      
      if (strategyPerformance.avgHoldTime !== null) {
        const holdTime = strategyPerformance.avgHoldTime >= 24 
          ? `${(strategyPerformance.avgHoldTime / 24).toFixed(1)} days`
          : `${strategyPerformance.avgHoldTime.toFixed(1)} hours`;
        insightsData.push(['Average Hold Time', holdTime]);
      }
      
      // Per-pair performance breakdown
      if (strategyPerformance.pairPerformance.length > 0) {
        insightsData.push(['Pairs Traded', String(strategyPerformance.pairPerformance.length)]);
      }
      
      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: insightsData,
        theme: 'striped',
        headStyles: { fillColor: [107, 114, 128] },
        styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      // Pair performance breakdown
      if (strategyPerformance.pairPerformance.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text('Performance by Pair', 14, currentY + 3);
        currentY += 6;
        
        const pairData = strategyPerformance.pairPerformance
          .sort((a, b) => b.winRate - a.winRate)
          .map(p => [
            p.pair,
            String(p.trades),
            `${p.wins}/${p.losses}`,
            `${p.winRate.toFixed(0)}%`,
            p.totalPnl >= 0 ? `+$${p.totalPnl.toFixed(2)}` : `-$${Math.abs(p.totalPnl).toFixed(2)}`,
          ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [['Pair', 'Trades', 'W/L', 'Win Rate', 'Total P&L']],
          body: pairData,
          theme: 'striped',
          headStyles: { fillColor: [107, 114, 128] },
          styles: { fontSize: 8 },
          didParseCell: (data) => {
            if (data.section === 'body') {
              // Win rate coloring
              if (data.column.index === 3) {
                const rate = parseFloat(data.cell.text[0]);
                if (rate >= 60) data.cell.styles.textColor = profitColor;
                else if (rate < 40) data.cell.styles.textColor = lossColor;
              }
              // P&L coloring
              if (data.column.index === 4) {
                const value = data.cell.text[0];
                if (value.startsWith('+')) data.cell.styles.textColor = profitColor;
                else if (value.startsWith('-')) data.cell.styles.textColor = lossColor;
              }
            }
          },
        });
      }
    }
    
    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Strategy Report: ${strategy.name} | Generated ${format(new Date(), 'MMM d, yyyy HH:mm')} | Page ${i} of ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Save
    const sanitizedName = strategy.name.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`strategy_${sanitizedName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };
  
  return { exportToPDF };
}
