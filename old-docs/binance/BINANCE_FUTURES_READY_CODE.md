# 💻 BINANCE FUTURES API - COPY-PASTE CODE EXAMPLES

Ready-to-use code snippets untuk web app Anda

---

## FILE 1: binance_futures_trader.py

```python
# binance_futures_trader.py
# Copy-paste ini ke project Anda

from binance.client import Client
import os
from dotenv import load_dotenv
from datetime import datetime
import logging

load_dotenv()
logger = logging.getLogger(__name__)

class BinanceFuturesTrader:
    """Binance Futures API wrapper - Place orders & get history"""
    
    def __init__(self, api_key=None, api_secret=None):
        """Initialize with API keys"""
        
        self.api_key = api_key or os.getenv('BINANCE_API_KEY')
        self.api_secret = api_secret or os.getenv('BINANCE_API_SECRET')
        
        if not self.api_key or not self.api_secret:
            raise ValueError("API keys not found!")
        
        self.client = Client(self.api_key, self.api_secret)
        logger.info("✅ Binance Futures Trader initialized")
    
    def place_future_order(self, symbol, side, order_type, quantity, price=None, **kwargs):
        """
        Place order
        
        Args:
            symbol: 'BTCUSDT' (str)
            side: 'BUY' or 'SELL' (str)
            order_type: 'LIMIT' or 'MARKET' (str)
            quantity: Order quantity (float)
            price: Price for LIMIT orders (float)
        
        Returns:
            Order dict or None
        """
        
        try:
            # Validate
            if side not in ['BUY', 'SELL']:
                raise ValueError(f"Invalid side: {side}")
            
            if order_type not in ['LIMIT', 'MARKET']:
                raise ValueError(f"Invalid type: {order_type}")
            
            if order_type == 'LIMIT' and price is None:
                raise ValueError("Price required for LIMIT orders")
            
            # Build order
            order_params = {
                'symbol': symbol,
                'side': side,
                'type': order_type,
                'quantity': quantity
            }
            
            if order_type == 'LIMIT':
                order_params['price'] = price
                order_params['timeInForce'] = 'GTC'
            
            # Add extra params
            for k, v in kwargs.items():
                if k not in order_params:
                    order_params[k] = v
            
            # Place
            order = self.client.futures_create_order(**order_params)
            
            logger.info(f"✅ Order placed: {order['orderId']} {side} {quantity} {symbol} @ {price}")
            
            return {
                'success': True,
                'order': order
            }
        
        except Exception as e:
            logger.error(f"❌ Error placing order: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_order(self, symbol, order_id):
        """Cancel order"""
        
        try:
            result = self.client.futures_cancel_order(symbol=symbol, orderId=order_id)
            logger.info(f"✅ Cancelled order {order_id}")
            return {'success': True, 'order': result}
        except Exception as e:
            logger.error(f"❌ Error cancelling order: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_open_orders(self, symbol=None):
        """Get open orders"""
        
        try:
            if symbol:
                orders = self.client.futures_get_open_orders(symbol=symbol)
            else:
                orders = self.client.futures_get_open_orders()
            
            return {
                'success': True,
                'orders': orders,
                'count': len(orders)
            }
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_order_history(self, symbol, limit=100):
        """Get order history"""
        
        try:
            orders = self.client.futures_get_orders(symbol=symbol, limit=limit)
            return {
                'success': True,
                'orders': orders,
                'count': len(orders)
            }
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_trades(self, symbol, limit=50):
        """Get executed trades"""
        
        try:
            trades = self.client.futures_account_trades(symbol=symbol, limit=limit)
            
            # Calculate stats
            total_pnl = sum([float(t.get('realizedPnl', 0)) for t in trades])
            
            return {
                'success': True,
                'trades': trades,
                'count': len(trades),
                'total_pnl': total_pnl
            }
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_positions(self, symbol=None):
        """Get current positions"""
        
        try:
            account = self.client.futures_account()
            positions = account['positions']
            
            if symbol:
                positions = [p for p in positions if p['symbol'] == symbol]
            
            # Filter non-zero positions
            active_positions = [p for p in positions if float(p['positionAmt']) != 0]
            
            return {
                'success': True,
                'positions': active_positions,
                'count': len(active_positions)
            }
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_balance(self):
        """Get account balance"""
        
        try:
            account = self.client.futures_account()
            
            return {
                'success': True,
                'balance': {
                    'totalWalletBalance': float(account.get('totalWalletBalance', 0)),
                    'availableBalance': float(account.get('availableBalance', 0)),
                    'totalUnrealizedProfit': float(account.get('totalUnrealizedProfit', 0)),
                    'totalMarginRequired': float(account.get('totalMarginRequired', 0))
                }
            }
        except Exception as e:
            logger.error(f"❌ Error: {str(e)}")
            return {'success': False, 'error': str(e)}
```

---

## FILE 2: app.py (Flask Backend)

```python
# app.py
# Copy-paste ini ke project Anda

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from binance_futures_trader import BinanceFuturesTrader
import os
from dotenv import load_dotenv
import logging

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-key')
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

trader = None

# ==========================================
# INIT ROUTES
# ==========================================

@app.route('/api/init', methods=['POST'])
def init_trader():
    """Initialize trader dengan API keys"""
    
    global trader
    
    try:
        data = request.json
        api_key = data.get('api_key')
        api_secret = data.get('api_secret')
        
        if not api_key or not api_secret:
            return jsonify({'error': 'Missing API key or secret'}), 400
        
        # Test connection
        from binance.client import Client
        test_client = Client(api_key, api_secret)
        test_client.futures_account()
        
        # Save to env
        os.environ['BINANCE_API_KEY'] = api_key
        os.environ['BINANCE_API_SECRET'] = api_secret
        
        # Initialize trader
        trader = BinanceFuturesTrader(api_key, api_secret)
        
        logger.info("✅ Trader initialized")
        
        return jsonify({'success': True, 'message': 'Connected to Binance Futures'})
    
    except Exception as e:
        logger.error(f"❌ Init error: {str(e)}")
        return jsonify({'error': str(e)}), 400

# ==========================================
# PLACE ORDERS
# ==========================================

@app.route('/api/orders/place', methods=['POST'])
def place_order():
    """Place new order"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'Not initialized. Set API keys first.'}), 400
    
    try:
        data = request.json
        
        result = trader.place_future_order(
            symbol=data.get('symbol'),
            side=data.get('side'),
            order_type=data.get('type'),
            quantity=float(data.get('quantity')),
            price=float(data.get('price')) if data.get('price') else None
        )
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"❌ Order error: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/orders/cancel', methods=['POST'])
def cancel_order():
    """Cancel order"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'Not initialized'}), 400
    
    try:
        data = request.json
        
        result = trader.cancel_order(
            symbol=data.get('symbol'),
            order_id=int(data.get('order_id'))
        )
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ==========================================
# GET HISTORY
# ==========================================

@app.route('/api/orders/open', methods=['GET'])
def get_open_orders():
    """Get open orders"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'Not initialized'}), 400
    
    try:
        symbol = request.args.get('symbol', None)
        result = trader.get_open_orders(symbol=symbol)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/orders/history', methods=['GET'])
def get_order_history():
    """Get order history"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'Not initialized'}), 400
    
    try:
        symbol = request.args.get('symbol', 'BTCUSDT')
        limit = request.args.get('limit', 100, type=int)
        
        result = trader.get_order_history(symbol=symbol, limit=limit)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/trades', methods=['GET'])
def get_trades():
    """Get trades"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'Not initialized'}), 400
    
    try:
        symbol = request.args.get('symbol', 'BTCUSDT')
        limit = request.args.get('limit', 50, type=int)
        
        result = trader.get_trades(symbol=symbol, limit=limit)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/positions', methods=['GET'])
def get_positions():
    """Get positions"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'Not initialized'}), 400
    
    try:
        symbol = request.args.get('symbol', None)
        result = trader.get_positions(symbol=symbol)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/balance', methods=['GET'])
def get_balance():
    """Get balance"""
    
    global trader
    
    if not trader:
        return jsonify({'error': 'Not initialized'}), 400
    
    try:
        result = trader.get_balance()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ==========================================
# PAGES
# ==========================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/trading')
def trading():
    return render_template('trading.html')

@app.route('/history')
def history():
    return render_template('history.html')

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
```

---

## FILE 3: JavaScript API Calls

```javascript
// static/js/api.js
// Copy-paste ini ke project Anda

class BinanceAPI {
    constructor() {
        this.baseURL = '/api';
    }
    
    // Init
    async init(apiKey, apiSecret) {
        const response = await fetch(`${this.baseURL}/init`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({api_key: apiKey, api_secret: apiSecret})
        });
        return await response.json();
    }
    
    // Place order
    async placeOrder(symbol, side, type, quantity, price = null) {
        const response = await fetch(`${this.baseURL}/orders/place`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                symbol, side, type,
                quantity: parseFloat(quantity),
                price: price ? parseFloat(price) : null
            })
        });
        return await response.json();
    }
    
    // Cancel order
    async cancelOrder(symbol, orderId) {
        const response = await fetch(`${this.baseURL}/orders/cancel`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({symbol, order_id: orderId})
        });
        return await response.json();
    }
    
    // Get open orders
    async getOpenOrders(symbol = null) {
        let url = `${this.baseURL}/orders/open`;
        if (symbol) url += `?symbol=${symbol}`;
        
        const response = await fetch(url);
        return await response.json();
    }
    
    // Get order history
    async getOrderHistory(symbol, limit = 100) {
        const response = await fetch(
            `${this.baseURL}/orders/history?symbol=${symbol}&limit=${limit}`
        );
        return await response.json();
    }
    
    // Get trades
    async getTrades(symbol, limit = 50) {
        const response = await fetch(
            `${this.baseURL}/trades?symbol=${symbol}&limit=${limit}`
        );
        return await response.json();
    }
    
    // Get positions
    async getPositions(symbol = null) {
        let url = `${this.baseURL}/positions`;
        if (symbol) url += `?symbol=${symbol}`;
        
        const response = await fetch(url);
        return await response.json();
    }
    
    // Get balance
    async getBalance() {
        const response = await fetch(`${this.baseURL}/balance`);
        return await response.json();
    }
}

// Global instance
const api = new BinanceAPI();
```

---

## FILE 4: HTML Form Example

```html
<!-- templates/trading.html -->
<!-- Copy-paste HTML untuk trading form -->

<div class="trading-container">
    <h1>Binance Futures Trading</h1>
    
    <!-- API Key Section -->
    <div class="section">
        <h2>Settings</h2>
        <input type="password" id="apiKey" placeholder="API Key">
        <input type="password" id="apiSecret" placeholder="API Secret">
        <button onclick="initAPI()">Connect</button>
    </div>
    
    <!-- Place Order -->
    <div class="section">
        <h2>Place Order</h2>
        <input type="text" id="symbol" placeholder="BTCUSDT" value="BTCUSDT">
        
        <select id="side">
            <option>BUY</option>
            <option>SELL</option>
        </select>
        
        <select id="orderType">
            <option value="LIMIT">LIMIT</option>
            <option value="MARKET">MARKET</option>
        </select>
        
        <input type="number" id="quantity" placeholder="Quantity" step="0.001">
        <input type="number" id="price" placeholder="Price" step="0.01">
        
        <button onclick="placeOrder()">Place Order</button>
    </div>
    
    <!-- Open Orders -->
    <div class="section">
        <h2>Open Orders</h2>
        <button onclick="loadOpenOrders()">Refresh</button>
        <table id="openOrdersTable">
            <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </table>
    </div>
    
    <!-- Trade History -->
    <div class="section">
        <h2>Trade History</h2>
        <button onclick="loadTrades()">Refresh</button>
        <table id="tradesTable">
            <tr>
                <th>Trade ID</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Price</th>
                <th>P&L</th>
                <th>Time</th>
            </tr>
        </table>
    </div>
</div>

<script src="/static/js/api.js"></script>
<script>
    // Init API
    async function initAPI() {
        const apiKey = document.getElementById('apiKey').value;
        const apiSecret = document.getElementById('apiSecret').value;
        
        const result = await api.init(apiKey, apiSecret);
        
        if (result.success) {
            alert('✅ ' + result.message);
            loadOpenOrders();
            loadBalance();
        } else {
            alert('❌ ' + result.error);
        }
    }
    
    // Place order
    async function placeOrder() {
        const symbol = document.getElementById('symbol').value;
        const side = document.getElementById('side').value;
        const type = document.getElementById('orderType').value;
        const qty = document.getElementById('quantity').value;
        const price = document.getElementById('price').value;
        
        const result = await api.placeOrder(symbol, side, type, qty, price);
        
        if (result.success) {
            alert('✅ Order placed!');
            loadOpenOrders();
        } else {
            alert('❌ ' + result.error);
        }
    }
    
    // Load open orders
    async function loadOpenOrders() {
        const symbol = document.getElementById('symbol').value;
        const result = await api.getOpenOrders(symbol);
        
        let html = '<tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Status</th><th>Action</th></tr>';
        
        result.orders.forEach(order => {
            html += `<tr>
                <td>${order.symbol}</td>
                <td>${order.side}</td>
                <td>${order.origQty}</td>
                <td>${order.price}</td>
                <td>${order.status}</td>
                <td><button onclick="cancelOrder('${order.symbol}', ${order.orderId})">Cancel</button></td>
            </tr>`;
        });
        
        document.getElementById('openOrdersTable').innerHTML = html;
    }
    
    // Cancel order
    async function cancelOrder(symbol, orderId) {
        const result = await api.cancelOrder(symbol, orderId);
        
        if (result.success) {
            alert('✅ Order cancelled!');
            loadOpenOrders();
        } else {
            alert('❌ ' + result.error);
        }
    }
    
    // Load trades
    async function loadTrades() {
        const symbol = document.getElementById('symbol').value;
        const result = await api.getTrades(symbol);
        
        let html = '<tr><th>ID</th><th>Side</th><th>Qty</th><th>Price</th><th>P&L</th><th>Time</th></tr>';
        
        result.trades.forEach(trade => {
            const pnl = parseFloat(trade.realizedPnl);
            const pnlClass = pnl > 0 ? 'profit' : 'loss';
            
            html += `<tr>
                <td>${trade.id}</td>
                <td>${trade.side}</td>
                <td>${trade.qty}</td>
                <td>${trade.price}</td>
                <td class="${pnlClass}">${pnl.toFixed(2)}</td>
                <td>${new Date(trade.time).toLocaleString()}</td>
            </tr>`;
        });
        
        document.getElementById('tradesTable').innerHTML = html;
    }
    
    // Load balance
    async function loadBalance() {
        const result = await api.getBalance();
        
        if (result.success) {
            const bal = result.balance;
            alert(`Balance: ${bal.availableBalance} USDT`);
        }
    }
</script>
```

---

## FILE 5: requirements.txt

```
python-binance==1.0.17
Flask==2.3.0
Flask-CORS==4.0.0
python-dotenv==1.0.0
requests==2.31.0
```

---

## QUICK START

```bash
# 1. Install
pip install -r requirements.txt

# 2. Create .env
echo "BINANCE_API_KEY=your_key_here" > .env
echo "BINANCE_API_SECRET=your_secret_here" >> .env
echo "FLASK_SECRET_KEY=dev-secret" >> .env

# 3. Run
python app.py

# 4. Open browser
http://localhost:5000
```

---

**Semua code siap pakai! Copy-paste saja!** 🚀
