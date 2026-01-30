# Binance Futures API - Endpoint dengan Permission "Enable Reading" Saja

## Definisi Permission
- **Enable Reading (Read-Only)**: Hanya memungkinkan akses untuk membaca data, tanpa kemampuan melakukan transaksi atau perubahan

---

## ✅ ENDPOINT YANG BISA DIAKSES (Read-Only)

### 1. **Market Data Endpoints** (Tanpa API Key - Public)
- Test Connectivity
- Check Server Time
- Exchange Information
- Delist Schedule
- Order Book
- Recent Trades List
- Old Trades Lookup
- Compressed Aggregate Trades List
- Kline Candlestick Data
- Continuous Contract Kline Candlestick Data
- Index Price Kline Candlestick Data
- Mark Price Kline Candlestick Data
- Premium Index Kline Data
- Mark Price
- Get Funding Rate History
- Get Funding Info
- 24hr Ticker Price Change Statistics
- Symbol Price Ticker V2
- Symbol Order Book Ticker
- Query Delivery Price
- Open Interest
- Open Interest Statistics
- Top Trader Long Short Position Ratio
- Top Trader Long Short Account Ratio
- Long Short Ratio
- Taker Buysell Volume
- Basis
- Composite Index Symbol Information
- Multi Assets Mode Asset Index
- Query Index Price Constituents
- Query Insurance Fund Balance Snapshot
- Query ADL risk rating
- Query Trading Schedule

### 2. **Account Data Endpoints** (Memerlukan API Key dengan Read Permission)
- **Query Order**
- **Query All Orders**
- **Query Current All Open Orders**
- **Query Current Open Order**
- **Query Users Force Orders**
- **Query Account Trade List**
- **Position Information V2**
- **Position Information V3**
- **Position ADL Quantile Estimation**
- **Get Position Margin Change History**
- **Futures Account Balance V3**
- **Futures Account Balance**
- **Account Information V3**
- **Account Information**
- **Get Future Account Transaction History List**
- **User Commission Rate**
- **Query Account Configuration**
- **Query Symbol Configuration**
- **Query Order Rate Limit**
- **Notional And Leverage Brackets**
- **Get Current Multi Assets Mode**
- **Get Current Position Mode**
- **Get Income History**
- **Futures Trading Quantitative Rules Indicators**
- **Get Download Id For Futures Transaction History**
- **Get Futures Transaction History Download Link By Id**
- **Get Download Id For Futures Order History**
- **Get Futures Order History Download Link By Id**
- **Get Download Id For Futures Trade History**
- **Get Futures Trade Download Link By Id**
- **Get BNB Burn Status**

### 3. **RPI Order Book** (Public Access)
- Dapat diakses tanpa API Key

---

## ❌ ENDPOINT YANG TIDAK BISA DIAKSES (Memerlukan Trading Permission)

Endpoint-endpoint berikut memerlukan permission **"Enable Spot Trading"** atau **"Enable Futures Trading"**:

- New Order
- Place Multiple Orders
- Modify Order
- Modify Multiple Orders
- Get Order Modify History
- Cancel Order
- Cancel Multiple Orders
- Cancel All Open Orders
- Auto Cancel All Open Orders
- Test New Order
- New Algo Order
- Cancel Algo Order
- Cancel All Algo Open Orders
- Query Algo Order
- Current All Algo Open Orders
- Query All Algo Orders
- New Future Account Transfer
- Change Margin Type
- Change Position Mode
- Change Initial Leverage
- Change Multi Assets Mode
- Modify Isolated Position Margin
- Sign TradFi-Perps agreement
- Toggle BNB Burn On Futures Trade

---

## 📋 Kesimpulan

**Dengan permission "Enable Reading" saja, Anda bisa:**
- ✅ Mengakses semua endpoint market data (data umum yang tidak memerlukan API Key)
- ✅ Mengakses akun dan order history Anda sendiri (order, trades, position, balance)
- ✅ Monitoring aktivitas trading Anda
- ✅ Tracking posisi dan income

**Anda TIDAK bisa:**
- ❌ Membuat order baru
- ❌ Membatalkan order
- ❌ Mengubah posisi
- ❌ Mengubah leverage
- ❌ Melakukan transfer
- ❌ Mengubah margin type

---

## 🔒 Security Tips

1. **Gunakan IP Whitelisting**: Batasi akses API ke IP addresses spesifik
2. **Jangan Share Key**: Jangan bagikan API key dengan siapa pun
3. **Review Berkala**: Cek dan hapus API keys yang tidak digunakan
4. **Gunakan Read-Only untuk Tools**: Untuk third-party tools seperti tax reporting, gunakan read-only keys
5. **Rotate Keys**: Ganti API keys setiap 90 hari

---

## 📌 Catatan Penting

- API Key dengan permission "Enable Reading" tetap membutuhkan **Secret Key** untuk signing requests pada endpoint-endpoint yang require USER_DATA permission
- Beberapa endpoint public (seperti Order Book, Trades) tidak memerlukan API Key sama sekali
- untuk endpoint dengan user data, Anda harus authenticated dengan API Key tetapi dengan read-only access
