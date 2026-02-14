import { Flame } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface StrategyRow {
  name: string;
  trades: number;
  pnl: number;
  wins: number;
}

interface AccountDetailStrategiesProps {
  strategyBreakdown: StrategyRow[];
}

export function AccountDetailStrategies({ strategyBreakdown }: AccountDetailStrategiesProps) {
  const { formatPnl } = useCurrencyConversion();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Strategy Breakdown</CardTitle>
        <CardDescription>Performance per strategy on this account</CardDescription>
      </CardHeader>
      <CardContent>
        {strategyBreakdown.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Flame className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No strategy data</p>
            <p className="text-sm">Tag trades with strategies to see breakdown</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strategyBreakdown.map((s, i) => {
                  const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.trades}</TableCell>
                      <TableCell className="text-right">{winRate.toFixed(1)}%</TableCell>
                      <TableCell className={`text-right font-mono ${s.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatPnl(s.pnl)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
