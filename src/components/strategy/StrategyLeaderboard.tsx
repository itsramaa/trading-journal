/**
 * StrategyLeaderboard - Shows top cloned strategies globally
 * Displays a ranking of the most popular shared strategies with filters
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { 
  Trophy, 
  Medal, 
  Users, 
  Clock, 
  TrendingUp, 
  ChevronRight,
  Crown,
  Star,
  Filter,
  X,
  Search,
  ArrowUpDown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { STRATEGY_CARD_COLOR_CLASSES } from "@/lib/constants/strategy-config";
import { TIMEFRAME_OPTIONS as CANONICAL_TIMEFRAME_OPTIONS } from "@/types/strategy";
interface LeaderboardStrategy {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  clone_count: number;
  last_cloned_at: string | null;
  timeframe: string | null;
  market_type: string | null;
  tags: string[] | null;
  share_token: string | null;
  user_id: string;
}

const RANK_ICONS = [Crown, Trophy, Medal];
const RANK_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-600"];

// Use canonical timeframe options with an "all" prepend
const TIMEFRAME_OPTIONS = [
  { value: "all", label: "All Timeframes" },
  ...CANONICAL_TIMEFRAME_OPTIONS,
];

const MARKET_TYPE_OPTIONS = [
  { value: "all", label: "All Markets" },
  { value: "spot", label: "Spot" },
  { value: "futures", label: "Futures" },
];

const SORT_OPTIONS = [
  { value: "clone_count_desc", label: "Most Cloned" },
  { value: "clone_count_asc", label: "Least Cloned" },
  { value: "last_cloned_desc", label: "Recently Cloned" },
  { value: "last_cloned_asc", label: "Oldest Cloned" },
];

const ITEMS_PER_PAGE = 10;

export function StrategyLeaderboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("all");
  const [marketTypeFilter, setMarketTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clone_count_desc");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: strategies, isLoading } = useQuery({
    queryKey: ["strategy-leaderboard"],
    queryFn: async (): Promise<LeaderboardStrategy[]> => {
      const { data, error } = await supabase
        .from("trading_strategies")
        .select("id, name, description, color, clone_count, last_cloned_at, timeframe, market_type, tags, share_token, user_id")
        .eq("is_shared", true)
        .gt("clone_count", 0)
        .order("clone_count", { ascending: false })
        .limit(100); // Fetch more for pagination

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000, // 5 minutes
  });

  // Filter and sort strategies (without pagination)
  const allFilteredStrategies = useMemo(() => {
    if (!strategies) return [];
    
    // First filter
    const filtered = strategies.filter((strategy) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = strategy.name.toLowerCase().includes(query);
        const descMatch = strategy.description?.toLowerCase().includes(query);
        const tagsMatch = strategy.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!nameMatch && !descMatch && !tagsMatch) {
          return false;
        }
      }

      // Timeframe filter
      if (timeframeFilter !== "all") {
        if (!strategy.timeframe || strategy.timeframe !== timeframeFilter) {
          return false;
        }
      }
      
      // Market type filter
      if (marketTypeFilter !== "all") {
        if (!strategy.market_type || strategy.market_type !== marketTypeFilter) {
          return false;
        }
      }
      
      return true;
    });

    // Then sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "clone_count_desc":
          return (b.clone_count || 0) - (a.clone_count || 0);
        case "clone_count_asc":
          return (a.clone_count || 0) - (b.clone_count || 0);
        case "last_cloned_desc":
          return new Date(b.last_cloned_at || 0).getTime() - new Date(a.last_cloned_at || 0).getTime();
        case "last_cloned_asc":
          return new Date(a.last_cloned_at || 0).getTime() - new Date(b.last_cloned_at || 0).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [strategies, searchQuery, timeframeFilter, marketTypeFilter, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(allFilteredStrategies.length / ITEMS_PER_PAGE);
  const paginatedStrategies = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allFilteredStrategies.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allFilteredStrategies, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery.trim() !== "" || timeframeFilter !== "all" || marketTypeFilter !== "all" || sortBy !== "clone_count_desc";

  const clearFilters = () => {
    setSearchQuery("");
    setTimeframeFilter("all");
    setMarketTypeFilter("all");
    setSortBy("clone_count_desc");
    setCurrentPage(1);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "ellipsis", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", currentPage, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Strategy Leaderboard
              <InfoTooltip content="Community-ranked strategies sorted by clone count. Share your strategies to appear here." />
            </CardTitle>
            <CardDescription>
              {allFilteredStrategies.length === 0
                ? "Be the first to share and get cloned!"
                : hasActiveFilters 
                ? `Showing ${allFilteredStrategies.length} filtered strategies`
                : `Top ${allFilteredStrategies.length} cloned strategies globally`
              }
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Star className="h-3 w-3" />
            Page {currentPage} of {totalPages || 1}
          </Badge>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 pt-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search strategies by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => handleFilterChange(setSearchQuery, "")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filters:</span>
            </div>
          
          <Select value={timeframeFilter} onValueChange={(v) => handleFilterChange(setTimeframeFilter, v)}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={marketTypeFilter} onValueChange={(v) => handleFilterChange(setMarketTypeFilter, v)}>
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              {MARKET_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
            <ArrowUpDown className="h-4 w-4" />
            <span>Sort:</span>
          </div>

          <Select value={sortBy} onValueChange={(v) => handleFilterChange(setSortBy, v)}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {paginatedStrategies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            {hasActiveFilters ? (
              <>
                <p>No strategies match your filters.</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters to see all strategies
                </Button>
              </>
            ) : (
              <>
                <p>No strategies have been cloned yet.</p>
                <p className="text-sm mt-1">Share your strategy to appear on the leaderboard!</p>
              </>
            )}
          </div>
        ) : (
          <>
            {paginatedStrategies.map((strategy, index) => {
              // Calculate the actual rank based on current page
              const actualRank = (currentPage - 1) * ITEMS_PER_PAGE + index;
              const RankIcon = RANK_ICONS[actualRank] || null;
              const rankColor = RANK_COLORS[actualRank] || "text-muted-foreground";
              const isOwner = user?.id === strategy.user_id;
            
            return (
              <div
                key={strategy.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8 shrink-0">
                  {RankIcon ? (
                    <RankIcon className={`h-6 w-6 ${rankColor}`} />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {actualRank + 1}
                    </span>
                  )}
                </div>

                {/* Strategy Color Indicator — use semantic color mapping */}
                <div
                  className={`w-2 h-10 rounded-full shrink-0 ${
                    (STRATEGY_CARD_COLOR_CLASSES[strategy.color || 'blue'] || STRATEGY_CARD_COLOR_CLASSES.blue).split(' ')[0]
                  }`}
                />

                {/* Strategy Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate" title={strategy.name}>
                      {strategy.name}
                    </h4>
                    {isOwner && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Yours
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {strategy.timeframe && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {strategy.timeframe}
                      </Badge>
                    )}
                    {strategy.market_type && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 capitalize">
                        {strategy.market_type}
                      </Badge>
                    )}
                    {strategy.last_cloned_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(strategy.last_cloned_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Clone Count */}
                <div className="flex items-center gap-2 shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-right cursor-help">
                          <div className="flex items-center gap-1 text-sm font-semibold">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {strategy.clone_count}
                          </div>
                          <span className="text-xs text-muted-foreground">clones</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">Number of times this strategy has been cloned by other traders.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* View Button */}
                  {strategy.share_token && !isOwner && (
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/shared/strategy/${strategy.share_token}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {getPageNumbers().map((page, idx) => (
                  <PaginationItem key={idx}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
