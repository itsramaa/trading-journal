import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Globe, TrendingUp, Clock, Activity, Sun, Moon, Sunrise, Sunset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

// Market session data (times in UTC)
const MARKET_SESSIONS = [
  { 
    name: 'Sydney', 
    openHour: 21, 
    closeHour: 6,
    icon: Sunrise,
    color: 'bg-purple-500',
    timezone: 'AEST',
    description: 'Opens the trading week'
  },
  { 
    name: 'Tokyo', 
    openHour: 23, 
    closeHour: 8,
    icon: Sun,
    color: 'bg-red-500',
    timezone: 'JST',
    description: 'Asian session'
  },
  { 
    name: 'London', 
    openHour: 7, 
    closeHour: 16,
    icon: Activity,
    color: 'bg-blue-500',
    timezone: 'GMT',
    description: 'Highest volume session'
  },
  { 
    name: 'New York', 
    openHour: 12, 
    closeHour: 21,
    icon: Sunset,
    color: 'bg-green-500',
    timezone: 'EST',
    description: 'USD pairs most active'
  },
];

// Economic events (mock data)
const UPCOMING_EVENTS = [
  { date: 'Today', time: '14:30', event: 'US CPI (YoY)', impact: 'high', forecast: '3.2%' },
  { date: 'Today', time: '16:00', event: 'Fed Chair Powell Speaks', impact: 'high', forecast: '-' },
  { date: 'Tomorrow', time: '08:00', event: 'UK GDP (QoQ)', impact: 'medium', forecast: '0.2%' },
  { date: 'Tomorrow', time: '12:30', event: 'US Retail Sales', impact: 'medium', forecast: '0.3%' },
  { date: 'Wed', time: '18:00', event: 'FOMC Minutes', impact: 'high', forecast: '-' },
  { date: 'Thu', time: '12:30', event: 'US Jobless Claims', impact: 'medium', forecast: '215K' },
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

const MarketCalendar = () => {
  const [currentHour, setCurrentHour] = useState(new Date().getUTCHours());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getUTCHours());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const activeSessions = MARKET_SESSIONS.filter(s => isSessionActive(s, currentHour));
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar & Market</h1>
          <p className="text-muted-foreground">
            Market sessions and economic calendar
          </p>
        </div>

        {/* Current Time & Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>Market Sessions</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(currentHour)} UTC
              </Badge>
            </div>
            <CardDescription>
              {activeSessions.length > 0 ? (
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  {activeSessions.map(s => s.name).join(', ')} session{activeSessions.length > 1 ? 's' : ''} currently open
                </span>
              ) : (
                "No major sessions currently open"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {MARKET_SESSIONS.map((session) => {
                const Icon = session.icon;
                const isActive = isSessionActive(session, currentHour);
                const progress = getSessionProgress(session, currentHour);
                
                return (
                  <Card key={session.name} className={cn(
                    "transition-all",
                    isActive && "border-green-500/50 bg-green-500/5"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn("p-2 rounded-lg", session.color)}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        {isActive ? (
                          <Badge className="bg-green-500">OPEN</Badge>
                        ) : (
                          <Badge variant="outline">CLOSED</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{session.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{session.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(session.openHour)} - {formatTime(session.closeHour)} UTC</span>
                      </div>
                      {isActive && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(progress)}% complete
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Session Overlap Info */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Session Overlaps (High Volume Periods)
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>London + Tokyo: 07:00 - 08:00 UTC</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>London + New York: 12:00 - 16:00 UTC</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Economic Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Economic Calendar</CardTitle>
              </div>
              <CardDescription>
                Upcoming high-impact economic events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {UPCOMING_EVENTS.map((event, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2",
                      event.impact === 'high' && "bg-red-500",
                      event.impact === 'medium' && "bg-yellow-500",
                      event.impact === 'low' && "bg-green-500"
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{event.event}</p>
                        <Badge variant="outline" className="text-xs">
                          {event.impact}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{event.date}</span>
                        <span>{event.time} UTC</span>
                        {event.forecast !== '-' && (
                          <span>Forecast: {event.forecast}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Data is for demonstration purposes. Connect to a live economic calendar API for real-time events.
              </p>
            </CardContent>
          </Card>

          {/* Market Analysis Placeholder */}
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>AI Market Sentiment</CardTitle>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <CardDescription>
                AI-powered market sentiment and trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                <p>AI market sentiment analysis will be available soon.</p>
                <p className="text-sm mt-2">
                  Features: Sentiment scores, trend detection, volatility alerts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketCalendar;
