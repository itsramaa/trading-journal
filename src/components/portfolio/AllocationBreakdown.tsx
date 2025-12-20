import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/lib/formatters";
import type { MarketAllocation } from "@/lib/data-transformers";

interface AllocationBreakdownProps {
  allocations: MarketAllocation[];
  currency?: 'USD' | 'IDR';
}

export function AllocationBreakdown({ allocations, currency = 'USD' }: AllocationBreakdownProps) {
  const [openMarkets, setOpenMarkets] = useState<Record<string, boolean>>({});

  const toggleMarket = (market: string) => {
    setOpenMarkets(prev => ({
      ...prev,
      [market]: !prev[market],
    }));
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Allocation by Market</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allocations.map((marketAlloc) => (
          <Collapsible
            key={marketAlloc.market}
            open={openMarkets[marketAlloc.market]}
            onOpenChange={() => toggleMarket(marketAlloc.market)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="space-y-2 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {openMarkets[marketAlloc.market] ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: marketAlloc.color }} 
                      />
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {marketAlloc.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({marketAlloc.assets.length} assets)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium font-mono-numbers">
                      {marketAlloc.percentage.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground font-mono-numbers w-24 text-right">
                      {formatCompactCurrency(marketAlloc.value, currency)}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={marketAlloc.percentage} 
                  className="h-2"
                />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-3 ml-9 space-y-2 pl-4 border-l-2 border-border">
                {marketAlloc.assets.map((asset) => (
                  <div 
                    key={asset.symbol}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {asset.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium font-mono-numbers">
                          {asset.percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground font-mono-numbers">
                          {asset.marketPercentage.toFixed(0)}% of {marketAlloc.name}
                        </p>
                      </div>
                      <span className="text-muted-foreground font-mono-numbers w-20 text-right">
                        {formatCompactCurrency(asset.value, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
