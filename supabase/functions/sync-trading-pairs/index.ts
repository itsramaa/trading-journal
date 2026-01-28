import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting trading pairs sync from Binance Futures API...');
    
    // Fetch from Binance Futures API
    const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response from Binance API - expected array');
    }
    
    console.log(`Fetched ${data.length} pairs from Binance`);
    
    // Extract unique symbols and parse base/quote assets
    const pairs = data.map((item: { symbol: string }) => {
      const symbol = item.symbol;
      
      // Parse base and quote assets
      // Most pairs end in USDT, BUSD, or USDC
      let quoteAsset = 'USDT';
      let baseAsset = symbol;
      
      if (symbol.endsWith('USDT')) {
        quoteAsset = 'USDT';
        baseAsset = symbol.slice(0, -4);
      } else if (symbol.endsWith('BUSD')) {
        quoteAsset = 'BUSD';
        baseAsset = symbol.slice(0, -4);
      } else if (symbol.endsWith('USDC')) {
        quoteAsset = 'USDC';
        baseAsset = symbol.slice(0, -4);
      }
      
      return {
        symbol,
        base_asset: baseAsset,
        quote_asset: quoteAsset,
        is_active: true,
        source: 'binance_futures',
        last_synced_at: new Date().toISOString(),
      };
    });
    
    // Connect to Supabase with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Upsert pairs - on conflict update last_synced_at
    const { error, count } = await supabase
      .from('trading_pairs')
      .upsert(pairs, { 
        onConflict: 'symbol',
        ignoreDuplicates: false,
        count: 'exact'
      });
    
    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }
    
    console.log(`Successfully synced ${count || pairs.length} trading pairs`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      pairs_synced: count || pairs.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
