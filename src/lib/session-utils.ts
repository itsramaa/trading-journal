/**
 * Trading Session Utilities
 * Converts between UTC and user timezone for session calculation
 * 
 * Sessions are defined in UTC and converted to user's local time for display:
 * - Asia: 20:00-05:00 UTC (Sydney/Tokyo overlap, crosses midnight)
 * - London: 08:00-17:00 UTC
 * - New York: 13:00-22:00 UTC
 * 
 * This utility is the Single Source of Truth for session logic.
 * DO NOT hardcode session hours in UI components.
 */

export type TradingSession = 'asia' | 'london' | 'newyork' | 'off-hours';

// Session definitions in UTC hours
export const SESSION_UTC = {
  asia: { start: 20, end: 5 },      // Crosses midnight
  london: { start: 8, end: 17 },
  newyork: { start: 13, end: 22 },
} as const;

export const SESSION_LABELS: Record<TradingSession, string> = {
  asia: 'Asia',
  london: 'London',
  newyork: 'New York',
  'off-hours': 'Off Hours',
};

export const SESSION_COLORS: Record<TradingSession, string> = {
  asia: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  london: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  newyork: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  'off-hours': 'bg-muted text-muted-foreground border-muted',
};

/**
 * Get user's timezone offset in hours from UTC
 */
export function getUserTimezoneOffset(): number {
  return new Date().getTimezoneOffset() / -60;
}

/**
 * Determine which trading session a given datetime falls into
 * Uses the UTC hour of the provided date
 */
export function getSessionForTime(date: Date | string): TradingSession {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utcHour = d.getUTCHours();
  
  // Check Asia (spans midnight: 20:00-05:00 UTC)
  if (utcHour >= SESSION_UTC.asia.start || utcHour < SESSION_UTC.asia.end) {
    return 'asia';
  }
  
  // Check London (08:00-17:00 UTC)
  if (utcHour >= SESSION_UTC.london.start && utcHour < SESSION_UTC.london.end) {
    return 'london';
  }
  
  // Check New York (13:00-22:00 UTC)
  if (utcHour >= SESSION_UTC.newyork.start && utcHour < SESSION_UTC.newyork.end) {
    return 'newyork';
  }
  
  return 'off-hours';
}

/**
 * Check if two sessions overlap at current time
 */
export function getActiveOverlaps(date: Date = new Date()): string | null {
  const utcHour = date.getUTCHours();
  
  // London/NY overlap: 13:00-17:00 UTC
  if (utcHour >= 13 && utcHour < 17) {
    return 'London + NY';
  }
  
  // Asia/London overlap: 08:00-09:00 UTC (brief)
  if (utcHour >= 8 && utcHour < 9) {
    return 'Asia + London';
  }
  
  return null;
}

/**
 * Format session time range in user's local time
 */
export function formatSessionTimeLocal(session: TradingSession): string {
  if (session === 'off-hours') return 'Variable';
  
  const { start, end } = SESSION_UTC[session];
  const offset = getUserTimezoneOffset();
  
  const localStart = (start + offset + 24) % 24;
  const localEnd = (end + offset + 24) % 24;
  
  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;
  return `${formatHour(localStart)}-${formatHour(localEnd)}`;
}

/**
 * Get current active session based on current time
 */
export function getCurrentSession(): TradingSession {
  return getSessionForTime(new Date());
}

/**
 * Get session from trade entry
 * Uses market_context if available, otherwise calculates from trade_date
 */
export function getTradeSession(trade: {
  trade_date: string;
  entry_datetime?: string | null;
  market_context?: { session?: { current: TradingSession } } | null;
}): TradingSession {
  // Prefer stored session from market_context
  if (trade.market_context?.session?.current) {
    return trade.market_context.session.current;
  }
  
  // Calculate from datetime
  const datetime = trade.entry_datetime || trade.trade_date;
  return getSessionForTime(datetime);
}

/**
 * Check if a session is currently active
 */
export function isSessionActive(session: TradingSession): boolean {
  return getCurrentSession() === session;
}

/**
 * Get all sessions with their local time ranges
 */
export function getAllSessionsWithLocalTimes(): Array<{
  session: TradingSession;
  label: string;
  localTimeRange: string;
  isActive: boolean;
}> {
  const currentSession = getCurrentSession();
  
  return (['asia', 'london', 'newyork'] as TradingSession[]).map(session => ({
    session,
    label: SESSION_LABELS[session],
    localTimeRange: formatSessionTimeLocal(session),
    isActive: session === currentSession,
  }));
}
