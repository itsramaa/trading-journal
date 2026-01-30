# 📊 AI Macro Analysis - Penjelasan Simple

---

## 1. APA ITU MACRO ANALYSIS?

**Definisi**: Analisis kondisi **ekonomi global & pasar tradisional** yang mempengaruhi crypto & forex.

**Mengapa penting?**: Crypto tidak bergerak sendiri - terpengaruh oleh:
- Kondisi dollar (DXY)
- Performa stock market (S&P 500)
- Interest rates (Treasury yields)
- Volatility/Fear level (VIX)
- Economic data releases (CPI, jobs, etc)

---

## 2. KOMPONEN UTAMA MACRO

### **A. DXY (Dollar Index)**

#### Apa itu?
Index yang mengukur **kekuatan US Dollar** dibanding currency lain.
- DXY naik = Dollar kuat
- DXY turun = Dollar lemah

#### Dari API mana?
**Yahoo Finance / Alpha Vantage (GRATIS)**

#### Interpretasi untuk Crypto:
```
DXY NAIK (dollar strong)
├─ Investor cari "safe haven" (cash/dollar)
├─ Crypto = risky asset, ditinggal
└─ → BEARISH untuk crypto ✗

DXY TURUN (dollar lemah)
├─ Investor cari yield (stocks, crypto)
├─ Crypto = attractive, dibeli
└─ → BULLISH untuk crypto ✓
```

#### Contoh:
```
Skenario 1: DXY -0.15% (turun)
Current DXY: 104.25
Interpretation: Dollar sedikit lemah
Impact: Positif untuk crypto (risk-on)
Weight to macro sentiment: +0.3

Skenario 2: DXY +0.85% (naik)
Current DXY: 105.10
Interpretation: Dollar mulai kuat
Impact: Negatif untuk crypto (risk-off)
Weight to macro sentiment: -0.3
```

---

### **B. S&P 500 (Stock Market)**

#### Apa itu?
Index yang mengukur **performa top 500 companies US**.
- S&P naik = Economy healthy, risk appetite tinggi
- S&P turun = Economy worry, risk appetite rendah

#### Dari API mana?
**Yahoo Finance / Alpha Vantage / TradingView (GRATIS)**

#### Interpretasi untuk Crypto:
```
S&P 500 NAIK (risk-on)
├─ Investor percaya diri dengan ekonomi
├─ Willing to take risk → membeli crypto
└─ → BULLISH untuk crypto ✓

S&P 500 TURUN (risk-off)
├─ Investor khawatir dengan ekonomi
├─ Menghindari risk asset
├─ → BEARISH untuk crypto ✗
```

#### Contoh:
```
Skenario 1: S&P 500 +0.45% (naik)
Current: 5,234.5
Interpretation: Positive day for stocks
Impact: Risk-on sentiment
Weight: +0.3

Skenario 2: S&P 500 -1.50% (turun)
Current: 5,100.0
Interpretation: Negative day, investors worried
Impact: Risk-off sentiment
Weight: -0.4
```

---

### **C. 10Y Treasury Yield**

#### Apa itu?
**Interest rate** yang US government bayar untuk borrow 10 tahun.
- Yield naik = Lebih expensive untuk borrow
- Yield turun = Lebih murah untuk borrow

#### Dari API mana?
**FRED (Federal Reserve) / Alpha Vantage (GRATIS)**

#### Interpretasi untuk Crypto:
```
YIELD NAIK (4.42%)
├─ Borrowing mahal → company earnings turun
├─ Stocks jadi less attractive
├─ Risk assets (crypto) less attractive
└─ → BEARISH untuk crypto ✗

YIELD TURUN (3.50%)
├─ Borrowing murah → company earnings naik
├─ Stocks lebih attractive, crypto attractive
└─ → BULLISH untuk crypto ✓
```

#### Contoh:
```
Skenario 1: 10Y Treasury +0.08% → 4.42%
Interpretation: Rising yields, inflation concern
Impact: Slightly bearish (growth pressure)
Weight: -0.2

Skenario 2: 10Y Treasury -0.25% → 4.00%
Interpretation: Falling yields, easing pressure
Impact: Bullish (easy money environment)
Weight: +0.2
```

---

### **D. VIX (Volatility Index)**

#### Apa itu?
"**Fear Gauge**" yang mengukur market volatility & uncertainty.
- VIX rendah (< 15) = Market calm, complacency
- VIX tinggi (> 25) = Market scared, panic selling

#### Dari API mana?
**Yahoo Finance / Alpha Vantage (GRATIS)**

#### Interpretasi:
```
VIX RENDAH (14.25)
├─ Market terlalu calm, overconfident
├─ Risk: sudden volatility spike
├─ Could trigger sharp selloff
└─ ⚠️ Warning sign (too greedy)

VIX TINGGI (35+)
├─ Market scared, panic selling
├─ But: Fear creates opportunity
├─ Recovery likely when fear subsides
└─ ⚠️ Warning sign (too much fear)

VIX NORMAL (15-25)
├─ Market balanced
├─ Good for trading
└─ ✓ Healthy
```

#### Contoh:
```
Skenario 1: VIX -0.85% → 14.25
Interpretation: Low volatility, complacency
Impact: Market could reverse sharply
Weight: -0.2 (warning, not bullish despite low VIX)

Skenario 2: VIX +2.50% → 18.50
Interpretation: Elevated fear but not panic
Impact: Some caution needed
Weight: -0.3
```

---

## 3. MACRO SENTIMENT SCORE (0-1)

### Cara menghitung:

Kombinasikan semua 4 metric dengan weight:

```
Macro_Sentiment = (DXY×0.25) + (SPX×0.30) + (Treasury×0.25) + (VIX×0.20)
                  (negative)   (positive)   (negative)      (fear gauge)

Normalisasi setiap metric ke 0-1 scale:

DXY:
  - Turun = bullish = +score
  - Naik = bearish = -score
  - Change: -0.15% → +0.3 score
  
SPX:
  - Naik = bullish = +score
  - Turun = bearish = -score
  - Change: +0.45% → +0.4 score

Treasury:
  - Naik = bearish = -score
  - Turun = bullish = +score
  - Change: +0.08% → -0.2 score

VIX:
  - Rendah (<15) = warning = -score (complacency)
  - Tinggi (>30) = warning = -score (panic)
  - Normal (15-25) = good = +0.5 score
  - Change: -0.85% (more complacency) → -0.3 score
```

### Contoh Calculation:

```
Current Market State:
- DXY: -0.15% (turun, bullish) → Score: +0.55
- S&P 500: +0.45% (naik, bullish) → Score: +0.65
- 10Y Treasury: +0.08% (naik, bearish) → Score: -0.30
- VIX: 14.25 (rendah, complacency warning) → Score: -0.40

═══════════════════════════════════════════════════════════════
Macro_Sentiment = (0.55×0.25) + (0.65×0.30) + (-0.30×0.25) + (-0.40×0.20)
                = 0.1375 + 0.195 - 0.075 - 0.08
                = 0.1775

Convert ke 0-1: Add 0.5 baseline
Final Score: 0.1775 + 0.5 = 0.6775

Interpretation: CAUTIOUS (slightly positive tapi with warnings)
Label: "Market Sentiment: Cautious"
```

---

## 4. MARKET SENTIMENT LABEL (Macro)

### Output Labels:

```
Score > 0.65
→ "Risk-On" atau "Bullish"
   (Investor optimistic)

0.45 - 0.65
→ "Cautious" atau "Mixed"
   (Some optimism but with caution)

Score < 0.45
→ "Risk-Off" atau "Bearish"
   (Investor pessimistic)
```

### Contoh Output:

```
Current Macro Sentiment: CAUTIOUS

Reasoning:
✓ DXY lemah (bullish for crypto)
✓ S&P 500 naik (risk-on sentiment)
✗ Treasury yield naik (inflation concern)
⚠️ VIX rendah (complacency, warning sign)

Overall: Mixed signals, hence "Cautious"
```

---

## 5. AI ANALYSIS SUMMARY

### Apa isinya?

**Text summary** yang explain kondisi macro saat ini:

```
"Market sedang dalam fase konsolidasi dengan sentimen mixed. 
DXY melemah sedikit yang mendukung aset berisiko, namun yield 
treasury naik menandakan kekhawatiran inflasi. VIX rendah 
menunjukkan potensi volatilitas mendadak. 

Perhatikan CPI release hari ini yang bisa memicu pergerakan 
signifikan."
```

### Cara generate:

**Template-based + Data-driven:**

```
1. Start dengan base template:
   "Market sedang dalam fase [consolidation/rally/decline] 
    dengan sentimen [bullish/bearish/mixed]."

2. Add kondisi masing-masing metric:
   "DXY melemah [+X%] yang [mendukung/mengganggu] aset risiko"
   "S&P naik [+X%] menunjukkan [optimisme/kekhawatiran]"
   "Yield treasury [naik/turun] [X%] menandakan [...]"
   "VIX [naik/turun] ke [level] menunjukkan [complacency/fear]"

3. Add warning untuk economic data:
   "Perhatikan [CPI/Jobs/FED] release hari ini 
    yang bisa memicu volatilitas [signifikan/moderate]"

4. Combine semua dalam paragraf coherent
```

---

## 6. HIGH-IMPACT EVENT (Economic Calendar)

### Apa itu?

**Jadwal data releases** yang bisa gerak market significantly.

### Dari API mana?

**Investing.com / Trading Economics (GRATIS)**

```
GET https://api.tradingeconomics.com/calendar

Returns:
[
  {
    "event": "US CPI",
    "date": "2026-01-31",
    "time": "14:30 UTC",
    "importance": "High",
    "forecast": 2.5,
    "previous": 2.4
  },
  {
    "event": "Fed Funds Rate",
    "date": "2026-02-05",
    "importance": "High",
    ...
  }
]
```

### Interpretasi:

```
HIGH-IMPACT EVENT HARI INI:
├─ CPI Release (Consumer Price Index)
│  ├─ Time: 14:30 UTC
│  ├─ Previous: 2.4%
│  ├─ Forecast: 2.5%
│  └─ → Jika actual > forecast = bearish (inflation rising)
│     → Jika actual < forecast = bullish (inflation cooling)

├─ Job Numbers (Employment)
│  ├─ Could trigger sharp moves
│  └─ Usually volatility increases

└─ Fed Announcement (Interest Rate)
   ├─ Major market mover
   └─ Affects everything
```

### Output:

```
"High-impact event today: 
 US CPI release at 14:30 UTC may cause significant volatility"
```

---

## 7. COMPLETE MACRO FLOW

```
┌──────────────────────────────────────────┐
│ MACRO ANALYSIS FLOW (Every hour)         │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 1. Fetch DXY data (Yahoo Finance)        │
│    Calculate: change %, score 0-1        │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 2. Fetch S&P 500 data (Yahoo Finance)    │
│    Calculate: change %, score 0-1        │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 3. Fetch 10Y Treasury yield (FRED API)   │
│    Calculate: change, score 0-1          │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 4. Fetch VIX data (Yahoo Finance)        │
│    Calculate: level, score 0-1           │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 5. Calculate Macro Sentiment Score       │
│    = Weighted average dari 4 metrics     │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 6. Determine Sentiment Label              │
│    RISK-ON / CAUTIOUS / RISK-OFF         │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 7. Generate AI Analysis Summary          │
│    (Template + data-driven text)         │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 8. Check Economic Calendar               │
│    (Investing.com / Trading Economics)   │
│    → "High-impact event: CPI at 14:30"  │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ 9. OUTPUT FINAL MACRO ANALYSIS           │
│    Save to DB, update dashboard          │
└──────────────────────────────────────────┘
```

---

## 8. CONTOH REAL OUTPUT

```
╔═══════════════════════════════════════════════════════════╗
║            AI MACRO ANALYSIS REPORT                       ║
╚═══════════════════════════════════════════════════════════╝

⏰ Time: 2026-01-30 10:30 UTC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 MARKET SENTIMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: CAUTIOUS

Breakdown:
├─ Risk Appetite: MIXED
├─ Dollar Strength: WEAK (supportive for risk assets)
├─ Growth Concern: MODERATE (rising yields)
└─ Volatility: LOW (complacency warning)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💱 DXY (Dollar Index)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Change:  -0.15%
Level:   104.25
Signal:  WEAKER DOLLAR ✓

Interpretation:
Weak dollar is typically bullish for crypto and other 
risk assets. Investors prefer yielding assets over cash.

Impact on Crypto: POSITIVE (+0.3)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 S&P 500
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Change:  +0.45%
Level:   5,234.5
Signal:  RISK-ON ✓

Interpretation:
Stock market gaining, indicating risk appetite is healthy.
Investors willing to take on risk, which benefits crypto.

Impact on Crypto: POSITIVE (+0.4)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 10Y Treasury Yield
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Change:  +0.08%
Level:   4.42%
Signal:  RISING YIELDS ⚠️

Interpretation:
Rising yields suggest concerns about inflation or 
Fed keeping rates higher for longer. This pressures 
growth stocks and could impact risk appetite.

Impact on Crypto: NEGATIVE (-0.2)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😨 VIX (Volatility Index)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Change:  -0.85%
Level:   14.25
Signal:  LOW VOLATILITY ⚠️

Interpretation:
VIX is very low (< 15), indicating market complacency.
This often precedes sudden volatility spikes and sharp
market corrections. Investors may be underestimating risk.

Impact on Crypto: CAUTION (-0.3)
                  (not bullish despite low fear)

═══════════════════════════════════════════════════════════

OVERALL MACRO SENTIMENT: 0.677 → CAUTIOUS

Summary of Analysis:
────────────────────

Market sedang dalam fase konsolidasi dengan sentimen mixed. 
DXY melemah sedikit yang mendukung aset berisiko, namun yield 
treasury naik menandakan kekhawatiran inflasi. VIX rendah 
menunjukkan potensi volatilitas mendadak.

Kesimpulannya: Situasi ambiguous. Ada supportive factors 
(weak dollar, rising stocks) tapi juga warning signs 
(rising yields, VIX complacency). Investors should stay 
vigilant.

═══════════════════════════════════════════════════════════

📅 ECONOMIC CALENDAR - TODAY
═══════════════════════════════════════════════════════════

High-Impact Events:
─────────────────

1. 🔴 US CPI Release (Consumer Price Index)
   Time:     14:30 UTC
   Previous: 2.4%
   Forecast: 2.5%
   Impact:   HIGH
   
   → If actual > 2.5%: Bearish (inflation concern)
   → If actual < 2.5%: Bullish (inflation cooling)
   → Either way: Expect volatility

2. 🟡 Initial Jobless Claims
   Time:     13:30 UTC
   Previous: 205,000
   Forecast: 210,000
   Impact:   MODERATE
   
   → Monitor for employment health

═══════════════════════════════════════════════════════════

💡 IMPACT ON CRYPTO
═══════════════════════════════════════════════════════════

Overall Macro Environment for Crypto:
✓ Weak dollar (good)
✓ Risk-on sentiment (good)
✗ Rising yields (concern)
⚠️ VIX complacency (warning)

Conclusion: CAUTIOUSLY BULLISH with elevated warning
Expected impact on BTC: Moderate bullish bias but watch 
for sharp reversals if CPI surprises.

═══════════════════════════════════════════════════════════
```

---

## 9. API GRATIS UNTUK MACRO ANALYSIS

| Komponen | API | Free? | Endpoint |
|----------|-----|-------|----------|
| **DXY** | Yahoo Finance | ✅ | `/v7/finance/quote?symbols=DX-Y.NYB` |
| | Alpha Vantage | ✅ | `/query?function=FX_DAILY` |
| **S&P 500** | Yahoo Finance | ✅ | `/v7/finance/quote?symbols=%5EGSPC` |
| | Alpha Vantage | ✅ | `/query?function=GLOBAL_QUOTE` |
| **10Y Treasury** | FRED (Federal Reserve) | ✅ | `/series/DGS10` |
| **VIX** | Yahoo Finance | ✅ | `/v7/finance/quote?symbols=%5EVIX` |
| | IVolatility | ✅ | `/get_vix` |
| **Economic Calendar** | Trading Economics | ✅ | `/calendar` |
| | Investing.com | ⚠️ Limited | Requires scraping |

---

## 10. PYTHON EXAMPLES (Simple)

### Get DXY Data

```python
import requests
import pandas as pd

def get_dxy():
    url = "https://query1.finance.yahoo.com/v7/finance/quote"
    params = {
        'symbols': 'DX-Y.NYB',  # DXY symbol
        'fields': 'regularMarketPrice,regularMarketChange,regularMarketChangePercent'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    quote = data['quoteResponse']['result'][0]
    
    return {
        'price': quote['regularMarketPrice'],
        'change': quote['regularMarketChange'],
        'change_percent': quote['regularMarketChangePercent']
    }

# Usage
dxy = get_dxy()
print(f"DXY: {dxy['price']} ({dxy['change_percent']}%)")
```

### Get S&P 500 Data

```python
def get_sp500():
    url = "https://query1.finance.yahoo.com/v7/finance/quote"
    params = {
        'symbols': '^GSPC',  # S&P 500 symbol
        'fields': 'regularMarketPrice,regularMarketChange,regularMarketChangePercent'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    quote = data['quoteResponse']['result'][0]
    
    return {
        'price': quote['regularMarketPrice'],
        'change': quote['regularMarketChange'],
        'change_percent': quote['regularMarketChangePercent']
    }

# Usage
sp500 = get_sp500()
print(f"S&P 500: {sp500['price']} ({sp500['change_percent']}%)")
```

### Get 10Y Treasury Yield

```python
def get_10y_treasury():
    # Using FRED API (Federal Reserve)
    url = "https://api.stlouisfed.org/fred/series/DGS10/observations"
    params = {
        'api_key': 'YOUR_FREE_API_KEY',  # Get from fred.stlouisfed.org
        'limit': 1,
        'sort_order': 'desc'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    latest = data['observations'][0]
    
    return {
        'yield': float(latest['value']),
        'date': latest['date']
    }

# Usage
treasury = get_10y_treasury()
print(f"10Y Treasury: {treasury['yield']}%")
```

### Get VIX Data

```python
def get_vix():
    url = "https://query1.finance.yahoo.com/v7/finance/quote"
    params = {
        'symbols': '^VIX',  # VIX symbol
        'fields': 'regularMarketPrice,regularMarketChange,regularMarketChangePercent'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    quote = data['quoteResponse']['result'][0]
    
    return {
        'level': quote['regularMarketPrice'],
        'change': quote['regularMarketChange'],
        'change_percent': quote['regularMarketChangePercent']
    }

# Usage
vix = get_vix()
print(f"VIX: {vix['level']} ({vix['change_percent']}%)")
```

### Calculate Macro Sentiment

```python
def calculate_macro_sentiment(dxy, sp500, treasury, vix):
    """
    Calculate macro sentiment score (0-1)
    """
    
    # Normalize each metric (convert to -1 to +1, then to 0-1)
    
    # DXY: turun = bullish, naik = bearish
    dxy_score = 0.5 - (dxy['change_percent'] * 0.5)  # inverted
    
    # S&P 500: naik = bullish, turun = bearish
    spx_score = 0.5 + (sp500['change_percent'] * 0.5)
    
    # Treasury: naik = bearish, turun = bullish
    # Assume change in basis points (let's say +0.08 means up)
    treasury_change = -0.08  # make it negative if up
    treasury_score = 0.5 + (treasury_change * 2)
    
    # VIX: terlalu rendah (<15) atau terlalu tinggi (>30) = warning
    if vix['level'] < 15:
        vix_score = 0.3  # complacency warning
    elif vix['level'] > 30:
        vix_score = 0.3  # fear warning
    else:
        vix_score = 0.5 + (20 - vix['level']) * 0.02
    
    # Weighted average
    macro_sentiment = (dxy_score * 0.25) + (spx_score * 0.30) + \
                      (treasury_score * 0.25) + (vix_score * 0.20)
    
    # Clamp to 0-1
    macro_sentiment = max(0, min(1, macro_sentiment))
    
    # Determine label
    if macro_sentiment > 0.65:
        label = "Risk-On"
    elif macro_sentiment < 0.45:
        label = "Risk-Off"
    else:
        label = "Cautious"
    
    return {
        'score': macro_sentiment,
        'label': label,
        'components': {
            'dxy': dxy_score,
            'sp500': spx_score,
            'treasury': treasury_score,
            'vix': vix_score
        }
    }

# Usage
dxy = get_dxy()
sp500 = get_sp500()
treasury = get_10y_treasury()
vix = get_vix()

macro = calculate_macro_sentiment(dxy, sp500, treasury, vix)
print(f"Macro Sentiment: {macro['label']} (Score: {macro['score']:.2f})")
```

---

## 11. INTEGRATION DENGAN CRYPTO SENTIMENT

```
Crypto Sentiment (dari sebelumnya):
Score: 0.678 (BULLISH)
Confidence: 78%

Macro Sentiment (baru):
Score: 0.677 (CAUTIOUS)

═════════════════════════════════════════════════════════

COMBINED ANALYSIS:

Crypto sentiment BULLISH ✓
BUT Macro sentiment CAUTIOUS ⚠️

Interpretasi:
"Crypto technicals and sentiment are bullish, BUT macro 
environment is mixed. This suggests upside potential BUT 
vulnerable to macro shocks (CPI, Fed news, etc).

Recommendation: Buy but with caution, use tight stops."
```

---

## 📋 CHECKLIST UNTUK MACRO IMPLEMENTATION

```
☐ Data Collection
  ☐ DXY from Yahoo Finance API
  ☐ S&P 500 from Yahoo Finance API
  ☐ 10Y Treasury from FRED API
  ☐ VIX from Yahoo Finance API

☐ Scoring System
  ☐ Normalize DXY (inverse: down = positive)
  ☐ Normalize S&P 500 (up = positive)
  ☐ Normalize Treasury (down = positive, up = negative)
  ☐ Normalize VIX (extreme levels = warning)
  ☐ Weight all 4 metrics

☐ Sentiment Label
  ☐ Score > 0.65 = "Risk-On"
  ☐ Score 0.45-0.65 = "Cautious"
  ☐ Score < 0.45 = "Risk-Off"

☐ AI Analysis Summary
  ☐ Template for text generation
  ☐ Data-driven insights
  ☐ Warning signals

☐ Economic Calendar
  ☐ Integration with Trading Economics API
  ☐ Fetch high-impact events for today
  ☐ Display time, importance, impact

☐ Output
  ☐ Dashboard display
  ☐ JSON export
  ☐ Historical tracking

☐ Integration with Crypto
  ☐ Combine macro + crypto sentiment
  ☐ Joint recommendation
```

---

**Semua API GRATIS dan siap digunakan!**

**Update setiap 1-2 jam (tidak perlu frequent seperti crypto sentiment)**
