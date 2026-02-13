
# Fix: Closed Trades Menampilkan "..." — Tabs Content Hilang

## Root Cause

Line 541-543 di `src/pages/TradeHistory.tsx` berisi literal `...` sebagai konten `<Tabs>`:

```tsx
<Tabs defaultValue="all" className="w-full">
...
</Tabs>
```

Ini terjadi karena pada edit sebelumnya, Tabs content (TabsList + 3 TabsContent) **terhapus** dan diganti literal `...`. Akibatnya, user melihat "..." di bawah "Closed Trades" header, tanpa trade list yang sebenarnya ter-render.

## Fix

Ganti `...` di dalam `<Tabs>` dengan konten lengkap:

### File: `src/pages/TradeHistory.tsx` (line 541-543)

Replace:
```tsx
<Tabs defaultValue="all" className="w-full">
...
</Tabs>
```

With:
```tsx
<Tabs defaultValue="all" className="w-full">
  <TabsList className="mb-4">
    <TabsTrigger value="all">
      All ({sortedTrades.length})
    </TabsTrigger>
    <TabsTrigger value="binance">
      Binance ({binanceTrades.length})
    </TabsTrigger>
    <TabsTrigger value="paper">
      Paper ({paperTrades.length})
    </TabsTrigger>
  </TabsList>

  <TabsContent value="all">
    <div className={cn(
      "transition-opacity duration-200",
      isFetching && !isLoading && "opacity-60"
    )}>
      {renderTradeList(sortedTrades)}
    </div>
  </TabsContent>

  <TabsContent value="binance">
    <div className={cn(
      "transition-opacity duration-200",
      isFetching && !isLoading && "opacity-60"
    )}>
      {renderTradeList(binanceTrades)}
    </div>
  </TabsContent>

  <TabsContent value="paper">
    <div className={cn(
      "transition-opacity duration-200",
      isFetching && !isLoading && "opacity-60"
    )}>
      {renderTradeList(paperTrades)}
    </div>
  </TabsContent>
</Tabs>
```

## Impact

- 114 trades akan tampil kembali di Closed Trades section
- Tabs All/Binance/Paper berfungsi dengan counter per tab
- Anti-blink opacity transition tetap diterapkan pada setiap tab content
- Hanya 1 file yang diubah, 1 lokasi (line 541-543)
