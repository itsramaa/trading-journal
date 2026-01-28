import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, AlertTriangle, BarChart3, LineChart, Brain } from 'lucide-react';

interface QuickAction {
  label: string;
  prompt: string;
  icon: React.ElementType;
  category: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Analisis Performa',
    prompt: 'Analisis performa trading saya secara keseluruhan',
    icon: TrendingUp,
    category: 'Analisis',
  },
  {
    label: 'Win Rate & Metrics',
    prompt: 'Berapa win rate dan metrics trading saya?',
    icon: BarChart3,
    category: 'Analisis',
  },
  {
    label: 'Pattern Terbaik',
    prompt: 'Pattern trading apa yang paling profitable untuk saya?',
    icon: LineChart,
    category: 'Strategi',
  },
  {
    label: 'Strategi Rekomendasi',
    prompt: 'Strategi mana yang sebaiknya saya fokuskan?',
    icon: Target,
    category: 'Strategi',
  },
  {
    label: 'Kelemahan Trading',
    prompt: 'Apa kelemahan utama dalam trading saya?',
    icon: AlertTriangle,
    category: 'Improvement',
  },
  {
    label: 'Tips Improvement',
    prompt: 'Bagaimana cara meningkatkan kualitas entry saya?',
    icon: Brain,
    category: 'Improvement',
  },
];

interface QuickActionsPanelProps {
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActionsPanel({ onSelectAction, disabled }: QuickActionsPanelProps) {
  const categories = [...new Set(QUICK_ACTIONS.map(a => a.category))];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map(category => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {category}
            </p>
            <div className="space-y-1">
              {QUICK_ACTIONS.filter(a => a.category === category).map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-2"
                    onClick={() => onSelectAction(action.prompt)}
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
