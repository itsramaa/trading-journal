/**
 * TradeTimeframeSection - 3-Timeframe system for professional trade enrichment
 * Execution TF is mandatory, Bias & Precision are optional
 */
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Eye, Crosshair } from "lucide-react";

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "3m", label: "3m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1H" },
  { value: "2h", label: "2H" },
  { value: "4h", label: "4H" },
  { value: "6h", label: "6H" },
  { value: "8h", label: "8H" },
  { value: "12h", label: "12H" },
  { value: "1d", label: "1D" },
  { value: "3d", label: "3D" },
  { value: "1w", label: "1W" },
  { value: "1M", label: "1M" },
];

interface TradeTimeframeSectionProps {
  biasTimeframe: string;
  executionTimeframe: string;
  precisionTimeframe: string;
  onBiasChange: (v: string) => void;
  onExecutionChange: (v: string) => void;
  onPrecisionChange: (v: string) => void;
}

export function TradeTimeframeSection({
  biasTimeframe,
  executionTimeframe,
  precisionTimeframe,
  onBiasChange,
  onExecutionChange,
  onPrecisionChange,
}: TradeTimeframeSectionProps) {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Multi-Timeframe Analysis
      </Label>
      <div className="grid grid-cols-3 gap-3">
        {/* Bias (HTF) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Bias (HTF)</span>
          </div>
          <Select value={biasTimeframe} onValueChange={onBiasChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Execution (mandatory) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium">Execution</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              Required
            </Badge>
          </div>
          <Select value={executionTimeframe} onValueChange={onExecutionChange}>
            <SelectTrigger className="h-8 text-xs border-primary/50">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Precision (LTF) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Crosshair className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Precision (LTF)</span>
          </div>
          <Select value={precisionTimeframe} onValueChange={onPrecisionChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
