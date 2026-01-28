/**
 * Lightweight Usage Analytics - Lean UX Framework
 * Simple localStorage-based event tracking for measuring feature usage
 */

interface AnalyticsEvent {
  event: string;
  data?: Record<string, any>;
  timestamp: number;
}

const STORAGE_KEY = 'usage_events';
const MAX_EVENTS = 100;

/**
 * Track a usage event
 */
export const trackEvent = (event: string, data?: Record<string, any>) => {
  try {
    const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    events.push({ event, data, timestamp: Date.now() });
    // Keep only the last MAX_EVENTS
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch (e) {
    // Silently fail if localStorage is unavailable
    console.debug('Analytics tracking unavailable:', e);
  }
};

/**
 * Get all tracked events
 */
export const getEvents = (): AnalyticsEvent[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Get events filtered by name
 */
export const getEventsByName = (eventName: string): AnalyticsEvent[] => {
  return getEvents().filter(e => e.event === eventName);
};

/**
 * Get event counts grouped by event name
 */
export const getEventCounts = (): Record<string, number> => {
  const events = getEvents();
  return events.reduce((acc, e) => {
    acc[e.event] = (acc[e.event] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Clear all tracked events
 */
export const clearEvents = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Pre-defined event names for consistency
export const ANALYTICS_EVENTS = {
  // Trade Entry
  TRADE_ENTRY_WIZARD_START: 'trade_entry_wizard_start',
  TRADE_ENTRY_WIZARD_COMPLETE: 'trade_entry_wizard_complete',
  TRADE_ENTRY_WIZARD_ABANDON: 'trade_entry_wizard_abandon',
  TRADE_ENTRY_QUICK: 'trade_entry_quick',
  
  // Navigation
  PAGE_VIEW: 'page_view',
  
  // AI Features
  AI_INSIGHT_VIEW: 'ai_insight_view',
  AI_RECOMMENDATION_FOLLOW: 'ai_recommendation_follow',
  
  // Risk Management
  RISK_PROFILE_SAVE: 'risk_profile_save',
  POSITION_SIZE_CALCULATE: 'position_size_calculate',
  
  // Session
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
} as const;
