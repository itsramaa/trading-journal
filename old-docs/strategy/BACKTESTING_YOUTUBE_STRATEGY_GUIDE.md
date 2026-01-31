# 📊 BACKTESTING STRATEGY & AI YOUTUBE STRATEGY IMPORT

Complete Implementation Guide untuk Web React Anda

---

## BAGIAN 1: BACKTESTING STRATEGY - KONSEP AKURAT

### 1.1 APA ITU BACKTESTING?

**Definisi**: Menjalankan strategy trading pada historical data untuk evaluate performa.

**Tujuan**: 
- Validate apakah strategy menguntungkan
- Hitung win rate, max drawdown, Sharpe ratio
- Optimize parameters sebelum live trading

---

### 1.2 KOMPONEN BACKTESTING YANG AKURAT

#### **A. Historical Data Quality** (CRITICAL!)

```
Data yang dibutuhkan:
├─ OHLCV (Open, High, Low, Close, Volume)
├─ Time: Timestamp yang akurat
├─ Bid-Ask Spread: Realisasi slippage
└─ Komisi: Biaya trading

Sumber data yang reliable:
✓ Binance API (historical klines)
✓ Pandas Datareader (Yahoo Finance)
✓ CSV import (dari platform lain)
```

#### **B. Entry & Exit Signals**

```
Struktur Signal:
├─ Entry Signal
│  ├─ Condition: Kapan buy/sell?
│  ├─ Price: Harga entry
│  └─ Quantity: Berapa banyak
│
└─ Exit Signal
   ├─ Take Profit (TP)
   ├─ Stop Loss (SL)
   └─ Time-based Exit
```

#### **C. Position Management**

```
Risk Management:
├─ Position Size
│  ├─ Fixed: Jumlah tetap per trade
│  ├─ % Risk: Misal 1-2% per trade
│  └─ Kelly Criterion: Mathematical optimal
│
├─ Stop Loss
│  ├─ Fixed SL: Misal 5% below entry
│  ├─ ATR-based: Dynamic based on volatility
│  └─ Support-based: Technical levels
│
└─ Take Profit
   ├─ Fixed TP: Misal 10% above entry
   ├─ Risk-Reward: Misal 1:2
   └─ Trailing TP: Dynamic take profit
```

#### **D. Slippage & Komisi**

```
Real-World Factors:
├─ Slippage
│  ├─ Bid-Ask Spread: Actual market spread
│  └─ Impact: Market movement saat order
│
└─ Komisi
   ├─ Maker: 0.02% (limit orders)
   ├─ Taker: 0.04% (market orders)
   └─ Per trade
```

---

### 1.3 METRICS YANG HARUS DIHITUNG

```
1. RETURN METRICS:
   ├─ Total Return: ((Final - Initial) / Initial) × 100%
   ├─ Annual Return: Normalized per tahun
   ├─ Monthly Return: Normalized per bulan
   └─ Win Rate: Winning trades / Total trades

2. RISK METRICS:
   ├─ Maximum Drawdown: (Peak - Trough) / Peak
   ├─ Volatility: Standard deviation of returns
   ├─ Sharpe Ratio: (Return - Rf) / Volatility
   │  └─ > 1.0 adalah good, > 2.0 excellent
   ├─ Sortino Ratio: Like Sharpe tapi hitung downside volatility only
   └─ Calmar Ratio: Annual Return / Max Drawdown

3. TRADE METRICS:
   ├─ Total Trades: Jumlah trades
   ├─ Winning Trades: Trades dengan profit
   ├─ Losing Trades: Trades dengan loss
   ├─ Consecutive Wins: Longest winning streak
   ├─ Consecutive Losses: Longest losing streak
   ├─ Avg Win: Average profit per winning trade
   ├─ Avg Loss: Average loss per losing trade
   └─ Profit Factor: (Sum of wins) / (Sum of losses)

4. EFFICIENCY METRICS:
   ├─ Recovery Factor: Net Profit / Max Drawdown
   ├─ Risk-Reward Ratio: Avg Win / Avg Loss
   └─ Expected Value: (Win% × Avg Win) - (Loss% × Avg Loss)
```

---

### 1.4 BACKTESTING ENGINE - ALGORITHM

```
PSEUDOCODE BACKTESTING:

Initialize:
├─ Initial Balance: $10,000
├─ Historical Data: Load OHLCV
└─ Strategy Rules: Entry & Exit conditions

Loop through each candle:
├─ Check Entry Signal:
│  ├─ If condition met:
│  │  ├─ Calculate position size
│  │  ├─ Place order at open of next candle
│  │  ├─ Update balance
│  │  └─ Record trade
│  └─ Else: Skip
│
├─ Check Exit Signal (for open positions):
│  ├─ If SL hit: Close position with loss
│  ├─ If TP hit: Close position with profit
│  ├─ If exit signal: Close position
│  └─ Update balance & record trade
│
└─ Move to next candle

Calculate Metrics:
├─ All return metrics
├─ All risk metrics
├─ All trade metrics
└─ All efficiency metrics

Output:
├─ Summary statistics
├─ Equity curve
├─ Trade list
└─ Charts & visualization
```

---

### 1.5 ACCURACY CONCERNS & SOLUTIONS

#### **MASALAH UTAMA:**

```
1. LOOK-AHEAD BIAS
   Problem: Menggunakan future data saat backtest
   Solution: Hanya gunakan data sampai current candle
   
   ❌ SALAH:
      if tomorrow_price > threshold:  # Data masa depan!
   
   ✅ BENAR:
      if current_price > threshold:   # Data saat ini

2. SURVIVORSHIP BIAS
   Problem: Hanya test pairs yang masih exist
   Solution: Include delisted/dead pairs
   
3. OVERFITTING
   Problem: Strategy optimized untuk past, tapi fail di future
   Solution: 
   - Walk-forward analysis
   - Out-of-sample testing
   - Parameter stability test

4. SLIPPAGE UNDERESTIMATION
   Problem: Assume instant execution pada harga ideal
   Solution:
   - Add bid-ask spread
   - Add market impact
   - Use realistic entry/exit prices
   
   ❌ SALAH:
      Entry: Close price exactly
   
   ✅ BENAR:
      Entry: Close price + half spread
      Exit: Close price - half spread (untuk sell)

5. COMMISSION IGNORING
   Problem: Forget trading costs
   Solution: Include real commission rates
   
   Binance Futures:
   - Maker: 0.02% per trade
   - Taker: 0.04% per trade
   - So 1 round trip: 0.06% cost

6. MARKET CONDITION CHANGES
   Problem: Strategy works di bull market, fail di bear
   Solution:
   - Test di multiple market conditions
   - 2020-2021 (bull): untuk uptrend
   - 2022 (bear): untuk downtrend
   - 2023-2024 (sideways): untuk range-bound
```

---

### 1.6 BACKTESTING WORKFLOW (Recommended)

```
┌─────────────────────────────────────┐
│ 1. DEFINE STRATEGY CLEARLY          │
│    ├─ Entry rules (exact conditions)│
│    ├─ Exit rules (all possibilities)│
│    └─ Position sizing               │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 2. COLLECT CLEAN DATA               │
│    ├─ 2+ years historical OHLCV    │
│    ├─ Verify no gaps                │
│    └─ Align with actual exchanges   │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 3. CODE BACKTEST ENGINE             │
│    ├─ Process each candle           │
│    ├─ Check signals                 │
│    ├─ Execute trades                │
│    └─ Track P&L                     │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 4. BACKTEST - INITIAL               │
│    ├─ Run on full historical data   │
│    ├─ Check if profitable           │
│    └─ Identify issues               │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 5. OPTIMIZE (CAREFUL!)              │
│    ├─ Walk-forward analysis         │
│    ├─ Parameter sensitivity test    │
│    └─ Avoid overfitting             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 6. OUT-OF-SAMPLE TEST               │
│    ├─ Test on unseen data           │
│    └─ Verify robustness             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 7. PAPER TRADE (LIVE TEST)          │
│    ├─ Live trading simulator        │
│    ├─ 2-4 weeks testing             │
│    └─ Check real-world conditions   │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ 8. LIVE TRADING                     │
│    ├─ Start with small size         │
│    ├─ Monitor closely               │
│    └─ Adjust if needed              │
└─────────────────────────────────────┘
```

---

## BAGIAN 2: IMPORT STRATEGY FROM YOUTUBE (AI GEMINI)

### 2.1 FLOW DIAGRAM

```
USER INPUT VIDEO URL
        ↓
GET VIDEO METADATA
(Title, Duration, Description)
        ↓
EXTRACT AUDIO
(Convert video to audio)
        ↓
TRANSCRIBE WITH GEMINI AI
(Generate full transcript)
        ↓
PARSE STRATEGY
(Extract trading rules using Gemini)
        ↓
CLASSIFY STRATEGY
(Type, Difficulty, Compatibility)
        ↓
VALIDATE STRATEGY
(Check if complete & valid)
        ↓
STORE IN DATABASE
        ↓
READY FOR BACKTESTING! ✅
```

---

### 2.2 STEP 1: GET YOUTUBE VIDEO INFO

```python
from yt_dlp import YoutubeDL
import json

def get_youtube_video_info(url):
    """Extract video info dari YouTube"""
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_audio': True,
        'audio_format': 'mp3',
        'audio_quality': '192',
        'outtmpl': 'audio/%(id)s',
    }
    
    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            return {
                'success': True,
                'title': info.get('title'),
                'duration': info.get('duration'),
                'channel': info.get('uploader'),
                'description': info.get('description'),
                'video_id': info.get('id'),
                'audio_path': f"audio/{info.get('id')}.mp3"
            }
    
    except Exception as e:
        return {'success': False, 'error': str(e)}
```

---

### 2.3 STEP 2: TRANSCRIBE WITH GEMINI

```python
import google.generativeai as genai
from google.api_core.exceptions import InvalidArgument
import base64
import os

class YoutubeStrategyExtractor:
    """Extract strategy dari YouTube video menggunakan Gemini"""
    
    def __init__(self, gemini_api_key):
        """Initialize Gemini"""
        genai.configure(api_key=gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def transcribe_audio(self, audio_path):
        """
        Transcribe audio ke text using Gemini
        
        Args:
            audio_path: Path ke file audio
        
        Returns:
            Transcript text
        """
        
        try:
            # Upload file ke Gemini
            audio_file = genai.upload_file(audio_path)
            
            # Transcribe dengan prompt
            prompt = """
            Please transcribe this video audio completely and accurately.
            Provide the full transcript of everything said in the video.
            """
            
            response = self.model.generate_content([prompt, audio_file])
            
            transcript = response.text
            
            return {
                'success': True,
                'transcript': transcript
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def extract_strategy_from_transcript(self, transcript, video_title):
        """
        Extract trading strategy dari transcript using Gemini
        
        Args:
            transcript: Video transcript text
            video_title: Video title
        
        Returns:
            Extracted strategy JSON
        """
        
        try:
            prompt = """
            You are a professional trading analyst. Analyze this video transcript and extract the trading strategy.
            
            VIDEO TITLE: {title}
            
            TRANSCRIPT:
            {transcript}
            
            EXTRACT THE FOLLOWING IN JSON FORMAT:
            {{
                "strategy_name": "Name of the strategy",
                "type": "Type of strategy (e.g., Scalping, Day Trading, Swing Trading, Position Trading, Trend Following, Range Bound, etc.)",
                "timeframe": "Recommended timeframe (e.g., 1m, 5m, 15m, 1h, 4h, 1d)",
                "entry_conditions": [
                    {{
                        "indicator": "Name of indicator or condition",
                        "condition": "Exact condition for entry",
                        "description": "Explanation"
                    }}
                ],
                "exit_conditions": {{
                    "take_profit": {{
                        "type": "Fixed/Trailing/ATR-based",
                        "value": "e.g., 2% or 2 ATR"
                    }},
                    "stop_loss": {{
                        "type": "Fixed/ATR-based/Support-based",
                        "value": "e.g., 1% or 1.5 ATR"
                    }},
                    "other_exits": ["Any other exit conditions"]
                }},
                "indicators_used": ["List of all indicators"],
                "position_sizing": "How to size positions",
                "pairs": ["Recommended trading pairs"],
                "market_conditions": "Best market conditions (e.g., trending, range-bound, volatile)",
                "risk_management": "Risk management rules from video",
                "difficulty_level": "Beginner/Intermediate/Advanced",
                "completeness": "How complete is the strategy (0-100%)",
                "confidence_score": "How confident are you this is a complete strategy (0-100%)",
                "missing_elements": "What's missing from the strategy",
                "author_notes": "Any special notes from the author",
                "is_valid_tradeable": "Can this strategy be backtested? (true/false)",
                "reason_if_not_valid": "If not valid, why not?"
            }}
            
            BE PRECISE AND EXTRACT EXACT CONDITIONS, NOT APPROXIMATE.
            IF SOMETHING IS NOT MENTIONED, SAY IT'S MISSING.
            """
            
            response = self.model.generate_content(
                prompt.format(title=video_title, transcript=transcript)
            )
            
            # Parse JSON response
            import json
            import re
            
            # Extract JSON dari response
            json_text = response.text
            
            # Try to find JSON block
            json_match = re.search(r'\{[\s\S]*\}', json_text)
            if json_match:
                json_str = json_match.group()
                strategy_data = json.loads(json_str)
            else:
                strategy_data = json.loads(json_text)
            
            return {
                'success': True,
                'strategy': strategy_data
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

---

### 2.4 STEP 3: VALIDATE & CLASSIFY STRATEGY

```python
def validate_strategy(strategy_data):
    """
    Validate apakah strategy lengkap dan dapat di-backtest
    
    Returns:
        Validation result dengan detail
    """
    
    required_fields = {
        'entry_conditions': 'Entry rules',
        'exit_conditions': 'Exit rules (TP + SL)',
        'indicators_used': 'Indicators',
        'timeframe': 'Timeframe',
        'type': 'Strategy type'
    }
    
    missing_fields = []
    
    for field, description in required_fields.items():
        if field not in strategy_data or not strategy_data[field]:
            missing_fields.append(f"{description} ({field})")
    
    # Check entry conditions detail
    entry_conditions = strategy_data.get('entry_conditions', [])
    if entry_conditions:
        for entry in entry_conditions:
            if 'condition' not in entry or not entry['condition']:
                missing_fields.append("Entry condition is not specific")
    else:
        missing_fields.append("No entry conditions specified")
    
    # Check exit conditions
    exit_conditions = strategy_data.get('exit_conditions', {})
    if not exit_conditions.get('take_profit') or not exit_conditions.get('take_profit', {}).get('value'):
        missing_fields.append("Take Profit not specified")
    if not exit_conditions.get('stop_loss') or not exit_conditions.get('stop_loss', {}).get('value'):
        missing_fields.append("Stop Loss not specified")
    
    # Determine if valid for backtesting
    is_valid = len(missing_fields) == 0
    
    return {
        'is_valid': is_valid,
        'missing_elements': missing_fields,
        'validation_score': ((len(required_fields) - len(missing_fields)) / len(required_fields)) * 100,
        'can_backtest': is_valid,
        'message': 'Strategy is complete and ready for backtesting!' if is_valid else f'Missing: {", ".join(missing_fields)}'
    }

def classify_strategy(strategy_data):
    """
    Classify strategy berdasarkan characteristics
    
    Returns:
        Classification details
    """
    
    classification = {
        'type': strategy_data.get('type', 'Unknown'),
        'timeframe': strategy_data.get('timeframe', 'Unknown'),
        'difficulty': strategy_data.get('difficulty_level', 'Unknown'),
        'complexity': 'High' if len(strategy_data.get('indicators_used', [])) > 5 else 'Medium' if len(strategy_data.get('indicators_used', [])) > 3 else 'Low',
        'risk_level': classify_risk_level(strategy_data),
        'market_fit': strategy_data.get('market_conditions', 'Any'),
        'suitable_pairs': strategy_data.get('pairs', ['All majors recommended']),
        'automation_score': calculate_automation_score(strategy_data)
    }
    
    return classification

def classify_risk_level(strategy_data):
    """Determine risk level dari strategy"""
    
    exit_conditions = strategy_data.get('exit_conditions', {})
    sl_value = exit_conditions.get('stop_loss', {}).get('value', '')
    tp_value = exit_conditions.get('take_profit', {}).get('value', '')
    
    # Try to parse SL percentage
    try:
        sl_num = float(str(sl_value).replace('%', '').replace('ATR', ''))
        if sl_num > 3:
            return 'High Risk'
        elif sl_num > 1.5:
            return 'Medium Risk'
        else:
            return 'Low Risk'
    except:
        return 'Unknown'

def calculate_automation_score(strategy_data):
    """
    Calculate how easy strategy is to automate (0-100)
    
    Factors:
    - Specific entry conditions
    - Specific exit conditions
    - Well-defined parameters
    """
    
    score = 0
    
    # Entry conditions detail
    entry_conditions = strategy_data.get('entry_conditions', [])
    if entry_conditions and all('condition' in e for e in entry_conditions):
        score += 25
    
    # Exit conditions detail
    exit_conditions = strategy_data.get('exit_conditions', {})
    if exit_conditions.get('stop_loss') and exit_conditions.get('take_profit'):
        score += 25
    
    # Indicators are specific
    indicators = strategy_data.get('indicators_used', [])
    if indicators:
        score += 20
    
    # Position sizing defined
    if strategy_data.get('position_sizing'):
        score += 15
    
    # Market conditions defined
    if strategy_data.get('market_conditions'):
        score += 15
    
    return min(100, score)
```

---

### 2.5 FULL INTEGRATION ENDPOINT (Flask/FastAPI)

```python
from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

@app.route('/api/strategy/import-from-youtube', methods=['POST'])
def import_strategy_from_youtube():
    """
    API endpoint untuk import strategy dari YouTube
    
    Request body:
    {
        "youtube_url": "https://www.youtube.com/watch?v=...",
        "user_id": "user_123"
    }
    """
    
    try:
        data = request.json
        youtube_url = data.get('youtube_url')
        user_id = data.get('user_id')
        
        if not youtube_url:
            return jsonify({'error': 'YouTube URL required'}), 400
        
        # Step 1: Get video info
        from yt_dlp import YoutubeDL
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_audio': True,
            'audio_format': 'mp3',
            'outtmpl': f'audio/{user_id}_%(id)s',
        }
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
        
        video_id = info.get('id')
        video_title = info.get('title')
        audio_path = f'audio/{user_id}_{video_id}.mp3'
        
        # Step 2: Transcribe with Gemini
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        extractor = YoutubeStrategyExtractor(gemini_api_key)
        
        # Show progress
        yield json.dumps({
            'status': 'downloading',
            'message': 'Downloaded video, now transcribing...',
            'progress': 30
        }) + '\n'
        
        transcribe_result = extractor.transcribe_audio(audio_path)
        
        if not transcribe_result['success']:
            return jsonify({'error': 'Transcription failed: ' + transcribe_result['error']}), 400
        
        transcript = transcribe_result['transcript']
        
        yield json.dumps({
            'status': 'transcribed',
            'message': 'Transcription complete, extracting strategy...',
            'progress': 60
        }) + '\n'
        
        # Step 3: Extract strategy
        extract_result = extractor.extract_strategy_from_transcript(transcript, video_title)
        
        if not extract_result['success']:
            return jsonify({'error': 'Strategy extraction failed: ' + extract_result['error']}), 400
        
        strategy_data = extract_result['strategy']
        
        yield json.dumps({
            'status': 'extracted',
            'message': 'Strategy extracted, validating...',
            'progress': 80
        }) + '\n'
        
        # Step 4: Validate
        validation = validate_strategy(strategy_data)
        strategy_data['validation'] = validation
        
        # Step 5: Classify
        classification = classify_strategy(strategy_data)
        strategy_data['classification'] = classification
        
        # Step 6: Save to database
        # (Implement your DB logic)
        strategy_data['id'] = str(uuid.uuid4())
        strategy_data['created_at'] = datetime.now().isoformat()
        strategy_data['source'] = 'youtube'
        strategy_data['source_url'] = youtube_url
        
        # Cleanup audio file
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        yield json.dumps({
            'status': 'complete',
            'message': 'Strategy imported successfully!',
            'progress': 100,
            'strategy': strategy_data
        }) + '\n'
    
    except Exception as e:
        yield json.dumps({
            'status': 'error',
            'error': str(e),
            'progress': 0
        }) + '\n'
```

---

### 2.6 FRONTEND REACT COMPONENT

```jsx
// StrategyImporter.jsx

import React, { useState } from 'react';
import axios from 'axios';

export default function StrategyImporter() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [strategy, setStrategy] = useState(null);
    const [error, setError] = useState(null);
    
    const handleImport = async () => {
        if (!url) {
            setError('Please enter a YouTube URL');
            return;
        }
        
        setLoading(true);
        setProgress(0);
        setError(null);
        
        try {
            const response = await axios.post(
                '/api/strategy/import-from-youtube',
                { youtube_url: url },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            
            // Stream progress updates
            const reader = response.data.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                lines.forEach(line => {
                    if (line.trim()) {
                        const data = JSON.parse(line);
                        setProgress(data.progress);
                        
                        if (data.status === 'complete') {
                            setStrategy(data.strategy);
                        } else if (data.status === 'error') {
                            setError(data.error);
                        }
                    }
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="strategy-importer">
            <h2>Import Strategy from YouTube</h2>
            
            {/* Input */}
            <input
                type="text"
                placeholder="Paste YouTube URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
            />
            
            <button onClick={handleImport} disabled={loading}>
                {loading ? `Importing... ${progress}%` : 'Import Strategy'}
            </button>
            
            {/* Progress Bar */}
            {loading && (
                <div className="progress-bar">
                    <div style={{ width: `${progress}%` }}></div>
                </div>
            )}
            
            {/* Error */}
            {error && <div className="error">{error}</div>}
            
            {/* Strategy Display */}
            {strategy && (
                <div className="strategy-result">
                    <h3>{strategy.strategy_name}</h3>
                    
                    <div className="validation">
                        <h4>Validation Status</h4>
                        {strategy.validation.is_valid ? (
                            <span className="valid">✅ Valid for Backtesting</span>
                        ) : (
                            <div>
                                <span className="invalid">❌ Not Complete</span>
                                <p>Missing: {strategy.validation.missing_elements.join(', ')}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="classification">
                        <h4>Classification</h4>
                        <p>Type: {strategy.classification.type}</p>
                        <p>Timeframe: {strategy.classification.timeframe}</p>
                        <p>Difficulty: {strategy.classification.difficulty}</p>
                        <p>Risk Level: {strategy.classification.risk_level}</p>
                        <p>Automation Score: {strategy.classification.automation_score}/100</p>
                    </div>
                    
                    <div className="entry-conditions">
                        <h4>Entry Conditions</h4>
                        {strategy.strategy.entry_conditions.map((entry, i) => (
                            <div key={i}>
                                <strong>{entry.indicator}:</strong> {entry.condition}
                            </div>
                        ))}
                    </div>
                    
                    <div className="exit-conditions">
                        <h4>Exit Conditions</h4>
                        <p>Take Profit: {strategy.strategy.exit_conditions.take_profit.value}</p>
                        <p>Stop Loss: {strategy.strategy.exit_conditions.stop_loss.value}</p>
                    </div>
                    
                    {strategy.validation.is_valid && (
                        <button className="backtest-btn">
                            Start Backtesting →
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
```

---

## BAGIAN 3: BACKTESTING ENGINE IMPLEMENTATION

### 3.1 BACKTESTING CLASS

```python
import pandas as pd
import numpy as np
from datetime import datetime

class BacktestEngine:
    """Backtesting engine untuk trading strategies"""
    
    def __init__(self, initial_balance=10000, commission=0.0004):
        """
        Initialize backtesting
        
        Args:
            initial_balance: Starting capital ($)
            commission: Commission rate (0.04% untuk Binance maker)
        """
        
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.commission = commission
        self.trades = []
        self.equity_curve = []
        self.positions = {}
    
    def backtest_strategy(self, df, strategy_rules):
        """
        Run backtest dengan strategy rules
        
        Args:
            df: DataFrame dengan OHLCV data
            strategy_rules: Strategy entry/exit rules
        
        Returns:
            Backtest results dengan semua metrics
        """
        
        self.equity_curve = []
        self.trades = []
        
        # Loop through each candle
        for i in range(1, len(df)):
            current = df.iloc[i]
            previous = df.iloc[i-1]
            
            # Check entry signal
            if not self.positions and self._check_entry_signal(current, previous, df[:i], strategy_rules):
                self._enter_trade(current, i, df.iloc[:i], strategy_rules)
            
            # Check exit signal for open positions
            if self.positions:
                self._check_exit_signal(current, i, df.iloc[:i], strategy_rules)
            
            # Record equity
            self.equity_curve.append({
                'timestamp': current['timestamp'],
                'equity': self.balance
            })
        
        # Calculate metrics
        metrics = self._calculate_metrics(df)
        
        return {
            'metrics': metrics,
            'trades': self.trades,
            'equity_curve': self.equity_curve
        }
    
    def _check_entry_signal(self, current, previous, history, rules):
        """Check if entry signal triggered"""
        
        for entry in rules.get('entry_conditions', []):
            # Evaluate condition
            # This is strategy-specific
            # Example: if entry['indicator'] == 'RSI':
            #             if current['rsi'] < 30: return True
            pass
        
        return False
    
    def _enter_trade(self, candle, index, history, rules):
        """Enter a trade"""
        
        entry_price = candle['close']
        position_size = self._calculate_position_size(rules)
        
        trade = {
            'entry_time': candle['timestamp'],
            'entry_price': entry_price,
            'size': position_size,
            'entry_index': index,
            'type': 'LONG'  # atau SHORT
        }
        
        # Deduct commission
        trade_cost = position_size * entry_price * self.commission
        self.balance -= trade_cost
        
        self.positions[index] = trade
    
    def _check_exit_signal(self, candle, index, history, rules):
        """Check exit signals"""
        
        for pos_index, position in list(self.positions.items()):
            entry_price = position['entry_price']
            current_price = candle['close']
            
            # Check TP
            tp_value = rules.get('exit_conditions', {}).get('take_profit', {}).get('value')
            if self._check_tp(current_price, entry_price, tp_value):
                self._exit_trade(position, current_price, index, 'TP')
            
            # Check SL
            sl_value = rules.get('exit_conditions', {}).get('stop_loss', {}).get('value')
            if self._check_sl(current_price, entry_price, sl_value):
                self._exit_trade(position, current_price, index, 'SL')
    
    def _exit_trade(self, position, exit_price, index, exit_type):
        """Exit a trade"""
        
        size = position['size']
        entry_price = position['entry_price']
        
        # Calculate P&L
        pnl = (exit_price - entry_price) * size
        pnl_percent = ((exit_price - entry_price) / entry_price) * 100
        
        # Deduct commission
        commission_cost = size * exit_price * self.commission
        pnl -= commission_cost
        
        # Update balance
        self.balance += size * exit_price
        self.balance += pnl
        
        # Record trade
        trade = position.copy()
        trade['exit_time'] = index
        trade['exit_price'] = exit_price
        trade['pnl'] = pnl
        trade['pnl_percent'] = pnl_percent
        trade['exit_type'] = exit_type
        
        self.trades.append(trade)
        
        # Remove from open positions
        del self.positions[position['entry_index']]
    
    def _calculate_position_size(self, rules):
        """Calculate position size based on rules"""
        
        position_sizing = rules.get('position_sizing', 'Fixed')
        
        if position_sizing == 'Fixed':
            return 1  # 1 contract
        elif '1%' in position_sizing:
            return (self.balance * 0.01) / 100  # 1% of balance
        else:
            return 1
    
    def _check_tp(self, current, entry, tp_value):
        """Check if take profit hit"""
        
        try:
            tp_num = float(str(tp_value).replace('%', ''))
            tp_level = entry * (1 + tp_num / 100)
            return current >= tp_level
        except:
            return False
    
    def _check_sl(self, current, entry, sl_value):
        """Check if stop loss hit"""
        
        try:
            sl_num = float(str(sl_value).replace('%', ''))
            sl_level = entry * (1 - sl_num / 100)
            return current <= sl_level
        except:
            return False
    
    def _calculate_metrics(self, df):
        """Calculate all backtesting metrics"""
        
        total_trades = len(self.trades)
        winning_trades = len([t for t in self.trades if t['pnl'] > 0])
        losing_trades = len([t for t in self.trades if t['pnl'] < 0])
        
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        
        total_pnl = sum([t['pnl'] for t in self.trades])
        avg_win = np.mean([t['pnl'] for t in self.trades if t['pnl'] > 0]) if winning_trades > 0 else 0
        avg_loss = np.mean([t['pnl'] for t in self.trades if t['pnl'] < 0]) if losing_trades > 0 else 0
        
        # Sharpe Ratio
        returns = [(t['pnl'] / self.initial_balance) for t in self.trades]
        sharpe_ratio = (np.mean(returns) / np.std(returns) * np.sqrt(252)) if len(returns) > 1 else 0
        
        # Max Drawdown
        equity = [t['equity'] for t in self.equity_curve] + [self.balance]
        cummax = np.maximum.accumulate(equity)
        drawdown = (np.array(equity) - cummax) / cummax
        max_drawdown = np.min(drawdown) * 100 if len(drawdown) > 0 else 0
        
        return {
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': win_rate,
            'total_pnl': total_pnl,
            'avg_win': avg_win,
            'avg_loss': abs(avg_loss),
            'profit_factor': (sum([t['pnl'] for t in self.trades if t['pnl'] > 0]) / 
                            abs(sum([t['pnl'] for t in self.trades if t['pnl'] < 0]))) if losing_trades > 0 else 0,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'final_balance': self.balance,
            'total_return': ((self.balance - self.initial_balance) / self.initial_balance) * 100
        }
```

---

## SUMMARY & RECOMMENDATIONS

### ✅ UNTUK WEB REACT ANDA:

#### **Feature 1: Strategy Importer (YouTube)**
```
1. Input YouTube URL
2. Download + Transcribe (Gemini)
3. Extract Strategy (Gemini AI parsing)
4. Validate & Classify
5. Store di database
6. Show in strategy library
```

#### **Feature 2: Backtesting Engine**
```
1. Select strategy
2. Choose OHLCV data
3. Set time period
4. Run backtest
5. Display results:
   - Win rate
   - Sharpe ratio
   - Max drawdown
   - Equity curve chart
   - Trade list
   - Metrics dashboard
```

#### **Feature 3: Strategy Library**
```
- List all imported strategies
- Filter by type/timeframe/difficulty
- Show validation status
- Quick preview
- One-click backtest
- Compare multiple strategies
```

---

### 🎯 BEST PRACTICES:

1. **Backtesting Accuracy:**
   - ✅ Use realistic slippage
   - ✅ Include commission
   - ✅ Test on 2+ years data
   - ✅ Test multiple market conditions
   - ✅ Walk-forward analysis
   - ❌ Avoid look-ahead bias
   - ❌ Avoid overfitting

2. **YouTube Strategy Import:**
   - ✅ Validate all required fields
   - ✅ Show validation errors clearly
   - ✅ Allow manual editing if needed
   - ✅ Store source URL
   - ✅ Show confidence score

3. **User Experience:**
   - Show progress during import
   - Clear error messages
   - Allow manual strategy creation if import fails
   - Save draft strategies
   - Compare strategies side-by-side

---

**Files siap untuk implementasi di React app Anda!** 🚀
