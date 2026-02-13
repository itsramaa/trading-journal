/**
 * Trade History Toolbar - View toggle, import link, sync status, enrichment badge
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, List, LayoutGrid, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { ViewMode } from "@/lib/constants/trade-history";

interface TradeHistoryToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isFullSyncing: boolean;
  isBinanceConnected: boolean;
  tradesNeedingEnrichment: number;
}

export function TradeHistoryToolbar({
  viewMode,
  onViewModeChange,
  isFullSyncing,
  isBinanceConnected,
  tradesNeedingEnrichment,
}: TradeHistoryToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
      <div className="flex items-center gap-3 flex-wrap">
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

      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(v) => v && onViewModeChange(v as ViewMode)}
        className="border rounded-md"
      >
        <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-3">
          <List className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">List</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="gallery" aria-label="Gallery view" className="gap-1.5 px-3">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Gallery</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
