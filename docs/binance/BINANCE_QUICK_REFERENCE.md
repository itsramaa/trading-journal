# Quick Reference: Binance API dengan Permission "Enable Reading"

## 📋 Endpoint yang BISA Diakses

### Kategori 1: PUBLIC MARKET DATA (Tidak perlu API Key)
Semua endpoint market data berikut dapat diakses tanpa API Key:
- ✅ Test Connectivity
- ✅ Check Server Time  
- ✅ Exchange Information
- ✅ Delist Schedule
- ✅ Order Book
- ✅ RPI Order Book
- ✅ Recent Trades List
- ✅ Old Trades Lookup
- ✅ Compressed Aggregate Trades List
- ✅ Kline Candlestick Data (semua variasi: regular, continuous, index, mark, premium)
- ✅ Mark Price
- ✅ Get Funding Rate History
- ✅ Get Funding Info
- ✅ 24hr Ticker Price Change Statistics
- ✅ Symbol Price Ticker V2
- ✅ Symbol Order Book Ticker
- ✅ Query Delivery Price
- ✅ Open Interest (dan statistiknya)
- ✅ Top Trader Long Short Position/Account Ratio
- ✅ Long Short Ratio
- ✅ Taker Buysell Volume
- ✅ Basis
- ✅ Composite Index Symbol Information
- ✅ Multi Assets Mode Asset Index
- ✅ Query Index Price Constituents
- ✅ Query Insurance Fund Balance Snapshot
- ✅ Query ADL Risk Rating
- ✅ Query Trading Schedule

**Total: 34 endpoint publik**

---

### Kategori 2: ACCOUNT & ORDER HISTORY (Memerlukan API Key Read-Only)
Dengan API Key yang hanya punya permission "Enable Reading":

**Balance & Account Info:**
- ✅ Futures Account Balance (V3 & regular)
- ✅ Account Information (V3 & regular)
- ✅ Get Current Position Mode
- ✅ Get Current Multi Assets Mode
- ✅ User Commission Rate

**Position & Order History:**
- ✅ Position Information (V2 & V3)
- ✅ Query All Orders
- ✅ Query Current All Open Orders
- ✅ Query Current Open Order
- ✅ Query Order (by ID)
- ✅ Query Account Trade List
- ✅ Get Order Modify History

**History & Analytics:**
- ✅ Query Users Force Orders
- ✅ Position ADL Quantile Estimation
- ✅ Get Position Margin Change History
- ✅ Get Income History
- ✅ Get Future Account Transaction History
- ✅ Query Account Configuration
- ✅ Query Symbol Configuration
- ✅ Query Order Rate Limit
- ✅ Notional And Leverage Brackets
- ✅ Futures Trading Quantitative Rules
- ✅ Query Algo Order (history)
- ✅ Current All Algo Open Orders (history)
- ✅ Query All Algo Orders (historical)
- ✅ Get BNB Burn Status

**Download History:**
- ✅ Get Download Id For Futures Transaction History
- ✅ Get Futures Transaction History Download Link By Id
- ✅ Get Download Id For Futures Order History
- ✅ Get Futures Order History Download Link By Id
- ✅ Get Download Id For Futures Trade History
- ✅ Get Futures Trade Download Link By Id

**Total: 34 endpoint akun**

---

## 🚫 Endpoint yang TIDAK BISA Diakses

### Kategori 1: ORDER PLACEMENT & MANAGEMENT (Memerlukan TRADE Permission)
- ❌ New Order
- ❌ Place Multiple Orders
- ❌ Modify Order
- ❌ Modify Multiple Orders
- ❌ Cancel Order
- ❌ Cancel Multiple Orders
- ❌ Cancel All Open Orders
- ❌ Auto Cancel All Open Orders
- ❌ Test New Order
- ❌ New Algo Order
- ❌ Cancel Algo Order
- ❌ Cancel All Algo Open Orders

**Total: 12 endpoint trading**

---

### Kategori 2: ACCOUNT CONFIGURATION (Memerlukan TRADE Permission)
- ❌ Change Margin Type
- ❌ Change Position Mode
- ❌ Change Initial Leverage
- ❌ Change Multi Assets Mode
- ❌ Modify Isolated Position Margin
- ❌ Sign TradFi-Perps Agreement
- ❌ Toggle BNB Burn On Futures Trade

**Total: 7 endpoint konfigurasi**

---

### Kategori 3: TRANSFER (Memerlukan INTERNAL_TRANSFER Permission)
- ❌ New Future Account Transfer

**Total: 1 endpoint transfer**

---

## 📊 Summary Table

| Kategori | Jumlah | Status |
|----------|--------|--------|
| Public Market Data | 34 | ✅ Bisa (tanpa API Key) |
| Account & History | 34 | ✅ Bisa (dengan Read-Only Key) |
| **Total Bisa Diakses** | **68** | **✅** |
| Order Placement | 12 | ❌ Tidak bisa |
| Account Config | 7 | ❌ Tidak bisa |
| Transfer | 1 | ❌ Tidak bisa |
| **Total Tidak Bisa** | **20** | **❌** |

---

## 🎯 Keputusan Singkat

**Gunakan Read-Only Permission untuk:**
- ✅ Monitoring portfolio
- ✅ Tracking order history
- ✅ Analisis performance
- ✅ Tax reporting
- ✅ Portfolio dashboard apps
- ✅ Analytics tools
- ✅ Risk monitoring

**Jangan gunakan untuk:**
- ❌ Trading bots
- ❌ Auto-order systems
- ❌ Leverage/margin adjustments
- ❌ Risk management dengan automated changes

---

## 🔐 Security Best Practice

**Untuk aplikasi pihak ketiga:**
```
Tax Reporting Tool     → Use Read-Only API Key
Portfolio Dashboard    → Use Read-Only API Key
Trading Bot           → Use Full Trading Key (TIDAK read-only)
Mobile Monitoring App → Use Read-Only API Key
```

**Setup yang aman:**
1. Create API Key untuk Read-Only dengan IP whitelist
2. Hanya share read-only key ke third-party tools
3. Keep full trading key untuk internal/trading bots saja
4. Rotate keys setiap 90 hari

