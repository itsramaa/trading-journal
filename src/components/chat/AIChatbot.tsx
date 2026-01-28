import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Send, 
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { useTradingStrategies } from '@/hooks/use-trading-strategies';
import { useAccounts } from '@/hooks/use-accounts';
import { useAppStore } from '@/store/app-store';
import { ChatMessage } from './ChatMessage';
import { QuickActionsPanel } from './QuickActionsPanel';
import { TipsPanel } from './TipsPanel';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type AIMode = 'trading';

const AI_MODES = {
  trading: {
    label: 'Trading Analyst',
    icon: BarChart3,
    description: 'Analisis pattern & performa trading',
    endpoint: 'trading-analysis',
    suggestions: ['Analisis performa saya', 'Strategi terbaik?', 'Kelemahan trading saya?'],
    greeting: 'Halo! Saya AI Trading Analyst. Saya akan menganalisis pattern dan performa trading journal Anda.',
    placeholder: 'Tanya tentang trading...',
  },
};

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiMode] = useState<AIMode>('trading');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global state for chatbot control
  const { isChatbotOpen, setChatbotOpen, chatbotInitialPrompt, setChatbotInitialPrompt } = useAppStore();

  // Trading data
  const { data: tradeEntries } = useTradeEntries();
  const { data: strategies } = useTradingStrategies();
  const { data: accounts } = useAccounts();

  const currentMode = AI_MODES[aiMode];
  const ModeIcon = currentMode.icon;

  // Listen to global state for opening chatbot
  useEffect(() => {
    if (isChatbotOpen && !isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      if (chatbotInitialPrompt) {
        setInput(chatbotInitialPrompt);
        setChatbotInitialPrompt(null);
        // Focus input after a short delay
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
    // Reset global state when closed
    if (!isChatbotOpen && isOpen === false) {
      setChatbotOpen(false);
    }
  }, [isChatbotOpen, chatbotInitialPrompt, isOpen, setChatbotOpen, setChatbotInitialPrompt]);

  // Keyboard shortcut: Escape to collapse/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          setIsOpen(false);
          setChatbotOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExpanded, setChatbotOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const getTradingContext = useCallback(() => {
    if (!tradeEntries || tradeEntries.length === 0) {
      return { trades: [], strategies: strategies || [] };
    }

    const closedTrades = tradeEntries.filter(t => t.status === 'closed');
    
    const tradesForAI = closedTrades.map(t => ({
      id: t.id,
      pair: t.pair,
      direction: t.direction,
      entryPrice: t.entry_price,
      exitPrice: t.exit_price,
      stopLoss: t.stop_loss,
      takeProfit: t.take_profit,
      quantity: t.quantity,
      pnl: t.pnl || 0,
      fees: t.fees || 0,
      result: t.result,
      tradeDate: t.trade_date,
      notes: t.notes,
      strategyIds: t.strategies?.map(s => s.id) || [],
      strategyNames: t.strategies?.map(s => s.name) || [],
      rr: t.stop_loss && t.take_profit && t.entry_price ? 
        Math.abs((t.take_profit - t.entry_price) / (t.entry_price - t.stop_loss)) : null,
    }));

    return {
      trades: tradesForAI,
      strategies: strategies || [],
      accountsSummary: {
        totalBalance: accounts?.reduce((sum, a) => sum + Number(a.balance), 0) || 0,
        accountCount: accounts?.length || 0,
      },
    };
  }, [tradeEntries, strategies, accounts]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${currentMode.endpoint}`;

    try {
      const tradingContext = getTradingContext();
      const body = {
        trades: tradingContext.trades,
        strategies: tradingContext.strategies,
        question: text,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      // Add empty assistant message to update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant') {
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev.filter(m => m.content !== ''),
        { role: 'assistant', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  const containerClasses = cn(
    "fixed z-50 shadow-2xl transition-all duration-300 flex flex-col",
    isExpanded 
      ? "inset-4 md:inset-8" 
      : isMinimized 
        ? "bottom-6 right-6 w-72 h-14" 
        : "bottom-6 right-6 w-96 h-[520px]"
  );

  return (
    <Card className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary/5 rounded-t-lg shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ModeIcon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm truncate">{currentMode.label}</span>
          {isExpanded && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              — {currentMode.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (!isExpanded) setIsMinimized(false);
            }}
            title={isExpanded ? "Compact mode" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          {/* Minimize (only in compact mode) */}
          {!isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { 
              setIsOpen(false); 
              setIsExpanded(false); 
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Main Content */}
          <div className={cn(
            "flex-1 flex overflow-hidden",
            isExpanded ? "flex-row" : "flex-col"
          )}>
            {/* Left Panel - Quick Actions (Expanded only) */}
            {isExpanded && (
              <div className="w-64 border-r p-3 hidden md:block overflow-auto">
                <QuickActionsPanel 
                  onSelectAction={handleQuickAction} 
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Center - Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ModeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 bg-muted rounded-lg p-3">
                        <p className="text-sm">{currentMode.greeting}</p>
                      </div>
                    </div>
                    {!isExpanded && (
                      <div className="pl-11 space-y-2">
                        <p className="text-xs text-muted-foreground">Suggestions:</p>
                        <div className="flex flex-wrap gap-2">
                          {currentMode.suggestions.map((suggestion, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleQuickAction(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="pl-11 text-xs text-muted-foreground">
                        Gunakan Quick Actions di panel kiri atau ketik pertanyaan Anda.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, i) => (
                      <ChatMessage key={i} {...message} ModeIcon={ModeIcon} />
                    ))}
                    {isLoading && messages[messages.length - 1]?.content === '' && (
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm text-muted-foreground">Thinking...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t shrink-0">
                <div className="flex gap-2">
                  {isExpanded && messages.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={clearChat}
                      title="Clear conversation"
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentMode.placeholder}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    size="icon" 
                    onClick={() => sendMessage()} 
                    disabled={!input.trim() || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {isExpanded && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Press Escape to collapse • Enter to send
                  </p>
                )}
              </div>
            </div>

            {/* Right Panel - Tips (Expanded only) */}
            {isExpanded && (
              <div className="w-64 border-l p-3 hidden lg:block overflow-auto">
                <TipsPanel />
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
