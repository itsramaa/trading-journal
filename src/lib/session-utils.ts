/**
 * Trading Session Utilities
 * Converts between UTC and user timezone for session calculation
 * 
 * Sessions are defined in UTC (aligned with Binance database values):
 * - Sydney: 21:00-06:00 UTC (crosses midnight)
 * - Tokyo: 00:00-09:00 UTC
 * - London: 07:00-16:00 UTC
 * - New York: 12:00-21:00 UTC
 * 
 * IMPORTANT: These values MUST match the database function get_trading_session()
 * This utility is the Single Source of Truth for session logic.
 * DO NOT hardcode session hours in UI components.
 */

// Session values aligned with database (snake_case for DB, as-is for frontend)
export type TradingSession = 'sydney' | 'tokyo' | 'london' | 'new_york' | 'other';

// Session definitions in UTC hours - MUST MATCH get_trading_session() in DB
export const SESSION_UTC = {
  sydney: { start: 21, end: 6 },    // Crosses midnight: 21:00-06:00 UTC
  tokyo: { start: 0, end: 9 },      // 00:00-09:00 UTC
  london: { start: 7, end: 16 },    // 07:00-16:00 UTC
  new_york: { start: 12, end: 21 }, // 12:00-21:00 UTC
} as const;

export const SESSION_LABELS: Record<TradingSession, string> = {
  sydney: 'Sydney',
  tokyo: 'Tokyo',
  london: 'London',
  new_york: 'New York',
  other: 'Other',
};

export const SESSION_COLORS: Record<TradingSession, string> = {
  sydney: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  tokyo: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  london: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  new_york: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  other: 'bg-muted text-muted-foreground border-muted',
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
 * MUST MATCH: get_trading_session() in database
 */
export function getSessionForTime(date: Date | string): TradingSession {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utcHour = d.getUTCHours();
  
  // Check Sydney (spans midnight: 21:00-06:00 UTC)
  if (utcHour >= SESSION_UTC.sydney.start || utcHour < SESSION_UTC.sydney.end) {
    return 'sydney';
  }
  
  // Check Tokyo (00:00-09:00 UTC)
  if (utcHour >= SESSION_UTC.tokyo.start && utcHour < SESSION_UTC.tokyo.end) {
    return 'tokyo';
  }
  
  // Check London (07:00-16:00 UTC)
  if (utcHour >= SESSION_UTC.london.start && utcHour < SESSION_UTC.london.end) {
    return 'london';
  }
  
  // Check New York (12:00-21:00 UTC)
  if (utcHour >= SESSION_UTC.new_york.start && utcHour < SESSION_UTC.new_york.end) {
    return 'new_york';
  }
  
  return 'other';
}

/**
 * Check if two sessions overlap at current time
 */
export function getActiveOverlaps(date: Date = new Date()): string | null {
  const utcHour = date.getUTCHours();
  
  // London/NY overlap: 12:00-16:00 UTC
  if (utcHour >= 12 && utcHour < 16) {
    return 'London + NY';
  }
  
  // Tokyo/London overlap: 07:00-09:00 UTC
  if (utcHour >= 7 && utcHour < 9) {
    return 'Tokyo + London';
  }
  
  // Sydney/Tokyo overlap: 00:00-06:00 UTC
  if (utcHour >= 0 && utcHour < 6) {
    return 'Sydney + Tokyo';
  }
  
  return null;
}

/**
 * Format session time range in user's local time
 */
export function formatSessionTimeLocal(session: TradingSession): string {
  if (session === 'other') return 'Variable';
  
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
 * Prefers the stored session column, falls back to calculation
 */
export function getTradeSession(trade: {
  trade_date: string;
  session?: string | null;
  entry_datetime?: string | null;
  market_context?: { session?: { current: TradingSession } } | null;
}): TradingSession {
  // Prefer stored session column (from database)
  if (trade.session && isValidSession(trade.session)) {
    return trade.session as TradingSession;
  }
  
  // Fallback to stored session from market_context
  if (trade.market_context?.session?.current) {
    return trade.market_context.session.current;
  }
  
  // Calculate from datetime
  const datetime = trade.entry_datetime || trade.trade_date;
  return getSessionForTime(datetime);
}

/**
 * Check if a string is a valid trading session
 */
export function isValidSession(value: string): value is TradingSession {
  return ['sydney', 'tokyo', 'london', 'new_york', 'other'].includes(value);
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
  
  return (['sydney', 'tokyo', 'london', 'new_york'] as TradingSession[]).map(session => ({
    session,
    label: SESSION_LABELS[session],
    localTimeRange: formatSessionTimeLocal(session),
    isActive: session === currentSession,
  }));
}
