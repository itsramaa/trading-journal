
# Plan: Searchable Trading Pairs Combobox

## Overview

Membuat komponen `TradingPairCombobox` yang dapat dicari (searchable) untuk memudahkan pemilihan dari 673 trading pairs yang sudah di-sync dari Binance.

## Problem

Saat ini dropdown Select dengan 673 pairs sangat sulit digunakan:
- User harus scroll manual untuk mencari pair
- Tidak ada fitur filter/search
- UX buruk untuk dataset besar

## Solution

Buat komponen **Combobox** menggunakan `cmdk` (Command) yang sudah ada di project dengan fitur:
- Searchable input
- Filtered results berdasarkan ketikan
- Empty state jika tidak ditemukan
- Support untuk controlled value

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ui/trading-pair-combobox.tsx` | **CREATE** - Komponen reusable |
| `src/components/trade/entry/TradeDetails.tsx` | Update to use Combobox |
| `src/pages/AIAssistant.tsx` | Update to use Combobox |
| `src/pages/trading-journey/TradingJournal.tsx` | Update to use Combobox |
| `src/pages/trading-journey/SessionDetail.tsx` | Update to use Combobox |

## New Component: TradingPairCombobox

```typescript
// src/components/ui/trading-pair-combobox.tsx
interface TradingPairComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TradingPairCombobox({ 
  value, 
  onValueChange, 
  placeholder = "Select pair...",
  disabled 
}: TradingPairComboboxProps) {
  const [open, setOpen] = useState(false);
  const { data: tradingPairs, isLoading } = useTradingPairs();
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search pair..." />
          <CommandList>
            <CommandEmpty>No pair found.</CommandEmpty>
            <CommandGroup>
              {tradingPairs?.map((pair) => (
                <CommandItem
                  key={pair.symbol}
                  value={pair.symbol}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === pair.symbol ? "opacity-100" : "opacity-0")} />
                  {pair.symbol}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

## Integration Points

### 1. TradeDetails.tsx (Step 3 of Wizard)

```tsx
// Before
<Select value={form.watch("pair")} onValueChange={(v) => form.setValue("pair", v)}>
  <SelectTrigger>...</SelectTrigger>
  <SelectContent>{pairs.map(...)}</SelectContent>
</Select>

// After
<TradingPairCombobox
  value={form.watch("pair")}
  onValueChange={(v) => form.setValue("pair", v)}
  placeholder="Select trading pair"
/>
```

### 2. AIAssistant.tsx

```tsx
// Before: Select with 673 pairs
<Select value={checkerPair} onValueChange={setCheckerPair}>...</Select>

// After
<TradingPairCombobox
  value={checkerPair}
  onValueChange={setCheckerPair}
  placeholder="Select pair"
/>
```

### 3. TradingJournal.tsx (Quick Entry Dialog)

```tsx
<TradingPairCombobox
  value={form.watch("pair") || ""}
  onValueChange={(v) => form.setValue("pair", v)}
/>
```

### 4. SessionDetail.tsx (Add Trade Dialog)

```tsx
<TradingPairCombobox
  value={form.watch("pair") || ""}
  onValueChange={(v) => form.setValue("pair", v)}
/>
```

## UX Features

1. **Type-to-search**: Ketik "BTC" untuk filter hanya pairs dengan "BTC"
2. **Keyboard navigation**: Arrow up/down untuk navigate, Enter untuk select
3. **Clear selection**: Klik pair yang sama untuk deselect
4. **Empty state**: Pesan "No pair found" jika search tidak menemukan hasil
5. **Loading state**: Skeleton/placeholder saat pairs loading
6. **Sync reminder**: Jika pairs kosong, tampilkan tombol sync

## Visual Design

```text
┌─────────────────────────────────────┐
│ BTCUSDT                           ▼ │  ← Trigger button
└─────────────────────────────────────┘
       ↓ Click opens
┌─────────────────────────────────────┐
│ 🔍 Search pair...                   │  ← Search input
├─────────────────────────────────────┤
│ ✓ BTCUSDT                           │  ← Selected item
│   ETHUSDT                           │
│   BNBUSDT                           │
│   SOLUSDT                           │
│   XRPUSDT                           │
│   ...                               │
└─────────────────────────────────────┘
```

## Technical Details

### Command Search Behavior

`cmdk` sudah built-in fuzzy search, jadi:
- Ketik "btc" → matches BTCUSDT, BTCBUSD, etc.
- Ketik "eth" → matches ETHUSDT, ETHBUSD, etc.
- Case insensitive

### Performance

- 673 pairs rendered di `CommandList` dengan virtual scrolling
- Search filtering dilakukan di client-side oleh cmdk
- Data di-cache dengan `staleTime: 1 hour` dari React Query

## Summary

| Before | After |
|--------|-------|
| Plain dropdown dengan 673 items | Searchable combobox |
| Scroll manual untuk cari pair | Type untuk filter |
| Tidak ada keyboard nav | Full keyboard support |
| Sulit menemukan pair | Instant search results |
