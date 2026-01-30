import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TradingEconomicsEvent {
  Date: string;
  Event: string;
  Country: string;
  Importance: number;
  Forecast: string | null;
  Previous: string | null;
  Actual: string | null;
}

interface ProcessedEvent {
  id: string;
  date: string;
  event: string;
  country: string;
  importance: 'high' | 'medium' | 'low';
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  aiPrediction: string | null;
  cryptoImpact: 'bullish' | 'bearish' | 'neutral' | null;
}

function mapImportance(importance: number): 'high' | 'medium' | 'low' {
  if (importance >= 3) return 'high';
  if (importance === 2) return 'medium';
  return 'low';
}

function isThisWeek(dateString: string): boolean {
  const eventDate = new Date(dateString);
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return eventDate >= now && eventDate <= weekFromNow;
}

function isToday(dateString: string): boolean {
  const eventDate = new Date(dateString).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  return eventDate === today;
}

function calculateRiskAdjustment(events: ProcessedEvent[]) {
  const todayHighImpact = events.filter(e => isToday(e.date) && e.importance === 'high').length;
  
  if (todayHighImpact >= 2) {
    return {
      hasHighImpact: true,
      eventCount: todayHighImpact,
      riskLevel: 'VERY_HIGH' as const,
      positionAdjustment: 'reduce_50%' as const
    };
  } else if (todayHighImpact === 1) {
    return {
      hasHighImpact: true,
      eventCount: todayHighImpact,
      riskLevel: 'HIGH' as const,
      positionAdjustment: 'reduce_30%' as const
    };
  }
  
  const weekHighImpact = events.filter(e => e.importance === 'high').length;
  if (weekHighImpact > 0) {
    return {
      hasHighImpact: true,
      eventCount: weekHighImpact,
      riskLevel: 'MODERATE' as const,
      positionAdjustment: 'normal' as const
    };
  }
  
  return {
    hasHighImpact: false,
    eventCount: 0,
    riskLevel: 'LOW' as const,
    positionAdjustment: 'normal' as const
  };
}

async function generateAIPredictions(events: ProcessedEvent[]): Promise<ProcessedEvent[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || events.length === 0) {
    return events;
  }

  // Only generate predictions for high-impact events to save API calls
  const highImpactEvents = events.filter(e => e.importance === 'high').slice(0, 5);
  
  if (highImpactEvents.length === 0) {
    return events;
  }

  try {
    const eventsContext = highImpactEvents.map(e => 
      `- ${e.event} (${e.country}): Forecast ${e.forecast || 'N/A'}, Previous ${e.previous || 'N/A'}`
    ).join('\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a crypto market analyst. Analyze economic events and predict their impact on cryptocurrency markets. For each event, provide a brief prediction and crypto impact (bullish/bearish/neutral).`
          },
          {
            role: "user",
            content: `Analyze these upcoming economic events for crypto market impact:\n\n${eventsContext}\n\nFor each event, respond with JSON array format:\n[{"event": "event name", "prediction": "1-2 sentence prediction", "impact": "bullish/bearish/neutral"}]`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_events",
              description: "Analyze economic events for crypto impact",
              parameters: {
                type: "object",
                properties: {
                  analyses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        event: { type: "string" },
                        prediction: { type: "string" },
                        impact: { type: "string", enum: ["bullish", "bearish", "neutral"] }
                      },
                      required: ["event", "prediction", "impact"]
                    }
                  }
                },
                required: ["analyses"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_events" } }
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", response.status);
      return events;
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const analyses = parsed.analyses || [];
      
      // Map AI predictions back to events
      return events.map(event => {
        const analysis = analyses.find((a: any) => 
          event.event.toLowerCase().includes(a.event.toLowerCase()) ||
          a.event.toLowerCase().includes(event.event.toLowerCase().split(' ')[0])
        );
        
        if (analysis) {
          return {
            ...event,
            aiPrediction: analysis.prediction,
            cryptoImpact: analysis.impact as 'bullish' | 'bearish' | 'neutral'
          };
        }
        return event;
      });
    }
  } catch (error) {
    console.error("Error generating AI predictions:", error);
  }
  
  return events;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch from Trading Economics API (free, no key required)
    const teResponse = await fetch('https://api.tradingeconomics.com/calendar?c=ALL', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TradingJourney/1.0'
      }
    });

    if (!teResponse.ok) {
      throw new Error(`Trading Economics API error: ${teResponse.status}`);
    }

    const rawEvents: TradingEconomicsEvent[] = await teResponse.json();
    
    // Filter for US and high-impact global events
    const relevantEvents = rawEvents.filter(e => {
      const isUS = e.Country === 'United States';
      const isFed = e.Event.toLowerCase().includes('fed') || 
                    e.Event.toLowerCase().includes('fomc') ||
                    e.Event.toLowerCase().includes('powell');
      const isHighImpact = e.Importance >= 2;
      
      return (isUS || isFed) && isHighImpact;
    });

    // Filter for this week only
    const weekEvents = relevantEvents.filter(e => isThisWeek(e.Date));

    // Process and format events
    let processedEvents: ProcessedEvent[] = weekEvents.map((e, idx) => ({
      id: `te-${idx}-${Date.now()}`,
      date: e.Date,
      event: e.Event,
      country: e.Country,
      importance: mapImportance(e.Importance),
      forecast: e.Forecast,
      previous: e.Previous,
      actual: e.Actual,
      aiPrediction: null,
      cryptoImpact: null
    }));

    // Sort by date
    processedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Limit to 15 events max
    processedEvents = processedEvents.slice(0, 15);

    // Generate AI predictions for high-impact events
    processedEvents = await generateAIPredictions(processedEvents);

    // Find today's highlight (most important event today)
    const todayEvents = processedEvents.filter(e => isToday(e.date));
    const todayHighlight = todayEvents.find(e => e.importance === 'high') || todayEvents[0] || null;

    // Calculate time until today's highlight
    let timeUntil: string | null = null;
    if (todayHighlight) {
      const eventTime = new Date(todayHighlight.date);
      const now = new Date();
      const diffMs = eventTime.getTime() - now.getTime();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        timeUntil = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      } else {
        timeUntil = 'Now';
      }
    }

    const response = {
      events: processedEvents,
      todayHighlight: {
        event: todayHighlight,
        hasEvent: !!todayHighlight,
        timeUntil
      },
      impactSummary: calculateRiskAdjustment(processedEvents),
      lastUpdated: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Economic calendar error:", error);
    
    // Return fallback response with empty data
    return new Response(JSON.stringify({
      events: [],
      todayHighlight: { event: null, hasEvent: false, timeUntil: null },
      impactSummary: {
        hasHighImpact: false,
        eventCount: 0,
        riskLevel: 'LOW',
        positionAdjustment: 'normal'
      },
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Failed to fetch calendar data'
    }), {
      status: 200, // Return 200 with error message for graceful handling
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
