# 📅 ECONOMIC CALENDAR API - OPSI GRATIS LENGKAP

---

## 1. ECONOMIC CALENDAR API YANG FREE

### ✅ OPTION 1: Trading Economics API (BEST FREE OPTION)

**Website**: https://tradingeconomics.com/

**Free Plan Available**: YES ⭐⭐⭐⭐⭐

**API Endpoint**:
```
https://api.tradingeconomics.com/calendar?c=ALL
```

**No API Key Needed**: YES (tapi ada limits)

**Apa yang bisa diakses**:
```
✓ Economic events (CPI, Jobs, GDP, etc)
✓ Release date & time
✓ Previous value
✓ Forecast value
✓ Actual value (setelah release)
✓ Importance level (High/Medium/Low)
✓ Impact (Positive/Negative/Neutral)
✓ Updated in real-time
✓ UNLIMITED requests (tanpa API key)
```

**Python Example**:
```python
import requests
import pandas as pd

def get_economic_calendar():
    """
    Fetch economic calendar dari Trading Economics
    GRATIS, NO API KEY NEEDED
    """
    
    url = "https://api.tradingeconomics.com/calendar"
    
    params = {
        'c': 'ALL',  # All countries
        'calendarType': 'events'
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    return df

# Usage
calendar = get_economic_calendar()
print(calendar.head(10))

# Output example:
# date            country  event              forecast  previous  actual
# 2026-01-30      USA     CPI                 2.5       2.4       2.6
# 2026-01-30      USA     Initial Jobless     210000    205000    215000
# 2026-01-31      USA     Personal Income     0.3       0.2       0.4
```

**Response Example**:
```json
[
  {
    "date": "2026-01-30",
    "dateFormatted": "Jan 30, 2026 2:30 PM",
    "event": "Core CPI m/m",
    "country": "United States",
    "importance": "high",
    "forecast": "0.3%",
    "previous": "0.2%",
    "actual": "0.4%",
    "revision": "",
    "URL": "https://tradingeconomics.com/united-states/core-inflation-mom"
  },
  {
    "date": "2026-01-30",
    "dateFormatted": "Jan 30, 2026 1:30 PM",
    "event": "Initial Jobless Claims",
    "country": "United States",
    "importance": "high",
    "forecast": "210000",
    "previous": "205000",
    "actual": "215000",
    "URL": "https://tradingeconomics.com/united-states/jobless-claims"
  }
]
```

**Keuntungan**:
- ✓ 100% FREE
- ✓ Unlimited requests
- ✓ No API key needed
- ✓ Real-time updates
- ✓ High & low impact events
- ✓ All countries
- ✓ Most reliable

**Kelemahan**:
- ✗ Dokumentasi bisa lebih baik
- ✗ API terkadang lambat
- ✗ Tidak resmi (scraping based)

**Verdict**: BEST OPTION ⭐⭐⭐⭐⭐

---

### ✅ OPTION 2: Investing.com API (GRATIS)

**Website**: https://www.investing.com/

**Free Plan Available**: YES (Limited)

**No API Key**: Mostly YES (untuk basic data)

**Cara akses**:
```python
import requests
from bs4 import BeautifulSoup

def get_investing_calendar():
    """
    Fetch dari investing.com calendar
    Scraping based (no official API)
    """
    
    url = "https://www.investing.com/economic-calendar/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Parse calendar table
    events = []
    table = soup.find('table', {'class': 'calendarTable'})
    
    if table:
        for row in table.findAll('tr'):
            cells = row.findAll('td')
            if len(cells) >= 5:
                event = {
                    'time': cells[0].text.strip(),
                    'country': cells[1].text.strip(),
                    'event': cells[2].text.strip(),
                    'importance': cells[3].find('span', {'class': 'icon'})['title'] if cells[3].find('span', {'class': 'icon'}) else 'N/A',
                    'forecast': cells[4].text.strip(),
                    'previous': cells[5].text.strip() if len(cells) > 5 else 'N/A'
                }
                events.append(event)
    
    return events

# Usage
events = get_investing_calendar()
for event in events[:5]:
    print(event)
```

**Keuntungan**:
- ✓ FREE
- ✓ Real-time
- ✓ High impact events highlighted

**Kelemahan**:
- ✗ Scraping based (unstable)
- ✗ Bisa di-block oleh Cloudflare
- ✗ Parsing kompleks
- ✗ Not official

**Verdict**: Backup option (unstable)

---

### ✅ OPTION 3: FRED API (Federal Reserve - GRATIS)

**Website**: https://fred.stlouisfed.org/

**Free Plan Available**: YES ⭐⭐⭐⭐

**API Key Required**: YES (free signup)

**Apa yang bisa diakses**:
```
✓ US Economic data (CPI, Jobs, GDP, etc)
✓ Historical data
✓ Real-time updates
✓ Release dates
✓ Data series IDs untuk 500,000+ indicators
```

**Get Free API Key**:
```
1. Go to: https://fred.stlouisfed.org/docs/api/fred/
2. Click "Request API Key"
3. Email verification
4. Get instant API key
```

**Python Example**:
```python
import requests

def get_fred_calendar_data(api_key):
    """
    Get economic data dari FRED
    """
    
    # Popular economic indicators
    indicators = {
        'CPI': 'CPIAUCSL',           # Consumer Price Index
        'UNEMPLOYMENT': 'UNRATE',     # Unemployment Rate
        'PAYROLL': 'PAYEMS',          # Total Nonfarm Payroll
        'RETAIL': 'RSXFS',            # Retail Sales
        'GDP': 'A191RA1Q225SBEA',     # GDP
        'PPI': 'PPIACO',              # Producer Price Index
    }
    
    base_url = "https://api.stlouisfed.org/fred/series/observations"
    
    results = {}
    
    for name, series_id in indicators.items():
        params = {
            'series_id': series_id,
            'api_key': api_key,
            'limit': 1,
            'sort_order': 'desc'
        }
        
        response = requests.get(base_url, params=params)
        data = response.json()
        
        if data['observations']:
            latest = data['observations'][0]
            results[name] = {
                'date': latest['date'],
                'value': latest['value']
            }
    
    return results

# Usage
api_key = 'YOUR_FREE_FRED_API_KEY'
data = get_fred_calendar_data(api_key)
print(data)

# Output:
# {
#   'CPI': {'date': '2026-01-31', 'value': '322.123'},
#   'UNEMPLOYMENT': {'date': '2026-01-31', 'value': '3.9'},
#   'PAYROLL': {'date': '2026-01-31', 'value': '158.2'}
# }
```

**Keuntungan**:
- ✓ Official (Federal Reserve)
- ✓ FREE API key
- ✓ Unlimited requests
- ✓ Historical data
- ✓ Very reliable

**Kelemahan**:
- ✗ Only US economic data
- ✗ Not a proper "calendar" (tapi data tersedia)
- ✗ Delayed data (not real-time releases)

**Verdict**: Good untuk historical data, tapi bukan real-time calendar

---

### ⭐ OPTION 4: CoinGecko API (Market Events)

**Website**: https://www.coingecko.com/

**Free Plan**: YES

**Apa yang bisa diakses**:
```
✗ Tidak ada economic calendar
✓ TAPI ada: Crypto events & releases
✓ Platform updates
✓ Listing events
```

**Not suitable untuk macro economics calendar**

---

## 2. COMPARISON TABLE

| API | Free | No Key | Real-time | Coverage | Reliability | Recommended |
|-----|------|--------|-----------|----------|-------------|-------------|
| **Trading Economics** | ✓ | ✓ | ✓ | Global | ⭐⭐⭐⭐⭐ | **YES** ⭐ |
| **FRED** | ✓ | ⚠️ | ✗ | US only | ⭐⭐⭐⭐⭐ | Yes (data) |
| **Investing.com** | ✓ | ✓ | ✓ | Global | ⭐⭐⭐ | No (unstable) |
| **Yahoo Finance** | ✓ | ✓ | ✓ | Partial | ⭐⭐⭐ | Limited |

---

## 3. BEST SOLUTION: TRADING ECONOMICS API

Karena **Trading Economics API** adalah yang terbaik untuk economic calendar, berikut implementasinya:

### Full Implementation:

```python
import requests
import pandas as pd
from datetime import datetime, timedelta

class EconomicCalendar:
    """
    Economic Calendar tracker menggunakan Trading Economics API
    FREE, NO API KEY NEEDED
    """
    
    def __init__(self):
        self.base_url = "https://api.tradingeconomics.com/calendar"
        self.high_impact_keywords = [
            'CPI', 'GDP', 'Employment', 'Jobless', 'Inflation',
            'Fed', 'Interest Rate', 'Unemployment', 'Payroll',
            'Manufacturing', 'Consumer', 'Retail Sales'
        ]
    
    def get_all_events(self):
        """Get semua economic events"""
        
        try:
            response = requests.get(self.base_url, params={'c': 'ALL'})
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching calendar: {e}")
            return []
    
    def get_high_impact_events(self):
        """Filter hanya high-impact events"""
        
        all_events = self.get_all_events()
        high_impact = []
        
        for event in all_events:
            # Check importance
            if event.get('importance') == 'high':
                high_impact.append(event)
        
        return high_impact
    
    def get_events_today(self):
        """Get events yang akan release hari ini"""
        
        today = datetime.now().strftime('%Y-%m-%d')
        all_events = self.get_all_events()
        
        today_events = [
            event for event in all_events
            if event.get('date', '').startswith(today) and event.get('importance') == 'high'
        ]
        
        return sorted(today_events, key=lambda x: x.get('date', ''))
    
    def get_events_this_week(self):
        """Get events minggu ini"""
        
        today = datetime.now()
        week_end = today + timedelta(days=7)
        
        all_events = self.get_all_events()
        week_events = []
        
        for event in all_events:
            event_date = datetime.strptime(event.get('date', '')[:10], '%Y-%m-%d')
            
            if today <= event_date <= week_end and event.get('importance') == 'high':
                week_events.append(event)
        
        return sorted(week_events, key=lambda x: x.get('date', ''))
    
    def get_us_events(self):
        """Get hanya US economic events (most impactful)"""
        
        all_events = self.get_all_events()
        us_events = [
            event for event in all_events
            if 'United States' in event.get('country', '') and 
            event.get('importance') == 'high'
        ]
        
        return us_events
    
    def get_event_by_name(self, event_name):
        """Get event tertentu by name"""
        
        all_events = self.get_all_events()
        
        matching = [
            event for event in all_events
            if event_name.lower() in event.get('event', '').lower()
        ]
        
        return matching
    
    def format_event(self, event):
        """Format event untuk display"""
        
        return {
            'date': event.get('date', 'N/A'),
            'time': event.get('dateFormatted', 'N/A'),
            'country': event.get('country', 'N/A'),
            'event': event.get('event', 'N/A'),
            'importance': event.get('importance', 'N/A'),
            'forecast': event.get('forecast', 'N/A'),
            'previous': event.get('previous', 'N/A'),
            'actual': event.get('actual', 'N/A'),
            'impact': self.determine_impact(event)
        }
    
    def determine_impact(self, event):
        """Determine impact: High/Medium/Low"""
        
        actual = event.get('actual', '')
        forecast = event.get('forecast', '')
        previous = event.get('previous', '')
        
        if not actual or actual == '':
            return 'PENDING'
        
        # Simple impact determination
        if actual > forecast:
            return 'BEAT_FORECAST'
        elif actual < forecast:
            return 'MISSED_FORECAST'
        else:
            return 'MET_FORECAST'
    
    def get_dataframe(self, events):
        """Convert to pandas DataFrame"""
        
        formatted = [self.format_event(e) for e in events]
        return pd.DataFrame(formatted)
    
    def display_events(self, events, limit=10):
        """Display events nicely"""
        
        print("=" * 100)
        print("ECONOMIC CALENDAR")
        print("=" * 100)
        
        for i, event in enumerate(events[:limit], 1):
            formatted = self.format_event(event)
            print(f"\n{i}. {formatted['event']}")
            print(f"   Date: {formatted['time']}")
            print(f"   Country: {formatted['country']}")
            print(f"   Forecast: {formatted['forecast']}")
            print(f"   Previous: {formatted['previous']}")
            print(f"   Actual: {formatted['actual']}")
            print(f"   Impact: {formatted['impact']}")

# Usage Examples:

# Initialize
calendar = EconomicCalendar()

# Get all high-impact events
print("HIGH-IMPACT EVENTS:")
high_impact = calendar.get_high_impact_events()
calendar.display_events(high_impact, limit=20)

# Get events today
print("\nTODAY'S EVENTS:")
today_events = calendar.get_events_today()
calendar.display_events(today_events)

# Get US events
print("\nUS EVENTS THIS WEEK:")
us_events = calendar.get_us_events()
calendar.display_events(us_events, limit=15)

# Get specific event (CPI)
print("\nCPI EVENTS:")
cpi_events = calendar.get_event_by_name('CPI')
calendar.display_events(cpi_events, limit=5)

# Convert to DataFrame
df = calendar.get_dataframe(high_impact)
print("\nDataFrame:")
print(df.head())
```

---

## 4. INTEGRATION DENGAN MARKET INSIGHT SYSTEM

Tambahkan economic calendar ke system Anda:

```python
def check_economic_calendar_impact():
    """
    Check apakah ada high-impact economic event hari ini
    Return: impact level untuk risk adjustment
    """
    
    calendar = EconomicCalendar()
    today_events = calendar.get_events_today()
    
    if not today_events:
        return {
            'has_event': False,
            'impact': 'NONE',
            'action': 'normal'
        }
    
    # Get importance
    high_impact_count = len([e for e in today_events if e.get('importance') == 'high'])
    
    if high_impact_count >= 2:
        return {
            'has_event': True,
            'impact': 'VERY_HIGH',
            'action': 'reduce_position_50%',
            'events': today_events
        }
    elif high_impact_count == 1:
        return {
            'has_event': True,
            'impact': 'HIGH',
            'action': 'reduce_position_30%',
            'events': today_events
        }
    else:
        return {
            'has_event': True,
            'impact': 'MODERATE',
            'action': 'use_tight_stops',
            'events': today_events
        }

# Usage
event_impact = check_economic_calendar_impact()
print(event_impact)

# If high-impact event, reduce position:
# OUTPUT:
# {
#   'has_event': True,
#   'impact': 'HIGH',
#   'action': 'reduce_position_30%',
#   'events': [...]
# }
```

---

## 5. API ENDPOINT LENGKAP

### Trading Economics API Endpoints:

```
1. Get all events:
   GET https://api.tradingeconomics.com/calendar?c=ALL

2. Get events by country:
   GET https://api.tradingeconomics.com/calendar?c=US,CN,DE,JP

3. Get events with filters:
   GET https://api.tradingeconomics.com/calendar?c=ALL&calendarType=events

4. Get latest release:
   GET https://api.tradingeconomics.com/calendar?c=US&calendarType=releases

Parameters:
- c: Country (US, EU, GB, JP, AU, CA, etc)
- calendarType: events, releases, earnings
- limit: number of results
- offset: pagination
```

---

## 6. IMPORTANT EVENTS TO MONITOR

### For Crypto & Forex:

```
MOST IMPORTANT (Impact: VERY HIGH)
├─ CPI (Consumer Price Index)           → Inflation indicator
├─ Fed Funds Rate Decision              → Interest rate policy
├─ Nonfarm Payroll                      → Employment data
├─ Unemployment Rate                     → Labor market health
├─ GDP (Gross Domestic Product)         → Economic growth
└─ Core CPI                             → Inflation (ex-food/energy)

IMPORTANT (Impact: HIGH)
├─ Retail Sales                         → Consumer spending
├─ Manufacturing PMI                    → Industrial activity
├─ Consumer Confidence                  → Economic sentiment
├─ Initial Jobless Claims               → Labor market
├─ PPI (Producer Price Index)           → Producer inflation
└─ Housing Starts                       → Construction activity

MODERATE (Impact: MEDIUM)
├─ Trade Balance                        → International trade
├─ Factory Orders                       → Manufacturing demand
├─ Durable Goods Orders                 → Equipment demand
├─ ISM Services PMI                     → Service sector
└─ Consumer Sentiment                   → Consumer mood
```

---

## 7. CHECKLIST UNTUK MARKET INSIGHT

```
☐ Setup Economic Calendar API
  ☐ Fetch dari Trading Economics
  ☐ Filter high-impact events
  ☐ Get events untuk hari ini & minggu depan

☐ Implement Risk Adjustment
  ☐ Jika ada high-impact event hari ini → reduce position 30-50%
  ☐ Use tight stops
  ☐ Monitor real-time selama event

☐ Display di Dashboard
  ☐ Show next high-impact event
  ☐ Show time until event
  ☐ Show previous vs forecast vs actual (after release)

☐ Notifications
  ☐ Alert jika ada high-impact event hari ini
  ☐ Alert 30 min before event
  ☐ Alert after event with actual result
```

---

## 🎯 REKOMENDASI AKHIR

**Untuk Market Insight System Anda**:

### ✅ USE TRADING ECONOMICS API

```
Reasons:
- ✓ FREE, no key needed
- ✓ Real-time updates
- ✓ All countries & events
- ✓ Most reliable free option
- ✓ Easy to integrate
```

### Code to add to your system:

```python
# 1. Add to data collection (run once per day)
calendar = EconomicCalendar()
today_events = calendar.get_events_today()

# 2. Adjust position based on events
if today_events:
    event_impact = check_economic_calendar_impact()
    if event_impact['impact'] == 'HIGH':
        reduce_position_by(30)  # Reduce by 30%
    elif event_impact['impact'] == 'VERY_HIGH':
        reduce_position_by(50)  # Reduce by 50%

# 3. Display in output
print(f"High-Impact Events Today: {len(today_events)}")
if today_events:
    for event in today_events:
        print(f"  - {event['event']} at {event['time']}")
```

---

**Summary: Trading Economics API adalah solusi GRATIS terbaik untuk economic calendar!** ✅
