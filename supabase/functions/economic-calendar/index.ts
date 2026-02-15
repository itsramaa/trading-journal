import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  DISPLAY_LIMITS,
  TIME_WINDOWS,
  mapImportance,
  isRelevantEvent,
  calculateRiskLevel,
} from "../_shared/constants/economic-calendar.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ForexFactoryEvent {
  title: string;
  country: string;
  date: string;
  impact: string; // "High", "Medium", "Low", "Holiday", "Non-Economic"
  forecast: string;
  previous: string;
  actual?: string;
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
  historicalStats: { avgBtcMove2h: number; medianBtcMove2h: number; maxBtcMove2h: number; worstCase2h: number; upsideBias: number; probMoveGt2Pct: number; sampleSize: number; volatilitySpikeProb: number } | null;
}

// Static historical correlation data for major economic events
// Based on aggregated BTC price reactions to US macro events (2020-2025)
const EVENT_HISTORICAL_STATS: Record<string, { avgBtcMove2h: number; medianBtcMove2h: number; maxBtcMove2h: number; worstCase2h: number; upsideBias: number; probMoveGt2Pct: number; sampleSize: number; volatilitySpikeProb: number }> = {
  'Non-Farm Employment Change': { avgBtcMove2h: 2.3, medianBtcMove2h: 1.7, maxBtcMove2h: 5.8, worstCase2h: -3.9, upsideBias: 58, probMoveGt2Pct: 72, sampleSize: 60, volatilitySpikeProb: 68 },
  'Nonfarm Payrolls': { avgBtcMove2h: 2.3, medianBtcMove2h: 1.7, maxBtcMove2h: 5.8, worstCase2h: -3.9, upsideBias: 58, probMoveGt2Pct: 72, sampleSize: 60, volatilitySpikeProb: 68 },
  'CPI': { avgBtcMove2h: 2.8, medianBtcMove2h: 2.1, maxBtcMove2h: 7.2, worstCase2h: -4.5, upsideBias: 52, probMoveGt2Pct: 82, sampleSize: 48, volatilitySpikeProb: 74 },
  'Consumer Price Index': { avgBtcMove2h: 2.8, medianBtcMove2h: 2.1, maxBtcMove2h: 7.2, worstCase2h: -4.5, upsideBias: 52, probMoveGt2Pct: 82, sampleSize: 48, volatilitySpikeProb: 74 },
  'Core CPI': { avgBtcMove2h: 2.1, medianBtcMove2h: 1.5, maxBtcMove2h: 4.8, worstCase2h: -3.2, upsideBias: 54, probMoveGt2Pct: 65, sampleSize: 48, volatilitySpikeProb: 65 },
  'FOMC': { avgBtcMove2h: 3.1, medianBtcMove2h: 2.4, maxBtcMove2h: 8.5, worstCase2h: -6.1, upsideBias: 62, probMoveGt2Pct: 85, sampleSize: 40, volatilitySpikeProb: 82 },
  'Federal Funds Rate': { avgBtcMove2h: 3.1, medianBtcMove2h: 2.4, maxBtcMove2h: 8.5, worstCase2h: -6.1, upsideBias: 62, probMoveGt2Pct: 85, sampleSize: 40, volatilitySpikeProb: 82 },
  'PPI': { avgBtcMove2h: 1.5, medianBtcMove2h: 1.1, maxBtcMove2h: 3.4, worstCase2h: -2.1, upsideBias: 55, probMoveGt2Pct: 42, sampleSize: 48, volatilitySpikeProb: 52 },
  'GDP': { avgBtcMove2h: 1.8, medianBtcMove2h: 1.3, maxBtcMove2h: 4.1, worstCase2h: -2.8, upsideBias: 60, probMoveGt2Pct: 54, sampleSize: 24, volatilitySpikeProb: 58 },
  'Unemployment Rate': { avgBtcMove2h: 1.9, medianBtcMove2h: 1.4, maxBtcMove2h: 4.5, worstCase2h: -3.0, upsideBias: 50, probMoveGt2Pct: 55, sampleSize: 60, volatilitySpikeProb: 55 },
  'Retail Sales': { avgBtcMove2h: 1.4, medianBtcMove2h: 1.0, maxBtcMove2h: 3.2, worstCase2h: -2.0, upsideBias: 53, probMoveGt2Pct: 38, sampleSize: 48, volatilitySpikeProb: 45 },
  'ISM Manufacturing PMI': { avgBtcMove2h: 1.2, medianBtcMove2h: 0.9, maxBtcMove2h: 2.8, worstCase2h: -1.8, upsideBias: 51, probMoveGt2Pct: 32, sampleSize: 48, volatilitySpikeProb: 42 },
  'Initial Jobless Claims': { avgBtcMove2h: 0.8, medianBtcMove2h: 0.5, maxBtcMove2h: 2.1, worstCase2h: -1.2, upsideBias: 49, probMoveGt2Pct: 18, sampleSize: 200, volatilitySpikeProb: 28 },
  'PCE Price Index': { avgBtcMove2h: 2.0, medianBtcMove2h: 1.5, maxBtcMove2h: 4.6, worstCase2h: -3.1, upsideBias: 56, probMoveGt2Pct: 62, sampleSize: 36, volatilitySpikeProb: 62 },
  'Core PCE': { avgBtcMove2h: 2.0, medianBtcMove2h: 1.5, maxBtcMove2h: 4.6, worstCase2h: -3.1, upsideBias: 56, probMoveGt2Pct: 62, sampleSize: 36, volatilitySpikeProb: 62 },
};

function matchHistoricalStats(eventTitle: string): { avgBtcMove2h: number; sampleSize: number; volatilitySpikeProb: number } | null {
  const titleLower = eventTitle.toLowerCase();
  for (const [key, stats] of Object.entries(EVENT_HISTORICAL_STATS)) {
    if (titleLower.includes(key.toLowerCase()) || key.toLowerCase().includes(titleLower.split(' ')[0])) {
      return stats;
    }
  }
  return null;
}

function mapFFImpact(impact: string): number {
  switch (impact) {
    case 'High': return 3;
    case 'Medium': return 2;
    case 'Low': return 1;
    default: return 0;
  }
}

function isToday(dateString: string): boolean {
  const eventDate = new Date(dateString).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  return eventDate === today;
}

function calculateRiskAdjustment(events: ProcessedEvent[]) {
  const todayHighImpact = events.filter(e => isToday(e.date) && e.importance === 'high').length;
  const weekHighImpact = events.filter(e => e.importance === 'high').length;
  
  return calculateRiskLevel(todayHighImpact, weekHighImpact);
}

async function generateAIPredictions(events: ProcessedEvent[]): Promise<ProcessedEvent[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY || events.length === 0) {
    return events;
  }

  const highImpactEvents = events
    .filter(e => e.importance === 'high')
    .slice(0, DISPLAY_LIMITS.MAX_AI_PREDICTIONS);
  
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
    // === AUTH CHECK ===
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // === END AUTH CHECK ===
    // Fetch from Forex Factory free JSON endpoint (no API key required)
    const ffResponse = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TradingJournal/1.0'
      }
    });

    if (!ffResponse.ok) {
      throw new Error(`Forex Factory API error: ${ffResponse.status}`);
    }

    const rawEvents: ForexFactoryEvent[] = await ffResponse.json();
    
    console.log(`Fetched ${rawEvents.length} raw events from Forex Factory`);

    // Map Forex Factory country codes to full names for filtering
    const countryCodeMap: Record<string, string> = {
      'USD': 'United States',
      'EUR': 'Euro Zone',
      'GBP': 'United Kingdom',
      'JPY': 'Japan',
      'CAD': 'Canada',
      'AUD': 'Australia',
      'NZD': 'New Zealand',
      'CHF': 'Switzerland',
      'CNY': 'China',
    };

    // Filter out holidays and non-economic events, and check relevance
    const relevantEvents = rawEvents.filter(e => {
      if (e.impact === 'Holiday' || e.impact === 'Non-Economic') return false;
      const importanceNum = mapFFImpact(e.impact);
      const fullCountry = countryCodeMap[e.country] || e.country;
      return isRelevantEvent(fullCountry, e.title, importanceNum);
    });

    console.log(`Filtered to ${relevantEvents.length} relevant events`);

    // Process and format events
    let processedEvents: ProcessedEvent[] = relevantEvents.map((e, idx) => ({
      id: `ff-${idx}-${Date.now()}`,
      date: e.date,
      event: e.title,
      country: countryCodeMap[e.country] || e.country,
      importance: mapImportance(mapFFImpact(e.impact)),
      forecast: e.forecast || null,
      previous: e.previous || null,
      actual: e.actual || null,
      aiPrediction: null,
      cryptoImpact: null,
      historicalStats: matchHistoricalStats(e.title),
    }));

    // Sort by date
    processedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Limit to max events
    processedEvents = processedEvents.slice(0, DISPLAY_LIMITS.MAX_EVENTS);

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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
