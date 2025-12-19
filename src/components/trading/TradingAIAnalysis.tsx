import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  Send, 
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade, Strategy } from '@/lib/trading-data';

interface TradingAIAnalysisProps {
  trades: Trade[];
  strategies: Strategy[];
}

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trading-analysis`;

export function TradingAIAnalysis({ trades, strategies }: TradingAIAnalysisProps) {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [analysis]);

  const runAnalysis = async (question?: string) => {
    setIsLoading(true);
    setAnalysis('');

    try {
      const response = await fetch(ANALYSIS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          trades,
          strategies,
          question: question || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get analysis');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setAnalysis(content);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis('Maaf, terjadi kesalahan saat menganalisis data trading. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomQuestion = () => {
    if (customQuestion.trim()) {
      runAnalysis(customQuestion);
      setCustomQuestion('');
    }
  };

  // Calculate quick stats
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.result === 'win').length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgRR = totalTrades > 0 
    ? (trades.reduce((sum, t) => sum + t.rr, 0) / totalTrades).toFixed(2)
    : '0';

  const quickQuestions = [
    'Apa kelemahan utama dalam trading saya?',
    'Strategi mana yang paling efektif?',
    'Kapan waktu terbaik saya untuk trading?',
    'Bagaimana cara meningkatkan win rate?',
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Trading Analysis
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAnalysis()}
            disabled={isLoading || trades.length === 0}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Analyze</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Trades</div>
            <div className="font-bold">{totalTrades}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Win Rate</div>
            <div className="font-bold text-green-500">{winRate}%</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">P&L</div>
            <div className={cn("font-bold", totalPnL >= 0 ? "text-green-500" : "text-red-500")}>
              ${totalPnL.toFixed(0)}
            </div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Avg R:R</div>
            <div className="font-bold">{avgRR}</div>
          </div>
        </div>

        {/* Quick Questions */}
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => runAnalysis(q)}
              disabled={isLoading || trades.length === 0}
            >
              {q}
            </Button>
          ))}
        </div>

        {/* Analysis Result */}
        <ScrollArea className="h-[300px] rounded-lg border p-4" ref={scrollRef}>
          {!analysis && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                Klik "Analyze" atau pilih pertanyaan untuk mendapatkan insight AI tentang performa trading Anda.
              </p>
            </div>
          )}
          {isLoading && !analysis && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Menganalisis data trading...</p>
            </div>
          )}
          {analysis && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{analysis}</p>
            </div>
          )}
        </ScrollArea>

        {/* Custom Question Input */}
        <div className="flex gap-2">
          <Input
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Tanyakan tentang trading Anda..."
            onKeyDown={(e) => e.key === 'Enter' && handleCustomQuestion()}
            disabled={isLoading || trades.length === 0}
          />
          <Button
            onClick={handleCustomQuestion}
            disabled={!customQuestion.trim() || isLoading || trades.length === 0}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
