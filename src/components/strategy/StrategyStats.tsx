/**
 * Strategy Stats - Summary cards for Strategy Management page
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, Zap, TrendingUp, BarChart3 } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";

interface StrategyStatsProps {
  strategies: TradingStrategy[] | undefined;
}

export function StrategyStats({ strategies }: StrategyStatsProps) {
  const totalStrategies = strategies?.length || 0;
  const activeStrategies = strategies?.filter(s => s.is_active).length || 0;
  const spotStrategies = strategies?.filter(s => s.market_type === 'spot' || !s.market_type).length || 0;
  const futuresStrategies = strategies?.filter(s => s.market_type === 'futures').length || 0;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            Total Strategies
            <InfoTooltip content="Total number of trading strategies you've created or imported. Includes both active and paused strategies." />
          </CardTitle>
          <Library className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStrategies}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            Active
            <InfoTooltip content="Strategies currently enabled for trading. Active strategies appear in your trade entry form for quick selection." />
          </CardTitle>
          <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{activeStrategies}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            Spot
            <InfoTooltip content="Strategies designed for spot trading (buying/selling the actual asset without leverage)." />
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{spotStrategies}</div>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            Futures
            <InfoTooltip content="Strategies designed for futures/derivatives trading with leverage. Higher risk, higher reward potential." />
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{futuresStrategies}</div>
        </CardContent>
      </Card>
    </div>
  );
}
