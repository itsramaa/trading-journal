

# Fix Rate Limit Log & Add Data Count to Sync Log

## Temuan

1. **Log "weight used" misleading**: Pesan `Rate limit: 5/1200 weight used` tidak menjelaskan bahwa ini per 30-detik window, bukan per request.
2. **Data count tidak muncul di log**: Ketika request mengembalikan data (misal 500 trades), jumlahnya tidak ditampilkan di sync log view.

## Perubahan

**File:** `src/hooks/binance/use-binance-aggregated-sync.ts`

### Lokasi: Lines 90-95

**Dari:**
```typescript
if (result.usedWeight) {
  const addLog = useSyncStore.getState().addSyncLog;
  const level = result.usedWeight > 900 ? 'warn' : 'info';
  addLog(`Rate limit: ${result.usedWeight}/1200 weight used`, level);
}
```

**Menjadi:**
```typescript
if (result.usedWeight) {
  const addLog = useSyncStore.getState().addSyncLog;
  const level = result.usedWeight > 900 ? 'warn' : 'info';
  const dataCount = Array.isArray(result.data) ? result.data.length : 0;
  const dataInfo = dataCount > 0 ? ` | ${dataCount} records fetched` : '';
  addLog(`Rate limit: ${result.usedWeight}/1200 weight (per 30s window)${dataInfo}`, level);
}
```

### Hasil di Log Panel

- **Ada data:** `Rate limit: 5/1200 weight (per 30s window) | 500 records fetched`
- **Tidak ada data:** `Rate limit: 5/1200 weight (per 30s window)`

## Detail Teknis

- `result.data` sudah tersedia di `ApiResponse<T>` (field optional)
- `Array.isArray` guard untuk memastikan data adalah array sebelum `.length`
- Hanya 1 file yang perlu diubah, 1 lokasi (line 90-95)

