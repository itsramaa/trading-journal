import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Search, TrendingUp, TrendingDown, Wallet, ArrowLeftRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAppStore } from "@/store/app-store";
import { useSearch, type SearchResult } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const navigate = useNavigate();
  const { isSearchOpen, setSearchOpen } = useAppStore();
  const { query, setQuery, groupedResults, isLoading, isEmpty, error, clear } = useSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Keyboard shortcut to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isSearchOpen, setSearchOpen]);

  // Reset state when closing
  useEffect(() => {
    if (!isSearchOpen) {
      clear();
      setSelectedIndex(0);
    }
  }, [isSearchOpen, clear]);

  const handleSelect = useCallback((result: SearchResult) => {
    setSearchOpen(false);
    navigate(result.href);
  }, [navigate, setSearchOpen]);

  // Get all results as flat array for keyboard navigation
  const allResults = [
    ...groupedResults.assets,
    ...groupedResults.portfolios,
    ...groupedResults.transactions,
    ...groupedResults.pages,
  ];

  const renderResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'asset':
        const priceChange = result.metadata?.priceChange;
        return priceChange >= 0 
          ? <TrendingUp className="h-4 w-4 text-profit" />
          : <TrendingDown className="h-4 w-4 text-loss" />;
      case 'portfolio':
        return <Wallet className="h-4 w-4 text-primary" />;
      case 'transaction':
        return <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />;
      case 'page':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const renderGroup = (
    title: string,
    results: SearchResult[],
    showSeparator: boolean = false
  ) => {
    if (results.length === 0) return null;

    return (
      <>
        {showSeparator && <CommandSeparator />}
        <CommandGroup heading={title}>
          {results.map((result) => (
            <CommandItem
              key={`${result.type}-${result.id}`}
              value={`${result.type}:${result.id}:${result.title}`}
              onSelect={() => handleSelect(result)}
              className="flex items-center gap-3 py-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                {renderResultIcon(result)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{result.title}</p>
                {result.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                )}
              </div>
              {result.value && (
                <div className="text-sm font-mono text-muted-foreground">
                  {result.value}
                </div>
              )}
              <Badge variant="outline" className="text-xs capitalize">
                {result.type}
              </Badge>
            </CommandItem>
          ))}
        </CommandGroup>
      </>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:w-64 md:w-80"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search assets, transactions...</span>
        <span className="lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={isSearchOpen} onOpenChange={setSearchOpen}>
        <CommandInput 
          placeholder="Search assets, portfolios, transactions, pages..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-6 text-sm text-destructive">
              <p>{error}</p>
              <Button variant="link" size="sm" onClick={clear}>
                Try again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {isEmpty && !error && (
            <CommandEmpty>
              No results found for "{query}". Try different keywords.
            </CommandEmpty>
          )}

          {/* Results */}
          {!isLoading && !error && (
            <>
              {renderGroup("Assets", groupedResults.assets)}
              {renderGroup("Portfolios", groupedResults.portfolios, groupedResults.assets.length > 0)}
              {renderGroup("Transactions", groupedResults.transactions, 
                groupedResults.assets.length > 0 || groupedResults.portfolios.length > 0)}
              {renderGroup("Pages", groupedResults.pages,
                groupedResults.assets.length > 0 || groupedResults.portfolios.length > 0 || groupedResults.transactions.length > 0)}
            </>
          )}

          {/* Initial State - Show quick links */}
          {!query && !isLoading && (
            <>
              <CommandGroup heading="Quick Links">
                <CommandItem onSelect={() => handleSelect({ type: 'page', id: 'dashboard', title: 'Dashboard', href: '/' })}>
                  <FileText className="mr-2 h-4 w-4" />
                  Dashboard
                </CommandItem>
                <CommandItem onSelect={() => handleSelect({ type: 'page', id: 'portfolio', title: 'Portfolio', href: '/portfolio' })}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Portfolio
                </CommandItem>
                <CommandItem onSelect={() => handleSelect({ type: 'page', id: 'transactions', title: 'Transactions', href: '/transactions' })}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Transactions
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
