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

// Rate limiting helper - delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Fetch crypto prices from CoinGecko (batch up to 50 at a time)
async function fetchCryptoFromCoinGecko(coingeckoIds: string[]): Promise<Map<string, any>> {
  const apiKey = Deno.env.get('COINGECKO_API_KEY')
  if (!apiKey || coingeckoIds.length === 0) return new Map()

  const priceMap = new Map()
  const BATCH_SIZE = 50 // CoinGecko allows up to 50 ids per request
  const DELAY_MS = 2000 // 2 second delay between batches (30 calls/min limit for demo key)

  try {
    for (let i = 0; i < coingeckoIds.length; i += BATCH_SIZE) {
      const batch = coingeckoIds.slice(i, i + BATCH_SIZE)
      const ids = batch.join(',')
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_market_cap=true&include_24hr_vol=true&x_cg_demo_api_key=${apiKey}`
      
      console.log(`[CoinGecko] Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} coins`)
      
      const response = await fetch(url)
      
      if (response.status === 429) {
        console.warn('[CoinGecko] Rate limited, waiting 60 seconds...')
        await delay(60000)
        // Retry once
        const retryResponse = await fetch(url)
        if (!retryResponse.ok) {
          console.error(`[CoinGecko] Retry failed: ${retryResponse.status}`)
          continue
        }
        const retryData = await retryResponse.json()
        for (const [id, info] of Object.entries(retryData)) {
          const priceInfo = info as any
          priceMap.set(id, {
            current_price: priceInfo.usd || 0,
            price_change_24h: priceInfo.usd_24h_change || 0,
            price_change_7d: priceInfo.usd_7d_change || 0,
            market_cap: priceInfo.usd_market_cap || null,
            volume_24h: priceInfo.usd_24h_vol || null,
          })
        }
        continue
      }
      
      if (!response.ok) {
        console.error(`[CoinGecko] API error: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      
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
      
      // Rate limit: wait between batches
      if (i + BATCH_SIZE < coingeckoIds.length) {
        await delay(DELAY_MS)
      }
    }
    
    console.log(`[CoinGecko] Returned ${priceMap.size} prices`)
    return priceMap
  } catch (error) {
    console.error('[CoinGecko] Fetch error:', error)
    return priceMap
  }
}

// Fetch US stock prices from Finnhub (60 calls/min limit)
async function fetchUSStockFromFinnhub(symbols: string[]): Promise<Map<string, any>> {
  const apiKey = Deno.env.get('FINNHUB_API_KEY')
  if (!apiKey || symbols.length === 0) return new Map()

  const priceMap = new Map()
  const DELAY_MS = 1100 // ~55 calls/minute to stay safe

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      console.log(`[Finnhub] Fetching ${i + 1}/${symbols.length}: ${symbol}`)
      
      const response = await fetch(url)
      
      if (response.status === 429) {
        console.warn('[Finnhub] Rate limited, waiting 60 seconds...')
        await delay(60000)
        i-- // Retry this symbol
        continue
      }
      
      if (!response.ok) {
        console.error(`[Finnhub] API error for ${symbol}: ${response.status}`)
        continue
      }
      
      const data = await response.json()
      if (data.c && data.c > 0) {
        const changePercent = data.dp || ((data.c - data.pc) / data.pc * 100)
        priceMap.set(symbol, {
          current_price: data.c,
          price_change_24h: changePercent,
          price_change_1h: null,
          price_change_7d: null,
        })
      }
      
      // Rate limit: wait between requests
      if (i < symbols.length - 1) {
        await delay(DELAY_MS)
      }
    } catch (error) {
      console.error(`[Finnhub] Fetch error for ${symbol}:`, error)
    }
  }
  
  console.log(`[Finnhub] Returned ${priceMap.size} prices`)
  return priceMap
}

// Fetch IDX stock prices from FCS API (batch request)
async function fetchIDStockFromFCS(symbols: string[]): Promise<Map<string, any>> {
  const apiKey = Deno.env.get('FCSAPI_API_KEY')
  if (!apiKey || symbols.length === 0) return new Map()

  const priceMap = new Map()
  const BATCH_SIZE = 10 // FCS allows multiple symbols
  const DELAY_MS = 2000

  try {
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE)
      const symbolList = batch.join(',')
      const url = `https://fcsapi.com/api-v3/stock/latest?symbol=${symbolList}&access_key=${apiKey}`
      
      console.log(`[FCS] Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} stocks`)
      
      const response = await fetch(url)
      
      if (response.status === 429) {
        console.warn('[FCS] Rate limited, waiting 60 seconds...')
        await delay(60000)
        i -= BATCH_SIZE // Retry this batch
        continue
      }
      
      if (!response.ok) {
        console.error(`[FCS] API error: ${response.status}`)
        continue
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
      
      // Rate limit: wait between batches
      if (i + BATCH_SIZE < symbols.length) {
        await delay(DELAY_MS)
      }
    }
  } catch (error) {
    console.error('[FCS] Fetch error:', error)
  }
  
  console.log(`[FCS] Returned ${priceMap.size} prices`)
  return priceMap
}

// Fallback: Fetch from Alpha Vantage (5 calls/min limit - very restrictive)
async function fetchFromAlphaVantage(symbol: string): Promise<any | null> {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY')
  if (!apiKey) return null

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    console.log(`[AlphaVantage] Fetching: ${symbol}`)
    
    const response = await fetch(url)
    
    if (response.status === 429) {
      console.warn('[AlphaVantage] Rate limited')
      return null
    }
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    // Check for rate limit message in response
    if (data.Note || data.Information) {
      console.warn('[AlphaVantage] API limit reached:', data.Note || data.Information)
      return null
    }
    
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
    console.error(`[AlphaVantage] Fetch error for ${symbol}:`, error)
  }
  
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('=== Starting price fetch job ===')

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
      console.log('No assets to update')
      return new Response(
        JSON.stringify({ success: true, message: 'No assets to update', duration_ms: Date.now() - startTime }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${assets.length} assets`)

    // Group assets by type
    const cryptoAssets = assets.filter(a => a.asset_type === 'CRYPTO' && a.coingecko_id)
    const usStockAssets = assets.filter(a => a.asset_type === 'STOCK' && a.finnhub_symbol)
    const idStockAssets = assets.filter(a => a.asset_type === 'STOCK' && a.fcs_id)
    const alphaAssets = assets.filter(a => a.alpha_symbol && !a.coingecko_id && !a.finnhub_symbol && !a.fcs_id)

    console.log(`Assets breakdown: ${cryptoAssets.length} crypto, ${usStockAssets.length} US stocks, ${idStockAssets.length} ID stocks, ${alphaAssets.length} Alpha Vantage`)

    // Fetch prices from different sources (sequential to avoid overwhelming APIs)
    const cryptoPrices = await fetchCryptoFromCoinGecko(cryptoAssets.map(a => a.coingecko_id!))
    const usStockPrices = await fetchUSStockFromFinnhub(usStockAssets.map(a => a.finnhub_symbol!))
    const idStockPrices = await fetchIDStockFromFCS(idStockAssets.map(a => a.fcs_id!))

    // Prepare price cache updates
    const priceUpdates: PriceData[] = []

    // Process crypto
    for (const asset of cryptoAssets) {
      const priceInfo = cryptoPrices.get(asset.coingecko_id!)
      if (priceInfo) {
        priceUpdates.push({
          asset_id: asset.id,
          ...priceInfo,
        })
      }
    }

    // Process US stocks
    for (const asset of usStockAssets) {
      const priceInfo = usStockPrices.get(asset.finnhub_symbol!)
      if (priceInfo) {
        priceUpdates.push({
          asset_id: asset.id,
          ...priceInfo,
          market_cap: null,
          volume_24h: null,
        })
      }
    }

    // Process ID stocks
    for (const asset of idStockAssets) {
      const priceInfo = idStockPrices.get(asset.fcs_id!)
      if (priceInfo) {
        priceUpdates.push({
          asset_id: asset.id,
          ...priceInfo,
          market_cap: null,
          volume_24h: null,
        })
      }
    }

    // Process Alpha Vantage (with rate limiting - max 5/min)
    const alphaVantageLimit = 3 // Stay well under limit
    for (let i = 0; i < Math.min(alphaAssets.length, alphaVantageLimit); i++) {
      const asset = alphaAssets[i]
      const priceInfo = await fetchFromAlphaVantage(asset.alpha_symbol!)
      if (priceInfo) {
        priceUpdates.push({
          asset_id: asset.id,
          ...priceInfo,
          market_cap: null,
          volume_24h: null,
        })
      }
      if (i < alphaVantageLimit - 1 && i < alphaAssets.length - 1) {
        await delay(12000) // 5 calls per minute = 12 second delay
      }
    }

    console.log(`Updating ${priceUpdates.length} price entries`)

    // Batch upsert price cache
    if (priceUpdates.length > 0) {
      const updatesWithTimestamp = priceUpdates.map(update => ({
        ...update,
        last_updated: new Date().toISOString(),
      }))

      const { error: upsertError } = await supabase
        .from('price_cache')
        .upsert(updatesWithTimestamp, { onConflict: 'asset_id' })

      if (upsertError) {
        console.error('Error upserting prices:', upsertError)
        throw upsertError
      }
    }

    const duration = Date.now() - startTime
    console.log(`=== Price fetch completed in ${duration}ms ===`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: priceUpdates.length,
        duration_ms: duration,
        breakdown: {
          crypto: cryptoAssets.length,
          us_stocks: usStockAssets.length,
          id_stocks: idStockAssets.length,
          alpha_vantage: Math.min(alphaAssets.length, alphaVantageLimit)
        },
        message: `Updated ${priceUpdates.length} asset prices`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('Price fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, duration_ms: duration }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
