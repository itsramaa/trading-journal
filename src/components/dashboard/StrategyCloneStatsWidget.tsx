/**
 * StrategyCloneStatsWidget - Shows statistics about shared strategies
 * Displays total clones, most popular strategy, and recent activity
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, Users, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CloneStats {
  totalClones: number;
  sharedStrategies: number;
  mostPopular: {
    name: string;
    cloneCount: number;
    color: string | null;
  } | null;
  recentClone: {
    strategyName: string;
    clonedAt: string;
  } | null;
}

export function StrategyCloneStatsWidget() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["strategy-clone-stats", user?.id],
    queryFn: async (): Promise<CloneStats> => {
      if (!user?.id) {
        return { totalClones: 0, sharedStrategies: 0, mostPopular: null, recentClone: null };
      }

      // Get all shared strategies with clone stats
      const { data: strategies, error } = await supabase
        .from("trading_strategies")
        .select("id, name, color, clone_count, last_cloned_at, is_shared")
        .eq("user_id", user.id)
        .eq("is_shared", true)
        .order("clone_count", { ascending: false });

      if (error) throw error;

      const sharedStrategies = strategies?.length || 0;
      const totalClones = strategies?.reduce((sum, s) => sum + (s.clone_count || 0), 0) || 0;

      // Most popular strategy
      const mostPopular = strategies?.[0] && strategies[0].clone_count > 0
        ? {
            name: strategies[0].name,
            cloneCount: strategies[0].clone_count || 0,
            color: strategies[0].color,
          }
        : null;

      // Most recent clone
      const withClones = strategies?.filter(s => s.last_cloned_at) || [];
      const sortedByRecent = withClones.sort(
        (a, b) => new Date(b.last_cloned_at!).getTime() - new Date(a.last_cloned_at!).getTime()
      );
      const recentClone = sortedByRecent[0]
        ? {
            strategyName: sortedByRecent[0].name,
            clonedAt: sortedByRecent[0].last_cloned_at!,
          }
        : null;

      return { totalClones, sharedStrategies, mostPopular, recentClone };
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show widget if user has no shared strategies
  if (!stats || stats.sharedStrategies === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4" />
              Strategy Sharing Stats
            </CardTitle>
            <CardDescription>
              How your shared strategies are performing
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {stats.sharedStrategies} shared
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-2">
          {/* Total Clones */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Total Clones
            </div>
            <p className="text-2xl font-bold">{stats.totalClones}</p>
          </div>

          {/* Most Popular */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Most Popular
            </div>
            {stats.mostPopular ? (
              <div className="flex items-center gap-2">
                {stats.mostPopular.color && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: stats.mostPopular.color }}
                  />
                )}
                <p className="font-medium truncate" title={stats.mostPopular.name}>
                  {stats.mostPopular.name}
                </p>
                <Badge variant="outline" className="text-xs shrink-0">
                  {stats.mostPopular.cloneCount}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No clones yet</p>
            )}
          </div>
        </div>

        {/* Recent Clone Activity */}
        {stats.recentClone && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last cloned:</span>
              <span className="font-medium">{stats.recentClone.strategyName}</span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(stats.recentClone.clonedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
