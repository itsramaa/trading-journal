
# Plan: Add Context Tab to Performance Overview

## Overview
Memindahkan semua komponen yang berkaitan dengan analisis kontekstual dari tab Overview ke tab baru bernama "Context" untuk mengurangi beban kognitif pada halaman Overview dan memberikan fokus yang lebih jelas pada setiap kategori analisis.

## Scope Perubahan

### Komponen yang akan dipindahkan ke Tab Context:
1. **CombinedContextualScore** - Skor kontekstual gabungan (Fear/Greed, Volatility, Events)
2. **TradingHeatmapChart** - Win rate berdasarkan waktu (hourly/daily/session)
3. **EventDayComparison** - Perbandingan performa Event Day vs Normal Day
4. **FearGreedZoneChart** - Win rate berdasarkan zona Fear/Greed
5. **VolatilityLevelChart** - Win rate berdasarkan level volatilitas
6. **SessionPerformanceChart** - Performa berdasarkan sesi trading

### Tab Overview (setelah perubahan):
Akan tetap berisi:
- 7-Day Stats Card
- Key Metrics (Win Rate, Profit Factor, Expectancy, Max Drawdown)
- Additional Metrics (Sharpe Ratio, Avg R:R, Total Trades, Total P&L)
- Equity Performance (Equity Curve with Events)
- Risk Analysis (Drawdown Chart)

### Tab Context (baru):
Akan berisi semua komponen kontekstual dengan section headers:
- **Market Conditions Overview**: CombinedContextualScore
- **Time-Based Analysis**: TradingHeatmapChart
- **Event Impact**: EventDayComparison, FearGreedZoneChart
- **Environmental Factors**: VolatilityLevelChart, SessionPerformanceChart

## Implementasi Teknis

### File yang dimodifikasi:
`src/pages/Performance.tsx`

### Perubahan Detail:

1. **Update TabsList** (sekitar line 338-351)
   - Tambahkan trigger baru untuk tab "Context"
   - Gunakan icon `Activity` atau `Gauge` untuk representasi visual
   
```tsx
<TabsList className="flex-wrap">
  <TabsTrigger value="overview" className="gap-2">
    <BarChart3 className="h-4 w-4" />
    <span className="hidden sm:inline">Overview</span>
  </TabsTrigger>
  <TabsTrigger value="context" className="gap-2">
    <Activity className="h-4 w-4" />
    <span className="hidden sm:inline">Context</span>
  </TabsTrigger>
  <TabsTrigger value="monthly" className="gap-2">
    <Calendar className="h-4 w-4" />
    <span className="hidden sm:inline">Monthly</span>
  </TabsTrigger>
  <TabsTrigger value="strategies" className="gap-2">
    <Trophy className="h-4 w-4" />
    <span className="hidden sm:inline">Strategies</span>
  </TabsTrigger>
</TabsList>
```

2. **Hapus Section Contextual Analysis dari Overview Tab** (lines 488-517)
   - Remove section header "Contextual Analysis"
   - Remove semua komponen kontekstual dari Overview

3. **Tambahkan Tab Context baru** (setelah TabsContent overview)
   - Buat TabsContent baru dengan value="context"
   - Pindahkan semua komponen kontekstual dengan section headers yang terorganisir

```tsx
{/* Tab: Context */}
<TabsContent value="context" className="space-y-8">
  {/* Market Conditions Overview */}
  <div className="space-y-4">
    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
      Market Conditions Overview
    </h3>
    <div className="grid gap-6 lg:grid-cols-2">
      <CombinedContextualScore trades={filteredTrades} />
      <TradingHeatmapChart trades={filteredTrades} />
    </div>
  </div>

  {/* Event Impact Analysis */}
  {contextualData && (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Event Impact Analysis
      </h3>
      <div className="grid gap-6 lg:grid-cols-2">
        <EventDayComparison 
          eventDayMetrics={contextualData.byEventProximity.eventDay}
          normalDayMetrics={contextualData.byEventProximity.normalDay}
        />
        <FearGreedZoneChart byFearGreed={contextualData.byFearGreed} />
      </div>
    </div>
  )}

  {/* Environmental Factors */}
  {contextualData && (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Environmental Factors
      </h3>
      <VolatilityLevelChart byVolatility={contextualData.byVolatility} />
      {contextualData.bySession && (
        <SessionPerformanceChart bySession={contextualData.bySession} />
      )}
    </div>
  )}
</TabsContent>
```

4. **Update Import** (line 20-32)
   - Pastikan icon `Activity` sudah di-import dari lucide-react (sudah ada)

## Struktur Tab Setelah Perubahan

```text
Performance Analytics
├── [Overview] - Metrik inti & equity curve
│   ├── 7-Day Stats
│   ├── Key Metrics (Win Rate, PF, Expectancy, DD)
│   ├── Additional Metrics
│   ├── Equity Performance
│   └── Risk Analysis (Drawdown)
│
├── [Context] - Analisis kontekstual (BARU)
│   ├── Market Conditions Overview
│   │   ├── CombinedContextualScore
│   │   └── TradingHeatmapChart
│   ├── Event Impact Analysis
│   │   ├── EventDayComparison
│   │   └── FearGreedZoneChart
│   └── Environmental Factors
│       ├── VolatilityLevelChart
│       └── SessionPerformanceChart
│
├── [Monthly] - Perbandingan bulanan
│   └── (tidak berubah)
│
└── [Strategies] - Performa per strategi
    └── (tidak berubah)
```

## Manfaat

1. **Reduced Cognitive Load**: Tab Overview menjadi lebih ringkas dan fokus pada metrik esensial
2. **Better Organization**: Semua analisis kontekstual tergabung dalam satu tempat
3. **Improved UX**: User dapat memilih untuk melihat konteks hanya saat diperlukan
4. **Scalability**: Mudah menambahkan komponen kontekstual baru di masa depan

## Konsistensi dengan Arsitektur

Perubahan ini sejalan dengan:
- **memory/design/navigation-architecture-principle**: Meminimalkan cognitive load dengan pemisahan yang jelas
- **memory/features/contextual-performance-and-risk-logic**: Sistem kontekstual yang terorganisir
- **memory/ui/performance-page-polish**: Section headers untuk scanability

