# 🚀 BINANCE FUTURES API - PLACE ORDERS & HISTORY

Complete Implementation Guide dengan Security Best Practices

---

## 1. SETUP BINANCE API KEY (SECURE WAY)

### Step 1: Create API Key di Binance

1. Go to: https://www.binance.com/
2. Login to your account
3. Click Profile → API Management
4. Click "Create API"
5. Label: "Futures Trading Bot" (atau nama lain)
6. Click Create

### Step 2: Configure API Permissions (VERY IMPORTANT!)

**PASTIKAN HANYA AKSES INI:**

```
✓ ENABLE (harus ON):
  ✓ Futures Enabled (Futures API access)
  ✓ Enable Futures (biar bisa trade)
  ✓ Read-only (untuk get history)
  
✗ DISABLE (harus OFF):
  ✗ Spot Trading (tidak perlu)
  ✗ Margin Trading (tidak perlu)
  ✗ Transfer (SANGAT PENTING: jangan bisa transfer!)
  ✗ Withdrawal (SANGAT PENTING: jangan bisa withdraw!)
  ✗ IP Restriction (optional, tapi recommended)
```

**Screen Settings:**

```
API Key Settings:
├─ Restrict access to trusted IPs (RECOMMENDED)
│  └─ IP Address: [Your server IP]
│
├─ IP Whitelist:
│  └─ Add your trading bot server IP
│
└─ API Key Permissions:
   ├─ Trading (Futures)         [X] ENABLE
   ├─ Data Access               [X] ENABLE (read-only)
   ├─ General (account info)    [X] ENABLE
   ├─ Transfer (withdraw)       [ ] DISABLE ← PENTING!
   └─ Sub-Account              [ ] DISABLE
```

### Step 3: Save Credentials Safely

```
Store in environment variables (NEVER in code!):

.env file:
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
```

**JANGAN PERNAH:**
```
❌ Push ke GitHub
❌ Store di hardcode
❌ Share di public
❌ Put di config file yang ter-commit
```

---

## 2. PYTHON IMPLEMENTATION - BINANCE FUTURES API

### Install Library:

```bash
pip install python-binance
pip install python-dotenv
```

### Core Implementation:

```python
from binance.client import Client
from binance.enums import *
import os
from dotenv import load_dotenv
from datetime import datetime
import json

# Load environment variables
load_dotenv()

class BinanceFuturesTrader:
    """
    Binance Futures API wrapper
    - Place orders
    - Get trade history
    - Minimal permissions (Futures only)
    """
    
    def __init__(self):
        """Initialize with API keys dari environment variables"""
        
        self.api_key = os.getenv('BINANCE_API_KEY')
        self.api_secret = os.getenv('BINANCE_API_SECRET')
        
        if not self.api_key or not self.api_secret:
            raise ValueError("API keys not found in environment variables!")
        
        # Initialize client
        self.client = Client(self.api_key, self.api_secret)
        
        # Futures base URL (untuk direct API calls jika perlu)
        self.futures_url = "https://fapi.binance.com"
    
    # ==========================================
    # 1. PLACE ORDERS
    # ==========================================
    
    def place_future_order(self, symbol, side, order_type, quantity, price=None, **kwargs):
        """
        Place order di Binance Futures
        
        Args:
            symbol: 'BTCUSDT', 'ETHUSDT', etc (string)
            side: BUY atau SELL (string)
            order_type: LIMIT, MARKET (string)
            quantity: Jumlah contract (float)
            price: Harga (float, required untuk LIMIT)
            **kwargs: Additional params (timeInForce, stopPrice, etc)
        
        Returns:
            Order response dict
        
        Example:
            order = trader.place_future_order(
                symbol='BTCUSDT',
                side='BUY',
                order_type='LIMIT',
                quantity=1.0,
                price=45000
            )
        """
        
        try:
            # Validate inputs
            if not symbol.endswith('USDT'):
                raise ValueError(f"Invalid symbol: {symbol}. Use USDT pairs only")
            
            if side not in ['BUY', 'SELL']:
                raise ValueError(f"Invalid side: {side}. Use BUY or SELL")
            
            if order_type not in ['LIMIT', 'MARKET']:
                raise ValueError(f"Invalid order type: {order_type}")
            
            if quantity <= 0:
                raise ValueError(f"Quantity must be > 0")
            
            if order_type == 'LIMIT' and price is None:
                raise ValueError("Price required for LIMIT orders")
            
            print(f"\n📊 Placing Futures Order:")
            print(f"   Symbol: {symbol}")
            print(f"   Side: {side}")
            print(f"   Type: {order_type}")
            print(f"   Quantity: {quantity}")
            if price:
                print(f"   Price: {price}")
            
            # Build order parameters
            order_params = {
                'symbol': symbol,
                'side': side,
                'type': order_type,
                'quantity': quantity
            }
            
            # Add price for LIMIT orders
            if order_type == 'LIMIT':
                order_params['price'] = price
                order_params['timeInForce'] = kwargs.get('timeInForce', 'GTC')  # Good Till Cancel
            
            # Add any additional parameters
            for key, value in kwargs.items():
                if key not in order_params:
                    order_params[key] = value
            
            # Place order
            order = self.client.futures_create_order(**order_params)
            
            print(f"✅ Order placed successfully!")
            print(f"   Order ID: {order.get('orderId')}")
            print(f"   Status: {order.get('status')}")
            
            return order
        
        except Exception as e:
            print(f"❌ Error placing order: {str(e)}")
            return None
    
    def place_market_order(self, symbol, side, quantity):
        """
        Place MARKET order (instant execution)
        
        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            side: 'BUY' or 'SELL'
            quantity: Contract quantity
        
        Returns:
            Order response
        """
        
        return self.place_future_order(
            symbol=symbol,
            side=side,
            order_type='MARKET',
            quantity=quantity
        )
    
    def place_limit_order(self, symbol, side, quantity, price):
        """
        Place LIMIT order (price specified)
        
        Args:
            symbol: Trading pair
            side: 'BUY' or 'SELL'
            quantity: Contract quantity
            price: Limit price
        
        Returns:
            Order response
        """
        
        return self.place_future_order(
            symbol=symbol,
            side=side,
            order_type='LIMIT',
            quantity=quantity,
            price=price
        )
    
    def place_stop_loss_order(self, symbol, side, quantity, stop_price, price=None):
        """
        Place STOP LOSS order
        
        Args:
            symbol: Trading pair
            side: 'BUY' or 'SELL'
            quantity: Contract quantity
            stop_price: Stop price
            price: Limit price (optional)
        
        Example:
            # Buy 1 BTC, set stop loss at 43000
            trader.place_stop_loss_order(
                symbol='BTCUSDT',
                side='SELL',
                quantity=1.0,
                stop_price=43000
            )
        """
        
        return self.place_future_order(
            symbol=symbol,
            side=side,
            order_type='LIMIT' if price else 'MARKET',
            quantity=quantity,
            price=price,
            stopPrice=stop_price,
            closePosition=True  # Close position automatically
        )
    
    def cancel_order(self, symbol, order_id):
        """
        Cancel existing order
        
        Args:
            symbol: Trading pair
            order_id: Order ID to cancel
        
        Returns:
            Cancelled order info
        """
        
        try:
            result = self.client.futures_cancel_order(
                symbol=symbol,
                orderId=order_id
            )
            
            print(f"✅ Order {order_id} cancelled successfully!")
            return result
        
        except Exception as e:
            print(f"❌ Error cancelling order: {str(e)}")
            return None
    
    # ==========================================
    # 2. GET TRADE HISTORY
    # ==========================================
    
    def get_open_orders(self, symbol=None):
        """
        Get all open orders
        
        Args:
            symbol: Optional, specific symbol. If None, gets all
        
        Returns:
            List of open orders
        
        Example:
            orders = trader.get_open_orders('BTCUSDT')
            orders = trader.get_open_orders()  # All symbols
        """
        
        try:
            if symbol:
                orders = self.client.futures_get_open_orders(symbol=symbol)
            else:
                orders = self.client.futures_get_open_orders()
            
            print(f"\n📋 Open Orders ({len(orders)}):")
            for order in orders:
                print(f"\n  Symbol: {order['symbol']}")
                print(f"  Side: {order['side']}")
                print(f"  Type: {order['type']}")
                print(f"  Quantity: {order['origQty']}")
                print(f"  Price: {order['price']}")
                print(f"  Status: {order['status']}")
                print(f"  Order ID: {order['orderId']}")
            
            return orders
        
        except Exception as e:
            print(f"❌ Error getting open orders: {str(e)}")
            return []
    
    def get_order_history(self, symbol, limit=100):
        """
        Get order history untuk symbol tertentu
        
        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            limit: Number of orders (default 100, max 1000)
        
        Returns:
            List of orders (completed + cancelled)
        
        Example:
            history = trader.get_order_history('BTCUSDT', limit=50)
        """
        
        try:
            orders = self.client.futures_get_orders(symbol=symbol, limit=limit)
            
            print(f"\n📜 Order History for {symbol} (Last {len(orders)}):")
            for order in orders[:10]:  # Show last 10
                print(f"\n  Order ID: {order['orderId']}")
                print(f"  Symbol: {order['symbol']}")
                print(f"  Side: {order['side']}")
                print(f"  Quantity: {order['origQty']}")
                print(f"  Price: {order['price']}")
                print(f"  Executed: {order['executedQty']}")
                print(f"  Status: {order['status']}")
                print(f"  Time: {datetime.fromtimestamp(order['time']/1000)}")
            
            return orders
        
        except Exception as e:
            print(f"❌ Error getting order history: {str(e)}")
            return []
    
    def get_trades(self, symbol, limit=50):
        """
        Get executed trades untuk symbol tertentu
        
        Args:
            symbol: Trading pair
            limit: Number of trades (default 50, max 1000)
        
        Returns:
            List of executed trades dengan P&L
        
        Example:
            trades = trader.get_trades('BTCUSDT', limit=30)
        """
        
        try:
            trades = self.client.futures_account_trades(symbol=symbol, limit=limit)
            
            print(f"\n💹 Trade History for {symbol} (Last {len(trades)}):")
            
            total_pnl = 0
            for trade in trades[:10]:  # Show last 10
                pnl = float(trade.get('realizedPnl', 0))
                total_pnl += pnl
                
                print(f"\n  Trade ID: {trade['id']}")
                print(f"  Side: {trade['side']}")
                print(f"  Quantity: {trade['qty']}")
                print(f"  Price: {trade['price']}")
                print(f"  Commission: {trade['commission']}")
                print(f"  P&L: {pnl} {'✅' if pnl > 0 else '❌'}")
                print(f"  Time: {datetime.fromtimestamp(trade['time']/1000)}")
            
            print(f"\nTotal P&L (last {min(10, len(trades))} trades): {total_pnl} ✅" if total_pnl > 0 else f"❌")
            
            return trades
        
        except Exception as e:
            print(f"❌ Error getting trades: {str(e)}")
            return []
    
    def get_position_info(self, symbol=None):
        """
        Get current positions
        
        Args:
            symbol: Optional, specific symbol
        
        Returns:
            Position information
        
        Example:
            pos = trader.get_position_info('BTCUSDT')
            all_pos = trader.get_position_info()
        """
        
        try:
            # Get account info
            account = self.client.futures_account()
            positions = account['positions']
            
            print(f"\n📍 Current Positions:")
            
            if symbol:
                positions = [p for p in positions if p['symbol'] == symbol]
            
            for pos in positions:
                if float(pos['positionAmt']) != 0:  # Show only non-zero positions
                    print(f"\n  Symbol: {pos['symbol']}")
                    print(f"  Side: {'LONG' if float(pos['positionAmt']) > 0 else 'SHORT'}")
                    print(f"  Amount: {pos['positionAmt']} contracts")
                    print(f"  Entry Price: {pos['entryPrice']}")
                    print(f"  Mark Price: {pos['markPrice']}")
                    print(f"  Unrealized P&L: {pos['unrealizedProfit']}")
                    print(f"  Leverage: {pos['leverage']}x")
            
            return positions
        
        except Exception as e:
            print(f"❌ Error getting position info: {str(e)}")
            return []
    
    def get_account_balance(self):
        """
        Get account balance
        
        Returns:
            Account info dengan balance
        
        Example:
            balance = trader.get_account_balance()
            print(f"Total Wallet Balance: {balance['totalWalletBalance']}")
            print(f"Available Balance: {balance['availableBalance']}")
        """
        
        try:
            account = self.client.futures_account()
            
            print(f"\n💰 Account Balance:")
            print(f"  Total Wallet Balance: {account.get('totalWalletBalance')} USDT")
            print(f"  Total Unrealized Profit: {account.get('totalUnrealizedProfit')} USDT")
            print(f"  Total Margin Required: {account.get('totalMarginRequired')} USDT")
            print(f"  Available Balance: {account.get('availableBalance')} USDT")
            
            return account
        
        except Exception as e:
            print(f"❌ Error getting account balance: {str(e)}")
            return None

```

---

## 3. FLASK WEB APP IMPLEMENTATION

### Setup Flask App:

```python
# app.py

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from binance_futures_trader import BinanceFuturesTrader
import os
from dotenv import load_dotenv
import logging

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your-secret-key-change-this')
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global trader instance
trader = None

# ==========================================
# SETTINGS / API KEY MANAGEMENT
# ==========================================

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get current API key settings"""
    
    return jsonify({
        'api_key_set': os.getenv('BINANCE_API_KEY') is not None,
        'api_key': '*****' + os.getenv('BINANCE_API_KEY', '')[-4:] if os.getenv('BINANCE_API_KEY') else None
    })

@app.route('/api/settings/set-api-key', methods=['POST'])
def set_api_key():
    """
    Set API key dari web UI
    
    Request body:
    {
        "api_key": "your_api_key",
        "api_secret": "your_api_secret"
    }
    """
    
    try:
        data = request.json
        api_key = data.get('api_key')
        api_secret = data.get('api_secret')
        
        if not api_key or not api_secret:
            return jsonify({'error': 'API key and secret required'}), 400
        
        # Validate keys by making test call
        from binance.client import Client
        test_client = Client(api_key, api_secret)
        
        # Test connection
        test_client.futures_account()
        
        # Store in environment (for this session)
        # BETTER: Store encrypted in database or secure storage
        os.environ['BINANCE_API_KEY'] = api_key
        os.environ['BINANCE_API_SECRET'] = api_secret
        
        global trader
        trader = BinanceFuturesTrader()
        
        logger.info("✅ API keys validated and set successfully")
        
        return jsonify({
            'success': True,
            'message': 'API keys set successfully'
        })
    
    except Exception as e:
        logger.error(f"❌ Error setting API keys: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/settings/validate-api-key', methods=['POST'])
def validate_api_key():
    """
    Validate API key sebelum save
    """
    
    try:
        data = request.json
        api_key = data.get('api_key')
        api_secret = data.get('api_secret')
        
        from binance.client import Client
        test_client = Client(api_key, api_secret)
        
        # Test connection
        test_account = test_client.futures_account()
        
        return jsonify({
            'valid': True,
            'message': 'API keys are valid',
            'account_balance': test_account.get('totalWalletBalance')
        })
    
    except Exception as e:
        logger.error(f"❌ API validation error: {str(e)}")
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 400

# ==========================================
# PLACE ORDERS
# ==========================================

@app.route('/api/orders/place', methods=['POST'])
def place_order():
    """
    Place new order
    
    Request body:
    {
        "symbol": "BTCUSDT",
        "side": "BUY",
        "type": "LIMIT",
        "quantity": 1.0,
        "price": 45000
    }
    """
    
    global trader
    
    if not trader:
        return jsonify({'error': 'API keys not configured'}), 400
    
    try:
        data = request.json
        
        order = trader.place_future_order(
            symbol=data.get('symbol'),
            side=data.get('side'),
            order_type=data.get('type'),
            quantity=float(data.get('quantity')),
            price=float(data.get('price')) if data.get('price') else None
        )
        
        return jsonify({
            'success': True,
            'order': order
        })
    
    except Exception as e:
        logger.error(f"❌ Error placing order: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/orders/cancel', methods=['POST'])
def cancel_order():
    """
    Cancel order
    
    Request body:
    {
        "symbol": "BTCUSDT",
        "order_id": 123456789
    }
    """
    
    global trader
    
    if not trader:
        return jsonify({'error': 'API keys not configured'}), 400
    
    try:
        data = request.json
        
        result = trader.cancel_order(
            symbol=data.get('symbol'),
            order_id=int(data.get('order_id'))
        )
        
        return jsonify({
            'success': True,
            'result': result
        })
    
    except Exception as e:
        logger.error(f"❌ Error cancelling order: {str(e)}")
        return jsonify({'error': str(e)}), 400

# ==========================================
# GET ORDER HISTORY
# ==========================================

@app.route('/api/orders/open/<symbol>', methods=['GET'])
def get_open_orders(symbol=None):
    """Get open orders untuk symbol"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'API keys not configured'}), 400
    
    try:
        orders = trader.get_open_orders(symbol=symbol if symbol != 'all' else None)
        
        return jsonify({
            'success': True,
            'orders': orders
        })
    
    except Exception as e:
        logger.error(f"❌ Error getting open orders: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/orders/history/<symbol>', methods=['GET'])
def get_order_history(symbol):
    """Get order history untuk symbol"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'API keys not configured'}), 400
    
    try:
        limit = request.args.get('limit', 100, type=int)
        
        orders = trader.get_order_history(symbol=symbol, limit=limit)
        
        return jsonify({
            'success': True,
            'orders': orders
        })
    
    except Exception as e:
        logger.error(f"❌ Error getting order history: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/trades/<symbol>', methods=['GET'])
def get_trades(symbol):
    """Get executed trades untuk symbol"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'API keys not configured'}), 400
    
    try:
        limit = request.args.get('limit', 50, type=int)
        
        trades = trader.get_trades(symbol=symbol, limit=limit)
        
        return jsonify({
            'success': True,
            'trades': trades
        })
    
    except Exception as e:
        logger.error(f"❌ Error getting trades: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/positions', methods=['GET'])
def get_positions():
    """Get current positions"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'API keys not configured'}), 400
    
    try:
        symbol = request.args.get('symbol', None)
        positions = trader.get_position_info(symbol=symbol)
        
        return jsonify({
            'success': True,
            'positions': positions
        })
    
    except Exception as e:
        logger.error(f"❌ Error getting positions: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/account/balance', methods=['GET'])
def get_balance():
    """Get account balance"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'API keys not configured'}), 400
    
    try:
        account = trader.get_account_balance()
        
        return jsonify({
            'success': True,
            'account': account
        })
    
    except Exception as e:
        logger.error(f"❌ Error getting account balance: {str(e)}")
        return jsonify({'error': str(e)}), 400

# ==========================================
# STATIC PAGES
# ==========================================

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/settings')
def settings():
    """Settings page"""
    return render_template('settings.html')

@app.route('/trading')
def trading():
    """Trading page"""
    return render_template('trading.html')

@app.route('/history')
def history():
    """History page"""
    return render_template('history.html')

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
```

---

## 4. FRONTEND JAVASCRIPT

### Place Order:

```javascript
// Place order
async function placeOrder(symbol, side, type, quantity, price) {
    try {
        const response = await fetch('/api/orders/place', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symbol: symbol,
                side: side,
                type: type,
                quantity: quantity,
                price: price
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Order placed successfully!');
            console.log('Order:', data.order);
            loadOpenOrders();  // Refresh list
        } else {
            alert('❌ Error: ' + data.error);
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// HTML Form
<form id="orderForm">
    <input type="text" id="symbol" placeholder="BTCUSDT" value="BTCUSDT">
    <select id="side">
        <option>BUY</option>
        <option>SELL</option>
    </select>
    <select id="type">
        <option>LIMIT</option>
        <option>MARKET</option>
    </select>
    <input type="number" id="quantity" placeholder="Quantity" step="0.001">
    <input type="number" id="price" placeholder="Price" step="0.01">
    <button onclick="submitOrder()">Place Order</button>
</form>

<script>
function submitOrder() {
    const symbol = document.getElementById('symbol').value;
    const side = document.getElementById('side').value;
    const type = document.getElementById('type').value;
    const quantity = document.getElementById('quantity').value;
    const price = document.getElementById('price').value;
    
    placeOrder(symbol, side, type, quantity, price);
}
</script>
```

### Get Order History:

```javascript
// Get open orders
async function loadOpenOrders(symbol = 'BTCUSDT') {
    try {
        const response = await fetch(`/api/orders/open/${symbol}`);
        const data = await response.json();
        
        if (data.success) {
            displayOrders(data.orders);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Get trade history
async function loadTradeHistory(symbol = 'BTCUSDT') {
    try {
        const response = await fetch(`/api/trades/${symbol}`);
        const data = await response.json();
        
        if (data.success) {
            displayTrades(data.trades);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Display trades
function displayTrades(trades) {
    let html = '<table><tr><th>ID</th><th>Side</th><th>Qty</th><th>Price</th><th>P&L</th></tr>';
    
    trades.forEach(trade => {
        const pnl = parseFloat(trade.realizedPnl);
        const pnlClass = pnl > 0 ? 'profit' : 'loss';
        
        html += `<tr>
            <td>${trade.id}</td>
            <td>${trade.side}</td>
            <td>${trade.qty}</td>
            <td>${trade.price}</td>
            <td class="${pnlClass}">${pnl.toFixed(2)}</td>
        </tr>`;
    });
    
    html += '</table>';
    document.getElementById('tradesTable').innerHTML = html;
}
```

---

## 5. SECURITY BEST PRACTICES

### ✅ DO:

```
✓ Store API keys in environment variables (.env)
✓ Never commit .env to GitHub
✓ Use IP whitelist di Binance
✓ Restrict API permissions (Futures only)
✓ Disable Transfer/Withdrawal permissions
✓ Use separate account untuk bot
✓ Log all trades for audit
✓ Use HTTPS only
✓ Rate limit API calls
✓ Monitor account for unusual activity
```

### ❌ DON'T:

```
❌ Hardcode API keys in code
❌ Share API keys
❌ Enable Transfer/Withdrawal
❌ Use main account
❌ Push credentials to Git
❌ Use HTTP (use HTTPS)
❌ Allow unlimited connections
❌ Store keys in config files
```

### .env Example:

```
# .env file (NEVER commit this!)

BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
FLASK_SECRET_KEY=your_flask_secret_key
FLASK_ENV=production
```

### .gitignore:

```
# .gitignore

.env
.env.local
.env.*.local
*.pyc
__pycache__/
venv/
.vscode/
.idea/
```

---

## 6. TESTING

### Test Place Order:

```bash
curl -X POST http://localhost:5000/api/orders/place \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 0.001,
    "price": 45000
  }'
```

### Test Get History:

```bash
curl http://localhost:5000/api/orders/open/BTCUSDT

curl http://localhost:5000/api/trades/BTCUSDT?limit=10
```

---

## 7. ERROR HANDLING

### Common Errors:

```
400 Bad Request:
- Missing required fields
- Invalid parameters
- API keys not configured

401 Unauthorized:
- Invalid API key/secret
- API key doesn't have Futures permission

403 Forbidden:
- API key doesn't have required permissions
- IP not whitelisted

429 Too Many Requests:
- Rate limit exceeded
- Need to implement backoff

500 Server Error:
- Network issues
- Binance server issues
```

### Handle Errors:

```python
try:
    order = trader.place_future_order(...)
except binance.exceptions.BinanceAPIException as e:
    # Handle API errors
    logger.error(f"Binance error: {e.status_code} {e.message}")
except binance.exceptions.BinanceOrderException as e:
    # Handle order errors
    logger.error(f"Order error: {e}")
except Exception as e:
    # Handle other errors
    logger.error(f"Unexpected error: {e}")
```

---

## 8. RATE LIMITING

Binance futures API rate limits:
```
- Order placement: 1200 per minute
- GET requests: 2400 per minute  
- WebSocket connections: 10 per minute
```

Implement backoff:

```python
import time
from functools import wraps

def rate_limit(calls=10, period=60):
    """Decorator untuk rate limit"""
    
    min_interval = period / calls
    last_called = [0.0]
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            wait_time = min_interval - elapsed
            
            if wait_time > 0:
                time.sleep(wait_time)
            
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            
            return result
        
        return wrapper
    
    return decorator
```

---

## RINGKASAN IMPLEMENTATION

1. ✅ Create API Key dengan restricted permissions
2. ✅ Store credentials in .env
3. ✅ Implement BinanceFuturesTrader class
4. ✅ Create Flask endpoints
5. ✅ Build web UI
6. ✅ Test endpoints
7. ✅ Secure dengan HTTPS
8. ✅ Monitor and log trades

**HANYA Futures, TIDAK ada Transfer!** 🔒
