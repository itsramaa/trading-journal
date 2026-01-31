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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

const TIMEFRAME_OPTIONS = [
  { value: "all", label: "All Timeframes" },
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "Daily" },
  { value: "1w", label: "Weekly" },
];

const MARKET_TYPE_OPTIONS = [
  { value: "all", label: "All Markets" },
  { value: "spot", label: "Spot" },
  { value: "futures", label: "Futures" },
  { value: "margin", label: "Margin" },
];

const SORT_OPTIONS = [
  { value: "clone_count_desc", label: "Most Cloned" },
  { value: "clone_count_asc", label: "Least Cloned" },
  { value: "last_cloned_desc", label: "Recently Cloned" },
  { value: "last_cloned_asc", label: "Oldest Cloned" },
];

export function StrategyLeaderboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframeFilter, setTimeframeFilter] = useState("all");
  const [marketTypeFilter, setMarketTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("clone_count_desc");

  const { data: strategies, isLoading } = useQuery({
    queryKey: ["strategy-leaderboard"],
    queryFn: async (): Promise<LeaderboardStrategy[]> => {
      const { data, error } = await supabase
        .from("trading_strategies")
        .select("id, name, description, color, clone_count, last_cloned_at, timeframe, market_type, tags, share_token, user_id")
        .eq("is_shared", true)
        .gt("clone_count", 0)
        .order("clone_count", { ascending: false })
        .limit(50); // Fetch more to allow filtering

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000, // 5 minutes
  });

  // Filter and sort strategies
  const filteredStrategies = useMemo(() => {
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

    return sorted.slice(0, 10); // Limit to top 10 after filtering and sorting
  }, [strategies, searchQuery, timeframeFilter, marketTypeFilter, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== "" || timeframeFilter !== "all" || marketTypeFilter !== "all" || sortBy !== "clone_count_desc";

  const clearFilters = () => {
    setSearchQuery("");
    setTimeframeFilter("all");
    setMarketTypeFilter("all");
    setSortBy("clone_count_desc");
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
            </CardTitle>
            <CardDescription>
              {hasActiveFilters 
                ? `Showing ${filteredStrategies.length} filtered strategies`
                : "Top cloned strategies globally"
              }
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Star className="h-3 w-3" />
            Top 10
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
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
          
          <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
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

          <Select value={marketTypeFilter} onValueChange={setMarketTypeFilter}>
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

          <Select value={sortBy} onValueChange={setSortBy}>
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
        {filteredStrategies.length === 0 ? (
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
          filteredStrategies.map((strategy, index) => {
            const RankIcon = RANK_ICONS[index] || null;
            const rankColor = RANK_COLORS[index] || "text-muted-foreground";
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
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Strategy Color Indicator */}
                <div
                  className="w-2 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: strategy.color || "#6b7280" }}
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
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {strategy.clone_count}
                    </div>
                    <span className="text-xs text-muted-foreground">clones</span>
                  </div>
                  
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
          })
        )}
      </CardContent>
    </Card>
  );
}
