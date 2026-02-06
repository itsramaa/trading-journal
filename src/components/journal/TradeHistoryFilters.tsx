/**
 * TradeHistoryFilters - Comprehensive filters for trade history
 * Includes: Result (profit/loss), Strategies (multi-select), Direction, Pair, Session, Date Range, AI Score
 */
import { useState } from "react";
import { Check, ChevronsUpDown, Filter, X, TrendingUp, TrendingDown, Brain, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";
import { TradingSession, SESSION_LABELS, formatSessionTimeLocal } from "@/lib/session-utils";

export type ResultFilter = 'all' | 'profit' | 'loss' | 'breakeven';
export type DirectionFilter = 'all' | 'LONG' | 'SHORT';
export type SessionFilter = 'all' | TradingSession;

interface TradeHistoryFiltersProps {
  // Date range
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  // Result filter (profit/loss)
  resultFilter: ResultFilter;
  onResultFilterChange: (filter: ResultFilter) => void;
  // Direction filter
  directionFilter: DirectionFilter;
  onDirectionFilterChange: (filter: DirectionFilter) => void;
  // Session filter (NEW)
  sessionFilter?: SessionFilter;
  onSessionFilterChange?: (filter: SessionFilter) => void;
  // Strategy filter (multi-select)
  strategies: TradingStrategy[];
  selectedStrategyIds: string[];
  onStrategyIdsChange: (ids: string[]) => void;
  // Pair filter
  availablePairs: string[];
  selectedPairs: string[];
  onPairsChange: (pairs: string[]) => void;
  // AI score sort
  sortByAI: 'none' | 'asc' | 'desc';
  onSortByAIChange: (sort: 'none' | 'asc' | 'desc') => void;
  // Stats
  totalCount?: number;
  filteredCount?: number;
}

export function TradeHistoryFilters({
  dateRange,
  onDateRangeChange,
  resultFilter,
  onResultFilterChange,
  directionFilter,
  onDirectionFilterChange,
  sessionFilter = 'all',
  onSessionFilterChange,
  strategies,
  selectedStrategyIds,
  onStrategyIdsChange,
  availablePairs,
  selectedPairs,
  onPairsChange,
  sortByAI,
  onSortByAIChange,
  totalCount,
  filteredCount,
}: TradeHistoryFiltersProps) {
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);

  const handleAISortClick = () => {
    onSortByAIChange(sortByAI === 'none' ? 'desc' : sortByAI === 'desc' ? 'asc' : 'none');
  };

  const toggleStrategy = (id: string) => {
    onStrategyIdsChange(
      selectedStrategyIds.includes(id)
        ? selectedStrategyIds.filter(sid => sid !== id)
        : [...selectedStrategyIds, id]
    );
  };

  const togglePair = (pair: string) => {
    onPairsChange(
      selectedPairs.includes(pair)
        ? selectedPairs.filter(p => p !== pair)
        : [...selectedPairs, pair]
    );
  };

  const clearAllFilters = () => {
    onDateRangeChange({ from: null, to: null });
    onResultFilterChange('all');
    onDirectionFilterChange('all');
    onSessionFilterChange?.('all');
    onStrategyIdsChange([]);
    onPairsChange([]);
    onSortByAIChange('none');
  };

  const hasActiveFilters = 
    dateRange.from !== null || 
    dateRange.to !== null ||
    resultFilter !== 'all' ||
    directionFilter !== 'all' ||
    sessionFilter !== 'all' ||
    selectedStrategyIds.length > 0 ||
    selectedPairs.length > 0 ||
    sortByAI !== 'none';

  return (
    <div className="space-y-4">
      {/* Main filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Date Range */}
        <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />

        {/* Result Filter (Profit/Loss) - Single Select */}
        <Select value={resultFilter} onValueChange={(v) => onResultFilterChange(v as ResultFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg z-50">
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="profit">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-profit" />
                Profit
              </span>
            </SelectItem>
            <SelectItem value="loss">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-loss" />
                Loss
              </span>
            </SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>

        {/* Direction Filter - Single Select */}
        <Select value={directionFilter} onValueChange={(v) => onDirectionFilterChange(v as DirectionFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg z-50">
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="LONG">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-profit" />
                LONG
              </span>
            </SelectItem>
            <SelectItem value="SHORT">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-loss" />
                SHORT
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Session Filter */}
        {onSessionFilterChange && (
          <Select value={sessionFilter} onValueChange={(v) => onSessionFilterChange(v as SessionFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-lg z-50">
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="asia">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Asia ({formatSessionTimeLocal('asia')})
                </span>
              </SelectItem>
              <SelectItem value="london">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  London ({formatSessionTimeLocal('london')})
                </span>
              </SelectItem>
              <SelectItem value="newyork">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  New York ({formatSessionTimeLocal('newyork')})
                </span>
              </SelectItem>
              <SelectItem value="off-hours">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Off Hours
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Strategy Filter - Multi Select with Search */}
        {strategies.length > 0 && (
          <Popover open={strategyOpen} onOpenChange={setStrategyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={strategyOpen}
                className="w-[180px] justify-between"
              >
                <span className="truncate">
                  {selectedStrategyIds.length === 0 
                    ? "All Strategies" 
                    : `${selectedStrategyIds.length} selected`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0 bg-popover border shadow-lg z-50" align="start">
              <Command>
                <CommandInput placeholder="Search strategies..." />
                <CommandList>
                  <CommandEmpty>No strategy found.</CommandEmpty>
                  <CommandGroup>
                    {strategies.map((strategy) => (
                      <CommandItem
                        key={strategy.id}
                        value={strategy.name}
                        onSelect={() => toggleStrategy(strategy.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedStrategyIds.includes(strategy.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: strategy.color || '#6366f1' }}
                        />
                        {strategy.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* Pair Filter - Multi Select with Search */}
        {availablePairs.length > 0 && (
          <Popover open={pairOpen} onOpenChange={setPairOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pairOpen}
                className="w-[160px] justify-between"
              >
                <span className="truncate">
                  {selectedPairs.length === 0 
                    ? "All Pairs" 
                    : `${selectedPairs.length} pairs`}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-popover border shadow-lg z-50" align="start">
              <Command>
                <CommandInput placeholder="Search pairs..." />
                <CommandList>
                  <CommandEmpty>No pair found.</CommandEmpty>
                  <CommandGroup>
                    {availablePairs.map((pair) => (
                      <CommandItem
                        key={pair}
                        value={pair}
                        onSelect={() => togglePair(pair)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPairs.includes(pair) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {pair}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* AI Score Sort */}
        <Button 
          variant={sortByAI !== 'none' ? 'default' : 'outline'} 
          size="sm"
          onClick={handleAISortClick}
          className="gap-1"
          aria-label={`Sort by AI score ${sortByAI === 'desc' ? 'descending' : sortByAI === 'asc' ? 'ascending' : ''}`}
        >
          <Brain className="h-4 w-4" aria-hidden="true" />
          AI {sortByAI === 'desc' ? '↓' : sortByAI === 'asc' ? '↑' : ''}
        </Button>

        {/* Clear All Filters */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {resultFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {resultFilter === 'profit' && <TrendingUp className="h-3 w-3 text-profit" />}
              {resultFilter === 'loss' && <TrendingDown className="h-3 w-3 text-loss" />}
              {resultFilter.charAt(0).toUpperCase() + resultFilter.slice(1)}
              <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => onResultFilterChange('all')} />
            </Badge>
          )}

          {directionFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {directionFilter}
              <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => onDirectionFilterChange('all')} />
            </Badge>
          )}

          {selectedStrategyIds.map(id => {
            const strategy = strategies.find(s => s.id === id);
            if (!strategy) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1">
                {strategy.name}
                <X 
                  className="h-3 w-3 cursor-pointer ml-1" 
                  onClick={() => toggleStrategy(id)} 
                />
              </Badge>
            );
          })}

          {selectedPairs.map(pair => (
            <Badge key={pair} variant="secondary" className="gap-1">
              {pair}
              <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => togglePair(pair)} />
            </Badge>
          ))}

          {sortByAI !== 'none' && (
            <Badge variant="secondary" className="gap-1">
              <Brain className="h-3 w-3" />
              AI Score {sortByAI === 'desc' ? '↓' : '↑'}
              <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => onSortByAIChange('none')} />
            </Badge>
          )}

          {sessionFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {SESSION_LABELS[sessionFilter]} ({formatSessionTimeLocal(sessionFilter)})
              <X className="h-3 w-3 cursor-pointer ml-1" onClick={() => onSessionFilterChange?.('all')} />
            </Badge>
          )}

          {/* Filter count */}
          {totalCount !== undefined && filteredCount !== undefined && (
            <span className="text-sm text-muted-foreground ml-2">
              Showing {filteredCount} of {totalCount} trades
            </span>
          )}
        </div>
      )}
    </div>
  );
}
