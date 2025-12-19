import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HistoricalPrice {
  date: string
  price: number
}

// Fetch crypto historical prices from CoinGecko
async function fetchCryptoHistory(coingeckoId: string, days: number): Promise<HistoricalPrice[]> {
  const apiKey = Deno.env.get('COINGECKO_API_KEY')
  if (!apiKey) {
    console.error('[CoinGecko] API key not configured')
    return []
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}&x_cg_demo_api_key=${apiKey}`
    console.log(`[CoinGecko] Fetching ${days} days history for ${coingeckoId}`)
    
    const response = await fetch(url)
    
    if (response.status === 429) {
      console.warn('[CoinGecko] Rate limited')
      return []
    }
    
    if (!response.ok) {
      console.error(`[CoinGecko] API error: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    
    if (!data.prices || !Array.isArray(data.prices)) {
      console.error('[CoinGecko] Invalid response format')
      return []
    }
    
    // Transform to our format - prices is array of [timestamp, price]
    const prices: HistoricalPrice[] = data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString(),
      price: price,
    }))
    
    console.log(`[CoinGecko] Returned ${prices.length} price points`)
    return prices
  } catch (error) {
    console.error('[CoinGecko] Fetch error:', error)
    return []
  }
}

// Fetch stock historical prices from Alpha Vantage
async function fetchStockHistory(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<HistoricalPrice[]> {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY')
  if (!apiKey) {
    console.error('[AlphaVantage] API key not configured')
    return []
  }

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${apiKey}`
    console.log(`[AlphaVantage] Fetching daily history for ${symbol}`)
    
    const response = await fetch(url)
    
    if (response.status === 429) {
      console.warn('[AlphaVantage] Rate limited')
      return []
    }
    
    if (!response.ok) {
      console.error(`[AlphaVantage] API error: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    
    // Check for rate limit message
    if (data.Note || data.Information) {
      console.warn('[AlphaVantage] API limit reached:', data.Note || data.Information)
      return []
    }
    
    const timeSeries = data['Time Series (Daily)']
    if (!timeSeries) {
      console.error('[AlphaVantage] No time series data in response')
      return []
    }
    
    // Transform to our format
    const prices: HistoricalPrice[] = Object.entries(timeSeries)
      .map(([date, values]: [string, any]) => ({
        date: new Date(date).toISOString(),
        price: parseFloat(values['4. close']),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    console.log(`[AlphaVantage] Returned ${prices.length} price points`)
    return prices
  } catch (error) {
    console.error('[AlphaVantage] Fetch error:', error)
    return []
  }
}

// Convert timeframe to CoinGecko days parameter
function timeframeToDays(timeframe: string): number {
  switch (timeframe) {
    case '1H': return 1 // CoinGecko minimum is 1 day, will filter later
    case '24H': return 1
    case '7D': return 7
    case '1M': return 30
    case '3M': return 90
    case '1Y': return 365
    case 'ALL': return 1825 // 5 years max
    default: return 30
  }
}

// Filter prices based on timeframe
function filterByTimeframe(prices: HistoricalPrice[], timeframe: string): HistoricalPrice[] {
  if (prices.length === 0) return []
  
  const now = new Date()
  let cutoffTime: Date
  
  switch (timeframe) {
    case '1H':
      cutoffTime = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case '24H':
      cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7D':
      cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '1M':
      cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '3M':
      cutoffTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '1Y':
      cutoffTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      return prices
  }
  
  return prices.filter(p => new Date(p.date) >= cutoffTime)
}

// Downsample prices to reduce data points for performance
function downsamplePrices(prices: HistoricalPrice[], maxPoints: number = 100): HistoricalPrice[] {
  if (prices.length <= maxPoints) return prices
  
  const step = Math.ceil(prices.length / maxPoints)
  const downsampled: HistoricalPrice[] = []
  
  for (let i = 0; i < prices.length; i += step) {
    downsampled.push(prices[i])
  }
  
  // Always include the last point
  if (downsampled[downsampled.length - 1] !== prices[prices.length - 1]) {
    downsampled.push(prices[prices.length - 1])
  }
  
  return downsampled
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol, timeframe = '1M' } = await req.json()
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ success: false, error: 'Symbol is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`=== Fetching price history for ${symbol}, timeframe: ${timeframe} ===`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find asset by symbol
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .maybeSingle()

    if (assetError) {
      console.error('Error fetching asset:', assetError)
      throw assetError
    }

    if (!asset) {
      return new Response(
        JSON.stringify({ success: false, error: 'Asset not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    let prices: HistoricalPrice[] = []
    const days = timeframeToDays(timeframe)

    // Determine which API to use based on asset type
    if (asset.asset_type === 'CRYPTO' && asset.coingecko_id) {
      prices = await fetchCryptoHistory(asset.coingecko_id, days)
    } else if ((asset.asset_type === 'US_STOCK' || asset.asset_type === 'ID_STOCK') && asset.alpha_symbol) {
      // Use full output for longer timeframes
      const outputSize = days > 100 ? 'full' : 'compact'
      prices = await fetchStockHistory(asset.alpha_symbol, outputSize)
      // Filter to requested timeframe since Alpha Vantage always returns full history
      prices = filterByTimeframe(prices, timeframe)
    } else if (asset.finnhub_symbol) {
      // Fallback: try Alpha Vantage with Finnhub symbol
      const outputSize = days > 100 ? 'full' : 'compact'
      prices = await fetchStockHistory(asset.finnhub_symbol, outputSize)
      prices = filterByTimeframe(prices, timeframe)
    }

    // Downsample for performance
    const maxPoints = timeframe === '1H' || timeframe === '24H' ? 50 : 100
    const downsampledPrices = downsamplePrices(prices, maxPoints)

    console.log(`=== Returning ${downsampledPrices.length} price points ===`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        symbol: asset.symbol,
        asset_type: asset.asset_type,
        timeframe,
        prices: downsampledPrices,
        count: downsampledPrices.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Price history fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
