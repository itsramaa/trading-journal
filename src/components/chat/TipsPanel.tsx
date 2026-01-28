import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, CheckCircle2 } from 'lucide-react';

const TIPS = [
  'Sebutkan pair spesifik untuk analisis lebih akurat',
  'Tanyakan tentang timeframe tertentu',
  'Minta perbandingan antar strategi',
  'Tanya tentang win rate di kondisi market tertentu',
  'Minta analisis drawdown dan risk management',
  'Tanyakan pattern yang sering loss untuk dihindari',
];

export function TipsPanel() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Tips AI Trading
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {TIPS.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
