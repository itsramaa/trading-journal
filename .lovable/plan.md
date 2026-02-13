

# Update Deriverse Program ID & Submission Readiness

## Konteks

Dari informasi bounty listing, sponsor memberikan **PROGRAM_ID resmi**:
```
CDESjex4EDBKLwx9ZPzVbjiHEHatasb5fhSJZMzNfvw2 (VERSION=6)
```

Saat ini kode menggunakan placeholder program IDs yang **salah**:
- `DRVRsJB1VczKWjYL4vBXCNvDWPdDPcFiRPGTQE5tfgfV`
- `DeRvCoT3GH5E6UeDWnUKSaQNzTDW3PiGAUPnqL8yVhSm`

## Perubahan yang Diperlukan

### 1. Update Program ID (Critical)

**File:** `src/services/solana-trade-parser.ts`

- Ganti `DERIVERSE_PROGRAM_IDS` dengan program ID resmi: `CDESjex4EDBKLwx9ZPzVbjiHEHatasb5fhSJZMzNfvw2`
- Tambahkan konstanta `DERIVERSE_VERSION = 6`
- Update `KNOWN_DEX_PROGRAMS` mapping untuk program ID baru
- Hapus placeholder IDs lama

### 2. Update Import Page Labels

**File:** `src/pages/ImportTrades.tsx`

- Update `SUPPORTED_DEXS` array: pastikan Deriverse entry menampilkan program ID resmi (opsional, sebagai tooltip/info)

### 3. Update Dokumentasi

**File:** `docs/JUDGING_CRITERIA_EVALUATION.md` dan/atau `docs/scope-coverage-map.md`

- Catat program ID resmi yang digunakan
- Tambahkan note bahwa integrasi menggunakan VERSION=6

## Detail Teknis

### solana-trade-parser.ts changes:

```typescript
// BEFORE
const DERIVERSE_PROGRAM_IDS = [
  'DRVRsJB1VczKWjYL4vBXCNvDWPdDPcFiRPGTQE5tfgfV',
  'DeRvCoT3GH5E6UeDWnUKSaQNzTDW3PiGAUPnqL8yVhSm',
];

// AFTER
const DERIVERSE_PROGRAM_ID = 'CDESjex4EDBKLwx9ZPzVbjiHEHatasb5fhSJZMzNfvw2';
const DERIVERSE_VERSION = 6;
const DERIVERSE_PROGRAM_IDS = [DERIVERSE_PROGRAM_ID];
```

- `KNOWN_DEX_PROGRAMS`: hapus 2 entry lama, tambahkan entry baru dengan key `CDESjex4EDBKLwx9ZPzVbjiHEHatasb5fhSJZMzNfvw2` -> `'Deriverse'`
- Fungsi `getDeriverseProgramIds()` dan `isDeriverseTransaction()` tetap bekerja tanpa perubahan karena mengacu ke array `DERIVERSE_PROGRAM_IDS`

### Catatan Penting

- Parsing logic (token balance analysis, direction detection, PnL calculation) **tidak perlu berubah** -- hanya program ID filter yang diupdate
- Karena SDK/demo address belum tersedia, parser tetap menggunakan pendekatan generic (token balance diff) yang akan bekerja dengan program ID manapun
- Mock data flow yang sudah ada tetap valid untuk testing

## Estimasi

Perubahan kecil, ~3 file, fokus pada konstanta dan label. Tidak ada perubahan arsitektur.

