

# Accounts: Layout Parity Between Paper & Live

## Problem

Live mode masih punya section ekstra "Live Trade Accounts" (3 Binance cards: Wallet Balance, Available, Unrealized P&L) yang tidak ada di Paper mode. Ini melanggar prinsip "layout identik, data beda".

## Changes pada `src/pages/Accounts.tsx`

### 1. Hapus seluruh Binance Connection Section (line 224-312)

Hapus block `{showExchangeData && (...)}` yang berisi:
- `BinanceNotConfiguredState` card
- Connection Error card  
- "Live Trade Accounts" section dengan 3 detail cards

Data Binance (balance, positions, unrealized P&L) sudah ditampilkan di **Summary Cards** di atas (Balance, Accounts, Open Positions). Section ini duplikasi.

### 2. Hide "Add Account" di Live mode (line 325)

Ganti:
```typescript
<AddAccountForm defaultIsBacktest={showPaperData} />
```
Menjadi:
```typescript
{showPaperData && <AddAccountForm defaultIsBacktest={true} />}
```

Live mode tidak perlu Add Account karena akun Live di-manage via exchange API.

### 3. Cleanup imports

Hapus yang tidak lagi dipakai:
- `XCircle` dari lucide-react
- `BinanceNotConfiguredState`
- `Skeleton` (masih dipakai di summary cards, keep)

### Struktur Akhir (identik kedua mode)

```text
PageHeader
Summary Cards (Balance | Accounts | Positions)
Section Header: "Trading Accounts" + Badge (Paper) + [Add Account hanya Paper]
AccountCardList (filtered by mode)
AccountComparisonTable
```

### File

| File | Change |
|------|--------|
| `src/pages/Accounts.tsx` | Hapus Binance section, hide Add Account di Live |

