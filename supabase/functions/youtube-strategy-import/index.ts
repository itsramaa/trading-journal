import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface YouTubeImportRequest {
  url?: string;
  transcript?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, transcript } = await req.json() as YouTubeImportRequest;
    
    if (!url && !transcript) {
      return new Response(
        JSON.stringify({ error: "URL or transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Extract video info from URL if provided
    let videoTitle = "Trading Strategy Video";
    let videoContent = transcript || "";
    
    if (url && !transcript) {
      // Try to extract video ID and fetch info
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        
        // Try to get video info using oEmbed (no API key needed)
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const oembedRes = await fetch(oembedUrl);
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            videoTitle = oembedData.title || videoTitle;
          }
        } catch (e) {
          console.log("Could not fetch video info:", e);
        }
        
        // Since we can't get transcript automatically, use the URL as context
        videoContent = `YouTube Video: ${videoTitle}\nURL: ${url}\n\nNote: Please analyze based on the video title and generate a typical trading strategy structure. User should edit the details.`;
      }
    }

    // Use Gemini to extract strategy
    const systemPrompt = `You are a trading strategy analyst. Extract trading strategy details from video content or descriptions.
    
IMPORTANT: If the content is limited, create a reasonable placeholder strategy based on the video title.
Generate valid JSON that follows this exact structure.`;

    const userPrompt = `Analyze this trading video content and extract the strategy:

TITLE: ${videoTitle}
CONTENT: ${videoContent}

Extract the trading strategy and return ONLY valid JSON (no markdown, no code blocks):
{
  "strategyName": "Strategy name based on title",
  "description": "Brief description",
  "type": "day_trading",
  "timeframe": "1h",
  "entryConditions": ["Entry condition 1", "Entry condition 2", "Entry condition 3"],
  "exitConditions": {
    "takeProfit": 2,
    "takeProfitUnit": "percent",
    "stopLoss": 1,
    "stopLossUnit": "percent"
  },
  "indicatorsUsed": ["RSI", "MACD", "EMA"],
  "positionSizing": "1-2% of capital per trade",
  "suitablePairs": ["BTC", "ETH", "SOL"],
  "difficultyLevel": "intermediate",
  "riskLevel": "medium",
  "confidenceScore": 70,
  "automationScore": 50
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let strategy;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      strategy = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse strategy from AI response");
    }

    // Validate and enhance the strategy
    const validation = validateStrategy(strategy);
    
    // Add source info
    strategy.sourceUrl = url || "";
    strategy.sourceTitle = videoTitle;

    return new Response(
      JSON.stringify({ 
        strategy,
        validation,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("YouTube import error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function validateStrategy(strategy: any) {
  const missingElements: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!strategy.entryConditions?.length) {
    missingElements.push("Entry conditions");
  } else if (strategy.entryConditions.length < 2) {
    warnings.push("Strategy has less than 2 entry conditions");
  }
  
  if (!strategy.exitConditions?.takeProfit) {
    missingElements.push("Take profit level");
  }
  
  if (!strategy.exitConditions?.stopLoss) {
    missingElements.push("Stop loss level");
  }
  
  if (!strategy.indicatorsUsed?.length) {
    warnings.push("No indicators specified");
  }
  
  if (!strategy.timeframe) {
    missingElements.push("Timeframe");
  }

  const isValid = missingElements.length === 0;
  const score = Math.max(0, 100 - (missingElements.length * 20) - (warnings.length * 10));

  return {
    isValid,
    missingElements,
    warnings,
    score,
  };
}
