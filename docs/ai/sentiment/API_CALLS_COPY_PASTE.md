# 🔌 API CALLS - Copy Paste Ready

Ini adalah API gratis yang perlu Anda call untuk Market Insight

---

## 1. TECHNICAL DATA - Binance API (FREE)

### Get Bitcoin OHLCV Data (untuk technical analysis)

```
GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=200

Response:
[
  ["1677628800000", "23500", "24000", "23400", "23800", "1250", ...],
  ["1677715200000", "23800", "24200", "23700", "24100", "1350", ...],
  ...
]

Artinya:
- 1677628800000 = timestamp (convert ke date)
- 23500 = open price
- 24000 = high price
- 23400 = low price
- 23800 = close price
- 1250 = volume

Dari sini bisa hitung:
- Moving Averages (MA50, MA200)
- RSI
- MACD
- Volume strength
```

### Get Ethereum OHLCV

```
GET https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1d&limit=200
```

### Get Solana OHLCV

```
GET https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1d&limit=200
```

---

## 2. ON-CHAIN DATA - CoinGecko API (FREE)

### Get Bitcoin On-Chain Metrics

```
GET https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false

Response (bagian penting):
{
  "market_data": {
    "current_price": {
      "usd": 45200
    },
    "market_cap": {
      "usd": 880000000000
    },
    "market_cap_change_24h_in_currency": {
      "usd": 12500000000
    }
  }
}

Dari sini dapat:
- Current price
- Market cap
- Market cap change (momentum)
```

### Get Global Market Data

```
GET https://api.coingecko.com/api/v3/global

Response:
{
  "data": {
    "total_market_cap": {
      "usd": 1500000000000
    },
    "total_volume_24h": {
      "usd": 50000000000
    },
    "btc_dominance": 48.5,
    "ethereum_dominance": 18.2,
    "market_cap_change_percentage_24h": 1.2
  }
}

Dari sini dapat:
- Bitcoin dominance (48.5% = bullish, market healthy)
- Total market cap trend
- Market volume
```

---

## 3. FEAR & GREED INDEX - Alternative.me API (FREE)

### Get Current Fear & Greed Index

```
GET https://api.alternative.me/fng/

Response:
{
  "data": [
    {
      "value": "62",
      "value_classification": "Greed",
      "timestamp": "1677628800",
      "time_until_update": "12345"
    }
  ]
}

Interpretasi:
- value: 62 (dari 0-100)
- classification: "Greed" 
  - 0-25: Extreme Fear
  - 25-45: Fear
  - 45-55: Neutral
  - 55-75: Greed
  - 75-100: Extreme Greed

Ini adalah single number yang mudah digunakan!
```

### Get Historical Fear & Greed

```
GET https://api.alternative.me/fng/?limit=30

Akan dapat last 30 days data untuk trend
```

---

## 4. SOCIAL SENTIMENT - NewsAPI (FREE TIER)

### Get Recent Crypto News

```
GET https://newsapi.org/v2/everything?q=bitcoin&sortBy=publishedAt&language=en&pageSize=20&apiKey=YOUR_FREE_API_KEY

Response:
{
  "articles": [
    {
      "title": "Bitcoin breaks through $45,000",
      "description": "Major cryptocurrency...",
      "url": "https://example.com",
      "publishedAt": "2024-01-30T10:30:00Z",
      "source": {
        "name": "CoinDesk"
      }
    },
    ...
  ]
}

Dari sini bisa:
- Hitung positive/negative words dalam title + description
- Tahu mood berita terbaru (bullish atau bearish)
- Recent news sentiment
```

### Get Ethereum News

```
GET https://newsapi.org/v2/everything?q=ethereum&sortBy=publishedAt&language=en&pageSize=20&apiKey=YOUR_FREE_API_KEY
```

---

## 5. MARKET SENTIMENT - CoinTrendz (Alternatif)

### Get Bitcoin Social Volume

```
Alternatif: Gunakan data dari CoinGecko dengan trending API

GET https://api.coingecko.com/api/v3/search/trending

Response:
{
  "coins": [
    {
      "item": {
        "id": "bitcoin",
        "name": "Bitcoin",
        "symbol": "BTC",
        "market_cap_rank": 1,
        "data": {
          "price_change_percentage_24h": {
            "usd": 2.5
          }
        }
      }
    },
    ...
  ]
}

Digunakan untuk:
- Trending coins (jika BTC trending = high interest)
- Price momentum dari trending API
```

---

## CONTOH IMPLEMENTASI (PSEUDOCODE)

```
SETIAP 5-15 MENIT, LAKUKAN INI:

1. FETCH TECHNICAL DATA
   GET /api/v3/klines (Binance)
   → Hitung: MA50, MA200, RSI, MACD, Volume
   → Score: 0-1

2. FETCH ONCHAIN DATA
   GET /api/v3/coins/bitcoin (CoinGecko)
   GET /api/v3/global (CoinGecko)
   → Hitung: Market cap change, volume momentum
   → Simulasi whale activity dari funding rates
   → Score: 0-1

3. FETCH SOCIAL DATA
   GET /v2/everything (NewsAPI)
   → Count positive/negative words
   → Sentiment score: 0-1

4. FETCH FEAR & GREED
   GET /fng/ (Alternative.me)
   → Langsung dapat value 0-100
   → Convert ke score 0-1 (divide by 100)

5. HITUNG SENTIMENT
   sentiment = (technical×0.30) + (onchain×0.25) + (social×0.25) + (macroF&G×0.20)

6. HITUNG CONFIDENCE
   agreement = % data sources yang agree
   confidence = weighted average dari semua factors

7. GENERATE RECOMMENDATION & SIGNALS
   Based pada: sentiment + confidence + F&G

8. SAVE & DISPLAY
   Store ke database
   Update dashboard real-time
```

---

## SIGN UP / GET API KEYS (SEMUA GRATIS)

| API | Website | Sign Up |
|-----|---------|---------|
| **Binance** | https://www.binance.com | Tidak perlu API key untuk public data |
| **CoinGecko** | https://www.coingecko.com | Tidak perlu API key untuk free tier |
| **Alternative.me** | https://api.alternative.me | Tidak perlu API key |
| **NewsAPI** | https://newsapi.org | Butuh sign up (free tier: 100/day) |

---

## CURL EXAMPLES (Copy-Paste)

### Get BTC Price

```bash
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=5" | jq '.[].4'
```

### Get Fear & Greed Index

```bash
curl -s "https://api.alternative.me/fng/" | jq '.data[0]'
```

### Get Bitcoin Market Data

```bash
curl -s "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false" | jq '.market_data'
```

### Get Global Market

```bash
curl -s "https://api.coingecko.com/api/v3/global" | jq '.data'
```

---

## PYTHON REQUESTS EXAMPLES

### Binance OHLCV

```python
import requests

url = "https://api.binance.com/api/v3/klines"
params = {
    'symbol': 'BTCUSDT',
    'interval': '1d',
    'limit': 200
}

response = requests.get(url, params=params)
data = response.json()

# data adalah list of [time, open, high, low, close, volume, ...]
for candle in data[-5:]:  # Last 5 candles
    timestamp = candle[0]
    close = float(candle[4])
    print(f"Close: ${close}")
```

### Fear & Greed Index

```python
import requests

url = "https://api.alternative.me/fng/"
response = requests.get(url)
data = response.json()

fg_index = data['data'][0]['value']
fg_label = data['data'][0]['value_classification']

print(f"F&G Index: {fg_index} ({fg_label})")
```

### Global Market Data

```python
import requests

url = "https://api.coingecko.com/api/v3/global"
response = requests.get(url)
data = response.json()['data']

btc_dominance = data['btc_dominance']
market_cap_change = data['market_cap_change_percentage_24h']

print(f"BTC Dominance: {btc_dominance}%")
print(f"Market Cap Change: {market_cap_change}%")
```

### Bitcoin Price & Market Data

```python
import requests

url = "https://api.coingecko.com/api/v3/coins/bitcoin"
params = {
    'localization': 'false',
    'tickers': 'false',
    'market_data': 'true'
}

response = requests.get(url, params=params)
data = response.json()

current_price = data['market_data']['current_price']['usd']
market_cap = data['market_data']['market_cap']['usd']

print(f"BTC Price: ${current_price}")
print(f"Market Cap: ${market_cap}")
```

### News Sentiment (dengan NewsAPI)

```python
import requests

url = "https://newsapi.org/v2/everything"
params = {
    'q': 'bitcoin',
    'sortBy': 'publishedAt',
    'language': 'en',
    'pageSize': 20,
    'apiKey': 'YOUR_API_KEY'
}

response = requests.get(url, params=params)
articles = response.json()['articles']

positive_words = ['bull', 'surge', 'moon', 'pump', 'breakout']
negative_words = ['crash', 'dump', 'bear', 'sell', 'down']

for article in articles:
    text = article['title'] + ' ' + article['description']
    text_lower = text.lower()
    
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        sentiment = "POSITIVE"
    elif negative_count > positive_count:
        sentiment = "NEGATIVE"
    else:
        sentiment = "NEUTRAL"
    
    print(f"{article['title']}: {sentiment}")
```

---

## FLOW UNTUK REAL-TIME UPDATE

```
┌──────────────────────────────────────┐
│ Timer: Every 5-15 minutes            │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ 1. Call Binance API                  │
│    Get last 200 days OHLCV data      │
│    Calculate indicators              │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ 2. Call CoinGecko API                │
│    Get market data + price           │
│    Get global dominance              │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ 3. Call Alternative.me API           │
│    Get Fear & Greed Index            │
│    (1 request, very fast)            │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ 4. Call NewsAPI                      │
│    Get recent news                   │
│    Analyze sentiment                 │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ 5. Calculate all scores              │
│    Aggregate sentiment               │
│    Calculate confidence              │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ 6. Generate output                   │
│    Save to database                  │
│    Update dashboard                  │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ Sleep until next interval            │
└──────────────────────────────────────┘
```

---

## RESPONSE TIME EXPECTATIONS

```
Binance API:     ~200ms
CoinGecko API:   ~300ms
Alternative.me:  ~100ms (very fast)
NewsAPI:         ~500ms

Total per cycle: ~1-2 seconds

Jadi bisa run setiap 5-15 menit tanpa masalah!
```

---

## TIPS IMPLEMENTASI

1. **Use Caching**
   - Cache results 5-10 menit
   - Jangan call API setiap detik

2. **Error Handling**
   - Jika API down, gunakan last cached value
   - Log semua errors

3. **Rate Limiting**
   - Binance: 1200 requests/minute (cukup)
   - CoinGecko: No strict limit (generous)
   - Alternative.me: Unlimited

4. **Database**
   - Store setiap update dengan timestamp
   - Keep history untuk historical analysis
   - Backup regularly

5. **Dashboard**
   - Update real-time dengan WebSocket
   - Show trend (arrows untuk up/down)
   - Color coding (green=bullish, red=bearish)

---

**Semua API ini GRATIS dan reliable. Siap pakai!**
