/**
 * Market Sessions Widget - Compact display for Dashboard
 * Shows live status of Sydney, Tokyo, London, NY sessions with progress
 * Times converted to user's local timezone
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity, Sun, Sunrise, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";

// Market session data (times in UTC for calculations)
const MARKET_SESSIONS = [
  { 
    name: 'Sydney', 
    // Sydney session: 07:00-16:00 AEDT (UTC+11)
    // In UTC: 20:00-05:00
    utcOpenHour: 20, 
    utcCloseHour: 5,
    icon: Sunrise,
    color: 'bg-purple-500',
  },
  { 
    name: 'Tokyo', 
    // Tokyo session: 09:00-18:00 JST (UTC+9)
    // In UTC: 00:00-09:00
    utcOpenHour: 0, 
    utcCloseHour: 9,
    icon: Sun,
    color: 'bg-red-500',
  },
  { 
    name: 'London', 
    // London session: 08:00-17:00 GMT/BST (UTC+0/+1)
    // In UTC (winter): 08:00-17:00
    utcOpenHour: 8, 
    utcCloseHour: 17,
    icon: Activity,
    color: 'bg-blue-500',
  },
  { 
    name: 'New York', 
    // NY session: 08:00-17:00 EST (UTC-5)
    // In UTC: 13:00-22:00
    utcOpenHour: 13, 
    utcCloseHour: 22,
    icon: Sunset,
    color: 'bg-green-500',
  },
];

// Get user's timezone offset in hours
function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset() / -60;
}

// Convert UTC hour to local hour
function utcToLocalHour(utcHour: number): number {
  const offset = getTimezoneOffset();
  let localHour = (utcHour + offset) % 24;
  if (localHour < 0) localHour += 24;
  return localHour;
}

function isSessionActive(session: typeof MARKET_SESSIONS[0], currentUtcHour: number): boolean {
  const { utcOpenHour, utcCloseHour } = session;
  
  // Handle sessions that span midnight UTC
  if (utcOpenHour > utcCloseHour) {
    return currentUtcHour >= utcOpenHour || currentUtcHour < utcCloseHour;
  }
  return currentUtcHour >= utcOpenHour && currentUtcHour < utcCloseHour;
}

function getSessionProgress(session: typeof MARKET_SESSIONS[0], currentUtcHour: number): number {
  if (!isSessionActive(session, currentUtcHour)) return 0;
  
  const { utcOpenHour, utcCloseHour } = session;
  let duration: number;
  let elapsed: number;
  
  if (utcOpenHour > utcCloseHour) {
    // Session spans midnight
    duration = (24 - utcOpenHour) + utcCloseHour;
    elapsed = currentUtcHour >= utcOpenHour ? currentUtcHour - utcOpenHour : (24 - utcOpenHour) + currentUtcHour;
  } else {
    duration = utcCloseHour - utcOpenHour;
    elapsed = currentUtcHour - utcOpenHour;
  }
  
  return Math.min(100, (elapsed / duration) * 100);
}

function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function getTimezoneAbbreviation(): string {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZoneName: 'short' };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
  const tz = parts.find(p => p.type === 'timeZoneName');
  return tz?.value || 'Local';
}

// Format session time range in user's local time
function formatSessionTimeLocal(session: typeof MARKET_SESSIONS[0]): string {
  const openLocal = utcToLocalHour(session.utcOpenHour);
  const closeLocal = utcToLocalHour(session.utcCloseHour);
  return `${formatTime(openLocal)}-${formatTime(closeLocal)}`;
}

export function MarketSessionsWidget() {
  // Track both local hour (for display) and UTC hour (for session calculations)
  const [currentLocalHour, setCurrentLocalHour] = useState(new Date().getHours());
  const [currentUtcHour, setCurrentUtcHour] = useState(new Date().getUTCHours());
  const [timezone, setTimezone] = useState(getTimezoneAbbreviation());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLocalHour(new Date().getHours());
      setCurrentUtcHour(new Date().getUTCHours());
      setTimezone(getTimezoneAbbreviation());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const activeSessions = MARKET_SESSIONS.filter(s => isSessionActive(s, currentUtcHour));
  
  // Check for session overlaps
  const hasLondonNYOverlap = isSessionActive(MARKET_SESSIONS[2], currentUtcHour) && isSessionActive(MARKET_SESSIONS[3], currentUtcHour);
  const hasTokyoLondonOverlap = isSessionActive(MARKET_SESSIONS[1], currentUtcHour) && isSessionActive(MARKET_SESSIONS[2], currentUtcHour);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header with current time */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {activeSessions.length > 0 ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-muted-foreground">
                  {activeSessions.map(s => s.name).join(' + ')} active
                </span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">No major sessions open</span>
            )}
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(currentLocalHour)} {timezone}
          </Badge>
        </div>

        {/* Session overlap alert */}
        {(hasLondonNYOverlap || hasTokyoLondonOverlap) && (
          <div className="mb-4 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs font-medium text-primary flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Session Overlap - High Volume Period
            </p>
          </div>
        )}

        {/* Sessions Grid */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {MARKET_SESSIONS.map((session) => {
            const Icon = session.icon;
            const isActive = isSessionActive(session, currentUtcHour);
            const progress = getSessionProgress(session, currentUtcHour);
            
            return (
              <div 
                key={session.name} 
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  isActive ? "border-green-500/50 bg-green-500/5" : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-1.5 rounded", session.color)}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  {isActive ? (
                    <Badge className="bg-green-500 text-xs h-5">OPEN</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs h-5">CLOSED</Badge>
                  )}
                </div>
                <h4 className="font-medium text-sm">{session.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {formatSessionTimeLocal(session)}
                </p>
                {isActive && (
                  <div className="mt-2">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {Math.round(progress)}% complete
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
