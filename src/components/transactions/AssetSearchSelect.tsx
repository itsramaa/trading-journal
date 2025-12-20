import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, Search, Bitcoin, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { SearchedAsset, useAssetSearch } from "@/hooks/use-asset-search";

interface AssetSearchSelectProps {
  value: SearchedAsset | null;
  onChange: (asset: SearchedAsset | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AssetSearchSelect({ 
  value, 
  onChange, 
  placeholder = "Search asset...",
  disabled = false 
}: AssetSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const { data: results = [], isLoading } = useAssetSearch(debouncedQuery);
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CRYPTO':
        return <Bitcoin className="h-4 w-4 text-orange-500" />;
      case 'US_STOCK':
      case 'ID_STOCK':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };
  
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CRYPTO':
        return <Badge variant="outline" className="text-xs">Crypto</Badge>;
      case 'US_STOCK':
        return <Badge variant="outline" className="text-xs">US Stock</Badge>;
      case 'ID_STOCK':
        return <Badge variant="outline" className="text-xs">ID Stock</Badge>;
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value ? (
            <div className="flex items-center gap-2">
              {value.logo_url && (
                <img 
                  src={value.logo_url} 
                  alt={value.symbol} 
                  className="h-5 w-5 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {!value.logo_url && getTypeIcon(value.type)}
              <span className="font-medium">{value.symbol}</span>
              <span className="text-muted-foreground text-sm truncate max-w-[150px]">
                {value.name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search crypto or stocks..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Type at least 2 characters to search</p>
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>No assets found.</CommandEmpty>
            ) : (
              <>
                {/* Crypto Results */}
                {results.filter(r => r.type === 'CRYPTO').length > 0 && (
                  <CommandGroup heading="Cryptocurrency">
                    {results.filter(r => r.type === 'CRYPTO').map((asset) => (
                      <CommandItem
                        key={asset.id}
                        value={asset.id}
                        onSelect={() => {
                          onChange(asset);
                          setOpen(false);
                          setSearchQuery("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value?.id === asset.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {asset.logo_url ? (
                            <img 
                              src={asset.logo_url} 
                              alt={asset.symbol} 
                              className="h-6 w-6 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Bitcoin className="h-6 w-6 text-orange-500" />
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium">{asset.symbol}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                              {asset.name}
                            </span>
                          </div>
                        </div>
                        {getTypeBadge(asset.type)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {/* Stock Results */}
                {results.filter(r => r.type !== 'CRYPTO').length > 0 && (
                  <CommandGroup heading="Stocks">
                    {results.filter(r => r.type !== 'CRYPTO').map((asset) => (
                      <CommandItem
                        key={asset.id}
                        value={asset.id}
                        onSelect={() => {
                          onChange(asset);
                          setOpen(false);
                          setSearchQuery("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value?.id === asset.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <TrendingUp className="h-6 w-6 text-blue-500" />
                          <div className="flex flex-col">
                            <span className="font-medium">{asset.symbol}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                              {asset.name}
                            </span>
                          </div>
                        </div>
                        {getTypeBadge(asset.type)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
