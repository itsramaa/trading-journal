import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, type } = await req.json();
    
    if (!symbol) {
      console.error('Missing symbol parameter');
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching price for symbol: ${symbol}, type: ${type}`);

    let price: number | null = null;

    if (type === 'CRYPTO') {
      // Use CoinGecko for crypto
      const coingeckoId = symbol.toLowerCase();
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
      );
      const data = await response.json();
      price = data[coingeckoId]?.usd || null;
      console.log(`CoinGecko price for ${symbol}:`, price);
    } else if (type === 'US_STOCK') {
      // Use Finnhub for US stocks
      const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
      if (!finnhubKey) {
        console.error('FINNHUB_API_KEY not configured');
        return new Response(
          JSON.stringify({ error: 'Finnhub API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${finnhubKey}`
      );
      const data = await response.json();
      console.log(`Finnhub response for ${symbol}:`, data);
      
      // Finnhub returns 'c' for current price
      if (data.c && data.c > 0) {
        price = data.c;
      }
    } else if (type === 'ID_STOCK') {
      // For Indonesian stocks, try Alpha Vantage
      const alphaKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
      if (alphaKey) {
        // Indonesian stocks on Alpha Vantage use .JK suffix
        const alphaSymbol = symbol.includes('.JK') ? symbol : `${symbol}.JK`;
        const response = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${alphaSymbol}&apikey=${alphaKey}`
        );
        const data = await response.json();
        console.log(`Alpha Vantage response for ${alphaSymbol}:`, data);
        
        if (data['Global Quote'] && data['Global Quote']['05. price']) {
          price = parseFloat(data['Global Quote']['05. price']);
        }
      }
    }

    if (price !== null) {
      console.log(`Successfully fetched price: ${price} for ${symbol}`);
      return new Response(
        JSON.stringify({ price, symbol, type }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`No price found for ${symbol}`);
      return new Response(
        JSON.stringify({ error: 'Price not found', symbol, type }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching stock price:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});