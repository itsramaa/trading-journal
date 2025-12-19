import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PriceData {
  asset_id: string
  current_price: number
  price_change_1h: number | null
  price_change_24h: number | null
  price_change_7d: number | null
  market_cap: number | null
  volume_24h: number | null
}

// Fetch crypto prices from CoinGecko
async function fetchCryptoFromCoinGecko(coingeckoIds: string[]): Promise<Map<string, any>> {
  const apiKey = Deno.env.get('COINGECKO_API_KEY')
  if (!apiKey || coingeckoIds.length === 0) return new Map()

  try {
    const ids = coingeckoIds.join(',')
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_market_cap=true&include_24hr_vol=true&x_cg_demo_api_key=${apiKey}`
    
    console.log(`Fetching CoinGecko prices for: ${ids}`)
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`)
      return new Map()
    }
    
    const data = await response.json()
    const priceMap = new Map()
    
    for (const [id, info] of Object.entries(data)) {
      const priceInfo = info as any
      priceMap.set(id, {
        current_price: priceInfo.usd || 0,
        price_change_24h: priceInfo.usd_24h_change || 0,
        price_change_7d: priceInfo.usd_7d_change || 0,
        market_cap: priceInfo.usd_market_cap || null,
        volume_24h: priceInfo.usd_24h_vol || null,
      })
    }
    
    console.log(`CoinGecko returned ${priceMap.size} prices`)
    return priceMap
  } catch (error) {
    console.error('CoinGecko fetch error:', error)
    return new Map()
  }
}

// Fetch US stock prices from Finnhub
async function fetchUSStockFromFinnhub(symbols: string[]): Promise<Map<string, any>> {
  const apiKey = Deno.env.get('FINNHUB_API_KEY')
  if (!apiKey || symbols.length === 0) return new Map()

  const priceMap = new Map()
  
  for (const symbol of symbols) {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      console.log(`Fetching Finnhub price for: ${symbol}`)
      
      const response = await fetch(url)
      if (!response.ok) continue
      
      const data = await response.json()
      if (data.c) {
        const changePercent = data.dp || ((data.c - data.pc) / data.pc * 100)
        priceMap.set(symbol, {
          current_price: data.c,
          price_change_24h: changePercent,
          price_change_1h: null,
          price_change_7d: null,
        })
      }
    } catch (error) {
      console.error(`Finnhub fetch error for ${symbol}:`, error)
    }
  }
  
  console.log(`Finnhub returned ${priceMap.size} prices`)
  return priceMap
}

// Fetch IDX stock prices from FCS API
async function fetchIDStockFromFCS(symbols: string[]): Promise<Map<string, any>> {
  const apiKey = Deno.env.get('FCSAPI_API_KEY')
  if (!apiKey || symbols.length === 0) return new Map()

  const priceMap = new Map()
  
  try {
    const symbolList = symbols.join(',')
    const url = `https://fcsapi.com/api-v3/stock/latest?symbol=${symbolList}&access_key=${apiKey}`
    console.log(`Fetching FCS prices for: ${symbolList}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`FCS API error: ${response.status}`)
      return priceMap
    }
    
    const data = await response.json()
    if (data.response && Array.isArray(data.response)) {
      for (const stock of data.response) {
        priceMap.set(stock.s, {
          current_price: parseFloat(stock.c) || 0,
          price_change_24h: parseFloat(stock.cp) || 0,
          price_change_1h: null,
          price_change_7d: null,
        })
      }
    }
  } catch (error) {
    console.error('FCS API fetch error:', error)
  }
  
  console.log(`FCS returned ${priceMap.size} prices`)
  return priceMap
}

// Fallback: Fetch from Alpha Vantage
async function fetchFromAlphaVantage(symbol: string): Promise<any | null> {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY')
  if (!apiKey) return null

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    console.log(`Fetching Alpha Vantage price for: ${symbol}`)
    
    const response = await fetch(url)
    if (!response.ok) return null
    
    const data = await response.json()
    const quote = data['Global Quote']
    
    if (quote && quote['05. price']) {
      return {
        current_price: parseFloat(quote['05. price']),
        price_change_24h: parseFloat(quote['10. change percent']?.replace('%', '')) || 0,
        price_change_1h: null,
        price_change_7d: null,
      }
    }
  } catch (error) {
    console.error(`Alpha Vantage fetch error for ${symbol}:`, error)
  }
  
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')

    if (assetsError) {
      console.error('Error fetching assets:', assetsError)
      throw assetsError
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No assets to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${assets.length} assets`)

    // Group assets by type
    const cryptoAssets = assets.filter(a => a.asset_type === 'CRYPTO' && a.coingecko_id)
    const usStockAssets = assets.filter(a => a.asset_type === 'STOCK' && a.finnhub_symbol)
    const idStockAssets = assets.filter(a => a.asset_type === 'STOCK' && a.fcs_id)

    // Fetch prices from different sources
    const [cryptoPrices, usStockPrices, idStockPrices] = await Promise.all([
      fetchCryptoFromCoinGecko(cryptoAssets.map(a => a.coingecko_id!)),
      fetchUSStockFromFinnhub(usStockAssets.map(a => a.finnhub_symbol!)),
      fetchIDStockFromFCS(idStockAssets.map(a => a.fcs_id!)),
    ])

    // Prepare price cache updates
    const priceUpdates: PriceData[] = []

    for (const asset of assets) {
      let priceInfo: any = null

      if (asset.asset_type === 'CRYPTO' && asset.coingecko_id) {
        priceInfo = cryptoPrices.get(asset.coingecko_id)
      } else if (asset.finnhub_symbol) {
        priceInfo = usStockPrices.get(asset.finnhub_symbol)
      } else if (asset.fcs_id) {
        priceInfo = idStockPrices.get(asset.fcs_id)
      } else if (asset.alpha_symbol) {
        priceInfo = await fetchFromAlphaVantage(asset.alpha_symbol)
      }

      if (priceInfo) {
        priceUpdates.push({
          asset_id: asset.id,
          current_price: priceInfo.current_price,
          price_change_1h: priceInfo.price_change_1h,
          price_change_24h: priceInfo.price_change_24h,
          price_change_7d: priceInfo.price_change_7d,
          market_cap: priceInfo.market_cap || null,
          volume_24h: priceInfo.volume_24h || null,
        })
      }
    }

    console.log(`Updating ${priceUpdates.length} price entries`)

    // Upsert price cache
    for (const update of priceUpdates) {
      const { error: upsertError } = await supabase
        .from('price_cache')
        .upsert(
          { ...update, last_updated: new Date().toISOString() },
          { onConflict: 'asset_id' }
        )

      if (upsertError) {
        console.error(`Error upserting price for ${update.asset_id}:`, upsertError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: priceUpdates.length,
        message: `Updated ${priceUpdates.length} asset prices`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Price fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
