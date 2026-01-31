
# Plan: Fix Sidebar Group Persistence, Market Data Widgets & Advanced Heatmap

## Ringkasan Masalah

### 1. Sidebar Group Collapse State Tidak Persist
**Root Cause**: `NavGroup` menggunakan `useState(defaultOpen)` yang di-inisialisasi ulang setiap render/navigasi karena:
- `defaultOpen={true}` selalu di-pass dari `AppSidebar`
- State collapse per-group tidak disimpan ke localStorage

**Solusi**: Buat sistem persistence untuk setiap group collapse state:
- Simpan state collapse tiap group ke localStorage dengan key unik per group title
- Inisialisasi state dari localStorage saat mount

### 2. Whale Tracking & Trading Opportunities Tidak Menampilkan Data
**Root Cause**: Data dari API `market-insight` menggunakan format berbeda:
- Whale: `{ asset: 'BTC' }` - bukan `'BTCUSDT'`
- Opportunities: `{ pair: 'BTC/USDT' }` - bukan `'BTCUSDT'`

Setelah review ulang, logika filter sudah benar tapi perlu dipastikan data tersedia. Jika API tidak mengembalikan data untuk top 5, widget akan kosong.

**Catatan**: Konsep Volatility Meter menggunakan hook `useMultiSymbolVolatility` yang fetch data langsung dari Binance. Whale Tracking dan Trading Opportunities menggunakan data dari edge function `market-insight`. Konsepnya BERBEDA - Volatility fetches real-time, sedangkan Whale/Opportunities bergantung pada respons edge function.

**Solusi**: 
- Pastikan menampilkan data yang ada tanpa filter ketat jika top 5 tidak tersedia
- Fallback ke semua data yang ada, limit 5

### 3. Heatmap Perlu Ditingkatkan
**Current State**: Heatmap dasar dengan PNL di cell dan tooltip untuk trades/winrate.

**Enhancement Plan**:
- Tambah filter by pair dan date range
- Tambah session breakdown (Asia, London, NY)
- Tambah average PNL per session summary cards
- Tambah streak analysis (consecutive winning/losing hours)
- Improve visual dengan gradient yang lebih halus
- Tambah export capability

---

## Bagian 1: Fix Sidebar Group Collapse Persistence

### File: `src/components/layout/NavGroup.tsx`

**Perubahan**:
```typescript
// Tambah localStorage key per group
const SIDEBAR_GROUPS_KEY = "trading-journey-sidebar-groups";

// Helper untuk get/set group states dari localStorage
function getGroupStates(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(SIDEBAR_GROUPS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function setGroupState(groupTitle: string, isOpen: boolean) {
  const states = getGroupStates();
  states[groupTitle] = isOpen;
  localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(states));
}

// Dalam NavGroup component:
export function NavGroup({ title, items, defaultOpen = true }) {
  // Inisialisasi dari localStorage
  const [isOpen, setIsOpen] = React.useState(() => {
    const states = getGroupStates();
    return states[title] ?? defaultOpen;
  });
  
  // Handler yang persist ke localStorage
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setGroupState(title, open);
  };
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      ...
    />
  );
}
```

---

## Bagian 2: Fix Whale Tracking & Trading Opportunities

### File: `src/pages/MarketData.tsx`

**Perubahan pada `getWhaleData()`**:
```typescript
const getWhaleData = () => {
  if (!sentimentData?.whaleActivity) return [];
  
  const allWhales = sentimentData.whaleActivity;
  if (allWhales.length === 0) return [];
  
  // Check if selected asset is in top 5
  const isSelectedInTop5 = TOP_5_ASSETS.includes(selectedAsset);
  
  // Filter for top 5 first
  let top5Data = allWhales.filter(w => TOP_5_ASSETS.includes(w.asset));
  
  // If no top 5 data, fallback to first 5 available
  if (top5Data.length === 0) {
    top5Data = allWhales.slice(0, 5);
  }
  
  // If selected NOT in top 5 and exists in data, prepend it
  if (!isSelectedInTop5) {
    const selectedWhale = allWhales.find(w => w.asset === selectedAsset);
    if (selectedWhale) {
      return [selectedWhale, ...top5Data.slice(0, 4)];
    }
  }
  
  return top5Data.slice(0, 5);
};
```

**Perubahan pada `getOpportunitiesData()`**:
```typescript
const getOpportunitiesData = () => {
  if (!sentimentData?.opportunities) return [];
  
  const allOpps = sentimentData.opportunities;
  if (allOpps.length === 0) return [];
  
  // Check if selected pair is in top 5
  const isSelectedInTop5 = TOP_5_OPP_PAIRS.includes(selectedOppPair);
  
  // Filter for top 5 first
  let top5Data = allOpps.filter(o => TOP_5_OPP_PAIRS.includes(o.pair));
  
  // If no top 5 data, fallback to first 5 available
  if (top5Data.length === 0) {
    top5Data = allOpps.slice(0, 5);
  }
  
  // If selected NOT in top 5 and exists in data, prepend it
  if (!isSelectedInTop5) {
    const selectedOpp = allOpps.find(o => o.pair === selectedOppPair);
    if (selectedOpp) {
      return [selectedOpp, ...top5Data.slice(0, 4)];
    }
  }
  
  return top5Data.slice(0, 5);
};
```

---

## Bagian 3: Advanced Heatmap Features

### File: `src/pages/TradingHeatmap.tsx` (Major Enhancement)

**New Features**:
1. **Date Range Filter** - Filter trades by week/month/quarter
2. **Pair Filter** - Filter by specific trading pair
3. **Session Summary Cards** - Asia (00-08), London (08-16), NY (16-24) performance
4. **Streak Analysis** - Consecutive winning/losing periods
5. **Best/Worst Hour Stats** - Detailed breakdown
6. **Export Button** - Export heatmap data as CSV

**New Structure**:
```
Page Header + Filters (Pair, Date Range)
↓
Session Performance Cards (3 cards: Asia, London, NY)
↓
Main Heatmap Grid (enhanced with smoother gradients)
↓
Stats Cards (Best Hour, Worst Hour, Longest Win Streak, Longest Loss Streak)
↓
Export Button
```

### File: `src/components/analytics/TradingHeatmap.tsx` (Enhanced)

**Enhancements**:
1. Accept filters as props (pair, dateRange)
2. Dynamic color scale based on max/min PNL
3. Better text contrast for light/dark values
4. Session indicators on time rows

---

## Technical Implementation Details

### NavGroup Persistence - Full Code

```typescript
// src/components/layout/NavGroup.tsx (partial)

const SIDEBAR_GROUPS_KEY = "trading-journey-sidebar-groups";

function getGroupStates(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setGroupState(groupTitle: string, isOpen: boolean) {
  const states = getGroupStates();
  states[groupTitle] = isOpen;
  localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(states));
}

export function NavGroup({ title, items, defaultOpen = true }) {
  const [isOpen, setIsOpen] = React.useState(() => {
    const states = getGroupStates();
    return states[title] !== undefined ? states[title] : defaultOpen;
  });

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    setGroupState(title, open);
  }, [title]);

  // ... rest of component
}
```

### Heatmap Page - New State

```typescript
// src/pages/TradingHeatmap.tsx

const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
const [selectedPair, setSelectedPair] = useState<string>('all');

// Unique pairs from trades
const availablePairs = useMemo(() => {
  if (!trades) return [];
  const pairs = new Set(trades.map(t => t.pair || 'Unknown'));
  return ['all', ...Array.from(pairs)];
}, [trades]);

// Filter trades by date range and pair
const filteredTrades = useMemo(() => {
  if (!trades) return [];
  
  let result = trades.filter(t => t.status === 'closed');
  
  // Date filter
  if (dateRange !== 'all') {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    result = result.filter(t => new Date(t.trade_date) >= cutoff);
  }
  
  // Pair filter
  if (selectedPair !== 'all') {
    result = result.filter(t => t.pair === selectedPair);
  }
  
  return result;
}, [trades, dateRange, selectedPair]);

// Session stats
const sessionStats = useMemo(() => {
  // Asia: 00:00-08:00, London: 08:00-16:00, NY: 16:00-24:00
  const sessions = {
    asia: { trades: 0, pnl: 0, wins: 0 },
    london: { trades: 0, pnl: 0, wins: 0 },
    ny: { trades: 0, pnl: 0, wins: 0 },
  };
  
  filteredTrades.forEach(trade => {
    const hour = new Date(trade.trade_date).getHours();
    const pnl = trade.realized_pnl || trade.pnl || 0;
    const session = hour < 8 ? 'asia' : hour < 16 ? 'london' : 'ny';
    
    sessions[session].trades++;
    sessions[session].pnl += pnl;
    if (pnl > 0) sessions[session].wins++;
  });
  
  return sessions;
}, [filteredTrades]);
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/NavGroup.tsx` | EDIT | Add localStorage persistence per group |
| `src/pages/MarketData.tsx` | EDIT | Fix whale/opportunities data filtering with fallbacks |
| `src/pages/TradingHeatmap.tsx` | REWRITE | Add filters, session cards, streak analysis, export |
| `src/components/analytics/TradingHeatmap.tsx` | EDIT | Accept filter props, improve gradients |

---

## Catatan Teknis

1. **Sidebar State Key**: Menggunakan `"trading-journey-sidebar-groups"` sebagai key terpisah dari sidebar main state untuk isolasi.

2. **Fallback Strategy**: Whale Tracking dan Trading Opportunities akan menampilkan data yang ada jika top 5 tidak tersedia, mencegah widget kosong.

3. **Heatmap Sessions**: Menggunakan UTC atau local time tergantung zona waktu user. Implementasi menggunakan local time untuk konsistensi dengan trade entry.

4. **Export Format**: CSV dengan kolom: Day, Time, Trades, Wins, WinRate, TotalPNL untuk mudah dianalisis di Excel/Google Sheets.
