import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  BarChart3, 
  LineChart, 
  Brain,
  Globe,
  Activity,
  Calendar,
  Gauge,
  Zap,
  Scale,
  History,
} from 'lucide-react';
import type { AIMode } from './AIChatbot';

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
  category: string;
  mode: AIMode;
}

const QUICK_ACTIONS: QuickAction[] = [
  // Trading Analyst
  {
    label: 'Performance Analysis',
    prompt: 'Analyze my overall trading performance',
    icon: TrendingUp,
    category: 'Analysis',
    mode: 'trading',
  },
  {
    label: 'Win Rate & Metrics',
    prompt: 'What are my win rate and key trading metrics?',
    icon: BarChart3,
    category: 'Analysis',
    mode: 'trading',
  },
  {
    label: 'Best Patterns',
    prompt: 'What trading patterns are most profitable for me?',
    icon: LineChart,
    category: 'Strategy',
    mode: 'trading',
  },
  {
    label: 'Strategy Recommendation',
    prompt: 'Which strategy should I focus on?',
    icon: Target,
    category: 'Strategy',
    mode: 'trading',
  },
  {
    label: 'Trading Weaknesses',
    prompt: 'What are the main weaknesses in my trading?',
    icon: AlertTriangle,
    category: 'Improvement',
    mode: 'trading',
  },
  {
    label: 'Improvement Tips',
    prompt: 'How can I improve my entry quality?',
    icon: Brain,
    category: 'Improvement',
    mode: 'trading',
  },
  
  // Market Analyst
  {
    label: 'Market Conditions',
    prompt: 'What are the current crypto market conditions?',
    icon: Globe,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Fear & Greed',
    prompt: 'What is the Fear & Greed index value and what does it mean for trading?',
    icon: Gauge,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Whale Activity',
    prompt: 'Is there any notable whale activity in BTC and ETH?',
    icon: Activity,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Trading Opportunities',
    prompt: 'What trading opportunities are available right now?',
    icon: Zap,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'BTC/ETH Analysis',
    prompt: 'Analyze the current BTC and ETH trends. Which one is more bullish?',
    icon: LineChart,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Macro Overview',
    prompt: 'What are the macro crypto market conditions? BTC dominance, funding rates?',
    icon: Globe,
    category: 'Market',
    mode: 'market',
  },
  
  // Setup Validator
  {
    label: 'Validate BTC Setup',
    prompt: 'Validate setup: BTCUSDT long entry 97000, SL 95000, TP 102000',
    icon: Target,
    category: 'Setup',
    mode: 'setup',
  },
  {
    label: 'Validate ETH Setup',
    prompt: 'Validate setup: ETHUSDT long entry 3400, SL 3300, TP 3700',
    icon: Target,
    category: 'Setup',
    mode: 'setup',
  },
  {
    label: 'Quality Score Check',
    prompt: 'What is the quality score for SOLUSDT short entry 220, SL 230, TP 200?',
    icon: Scale,
    category: 'Setup',
    mode: 'setup',
  },
  {
    label: 'Confluence Analysis',
    prompt: 'Analyze confluences for the setup I am planning. What should I check?',
    icon: Brain,
    category: 'Setup',
    mode: 'setup',
  },
  {
    label: 'Event Impact Today',
    prompt: 'Are there any economic events today that could impact the crypto market?',
    icon: Calendar,
    category: 'Calendar',
    mode: 'market',
  },
  
  // Post-Trade Coach
  {
    label: 'Last Trade Analysis',
    prompt: 'Analyze my last trade and provide lessons learned.',
    icon: History,
    category: 'Post-Trade',
    mode: 'posttrade',
  },
  {
    label: 'Loss Patterns',
    prompt: 'What patterns do you see from my losing trades?',
    icon: AlertTriangle,
    category: 'Post-Trade',
    mode: 'posttrade',
  },
  {
    label: 'What Can I Improve',
    prompt: 'From my last 10 trades, what can I improve?',
    icon: TrendingUp,
    category: 'Post-Trade',
    mode: 'posttrade',
  },
  {
    label: 'Win vs Loss Comparison',
    prompt: 'Compare the characteristics of my winning trades vs losing trades.',
    icon: Scale,
    category: 'Post-Trade',
    mode: 'posttrade',
  },
];

interface QuickActionsPanelProps {
  onSelectAction: (prompt: string, mode?: AIMode) => void;
  disabled?: boolean;
  currentMode?: AIMode;
}

export function QuickActionsPanel({ onSelectAction, disabled, currentMode = 'trading' }: QuickActionsPanelProps) {
  // Filter actions by current mode
  const filteredActions = QUICK_ACTIONS.filter(a => a.mode === currentMode);
  const categories = [...new Set(filteredActions.map(a => a.category))];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Quick Actions
          <Badge variant="outline" className="text-xs font-normal">
            {currentMode === 'trading' ? 'Trading' : currentMode === 'market' ? 'Market' : currentMode === 'posttrade' ? 'Post-Trade' : 'Setup'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {category}
            </p>
            <div className="space-y-1">
              {filteredActions.filter(a => a.category === category).map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-2"
                    onClick={() => onSelectAction(action.prompt, action.mode)}
                    disabled={disabled}
                  >
                    <Icon className="h-4 w-4 mr-2 shrink-0" />
                    <span className="text-xs text-left">{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
