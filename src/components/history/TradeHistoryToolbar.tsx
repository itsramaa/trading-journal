/**
 * Trade History Toolbar - View toggle, import link, sync status, enrichment badge
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
interface TradeHistoryToolbarProps {
  isFullSyncing: boolean;
  isBinanceConnected: boolean;
  tradesNeedingEnrichment: number;
}

export function TradeHistoryToolbar({
  isFullSyncing,
  isBinanceConnected,
  tradesNeedingEnrichment,
}: TradeHistoryToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/import">
          <Download className="h-3 w-3" />
          Import & Sync
        </Link>
      </Button>

      {isFullSyncing && (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sync in progress...
        </Badge>
      )}

      {isBinanceConnected && tradesNeedingEnrichment > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                <AlertCircle className="h-3 w-3" />
                {tradesNeedingEnrichment} need enrichment
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go to Import & Sync to enrich trades with missing data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
