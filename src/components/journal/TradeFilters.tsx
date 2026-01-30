/**
 * Trade Filters - Date range, strategy, and AI score filters
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { Brain, ArrowUpDown } from "lucide-react";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";

interface TradeFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  sortByAI: 'none' | 'asc' | 'desc';
  onSortByAIChange: (sort: 'none' | 'asc' | 'desc') => void;
  strategies: TradingStrategy[];
  selectedStrategyIds: string[];
  onStrategyIdsChange: (ids: string[]) => void;
}

export function TradeFilters({
  dateRange,
  onDateRangeChange,
  sortByAI,
  onSortByAIChange,
  strategies,
  selectedStrategyIds,
  onStrategyIdsChange,
}: TradeFiltersProps) {
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

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
      <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
      
      {/* AI Score Sort Button */}
      <Button 
        variant={sortByAI !== 'none' ? 'default' : 'outline'} 
        size="sm"
        onClick={handleAISortClick}
        className="gap-1"
        aria-label={`Sort by AI score ${sortByAI === 'desc' ? 'descending' : sortByAI === 'asc' ? 'ascending' : ''}`}
      >
        <Brain className="h-4 w-4" aria-hidden="true" />
        AI Score {sortByAI === 'desc' ? '↓' : sortByAI === 'asc' ? '↑' : ''}
        {sortByAI !== 'none' && (
          <ArrowUpDown className="h-3 w-3 ml-1" aria-hidden="true" />
        )}
      </Button>
      
      {/* Strategy Filter Badges */}
      {strategies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {strategies.map((strategy) => (
            <Badge
              key={strategy.id}
              variant={selectedStrategyIds.includes(strategy.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleStrategy(strategy.id)}
            >
              {strategy.name}
            </Badge>
          ))}
          {selectedStrategyIds.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onStrategyIdsChange([])}
              aria-label="Clear all strategy filters"
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
