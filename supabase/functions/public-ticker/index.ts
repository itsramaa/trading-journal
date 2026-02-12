import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbols = url.searchParams.get('symbols') || '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT"]';
    
    // Use spot API (more widely available) with individual symbol requests
    // or the /api/v3/ticker/24hr endpoint
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`);
    
    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
