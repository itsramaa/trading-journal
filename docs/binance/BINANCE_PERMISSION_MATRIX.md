# Binance Futures API - Detailed Permission Matrix

## API Security Types Explanation

```
NONE        = Endpoint public, tidak perlu API Key
READING     = Memerlukan API Key dengan permission "Enable Reading"
TRADE       = Memerlukan API Key dengan permission trading
USER_DATA   = Memerlukan API Key dengan read permission untuk akses data user
MARGIN      = Memerlukan API Key dengan margin trading permission
INTERNAL_TRANSFER = Khusus untuk transfer antar akun
```

---

## 📊 Endpoint Breakdown Berdasarkan Permission

### 🟢 ENDPOINT PUBLIK (NONE - Tidak perlu API Key)

Kategori: **Market Data & General Information**

| Endpoint | Type | Deskripsi |
|----------|------|-----------|
| Test Connectivity | GET | Tes koneksi ke API |
| Check Server Time | GET | Ambil server time saat ini |
| Exchange Information | GET | Info exchange, symbol list, filters |
| Delist Schedule | GET | Jadwal delisting aset |
| Order Book | GET | Baca order book (depth) |
| RPI Order Book | GET | Restricted Platform Index order book |
| Recent Trades List | GET | Daftar trades terbaru |
| Old Trades Lookup | GET | Historical trades |
| Compressed Aggregate Trades List | GET | Aggreagted trades |
| Kline Candlestick Data | GET | Candlestick/OHLC data |
| Continuous Contract Kline Data | GET | Candlestick continuous contracts |
| Index Price Kline Data | GET | Candlestick index price |
| Mark Price Kline Data | GET | Candlestick mark price |
| Premium Index Kline Data | GET | Candlestick premium index |
| Mark Price | GET | Mark price saat ini |
| Get Funding Rate History | GET | History funding rate |
| Get Funding Info | GET | Info funding rate terbaru |
| 24hr Ticker Price Change | GET | Statistik perubahan 24 jam |
| Symbol Price Ticker V2 | GET | Harga ticker simbol terbaru |
| Symbol Order Book Ticker | GET | Ticker dengan bid/ask terbaik |
| Query Delivery Price | GET | Harga delivery |
| Open Interest | GET | Open interest data |
| Open Interest Statistics | GET | Statistik open interest |
| Top Trader Long Short Position Ratio | GET | Rasio posisi top traders |
| Top Trader Long Short Account Ratio | GET | Rasio akun top traders |
| Long Short Ratio | GET | Rasio long/short |
| Taker Buysell Volume | GET | Volume buy/sell taker |
| Basis | GET | Data basis |
| Composite Index Symbol Information | GET | Info composite index |
| Multi Assets Mode Asset Index | GET | Asset index untuk multi-assets |
| Query Index Price Constituents | GET | Konstituent index price |
| Query Insurance Fund Balance Snapshot | GET | Snapshot insurance fund |
| Query ADL Risk Rating | GET | Rating risiko ADL |
| Query Trading Schedule | GET | Jadwal trading |

---

### 🟡 ENDPOINT USER_DATA (Memerlukan API Key + Read Permission)

Kategori: **Account & Order Information**

| Endpoint | Method | Type | Deskripsi |
|----------|--------|------|-----------|
| Query Order | GET | USER_DATA | Cek detail 1 order |
| Query All Orders | GET | USER_DATA | Ambil semua order (filled & unfilled) |
| Query Current All Open Orders | GET | USER_DATA | Ambil semua open orders |
| Query Current Open Order | GET | USER_DATA | Cek open order spesifik |
| Query Users Force Orders | GET | USER_DATA | Ambil force orders (liquidation) |
| Query Account Trade List | GET | USER_DATA | Daftar trades akun |
| Position Information V2 | GET | USER_DATA | Info posisi (versi 2) |
| Position Information V3 | GET | USER_DATA | Info posisi (versi 3 - lebih baru) |
| Position ADL Quantile Estimation | GET | USER_DATA | Estimasi ADL quantile |
| Get Position Margin Change History | GET | USER_DATA | History perubahan margin posisi |
| Futures Account Balance V3 | GET | USER_DATA | Balance akun futures (v3) |
| Futures Account Balance | GET | USER_DATA | Balance akun futures |
| Account Information V3 | GET | USER_DATA | Info akun lengkap (v3) |
| Account Information | GET | USER_DATA | Info akun lengkap |
| Get Future Account Transaction History | GET | USER_DATA | History transaksi akun |
| User Commission Rate | GET | USER_DATA | Komisi trading akun |
| Query Account Configuration | GET | USER_DATA | Konfigurasi akun |
| Query Symbol Configuration | GET | USER_DATA | Konfigurasi per symbol |
| Query Order Rate Limit | GET | USER_DATA | Rate limit per order |
| Notional And Leverage Brackets | GET | USER_DATA | Bracket notional & leverage |
| Get Current Multi Assets Mode | GET | USER_DATA | Status multi-asset mode |
| Get Current Position Mode | GET | USER_DATA | Mode posisi (one-way/hedge) |
| Get Income History | GET | USER_DATA | History income (funding, trading) |
| Futures Trading Quantitative Rules | GET | USER_DATA | Rule untuk quantitative trading |
| Get Download Id For Futures Transaction History | GET | USER_DATA | Ambil download ID history transaksi |
| Get Futures Transaction History Download Link | GET | USER_DATA | Ambil link download transaksi |
| Get Download Id For Futures Order History | GET | USER_DATA | Ambil download ID order history |
| Get Futures Order History Download Link | GET | USER_DATA | Ambil link download order |
| Get Download Id For Futures Trade History | GET | USER_DATA | Ambil download ID trade history |
| Get Futures Trade Download Link | GET | USER_DATA | Ambil link download trade |
| Get BNB Burn Status | GET | USER_DATA | Status BNB burn setting |

**Total Endpoint USER_DATA yang bisa diakses dengan Read-Only: 34 endpoints**

---

### 🔴 ENDPOINT TRADE (Memerlukan Trading Permission - TIDAK BISA dengan Read-Only)

Kategori: **Order Management & Trading Operations**

| Endpoint | Method | Type | Deskripsi |
|----------|--------|------|-----------|
| New Order | POST | TRADE | Buat order baru |
| Place Multiple Orders | POST | TRADE | Buat multiple orders sekaligus |
| Modify Order | PUT | TRADE | Modify order yang ada |
| Modify Multiple Orders | PUT | TRADE | Modify multiple orders |
| Get Order Modify History | GET | TRADE | Lihat history modifikasi order |
| Cancel Order | DELETE | TRADE | Batalkan order |
| Cancel Multiple Orders | DELETE | TRADE | Batalkan multiple orders |
| Cancel All Open Orders | DELETE | TRADE | Batalkan semua open orders |
| Auto Cancel All Open Orders | POST | TRADE | Set auto cancel untuk semua orders |
| Test New Order | POST | TRADE | Test order placement (dry-run) |
| New Algo Order | POST | TRADE | Buat conditional/algo order |
| Cancel Algo Order | DELETE | TRADE | Batalkan algo order |
| Cancel All Algo Open Orders | DELETE | TRADE | Batalkan semua algo orders |
| Query Algo Order | GET | TRADE | Cek detail algo order |
| Current All Algo Open Orders | GET | TRADE | Lihat semua open algo orders |
| Query All Algo Orders | GET | TRADE | Lihat semua algo orders (historical) |

---

### 🔴 ENDPOINT ACCOUNT (Memerlukan Margin/Futures Trading Permission - TIDAK BISA dengan Read-Only)

Kategori: **Account Configuration & Management**

| Endpoint | Method | Type | Deskripsi |
|----------|--------|------|-----------|
| Change Margin Type | POST | TRADE | Ubah margin type (isolated/cross) |
| Change Position Mode | POST | TRADE | Ubah position mode (one-way/hedge) |
| Change Initial Leverage | POST | TRADE | Ubah initial leverage |
| Change Multi Assets Mode | POST | TRADE | Enable/disable multi-assets mode |
| Modify Isolated Position Margin | POST | TRADE | Tambah/kurangi margin posisi isolated |
| Sign TradFi-Perps Agreement | POST | TRADE | Sign agreement untuk TradFi-Perps |
| Toggle BNB Burn On Futures Trade | POST | TRADE | Aktifkan/nonaktifkan BNB burn |

---

### 🔴 ENDPOINT TRANSFER (Memerlukan Transfer Permission - TIDAK BISA dengan Read-Only)

Kategori: **Account Transfer Operations**

| Endpoint | Method | Type | Deskripsi |
|----------|--------|------|-----------|
| New Future Account Transfer | POST | TRANSFER | Transfer antar akun futures |

---

## 📈 Statistik Permission Usage

```
✅ Dengan Permission "Enable Reading":
   - Public Endpoints (NONE):      34 endpoints
   - USER_DATA Endpoints:          34 endpoints
   - Total:                        68 endpoints
   
❌ Memerlukan Permission Lain:
   - TRADE Endpoints:              16 endpoints
   - ACCOUNT Endpoints:            7 endpoints
   - TRANSFER Endpoints:           1 endpoint
   - Total:                        24 endpoints
```

---

## 🎯 Contoh Use Cases dengan Read-Only Permission

### ✅ Bisa Dilakukan:
- Monitoring portfolio dan positions
- Tracking order history dan fills
- Analisis trading performance
- Check balance dan margin status
- Monitor funding rate history
- Lihat leverage brackets
- Download trading history untuk tax reporting
- Monitor market data real-time
- Tracking P&L

### ❌ TIDAK Bisa Dilakukan:
- Membuka/menutup position baru
- Memodifikasi orders yang existing
- Mengubah leverage atau margin
- Melakukan transfers
- Setting up algo/conditional orders

---

## 🔑 Implementasi Praktis

### Setup API Key Read-Only di Binance:

1. Buka Binance.com → Account → API Management
2. Create New Key
3. Edit Restriction:
   - ✅ Enable Reading
   - ❌ Disable Spot Trading
   - ❌ Disable Margin Trading
   - ❌ Disable Futures Trading
   - ❌ Disable Withdrawals
4. Set IP Whitelist (optional tapi recommended)
5. Confirm via email

### Contoh Kode Python:

```python
from binance.um_futures import UMFutures

client = UMFutures(
    key="your_api_key",
    secret="your_secret_key"
)

# Endpoint yang bisa diakses:
account = client.account()  # ✅ Works
positions = client.get_position()  # ✅ Works
orders = client.get_orders(symbol="BTCUSDT")  # ✅ Works

# Endpoint yang TIDAK bisa:
# client.new_order(symbol="BTCUSDT", side="BUY", ...)  # ❌ Akan error
```

---

## ⚠️ Error yang Akan Muncul Jika Coba Akses Trading Endpoint

```
APIError(code=-2015): "Invalid API-key, IP, or permissions for action"
```

Artinya: API key tidak memiliki permission untuk endpoint tersebut.

