/**
 * Gemini Direct YouTube Transcription
 * Experimental: Send YouTube URL directly to Gemini to see if it can transcribe
 */

export interface GeminiTranscribeResult {
  success: boolean;
  transcript?: string;
  error?: string;
  method: 'gemini_direct' | 'gemini_grounding' | 'failed';
}

/**
 * Attempt to transcribe YouTube video using Gemini's potential grounding capability
 * This is experimental - Gemini web app can do this, but API might be different
 */
export async function transcribeWithGemini(
  youtubeUrl: string,
  apiKey: string
): Promise<GeminiTranscribeResult> {
  try {
    console.log(`[Gemini Transcribe] Attempting to transcribe: ${youtubeUrl}`);

    // Attempt 1: Direct URL in prompt with explicit transcription request
    const directPrompt = `I need you to transcribe the audio/speech from this YouTube video: ${youtubeUrl}

Please provide the complete transcript of what is being said in the video. 
Focus on capturing all spoken words accurately.
If you cannot access the video content, please respond with exactly: "CANNOT_ACCESS_VIDEO"

Transcript:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "user", 
            content: directPrompt 
          },
        ],
        temperature: 0.1, // Low temperature for accuracy
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini Transcribe] API error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded', method: 'failed' };
      }
      if (response.status === 402) {
        return { success: false, error: 'AI credits exhausted', method: 'failed' };
      }
      
      return { success: false, error: `API error: ${response.status}`, method: 'failed' };
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    console.log(`[Gemini Transcribe] Response length: ${content.length} chars`);
    console.log(`[Gemini Transcribe] First 200 chars: ${content.substring(0, 200)}`);

    // Check if Gemini couldn't access the video
    if (
      content.includes("CANNOT_ACCESS_VIDEO") ||
      content.includes("I cannot access") ||
      content.includes("I'm unable to access") ||
      content.includes("I don't have the ability to access") ||
      content.includes("I cannot watch") ||
      content.includes("I'm not able to watch") ||
      content.includes("I cannot view") ||
      content.includes("cannot directly access") ||
      content.includes("don't have access to") ||
      content.includes("unable to transcribe") ||
      content.includes("cannot transcribe") ||
      content.length < 100
    ) {
      console.log('[Gemini Transcribe] Gemini cannot access the video directly');
      return { 
        success: false, 
        error: 'Gemini cannot directly access YouTube videos through the API. Please use manual transcript.', 
        method: 'failed' 
      };
    }

    // Check if we got what looks like a real transcript
    // Real transcripts should be substantial and contain natural speech patterns
    const wordCount = content.split(/\s+/).length;
    
    if (wordCount < 50) {
      console.log(`[Gemini Transcribe] Response too short: ${wordCount} words`);
      return { 
        success: false, 
        error: 'Response too short to be a valid transcript', 
        method: 'failed' 
      };
    }

    // Success! Gemini was able to transcribe
    console.log(`[Gemini Transcribe] SUCCESS! Got ${wordCount} words`);
    
    return {
      success: true,
      transcript: content.trim(),
      method: 'gemini_direct',
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Gemini Transcribe] Error: ${message}`);
    return { success: false, error: message, method: 'failed' };
  }
}

/**
 * Alternative approach: Use Gemini to analyze video with grounding
 * This uses a different prompt strategy
 */
export async function transcribeWithGeminiGrounding(
  youtubeUrl: string,
  videoId: string,
  apiKey: string
): Promise<GeminiTranscribeResult> {
  try {
    console.log(`[Gemini Grounding] Attempting grounded transcription for: ${videoId}`);

    // Try with grounding context
    const groundingPrompt = `You have access to YouTube content through Google's grounding capabilities.

YouTube Video URL: ${youtubeUrl}
Video ID: ${videoId}

Task: Provide a complete word-for-word transcription of this YouTube video's audio content.

Requirements:
1. Transcribe ALL spoken words in the video
2. Include natural speech patterns, pauses indicated by "..."
3. If multiple speakers, try to distinguish them
4. Focus on accuracy over formatting

If you cannot access or transcribe this video, respond with exactly: "GROUNDING_UNAVAILABLE"

Begin transcription:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Try Pro model for better grounding
        messages: [
          { 
            role: "user", 
            content: groundingPrompt 
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}`, method: 'failed' };
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    if (
      content.includes("GROUNDING_UNAVAILABLE") ||
      content.includes("cannot access") ||
      content.includes("unable to access") ||
      content.includes("don't have access") ||
      content.length < 100
    ) {
      return { 
        success: false, 
        error: 'Gemini grounding for YouTube is not available through API', 
        method: 'failed' 
      };
    }

    const wordCount = content.split(/\s+/).length;
    if (wordCount < 50) {
      return { success: false, error: 'Response too short', method: 'failed' };
    }

    return {
      success: true,
      transcript: content.trim(),
      method: 'gemini_grounding',
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message, method: 'failed' };
  }
}
