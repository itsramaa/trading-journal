/**
 * Calculator Results Display - Position Size Calculator
 */
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { calculatePositionSize } from "@/lib/calculations/position-sizing";

interface CalculatorResultsProps {
  result: ReturnType<typeof calculatePositionSize>;
}

export function CalculatorResults({ result }: CalculatorResultsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatQuantity = (value: number) => {
    if (value >= 1) {
      return value.toFixed(4);
    }
    return value.toFixed(8);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Calculation Results</h4>
      
      <div className="grid gap-3 md:grid-cols-2">
        {/* Position Size */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Position Size
            <InfoTooltip content="The number of units/contracts to buy or sell. Calculated to ensure your stop loss equals your risk amount." />
          </p>
          <p className="text-2xl font-bold">{formatQuantity(result.position_size)}</p>
          <p className="text-sm text-muted-foreground">units</p>
        </div>
        
        {/* Position Value */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Position Value
            <InfoTooltip content="Total dollar value of the position (units × entry price). Shows how much capital is deployed in this trade." />
          </p>
          <p className="text-2xl font-bold">{formatCurrency(result.position_value)}</p>
          <p className="text-sm text-muted-foreground">
            {result.capital_deployment_percent.toFixed(1)}% of capital
          </p>
        </div>
        
        {/* Risk Amount */}
        <div className="p-4 rounded-lg bg-loss-muted">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Risk Amount (1R)
            <InfoTooltip 
              content="Maximum loss if price hits stop loss. This is your 'R' value used to measure trade outcomes. 1R loss = planned risk." 
              variant="warning" 
            />
          </p>
          <p className="text-2xl font-bold text-loss">
            -{formatCurrency(result.potential_loss)}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.stop_distance_percent.toFixed(2)}% stop distance
          </p>
        </div>
        
        {/* Potential Profit */}
        <div className="p-4 rounded-lg bg-profit-muted">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Potential Profit (2R)
            <InfoTooltip content="Profit if price reaches 2× your risk distance. A 2R win means you gained twice what you risked. Aim for 2R+ on winning trades." />
          </p>
          <p className="text-2xl font-bold text-profit">
            +{formatCurrency(result.potential_profit_2r)}
          </p>
          <p className="text-sm text-muted-foreground">
            3R: +{formatCurrency(result.potential_profit_3r)}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert variant={result.is_valid ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {result.is_valid && result.warnings.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-profit" aria-hidden="true" />
          <AlertDescription className="text-profit">
            Position size is within acceptable risk parameters
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
