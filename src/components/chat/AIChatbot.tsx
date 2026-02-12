import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  EyeOff,
  Globe,
  Target,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModeFilteredTrades } from '@/hooks/use-mode-filtered-trades';
import { useTradingStrategies } from '@/hooks/use-trading-strategies';
import { useAccounts } from '@/hooks/use-accounts';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/hooks/use-auth';
import { ChatMessage } from './ChatMessage';
import { QuickActionsPanel } from './QuickActionsPanel';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export type AIMode = 'trading' | 'market' | 'setup' | 'posttrade';

interface AIModeConfig {
  label: string;
  icon: React.ElementType;
  description: string;
  endpoint: string;
  suggestions: string[];
  greeting: string;
  placeholder: string;
}

const AI_MODES: Record<AIMode, AIModeConfig> = {
  trading: {
    label: 'Trading Analyst',
    icon: BarChart3,
    description: 'Analyze patterns & trading performance',
    endpoint: 'trading-analysis',
    suggestions: ['Analyze my performance', 'Best strategy?', 'My trading weaknesses?'],
    greeting: 'Hi! I\'m your AI Trading Analyst. I\'ll analyze your trading journal patterns and performance based on historical data and current market conditions.',
    placeholder: 'Ask about your trading...',
  },
  market: {
    label: 'Market Analyst',
    icon: Globe,
    description: 'Market sentiment & opportunities',
    endpoint: 'market-analysis',
    suggestions: ['Current market conditions?', 'Fear & Greed?', 'Whale activity?'],
    greeting: 'Hi! I\'m your AI Market Analyst. I\'ll provide real-time analysis on market sentiment, whale activity, and trading opportunities.',
    placeholder: 'Ask about the market...',
  },
  setup: {
    label: 'Setup Validator',
    icon: Target,
    description: 'Validate trade confluences',
    endpoint: 'confluence-chat',
    suggestions: ['Validate BTCUSDT long setup', 'What\'s the quality score?', 'Is this setup valid?'],
    greeting: 'Hi! I\'m your AI Setup Validator. Describe your trade setup (pair, direction, entry, SL, TP) and I\'ll provide confluence analysis and a quality score.',
    placeholder: 'e.g. BTCUSDT long entry 95000, SL 94000, TP 98000',
  },
  posttrade: {
    label: 'Post-Trade Coach',
    icon: History,
    description: 'Learn from your closed trades',
    endpoint: 'post-trade-chat',
    suggestions: ['Analyze my last trade', 'What can I improve?', 'Patterns from my losses?'],
    greeting: 'Hi! I\'m your AI Post-Trade Coach. I\'ll help you learn from completed trades — identifying what worked and what needs improvement.',
    placeholder: 'Ask about your closed trades...',
  },
};

export function AIChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  // Per-mode message history - preserved when switching tabs
  const [messageHistory, setMessageHistory] = useState<Record<AIMode, Message[]>>({
    trading: [],
    market: [],
    setup: [],
    posttrade: [],
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>('trading');

  // Get current mode's messages
  const messages = messageHistory[aiMode];

  // Helper to update messages for current mode only
  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessageHistory(prev => ({
      ...prev,
      [aiMode]: typeof updater === 'function' ? updater(prev[aiMode]) : updater,
    }));
  };

  // Clear all history across all modes
  const clearAllHistory = () => {
    setMessageHistory({
      trading: [],
      market: [],
      setup: [],
      posttrade: [],
    });
  };

  // Check if any mode has messages
  const hasAnyMessages = Object.values(messageHistory).some(m => m.length > 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global state for chatbot control
  const { isChatbotOpen, setChatbotOpen, chatbotInitialPrompt, setChatbotInitialPrompt } = useAppStore();

  // Trading data
  const { data: tradeEntries } = useModeFilteredTrades();
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

  // Fetch market context for trading mode
  const fetchMarketContext = useCallback(async () => {
    try {
      const { data: marketData } = await supabase.functions.invoke('market-insight', {
        body: { symbols: ['BTCUSDT', 'ETHUSDT'] },
      });
      
      const { data: macroData } = await supabase.functions.invoke('macro-analysis', {
        body: {},
      });

      return {
        fearGreed: marketData?.sentiment?.fearGreed,
        overall: marketData?.sentiment?.overall,
        recommendation: marketData?.sentiment?.recommendation,
        btcTrend: marketData?.sentiment?.signals?.find((s: any) => s.asset === 'BTC'),
        macroSentiment: macroData?.macro?.overallSentiment,
        btcDominance: macroData?.macro?.btcDominance,
      };
    } catch (error) {
      console.error('Failed to fetch market context:', error);
      return null;
    }
  }, []);

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
      marketCondition: t.market_condition,
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

  // Fetch active trading pairs for setup validation
  const fetchTradingPairs = async (): Promise<string[]> => {
    try {
      const { data } = await supabase
        .from('trading_pairs')
        .select('symbol')
        .eq('is_active', true)
        .limit(100);
      return data?.map(p => p.symbol) || [];
    } catch {
      return [];
    }
  };

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
      // Get user session for proper auth (critical for post-trade mode)
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Build body based on mode - each mode gets its specific context
      let body: any = { question: text };

      if (aiMode === 'trading') {
        // Trading mode: full trade history + strategies + market context
        const tradingContext = getTradingContext();
        const marketContext = await fetchMarketContext();
        body = {
          trades: tradingContext.trades,
          strategies: tradingContext.strategies,
          question: text,
          marketContext,
        };
      } else if (aiMode === 'market') {
        // Market mode: user context so AI can relate analysis to user's positions
        const tradingContext = getTradingContext();
        const openPositions = tradeEntries?.filter(t => t.status === 'open') || [];
        body = {
          question: text,
          userContext: {
            totalTrades: tradingContext.trades.length,
            openPositions: openPositions.map(p => ({
              pair: p.pair,
              direction: p.direction,
              entryPrice: p.entry_price,
              pnl: p.pnl,
            })),
            favoriteStrategies: strategies?.slice(0, 5).map(s => ({
              name: s.name,
              id: s.id,
            })),
          },
        };
      } else if (aiMode === 'setup') {
        // Setup mode: strategies with rules + trading pairs for validation
        const tradingPairs = await fetchTradingPairs();
        body = {
          question: text,
          strategies: strategies?.map(s => ({
            id: s.id,
            name: s.name,
            entry_rules: s.entry_rules,
            exit_rules: s.exit_rules,
            min_confluences: s.min_confluences,
            min_rr: s.min_rr,
            valid_pairs: s.valid_pairs,
          })) || [],
          tradingPairs,
        };
      }
      // posttrade mode: just question, edge function fetches data via auth

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use user JWT for authenticated edge functions, fallback to anon key
          Authorization: authToken 
            ? `Bearer ${authToken}` 
            : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' }
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

  const handleQuickAction = (prompt: string, mode?: AIMode) => {
    if (mode && mode !== aiMode) {
      setAiMode(mode);
      // History preserved - no longer clearing
    }
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleModeChange = (mode: AIMode) => {
    setAiMode(mode);
    // History preserved - no longer clearing when switching modes
  };

  const clearCurrentModeChat = () => {
    setMessages([]);
  };

  // Don't render if user is not logged in
  if (!user) {
    return null;
  }

  // Hidden state - show small button to unhide
  if (isHidden) {
    return (
      <Button
        onClick={() => setIsHidden(false)}
        size="sm"
        variant="outline"
        className="fixed bottom-6 right-6 h-10 px-3 rounded-full shadow-lg z-50 gap-2"
        aria-label="Show AI Assistant"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs">Show AI</span>
      </Button>
    );
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        aria-label="Open AI Trading Assistant"
      >
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </Button>
    );
  }

  const containerClasses = cn(
    "fixed z-50 shadow-2xl transition-all duration-300 flex flex-col",
    isExpanded 
      ? "inset-4 md:inset-8" 
      : isMinimized 
        ? "bottom-6 right-6 w-72 h-14" 
        : "bottom-6 right-6 w-[420px] h-[560px]"
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
          {/* Hide button (only in expanded mode) */}
          {isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setIsHidden(true);
                setIsOpen(false);
                setIsExpanded(false);
                setChatbotOpen(false);
              }}
              aria-label="Hide AI Assistant"
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Hide AI Assistant</span>
            </Button>
          )}
          
          {/* Expand/Collapse */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (!isExpanded) setIsMinimized(false);
            }}
            aria-label={isExpanded ? "Compact mode" : "Expand chat"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            <span className="sr-only">{isExpanded ? "Collapse to compact view" : "Expand to full view"}</span>
          </Button>
          
          {/* Minimize (only in compact mode) */}
          {!isExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(!isMinimized)}
              aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
            >
              {isMinimized ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              <span className="sr-only">{isMinimized ? "Show chat" : "Minimize chat"}</span>
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
              setChatbotOpen(false);
            }}
            aria-label="Close AI chat"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close chat</span>
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Mode Selector Tabs */}
          <div className="px-3 pt-2 pb-1 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Tabs value={aiMode} onValueChange={(v) => handleModeChange(v as AIMode)} className="flex-1">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  {(Object.keys(AI_MODES) as AIMode[]).map((mode) => {
                    const config = AI_MODES[mode];
                    const Icon = config.icon;
                    const msgCount = messageHistory[mode].length;
                    return (
                      <TabsTrigger 
                        key={mode} 
                        value={mode} 
                        className="text-xs gap-1 data-[state=active]:bg-primary/10 relative"
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{config.label.split(' ')[0]}</span>
                        {msgCount > 0 && (
                          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] min-w-[16px]">
                            {msgCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
              {/* Reset All button */}
              {hasAnyMessages && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllHistory}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive shrink-0"
                  title="Reset semua percakapan"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              )}
            </div>
          </div>

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
                  currentMode={aiMode}
                />
              </div>
            )}

            {/* Center - Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              <ScrollArea 
                className="flex-1 min-h-0" 
                ref={scrollRef}
                role="log"
                aria-live="polite"
                aria-label="Chat messages"
              >
                <div className="p-4">
                  {messages.length === 0 ? (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ModeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
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
                    <div className="space-y-4" aria-busy={isLoading}>
                      {messages.map((message, i) => (
                        <ChatMessage key={i} {...message} ModeIcon={ModeIcon} />
                      ))}
                      {/* Typing indicator - shows when waiting for AI response */}
                      {isLoading && (
                        <div className="flex gap-3" role="status" aria-label="AI is typing">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <ModeIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                          </div>
                          <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-sm text-muted-foreground">Typing...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t shrink-0">
                <div className="flex gap-2">
                  {isExpanded && messages.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={clearCurrentModeChat}
                      aria-label="Clear current mode conversation"
                      className="shrink-0"
                      title="Clear current mode"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                    aria-label="Type your message"
                  />
                  <Button 
                    size="icon" 
                    onClick={() => sendMessage()} 
                    disabled={!input.trim() || isLoading}
                    aria-label={isLoading ? "Sending message" : "Send message"}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Panel - Tips (Expanded only) */}
            {isExpanded && (
              <div className="w-64 border-l p-3 hidden lg:block overflow-auto">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Mode: {currentMode.label}</h4>
                    <p className="text-xs text-muted-foreground">{currentMode.description}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Tips</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {aiMode === 'trading' && (
                        <>
                          <li>• Ask about your win rate and metrics</li>
                          <li>• Analyze your most profitable strategies</li>
                          <li>• Identify trading weaknesses</li>
                        </>
                      )}
                      {aiMode === 'market' && (
                        <>
                          <li>• Check Fear & Greed Index</li>
                          <li>• View whale activity</li>
                          <li>• Analyze BTC/ETH trends</li>
                        </>
                      )}
                      {aiMode === 'setup' && (
                        <>
                          <li>• Format: "BTCUSDT long entry 95000, SL 94000, TP 98000"</li>
                          <li>• AI will calculate R:R ratio</li>
                          <li>• Get quality score + calendar warning</li>
                        </>
                      )}
                      {aiMode === 'posttrade' && (
                        <>
                          <li>• Analyze your recent trades</li>
                          <li>• Identify patterns from losses</li>
                          <li>• Learn what can be improved</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
