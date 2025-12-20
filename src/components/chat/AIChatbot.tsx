import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  X, 
  Send, 
  User,
  Sparkles,
  Loader2,
  Minimize2,
  Maximize2,
  TrendingUp,
  BarChart3,
  ChevronDown,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHoldings, usePortfolios } from '@/hooks/use-portfolio';
import { useTradeEntries } from '@/hooks/use-trade-entries';
import { useTradingStrategies } from '@/hooks/use-trading-strategies';
import { useFireSettings } from '@/hooks/use-fire-settings';
import { useBudgetCategories } from '@/hooks/use-budget';
import { useGoals } from '@/hooks/use-goals';
import { useEmergencyFund } from '@/hooks/use-emergency-fund';
import { useAccounts } from '@/hooks/use-accounts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type AIMode = 'investment' | 'trading' | 'fire';

const AI_MODES = {
  investment: {
    label: 'Investment Advisor',
    icon: TrendingUp,
    description: 'Analisis portfolio & strategi investasi',
    endpoint: 'portfolio-insights',
    suggestions: ['Analisis portfolio saya', 'Tips diversifikasi', 'Apa itu DCA?'],
    greeting: 'Halo! Saya AI Investment Advisor. Tanyakan apa saja tentang portfolio Anda, strategi investasi, atau insight pasar.',
    placeholder: 'Tanya tentang investasi...',
  },
  trading: {
    label: 'Trading Analyst',
    icon: BarChart3,
    description: 'Analisis pattern & performa trading',
    endpoint: 'trading-analysis',
    suggestions: ['Analisis performa saya', 'Strategi terbaik?', 'Kelemahan trading saya?'],
    greeting: 'Halo! Saya AI Trading Analyst. Saya akan menganalisis pattern dan performa trading journal Anda.',
    placeholder: 'Tanya tentang trading...',
  },
  fire: {
    label: 'FIRE Coach',
    icon: Flame,
    description: 'Financial independence & retirement planning',
    endpoint: 'fire-insights',
    suggestions: ['Berapa FIRE number saya?', 'Tips tingkatkan savings rate', 'Apa itu Coast FIRE?'],
    greeting: 'Halo! Saya AI FIRE Coach. Saya akan membantu Anda merencanakan kebebasan finansial dan pensiun dini.',
    placeholder: 'Tanya tentang FIRE planning...',
  },
};

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiMode, setAIMode] = useState<AIMode>('investment');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Portfolio data
  const { data: portfolios } = usePortfolios();
  const defaultPortfolio = portfolios?.find(p => p.is_default) || portfolios?.[0];
  const { data: holdings } = useHoldings(defaultPortfolio?.id);

  // Trading data
  const { data: tradeEntries } = useTradeEntries();
  const { data: strategies } = useTradingStrategies();

  // FIRE data
  const { data: fireSettings } = useFireSettings();
  const { data: budgetCategories } = useBudgetCategories();
  const { data: goals } = useGoals();
  const { data: emergencyFund } = useEmergencyFund();
  const { data: accounts } = useAccounts();

  const currentMode = AI_MODES[aiMode];
  const ModeIcon = currentMode.icon;

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

  // Clear messages when mode changes
  const handleModeChange = (mode: AIMode) => {
    setAIMode(mode);
    setMessages([]);
  };

  const getPortfolioContext = () => {
    if (!holdings || holdings.length === 0) {
      return null;
    }

    const totalValue = holdings.reduce((sum, h) => {
      const asset = h.assets as any;
      const price = asset?.price_cache?.[0]?.price || asset?.current_price || 0;
      return sum + (h.quantity * price);
    }, 0);

    const totalCost = holdings.reduce((sum, h) => sum + h.total_cost, 0);

    const holdingsSummary = holdings.map(h => {
      const asset = h.assets as any;
      const price = asset?.price_cache?.[0]?.price || asset?.current_price || 0;
      const value = h.quantity * price;
      const change24h = asset?.price_cache?.[0]?.price_change_percentage_24h || 0;
      const profitLoss = value - h.total_cost;
      const profitLossPercent = h.total_cost > 0 ? ((profitLoss / h.total_cost) * 100) : 0;
      
      return {
        symbol: asset?.symbol,
        name: asset?.name,
        type: asset?.asset_type,
        quantity: h.quantity,
        averageCost: h.average_cost,
        currentPrice: price,
        value,
        allocation: totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) + '%' : '0%',
        profitLoss,
        profitLossPercent: profitLossPercent.toFixed(2) + '%',
        change24h: change24h.toFixed(2) + '%'
      };
    });

    // Calculate allocation by asset type
    const allocationByType: Record<string, number> = {};
    holdingsSummary.forEach(h => {
      const type = h.type || 'Other';
      allocationByType[type] = (allocationByType[type] || 0) + parseFloat(h.allocation);
    });

    return {
      portfolioName: defaultPortfolio?.name || 'Default Portfolio',
      currency: defaultPortfolio?.currency || 'IDR',
      totalPortfolioValue: totalValue,
      totalCost: totalCost,
      totalProfitLoss: totalValue - totalCost,
      totalProfitLossPercent: totalCost > 0 ? (((totalValue - totalCost) / totalCost) * 100).toFixed(2) + '%' : '0%',
      numberOfAssets: holdings.length,
      allocationByType,
      holdings: holdingsSummary,
    };
  };

  const getTradingContext = () => {
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
      // Calculate R:R if possible
      rr: t.stop_loss && t.take_profit && t.entry_price ? 
        Math.abs((t.take_profit - t.entry_price) / (t.entry_price - t.stop_loss)) : null,
    }));

    return {
      trades: tradesForAI,
      strategies: strategies || [],
    };
  };

  const getFireContext = () => {
    // Calculate total savings from accounts
    const totalSavings = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

    // Calculate FIRE number
    const monthlyExpenses = fireSettings?.monthly_expenses || 0;
    const withdrawalRate = fireSettings?.safe_withdrawal_rate || 4;
    const fireNumber = monthlyExpenses > 0 ? (monthlyExpenses * 12) / (withdrawalRate / 100) : 0;

    // Calculate progress
    const progressPercent = fireNumber > 0 ? (totalSavings / fireNumber) * 100 : 0;

    // Calculate years to FIRE
    const monthlySavings = (fireSettings?.monthly_income || 0) - monthlyExpenses;
    const expectedReturn = (fireSettings?.expected_annual_return || 7) / 100;
    let yearsToFire = 0;
    if (monthlySavings > 0 && fireNumber > totalSavings) {
      // Simple calculation - can be more sophisticated with compound interest
      const remaining = fireNumber - totalSavings;
      const annualSavings = monthlySavings * 12;
      const effectiveRate = annualSavings * (1 + expectedReturn / 2);
      yearsToFire = remaining / effectiveRate;
    }

    // Budget summary
    const totalBudgeted = budgetCategories?.reduce((sum, c) => sum + c.budgeted_amount, 0) || 0;
    const totalSpent = budgetCategories?.reduce((sum, c) => sum + c.spent_amount, 0) || 0;
    const budgetSummary = budgetCategories?.map(c => ({
      name: c.name,
      budgeted: c.budgeted_amount,
      spent: c.spent_amount,
      remaining: c.budgeted_amount - c.spent_amount,
    })) || [];

    // Goals summary
    const goalsWithProgress = goals?.map(g => ({
      name: g.name,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      progress: g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0,
      deadline: g.deadline,
      monthlyContribution: g.monthly_contribution,
      priority: g.priority,
    })) || [];

    // Emergency fund summary
    const emergencyFundTarget = emergencyFund ? 
      emergencyFund.monthly_expenses * emergencyFund.target_months : 0;
    const emergencyFundProgress = emergencyFundTarget > 0 ? 
      (emergencyFund?.current_balance || 0) / emergencyFundTarget * 100 : 0;

    return {
      fireData: {
        currentAge: fireSettings?.current_age || null,
        targetRetirementAge: fireSettings?.target_retirement_age || null,
        currentSavings: totalSavings,
        monthlyIncome: fireSettings?.monthly_income || 0,
        monthlyExpenses: monthlyExpenses,
        monthlySavings: monthlySavings,
        savingsRate: fireSettings?.monthly_income ? 
          ((monthlySavings / fireSettings.monthly_income) * 100).toFixed(1) + '%' : '0%',
        fireNumber: fireNumber,
        progressPercent: progressPercent,
        yearsToFire: yearsToFire > 0 ? Math.ceil(yearsToFire) : null,
        withdrawalRate: withdrawalRate,
        expectedReturn: fireSettings?.expected_annual_return || 7,
        inflationRate: fireSettings?.inflation_rate || 3,
      },
      budgetData: {
        totalBudgeted,
        totalSpent,
        remaining: totalBudgeted - totalSpent,
        categories: budgetSummary,
      },
      goalsData: goalsWithProgress,
      emergencyFundData: emergencyFund ? {
        name: emergencyFund.name,
        targetMonths: emergencyFund.target_months,
        currentAmount: emergencyFund.current_balance,
        targetAmount: emergencyFundTarget,
        progress: emergencyFundProgress,
        monthlyContribution: emergencyFund.monthly_contribution,
      } : null,
      accountsSummary: {
        totalBalance: totalSavings,
        accountCount: accounts?.length || 0,
        byType: accounts?.reduce((acc, a) => {
          acc[a.account_type] = (acc[a.account_type] || 0) + Number(a.balance);
          return acc;
        }, {} as Record<string, number>) || {},
      },
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${currentMode.endpoint}`;

    try {
      let body: any;
      
      if (aiMode === 'investment') {
        body = {
          messages: [...messages, userMessage],
          portfolioContext: getPortfolioContext(),
        };
      } else if (aiMode === 'trading') {
        const tradingContext = getTradingContext();
        body = {
          trades: tradingContext.trades,
          strategies: tradingContext.strategies,
          question: input.trim(),
        };
      } else {
        // FIRE mode
        const fireContext = getFireContext();
        body = {
          messages: [...messages, userMessage],
          ...fireContext,
        };
      }

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

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 z-50 shadow-2xl transition-all duration-300 flex flex-col",
      isMinimized ? "w-72 h-14" : "w-96 h-[520px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary/5 rounded-t-lg shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ModeIcon className="h-4 w-4 text-primary" />
          </div>
          {!isMinimized ? (
            <Select value={aiMode} onValueChange={(v: AIMode) => handleModeChange(v)}>
              <SelectTrigger className="h-8 border-0 bg-transparent p-0 shadow-none focus:ring-0 w-auto">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm">{currentMode.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </div>
              </SelectTrigger>
              <SelectContent className="z-[60]">
                {Object.entries(AI_MODES).map(([key, mode]) => {
                  const Icon = mode.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs text-muted-foreground">{mode.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <span className="font-semibold text-sm truncate">{currentMode.label}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h4 className="font-medium mb-2">{currentMode.greeting.split('.')[0]}.</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentMode.greeting.split('.').slice(1).join('.')}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentMode.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-2",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ModeIcon className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content || '...'}</p>
                    </div>
                    {message.role === 'user' && (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ModeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
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
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
