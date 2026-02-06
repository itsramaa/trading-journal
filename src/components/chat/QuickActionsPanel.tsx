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
    label: 'Analisis Performa',
    prompt: 'Analisis performa trading saya secara keseluruhan',
    icon: TrendingUp,
    category: 'Analisis',
    mode: 'trading',
  },
  {
    label: 'Win Rate & Metrics',
    prompt: 'Berapa win rate dan metrics trading saya?',
    icon: BarChart3,
    category: 'Analisis',
    mode: 'trading',
  },
  {
    label: 'Pattern Terbaik',
    prompt: 'Pattern trading apa yang paling profitable untuk saya?',
    icon: LineChart,
    category: 'Strategi',
    mode: 'trading',
  },
  {
    label: 'Strategi Rekomendasi',
    prompt: 'Strategi mana yang sebaiknya saya fokuskan?',
    icon: Target,
    category: 'Strategi',
    mode: 'trading',
  },
  {
    label: 'Kelemahan Trading',
    prompt: 'Apa kelemahan utama dalam trading saya?',
    icon: AlertTriangle,
    category: 'Improvement',
    mode: 'trading',
  },
  {
    label: 'Tips Improvement',
    prompt: 'Bagaimana cara meningkatkan kualitas entry saya?',
    icon: Brain,
    category: 'Improvement',
    mode: 'trading',
  },
  
  // Market Analyst
  {
    label: 'Kondisi Market',
    prompt: 'Bagaimana kondisi market crypto saat ini?',
    icon: Globe,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Fear & Greed',
    prompt: 'Berapa nilai Fear & Greed index dan apa artinya untuk trading?',
    icon: Gauge,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Whale Activity',
    prompt: 'Adakah whale activity yang perlu diperhatikan di BTC dan ETH?',
    icon: Activity,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Trading Opportunities',
    prompt: 'Apa trading opportunities yang ada saat ini?',
    icon: Zap,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'BTC/ETH Analysis',
    prompt: 'Analisis trend BTC dan ETH saat ini. Mana yang lebih bullish?',
    icon: LineChart,
    category: 'Market',
    mode: 'market',
  },
  {
    label: 'Macro Overview',
    prompt: 'Bagaimana kondisi macro crypto market? BTC dominance, funding rates?',
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
    prompt: 'Berapa quality score untuk trade SOLUSDT short entry 220, SL 230, TP 200?',
    icon: Scale,
    category: 'Setup',
    mode: 'setup',
  },
  {
    label: 'Confluence Analysis',
    prompt: 'Analisis confluence untuk setup yang saya planning. Apa yang perlu saya cek?',
    icon: Brain,
    category: 'Setup',
    mode: 'setup',
  },
  {
    label: 'Event Impact Today',
    prompt: 'Adakah economic event hari ini yang bisa mempengaruhi crypto market?',
    icon: Calendar,
    category: 'Calendar',
    mode: 'market',
  },
  
  // Post-Trade Coach
  {
    label: 'Analisis Trade Terakhir',
    prompt: 'Analisis trade terakhir saya dan berikan lessons learned.',
    icon: History,
    category: 'Post-Trade',
    mode: 'posttrade',
  },
  {
    label: 'Pattern dari Losses',
    prompt: 'Apa pattern yang saya lihat dari losing trades saya?',
    icon: AlertTriangle,
    category: 'Post-Trade',
    mode: 'posttrade',
  },
  {
    label: 'Apa yang Bisa Diperbaiki',
    prompt: 'Dari 10 trade terakhir, apa yang bisa saya perbaiki?',
    icon: TrendingUp,
    category: 'Post-Trade',
    mode: 'posttrade',
  },
  {
    label: 'Win vs Loss Comparison',
    prompt: 'Bandingkan karakteristik winning trades vs losing trades saya.',
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
