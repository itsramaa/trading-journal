

# Fix: Mode-Based Account Filtering

## Masalah Saat Ini

Halaman Accounts menampilkan **semua akun** di kedua mode. Seharusnya:

| Mode | Akun yang Ditampilkan | Add Account |
|------|----------------------|-------------|
| Paper | Paper accounts (`exchange: manual`) | Ya |
| Live | Exchange accounts (`exchange: binance`, dll) | Tidak |

Layout dan komponen 100% sama, hanya **data source** yang berbeda.

## Perubahan

### `src/pages/Accounts.tsx`

1. **Re-add mode filter ke `AccountCardList`**:
   - Paper mode: `backtestOnly={true}` (hanya paper accounts)
   - Live mode: `excludeBacktest={true}` (hanya exchange accounts)

2. **Conditional Add Account**: Hanya tampil di Paper mode

3. **Summary Cards**: Filter balance/count berdasarkan mode juga

```typescript
const { showPaperData } = useModeVisibility();

// Filter accounts for summary berdasarkan mode
const modeAccounts = useMemo(() => 
  (accounts || []).filter(a => {
    const paper = isPaperAccount(a);
    return showPaperData ? paper : !paper;
  }), [accounts, showPaperData]);

const totalDbBalance = useMemo(() => 
  modeAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
  [modeAccounts]);

const modeAccountsCount = modeAccounts.length;
```

```typescript
// Section Header - Add Account hanya di Paper mode
<div className="flex items-center justify-between">
  <h2 className="text-xl font-semibold">Trading Accounts</h2>
  {showPaperData && <AddAccountForm />}
</div>

// AccountCardList dengan mode filter
<AccountCardList
  filterType="trading"
  excludeBacktest={!showPaperData}
  backtestOnly={showPaperData}
  onTransact={handleTransact}
  onEdit={handleEdit}
  emptyMessage={showPaperData 
    ? "No paper accounts yet. Create one to get started." 
    : "No exchange accounts found. Connect your exchange in API Settings."}
/>
```

### Import tambahan

Tambah `isPaperAccount` dari `@/lib/account-utils` untuk filter summary cards.

### File

| File | Perubahan |
|------|-----------|
| `src/pages/Accounts.tsx` | Re-add mode filter, conditional Add Account, filter summary by mode |

`AccountCardList.tsx` tidak perlu diubah -- props `excludeBacktest`/`backtestOnly` sudah berfungsi dengan benar.

