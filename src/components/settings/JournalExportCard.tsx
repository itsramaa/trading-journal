/**
 * Journal Export Card - Export trades with market context
 * Enhanced export with JSON format and context options
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  FileJson, 
  FileSpreadsheet, 
  Download,
  Activity,
  Calendar,
  TrendingUp,
  Loader2
} from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { format } from "date-fns";
import { toast } from "sonner";
import type { UnifiedMarketContext } from "@/types/market-context";

type ExportFormat = 'csv' | 'json';

interface JournalExportOptions {
  format: ExportFormat;
  includeMarketContext: boolean;
  includeStrategyName: boolean;
  includeAIScores: boolean;
}

export function JournalExportCard() {
  const { data: trades } = useTradeEntries();
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<JournalExportOptions>({
    format: 'csv',
    includeMarketContext: true,
    includeStrategyName: true,
    includeAIScores: true,
  });

  const handleExport = async () => {
    if (!trades || trades.length === 0) {
      toast.error('No trades to export');
      return;
    }

    setIsExporting(true);
    try {
      if (options.format === 'json') {
        exportAsJSON();
      } else {
        exportAsCSV();
      }
      toast.success(`Exported ${trades.length} trades as ${options.format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export trades');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJSON = () => {
    if (!trades) return;

    const exportData = trades.map(trade => {
      const base: Record<string, unknown> = {
        id: trade.id,
        pair: trade.pair,
        direction: trade.direction,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        quantity: trade.quantity,
        pnl: trade.pnl,
        result: trade.result,
        trade_date: trade.trade_date,
        created_at: trade.created_at,
        updated_at: trade.updated_at,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        fees: trade.fees,
        notes: trade.notes,
        tags: trade.tags,
      };

      if (options.includeMarketContext && trade.market_context) {
        const ctx = trade.market_context as unknown as UnifiedMarketContext;
        base.market_context = {
          compositeScore: ctx.compositeScore,
          tradingBias: ctx.tradingBias,
          fearGreed: ctx.fearGreed,
          volatility: ctx.volatility,
          events: ctx.events,
          sentiment: ctx.sentiment,
          capturedAt: ctx.capturedAt,
        };
      }

      if (options.includeAIScores) {
        base.ai_quality_score = trade.ai_quality_score;
        base.ai_confidence = trade.ai_confidence;
        base.confluence_score = trade.confluence_score;
      }

      return base;
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `trades_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
  };

  const exportAsCSV = () => {
    if (!trades) return;

    const headers = [
      'ID',
      'Pair',
      'Direction',
      'Entry Price',
      'Exit Price',
      'Quantity',
      'P&L',
      'Result',
      'Trade Date',
      'Created At',
      'Updated At',
      'Stop Loss',
      'Take Profit',
      'Fees',
      'Notes',
      'Tags',
    ];

    if (options.includeMarketContext) {
      headers.push(
        'Market Score',
        'Trading Bias',
        'Fear Greed Value',
        'Fear Greed Label',
        'Volatility Level',
        'Event Risk',
        'High Impact Event',
      );
    }

    if (options.includeAIScores) {
      headers.push('AI Quality Score', 'AI Confidence', 'Confluence Score');
    }

    const rows = trades.map(trade => {
      const row: (string | number | null)[] = [
        trade.id,
        trade.pair,
        trade.direction,
        trade.entry_price,
        trade.exit_price,
        trade.quantity,
        trade.pnl,
        trade.result,
        trade.trade_date,
        trade.created_at,
        trade.updated_at,
        trade.stop_loss,
        trade.take_profit,
        trade.fees,
        trade.notes?.replace(/,/g, ';'),
        trade.tags?.join(';'),
      ];

      if (options.includeMarketContext) {
        const ctx = trade.market_context as unknown as UnifiedMarketContext;
        row.push(
          ctx?.compositeScore ?? '',
          ctx?.tradingBias ?? '',
          ctx?.fearGreed?.value ?? '',
          ctx?.fearGreed?.label ?? '',
          ctx?.volatility?.level ?? '',
          ctx?.events?.riskLevel ?? '',
          ctx?.events?.hasHighImpactToday ? 'Yes' : 'No',
        );
      }

      if (options.includeAIScores) {
        row.push(
          trade.ai_quality_score,
          trade.ai_confidence,
          trade.confluence_score,
        );
      }

      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        cell === null || cell === undefined ? '' : `"${String(cell).replace(/"/g, '""')}"`
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    downloadBlob(blob, `trades_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Journal Export
        </CardTitle>
        <CardDescription>
          Export trades with market context and AI analysis data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format Selection */}
        <div className="space-y-2">
          <Label>Export Format</Label>
          <RadioGroup 
            value={options.format} 
            onValueChange={(v) => setOptions(prev => ({ ...prev, format: v as ExportFormat }))}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex items-center gap-1.5 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json" className="flex items-center gap-1.5 cursor-pointer">
                <FileJson className="h-4 w-4" />
                JSON
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Options */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <Label className="cursor-pointer">Include Market Context</Label>
              <Badge variant="secondary" className="text-xs">Fear/Greed, Volatility</Badge>
            </div>
            <Switch 
              checked={options.includeMarketContext}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeMarketContext: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="cursor-pointer">Include Strategy Name</Label>
            </div>
            <Switch 
              checked={options.includeStrategyName}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeStrategyName: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <Label className="cursor-pointer">Include AI Scores</Label>
              <Badge variant="secondary" className="text-xs">Quality, Confluence</Badge>
            </div>
            <Switch 
              checked={options.includeAIScores}
              onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeAIScores: checked }))}
            />
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExport}
          disabled={isExporting || !trades || trades.length === 0}
          className="w-full gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export {trades?.length || 0} Trades
        </Button>
      </CardContent>
    </Card>
  );
}
