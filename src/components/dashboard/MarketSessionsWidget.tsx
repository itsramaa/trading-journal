/**
 * Market Sessions Widget - Compact display for Dashboard
 * Shows live status of Sydney, Tokyo, London, NY sessions with progress
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity, Sun, Sunrise, Sunset } from "lucide-react";
import { cn } from "@/lib/utils";

// Market session data (times in UTC)
const MARKET_SESSIONS = [
  { 
    name: 'Sydney', 
    openHour: 21, 
    closeHour: 6,
    icon: Sunrise,
    color: 'bg-purple-500',
  },
  { 
    name: 'Tokyo', 
    openHour: 23, 
    closeHour: 8,
    icon: Sun,
    color: 'bg-red-500',
  },
  { 
    name: 'London', 
    openHour: 7, 
    closeHour: 16,
    icon: Activity,
    color: 'bg-blue-500',
  },
  { 
    name: 'New York', 
    openHour: 12, 
    closeHour: 21,
    icon: Sunset,
    color: 'bg-green-500',
  },
];

function isSessionActive(session: typeof MARKET_SESSIONS[0], currentHour: number): boolean {
  const { openHour, closeHour } = session;
  
  // Handle sessions that span midnight
  if (openHour > closeHour) {
    return currentHour >= openHour || currentHour < closeHour;
  }
  return currentHour >= openHour && currentHour < closeHour;
}

function getSessionProgress(session: typeof MARKET_SESSIONS[0], currentHour: number): number {
  if (!isSessionActive(session, currentHour)) return 0;
  
  const { openHour, closeHour } = session;
  let duration: number;
  let elapsed: number;
  
  if (openHour > closeHour) {
    // Session spans midnight
    duration = (24 - openHour) + closeHour;
    elapsed = currentHour >= openHour ? currentHour - openHour : (24 - openHour) + currentHour;
  } else {
    duration = closeHour - openHour;
    elapsed = currentHour - openHour;
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

export function MarketSessionsWidget() {
  // Use local time instead of UTC
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [timezone, setTimezone] = useState(getTimezoneAbbreviation());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
      setTimezone(getTimezoneAbbreviation());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const activeSessions = MARKET_SESSIONS.filter(s => isSessionActive(s, currentHour));
  
  // Check for session overlaps
  const hasLondonNYOverlap = isSessionActive(MARKET_SESSIONS[2], currentHour) && isSessionActive(MARKET_SESSIONS[3], currentHour);
  const hasTokyoLondonOverlap = isSessionActive(MARKET_SESSIONS[1], currentHour) && isSessionActive(MARKET_SESSIONS[2], currentHour);

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
            {formatTime(currentHour)} {timezone}
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
            const isActive = isSessionActive(session, currentHour);
            const progress = getSessionProgress(session, currentHour);
            
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
                  {formatTime(session.openHour)}-{formatTime(session.closeHour)}
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
