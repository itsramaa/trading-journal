import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  Send, 
  Loader2, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Smile,
  Meh,
  Frown,
  Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { TradingSessionWithStats } from '@/hooks/use-trading-sessions';

interface SessionAIAnalysisProps {
  session: TradingSessionWithStats;
}

interface SessionTrade {
  pair: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number;
  result: string | null;
  rr: number | null;
  notes: string | null;
  strategyNames: string[];
}

export function SessionAIAnalysis({ session }: SessionAIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: allTrades } = useTradeEntries();
  
  // Get trades for this session
  const sessionTrades = allTrades?.filter(t => t.session_id === session.id) || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [analysis]);

  const buildSessionContext = () => {
    const trades: SessionTrade[] = sessionTrades.map(t => ({
      pair: t.pair,
      direction: t.direction,
      entryPrice: t.entry_price,
      exitPrice: t.exit_price,
      pnl: t.pnl || 0,
      result: t.result,
      rr: t.stop_loss && t.take_profit && t.entry_price 
        ? Math.abs((t.take_profit - t.entry_price) / (t.entry_price - t.stop_loss))
        : null,
      notes: t.notes,
      strategyNames: t.strategies?.map((s: any) => s.name) || [],
    }));

    return {
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      mood: session.mood,
      rating: session.rating,
      marketCondition: session.market_condition,
      notes: session.notes,
      tags: session.tags || [],
      trades,
    };
  };

  const runAnalysis = async (question?: string) => {
    setIsLoading(true);
    setAnalysis('');

    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-analysis`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          session: buildSessionContext(),
          question: question || 'Berikan analisis lengkap sesi trading ini, termasuk korelasi mood dengan performa.',
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

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
      console.error('Session analysis error:', error);
      setAnalysis('Maaf, terjadi kesalahan saat menganalisis sesi. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = () => {
    if (customQuestion.trim()) {
      runAnalysis(customQuestion);
      setCustomQuestion('');
    }
  };

  const MoodIcon = session.mood === 'positive' ? Smile : session.mood === 'negative' ? Frown : Meh;
  const moodColor = session.mood === 'positive' ? 'text-green-500' : session.mood === 'negative' ? 'text-destructive' : 'text-yellow-500';
  const sessionPnl = session.calculated_pnl || 0;

  const quickQuestions = [
    'Apa yang bisa ditingkatkan?',
    'Analisis korelasi mood',
    'Saran untuk sesi berikutnya',
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Session Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Quick Stats */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <MoodIcon className={`h-5 w-5 mx-auto mb-1 ${moodColor}`} />
            <p className="text-xs text-muted-foreground">Mood</p>
            <p className="font-medium text-sm capitalize">{session.mood}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-xs text-muted-foreground">Rating</p>
            <p className="font-medium text-sm">{session.rating}/5</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            {sessionPnl >= 0 ? (
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 mx-auto mb-1 text-destructive" />
            )}
            <p className="text-xs text-muted-foreground">P&L</p>
            <p className={`font-medium text-sm ${sessionPnl >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {sessionPnl >= 0 ? '+' : ''}${sessionPnl.toFixed(2)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <Sparkles className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="font-medium text-sm">{session.calculated_trades_count || 0}</p>
          </div>
        </div>

        {/* Quick Questions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAnalysis()}
            disabled={isLoading}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Analisis Lengkap
          </Button>
          {quickQuestions.map((q) => (
            <Button
              key={q}
              variant="ghost"
              size="sm"
              onClick={() => runAnalysis(q)}
              disabled={isLoading}
              className="text-xs"
            >
              {q}
            </Button>
          ))}
        </div>

        {/* Custom Question Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Tanya tentang sesi ini..."
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleAskQuestion}
            disabled={isLoading || !customQuestion.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {/* Analysis Result */}
        {(analysis || isLoading) && (
          <ScrollArea className="h-[300px] rounded-lg border p-4" ref={scrollRef}>
            {isLoading && !analysis ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Menganalisis sesi trading...</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm">{analysis}</pre>
              </div>
            )}
          </ScrollArea>
        )}

        {/* Session Tags */}
        {session.tags && session.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {session.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
