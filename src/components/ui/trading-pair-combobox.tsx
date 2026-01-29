/**
 * TradingPairCombobox - Searchable dropdown for 600+ trading pairs
 * Uses cmdk (Command) for fuzzy search and keyboard navigation
 */
import { useState } from "react";
import { Check, ChevronsUpDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useTradingPairs, useSyncTradingPairs } from "@/hooks/use-trading-pairs";

interface TradingPairComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TradingPairCombobox({
  value,
  onValueChange,
  placeholder = "Select pair...",
  disabled = false,
  className,
}: TradingPairComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: tradingPairs, isLoading } = useTradingPairs();
  const syncPairs = useSyncTradingPairs();

  // Show loading skeleton
  if (isLoading) {
    return <Skeleton className={cn("h-10 w-full", className)} />;
  }

  // Show sync prompt if no pairs
  if (!tradingPairs || tradingPairs.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          disabled={syncPairs.isPending}
          onClick={() => syncPairs.mutate()}
        >
          {syncPairs.isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing pairs...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync trading pairs from Binance
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search pair..." />
          <CommandList>
            <CommandEmpty>No pair found.</CommandEmpty>
            <CommandGroup>
              {tradingPairs.map((pair) => (
                <CommandItem
                  key={pair.symbol}
                  value={pair.symbol}
                  onSelect={(currentValue) => {
                    // cmdk converts to lowercase, so we need to find the original
                    const selectedPair = tradingPairs.find(
                      (p) => p.symbol.toLowerCase() === currentValue.toLowerCase()
                    );
                    if (selectedPair) {
                      onValueChange(selectedPair.symbol === value ? "" : selectedPair.symbol);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === pair.symbol ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {pair.symbol}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
