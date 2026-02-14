

# Accounts Page: Unified Mode Layout & Exchange-Agnostic Labels

## Problem

1. **Section title berbeda per mode** - Paper: "Paper Trading Accounts", Live: "Trading Accounts". Seharusnya sama, mode hanya konteks.
2. **Binance Details pakai Collapsible** - Seharusnya hanya title biasa "Live Trade Accounts" tanpa toggle.
3. **Label "Binance Futures" ada di section title** - Seharusnya ada di level card, karena nanti akan ada exchange lain (Bybit, OKX).

## Changes

### `src/pages/Accounts.tsx`

**1. Hapus Collapsible dari Binance section**

Ganti `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` wrapper (line 257-319) menjadi plain section dengan title "Live Trade Accounts". Detail cards selalu visible tanpa toggle.

**2. Pindahkan label exchange ke card level**

Setiap card (Wallet Balance, Available, Unrealized P&L) mendapat subtitle yang menyebut exchange-nya, contoh: "Binance Futures - USDT" bukan di title section.

**3. Samakan section title untuk kedua mode**

Hapus conditional title (line 328). Gunakan satu title: **"Trading Accounts"** untuk kedua mode. Badge `Simulated` tetap muncul di Paper mode sebagai konteks indicator.

**4. Cleanup imports**

Hapus `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `ChevronDown`, `ChevronUp`. Hapus state `binanceDetailsOpen`.

### Struktur Akhir (kedua mode identik)

```text
PageHeader
Summary Cards (Balance | Accounts | Positions)
[Live only: connection status ATAU exchange detail cards]
  -> Title: "Live Trade Accounts" (bukan collapsible)
  -> Cards: masing-masing berlabel "Binance Futures" di subtitle
Section Header: "Trading Accounts" + Badge (Paper only) + Add Account
AccountCardList (filtered by mode)
AccountComparisonTable
```

### Detail Teknis

**Binance section (Live, connected) - BEFORE:**
```typescript
<Collapsible open={binanceDetailsOpen} onOpenChange={setBinanceDetailsOpen}>
  <CollapsibleTrigger>
    <h2>Binance Futures Details</h2>
    <Badge>Live</Badge>
    <ChevronDown/Up />
  </CollapsibleTrigger>
  <CollapsibleContent>
    ...3 cards...
  </CollapsibleContent>
</Collapsible>
```

**AFTER:**
```typescript
<div className="space-y-3">
  <h2 className="text-lg font-semibold">Live Trade Accounts</h2>
  <div className="grid gap-4 md:grid-cols-3">
    <Card>
      <CardTitle>Wallet Balance</CardTitle>
      <p className="text-xs text-muted-foreground">Binance Futures</p>
    </Card>
    <Card>
      <CardTitle>Available</CardTitle>
      <p className="text-xs text-muted-foreground">Binance Futures</p>
    </Card>
    <Card>
      <CardTitle>Unrealized P&L</CardTitle>
      <p className="text-xs text-muted-foreground">Binance Futures</p>
    </Card>
  </div>
</div>
```

**Section header - BEFORE:**
```typescript
<h2>{showPaperData ? 'Paper Trading Accounts' : 'Trading Accounts'}</h2>
```

**AFTER:**
```typescript
<h2>Trading Accounts</h2>
```

