/**
 * Weekly Report Generator Edge Function
 * Generates trading performance summary for the past week
 * Can be triggered via cron job or manual API call
 * 
 * Sends email via Resend and creates notification in database
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  grossPnl: number;
  totalFees: number;
  netPnl: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  topPairs: { pair: string; pnl: number; trades: number }[];
  tradingDays: number;
}

interface UserReport {
  userId: string;
  email: string;
  displayName: string;
  stats: WeeklyStats;
  weekStart: string;
  weekEnd: string;
}

interface TradeRecord {
  realized_pnl: number | null;
  commission: number | null;
  pair: string;
  trade_date: string;
}

async function calculateWeeklyStats(
  supabaseClient: any,
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<WeeklyStats | null> {
  // Fetch closed trades for the week
  const { data, error } = await supabaseClient
    .from("trade_entries")
    .select("realized_pnl, commission, pair, trade_date")
    .eq("user_id", userId)
    .eq("status", "closed")
    .gte("trade_date", weekStart)
    .lte("trade_date", weekEnd);

  if (error || !data || data.length === 0) {
    return null;
  }

  const trades = data as TradeRecord[];

  const winningTrades = trades.filter((t) => (t.realized_pnl || 0) > 0);
  const losingTrades = trades.filter((t) => (t.realized_pnl || 0) < 0);
  const breakevenTrades = trades.filter((t) => (t.realized_pnl || 0) === 0);

  const grossPnl = trades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalFees = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
  const netPnl = grossPnl - totalFees;

  const totalWins = winningTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0));

  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map((t) => t.realized_pnl || 0)) 
    : 0;
  const largestLoss = losingTrades.length > 0 
    ? Math.min(...losingTrades.map((t) => t.realized_pnl || 0)) 
    : 0;

  // Calculate top pairs
  const pairStats = new Map<string, { pnl: number; trades: number }>();
  trades.forEach((t) => {
    const current = pairStats.get(t.pair) || { pnl: 0, trades: 0 };
    current.pnl += t.realized_pnl || 0;
    current.trades += 1;
    pairStats.set(t.pair, current);
  });

  const topPairs = Array.from(pairStats.entries())
    .map(([pair, stats]) => ({ pair, ...stats }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  // Unique trading days
  const uniqueDays = new Set(trades.map((t) => t.trade_date.split("T")[0]));

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakevenTrades: breakevenTrades.length,
    grossPnl,
    totalFees,
    netPnl,
    winRate: (winningTrades.length / trades.length) * 100,
    avgWin,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
    topPairs,
    tradingDays: uniqueDays.size,
  };
}

function generateEmailHtml(report: UserReport): string {
  const { stats, weekStart, weekEnd, displayName } = report;
  const pnlColor = stats.netPnl >= 0 ? "#22c55e" : "#ef4444";
  const pnlSign = stats.netPnl >= 0 ? "+" : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Trading Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0b; color: #fafafa; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 24px;">
    
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #fafafa; margin: 0 0 8px 0; font-size: 24px;">📊 Weekly Trading Report</h1>
      <p style="color: #a1a1aa; margin: 0; font-size: 14px;">${weekStart} - ${weekEnd}</p>
    </div>

    <div style="text-align: center; margin-bottom: 32px;">
      <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 14px;">Net P&L</p>
      <p style="color: ${pnlColor}; margin: 0; font-size: 36px; font-weight: bold;">${pnlSign}$${stats.netPnl.toFixed(2)}</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
      <div style="background-color: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="color: #a1a1aa; margin: 0 0 4px 0; font-size: 12px;">Total Trades</p>
        <p style="color: #fafafa; margin: 0; font-size: 20px; font-weight: bold;">${stats.totalTrades}</p>
      </div>
      <div style="background-color: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="color: #a1a1aa; margin: 0 0 4px 0; font-size: 12px;">Win Rate</p>
        <p style="color: #fafafa; margin: 0; font-size: 20px; font-weight: bold;">${stats.winRate.toFixed(1)}%</p>
      </div>
      <div style="background-color: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="color: #a1a1aa; margin: 0 0 4px 0; font-size: 12px;">Profit Factor</p>
        <p style="color: #fafafa; margin: 0; font-size: 20px; font-weight: bold;">${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}</p>
      </div>
      <div style="background-color: #27272a; padding: 16px; border-radius: 8px; text-align: center;">
        <p style="color: #a1a1aa; margin: 0 0 4px 0; font-size: 12px;">Trading Days</p>
        <p style="color: #fafafa; margin: 0; font-size: 20px; font-weight: bold;">${stats.tradingDays}</p>
      </div>
    </div>

    <div style="background-color: #27272a; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="color: #fafafa; margin: 0 0 12px 0; font-size: 14px;">Trade Breakdown</h3>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #22c55e;">🟢 Wins: ${stats.winningTrades}</span>
        <span style="color: #a1a1aa;">Avg: $${stats.avgWin.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #ef4444;">🔴 Losses: ${stats.losingTrades}</span>
        <span style="color: #a1a1aa;">Avg: -$${stats.avgLoss.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #a1a1aa;">⚪ Breakeven: ${stats.breakevenTrades}</span>
        <span style="color: #a1a1aa;">Fees: $${stats.totalFees.toFixed(2)}</span>
      </div>
    </div>

    ${stats.topPairs.length > 0 ? `
    <div style="background-color: #27272a; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="color: #fafafa; margin: 0 0 12px 0; font-size: 14px;">Top Pairs</h3>
      ${stats.topPairs.map((p) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #fafafa;">${p.pair}</span>
          <span style="color: ${p.pnl >= 0 ? '#22c55e' : '#ef4444'};">${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)} (${p.trades} trades)</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div style="text-align: center; padding-top: 16px; border-top: 1px solid #27272a;">
      <p style="color: #a1a1aa; margin: 0; font-size: 12px;">
        This report was automatically generated by Trading Journey
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Dynamic import of Resend to avoid build issues
    let Resend: any = null;
    if (resendApiKey) {
      try {
        const resendModule = await import("https://esm.sh/resend@2.0.0");
        Resend = resendModule.Resend;
      } catch (e) {
        console.warn("Resend module not available:", e);
      }
    }

    // Parse request body (optional user_id for manual trigger)
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body.user_id || null;
    } catch {
      // No body, will process all users
    }

    // Calculate week range (last completed week: Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - daysToLastSunday);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Fetch users to generate reports for
    let usersQuery = supabase
      .from("users_profile")
      .select("user_id, display_name");
    
    if (targetUserId) {
      usersQuery = usersQuery.eq("user_id", targetUserId);
    }
    
    const { data: users, error: usersError } = await usersQuery;
    
    if (usersError) throw usersError;

    const results: { userId: string; success: boolean; error?: string }[] = [];
    const resend = Resend && resendApiKey ? new Resend(resendApiKey) : null;

    for (const user of users || []) {
      try {
        // Calculate stats
        const stats = await calculateWeeklyStats(
          supabase as any,
          user.user_id,
          weekStartStr,
          weekEndStr
        );

        if (!stats || stats.totalTrades === 0) {
          results.push({ userId: user.user_id, success: true, error: "No trades this week" });
          continue;
        }

        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
        const email = authUser?.user?.email;

        // Create notification in database
        await supabase.from("notifications").insert({
          user_id: user.user_id,
          type: "weekly_report",
          title: `📊 Weekly Report: ${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}`,
          message: `Week ${weekStartStr} to ${weekEndStr}: ${stats.totalTrades} trades, ${stats.winRate.toFixed(1)}% win rate, Profit Factor ${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}`,
          metadata: {
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
            stats,
          },
          read: false,
        });

        // Send email if Resend is configured and user has email
        if (resend && email) {
          const report: UserReport = {
            userId: user.user_id,
            email,
            displayName: user.display_name || "Trader",
            stats,
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
          };

          try {
            await resend.emails.send({
              from: "Trading Journey <reports@lovable.app>",
              to: [email],
              subject: `📊 Weekly Trading Report: ${stats.netPnl >= 0 ? '+' : ''}$${stats.netPnl.toFixed(2)}`,
              html: generateEmailHtml(report),
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${email}:`, emailError);
          }
        }

        results.push({ userId: user.user_id, success: true });
      } catch (err) {
        console.error(`Error processing user ${user.user_id}:`, err);
        results.push({ 
          userId: user.user_id, 
          success: false, 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        weekRange: { start: weekStartStr, end: weekEndStr },
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weekly report error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
