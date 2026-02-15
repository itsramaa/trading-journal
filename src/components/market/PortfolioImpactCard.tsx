/**
 * Portfolio Impact Card - "What If" Scenario Calculator
 * Calculates portfolio impact based on hypothetical market moves
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { usePositions } from "@/hooks/use-positions";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { getCorrelation } from "@/lib/correlation-utils";
import { getBaseSymbol } from "@/lib/symbol-utils";
import { cn } from "@/lib/utils";

export function PortfolioImpactCard() {
  const { positions, isLoading } = usePositions();
  const { format } = useCurrencyConversion();
  const [scenarioMove, setScenarioMove] = useState(-5); // BTC % move

  const impactAnalysis = useMemo(() => {
    if (!positions.length) return null;

    const btcSymbol = 'BTCUSDT';
    let totalImpact = 0;
    const affectedPositions: Array<{
      symbol: string;
      correlation: number;
      positionSize: number;
      estimatedImpact: number;
      isDirect: boolean;
    }> = [];

    for (const pos of positions) {
      const corr = pos.symbol === btcSymbol ? 1 : getCorrelation(btcSymbol, pos.symbol);
      if (corr === 0 && pos.symbol !== btcSymbol) continue;

      const effectiveCorr = pos.symbol === btcSymbol ? 1 : corr;
      const posNotional = Math.abs(pos.notional);
      const estimatedImpact = posNotional * (scenarioMove / 100) * effectiveCorr * (pos.side === 'SHORT' ? -1 : 1);
      
      totalImpact += estimatedImpact;
      affectedPositions.push({
        symbol: pos.symbol,
        correlation: effectiveCorr,
        positionSize: posNotional,
        estimatedImpact,
        isDirect: pos.symbol === btcSymbol,
      });
    }

    const totalNotional = positions.reduce((sum, p) => sum + Math.abs(p.notional), 0);
    const portfolioPctImpact = totalNotional > 0 ? (totalImpact / totalNotional) * 100 : 0;

    return {
      totalImpact,
      portfolioPctImpact,
      affectedPositions: affectedPositions.sort((a, b) => Math.abs(b.estimatedImpact) - Math.abs(a.estimatedImpact)),
      totalNotional,
    };
  }, [positions, scenarioMove]);

  if (isLoading || !positions.length) {
    return null; // Don't show if no positions
  }

  return (
    <Card role="region" aria-label="Portfolio Impact Calculator">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          Portfolio Impact
          <InfoTooltip content="Estimates how a BTC price move would affect your open positions, accounting for cross-asset correlations" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">BTC Move Scenario</span>
            <Badge variant="outline" className={cn(
              "font-mono",
              scenarioMove > 0 ? "text-profit border-profit/50" : scenarioMove < 0 ? "text-loss border-loss/50" : ""
            )}>
              {scenarioMove > 0 ? '+' : ''}{scenarioMove}%
            </Badge>
          </div>
          <Slider
            value={[scenarioMove]}
            onValueChange={([v]) => setScenarioMove(v)}
            min={-20}
            max={20}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-20%</span>
            <span>0%</span>
            <span>+20%</span>
          </div>
        </div>

        {/* Impact Result */}
        {impactAnalysis && (
          <>
            <div className={cn(
              "p-3 rounded-lg border",
              impactAnalysis.totalImpact > 0 ? "border-profit/30 bg-profit/5" : "border-loss/30 bg-loss/5"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Portfolio Impact</span>
                <div className="flex items-center gap-2">
                  {impactAnalysis.totalImpact > 0 ? (
                    <TrendingUp className="h-4 w-4 text-profit" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-loss" />
                  )}
                  <span className={cn(
                    "text-lg font-bold font-mono",
                    impactAnalysis.totalImpact > 0 ? "text-profit" : "text-loss"
                  )}>
                    {impactAnalysis.totalImpact > 0 ? '+' : ''}{format(impactAnalysis.totalImpact)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  Total exposure: {format(impactAnalysis.totalNotional)}
                </span>
                <span className={cn(
                  "text-sm font-mono",
                  impactAnalysis.portfolioPctImpact > 0 ? "text-profit" : "text-loss"
                )}>
                  {impactAnalysis.portfolioPctImpact > 0 ? '+' : ''}{impactAnalysis.portfolioPctImpact.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Affected Positions */}
            {impactAnalysis.affectedPositions.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Affected Positions</span>
                {impactAnalysis.affectedPositions.slice(0, 5).map((p) => (
                  <div key={p.symbol} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getBaseSymbol(p.symbol)}</span>
                      {p.isDirect ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">direct</Badge>
                      ) : (
                        <span className="text-muted-foreground">corr {p.correlation.toFixed(2)}</span>
                      )}
                    </div>
                    <span className={cn(
                      "font-mono",
                      p.estimatedImpact > 0 ? "text-profit" : "text-loss"
                    )}>
                      {p.estimatedImpact > 0 ? '+' : ''}{format(p.estimatedImpact)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
