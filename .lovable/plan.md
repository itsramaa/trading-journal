

# Fix: Data Mismatch di Accounts Page (Paper vs Live)

## Root Cause

Semua akun di database memiliki `exchange: manual` → semuanya dianggap "paper account". Ketika mode Live aktif, filter `excludeBacktest={true}` membuang SEMUA akun, sehingga:
- **Summary Cards**: Menampilkan data Binance API (benar)
- **AccountCardList**: Kosong (ngaco - tidak ada akun live di DB)
- **AccountComparisonTable**: Kosong juga

Masalah utama: **tidak ada mekanisme untuk menampilkan akun live dari Binance sebagai card**.

## Solusi

Karena user ingin layout 100% identik antara Paper dan Live (hanya data beda), kita perlu:

### 1. Hapus filter Paper/Live di `AccountCardList`

Ganti props `excludeBacktest` / `backtestOnly` menjadi menampilkan **semua akun** di kedua mode. Akun yang ada di DB tetap ditampilkan tanpa filter mode.

```typescript
// BEFORE (di Accounts.tsx)
<AccountCardList
  filterType="trading"
  excludeBacktest={!showPaperData}  // Live: hide paper
  backtestOnly={showPaperData}      // Paper: only paper
/>

// AFTER
<AccountCardList
  filterType="trading"
  onTransact={handleTransact}
  onEdit={handleEdit}
  emptyMessage="No trading accounts yet."
/>
```

### 2. Update Summary Cards agar konsisten

Summary cards harus menampilkan data yang sesuai dengan apa yang ditampilkan di card list (semua akun), bukan data per-mode. Karena semua akun saat ini adalah paper, summary harus mencerminkan total balance dari semua akun DB + data Binance jika connected.

| Metric | Value |
|--------|-------|
| Balance | Total semua akun DB (+ Binance balance jika connected) |
| Accounts | Jumlah semua akun DB (+ 1 jika Binance connected) |
| Open Positions | Paper open trades + Binance positions |

### 3. Simplify `AccountCardList` filter logic

Hapus props `excludeBacktest` dan `backtestOnly` karena tidak lagi diperlukan di halaman Accounts. Filter hanya berdasarkan `filterType`.

### 4. Update `AccountComparisonTable`

Hapus filter `tradeMode` agar menampilkan comparison semua akun yang punya trades, regardless of mode.

## Files yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/Accounts.tsx` | Hapus filter mode di AccountCardList, simplify summary cards |
| `src/components/accounts/AccountCardList.tsx` | Hapus props `excludeBacktest`/`backtestOnly`, tampilkan semua akun |
| `src/components/accounts/AccountComparisonTable.tsx` | Hapus filter tradeMode |

## Catatan

- Props `excludeBacktest`/`backtestOnly` tetap ada di `AccountCardList` dan `AccountSelect` untuk backward compatibility (dipakai di komponen lain), tapi di halaman Accounts tidak lagi digunakan.
- Ke depan, jika user menambahkan akun dengan exchange selain `manual` (misal `binance`), akun tersebut otomatis muncul sebagai akun Live.

