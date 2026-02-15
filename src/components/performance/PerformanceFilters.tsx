/**
 * Performance Filters - Filter bar for Performance page
 * Analytics level, date range, strategy, event day filters
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnalyticsLevelSelector, type AnalyticsSelection } from "@/components/analytics/AnalyticsLevelSelector";
import { DateRangeFilter, type DateRange } from "@/components/trading/DateRangeFilter";

interface Strategy {
  id: string;
  name: string;
}

interface PerformanceFiltersProps {
  analyticsSelection: AnalyticsSelection;
  onAnalyticsSelectionChange: (v: AnalyticsSelection) => void;
  dateRange: DateRange;
  onDateRangeChange: (v: DateRange) => void;
  selectedStrategyIds: string[];
  onSelectedStrategyIdsChange: (ids: string[]) => void;
  strategies: Strategy[];
  eventDaysOnly: boolean;
  onEventDaysOnlyChange: (v: boolean) => void;
  eventDayTradeCount: number;
}

export function PerformanceFilters({
  analyticsSelection,
  onAnalyticsSelectionChange,
  dateRange,
  onDateRangeChange,
  selectedStrategyIds,
  onSelectedStrategyIdsChange,
  strategies,
  eventDaysOnly,
  onEventDaysOnlyChange,
  eventDayTradeCount,
}: PerformanceFiltersProps) {
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <AnalyticsLevelSelector value={analyticsSelection} onChange={onAnalyticsSelectionChange} />
            <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
            {strategies.length > 0 && (
              <Popover open={strategyDropdownOpen} onOpenChange={setStrategyDropdownOpen}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="min-w-[180px] justify-between">
                          <span className="truncate">
                            {selectedStrategyIds.length === 0 
                              ? "All Strategies" 
                              : selectedStrategyIds.length === 1 
                                ? strategies.find(s => s.id === selectedStrategyIds[0])?.name || "1 selected"
                                : `${selectedStrategyIds.length} strategies`}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Filter performance metrics to specific trading strategies.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search strategies..." />
                    <CommandList>
                      <CommandEmpty>No strategies found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => onSelectedStrategyIdsChange([])}
                          className="gap-2"
                        >
                          <Checkbox checked={selectedStrategyIds.length === 0} />
                          <span>All Strategies</span>
                        </CommandItem>
                        {strategies.map((strategy) => (
                          <CommandItem
                            key={strategy.id}
                            onSelect={() => {
                              onSelectedStrategyIdsChange(
                                selectedStrategyIds.includes(strategy.id)
                                  ? selectedStrategyIds.filter(id => id !== strategy.id)
                                  : [...selectedStrategyIds, strategy.id]
                              );
                            }}
                            className="gap-2"
                          >
                            <Checkbox checked={selectedStrategyIds.includes(strategy.id)} />
                            <span>{strategy.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          {eventDayTradeCount > 0 && (
            <div className="flex items-center gap-2">
              <Switch
                id="event-days-filter"
                checked={eventDaysOnly}
                onCheckedChange={onEventDaysOnlyChange}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label 
                      htmlFor="event-days-filter" 
                      className="flex items-center gap-1.5 cursor-pointer text-sm"
                    >
                      <Calendar className="h-4 w-4 text-warning" />
                      Event Days Only
                      <Badge variant="secondary" className="ml-1">
                        {eventDayTradeCount}
                      </Badge>
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>Show only trades on days with high-impact economic events (FOMC, CPI, NFP, etc.).</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
