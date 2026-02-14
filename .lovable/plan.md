

# Merge Trade History into Trading Journal as a Tab

## What Changes

Trade History will become the **3rd tab** ("Closed") inside the Trading Journal page, instead of being a separate page in the sidebar. The tab structure becomes:

```text
Trading Journal
  [Pending] [Active] [Closed]
```

## Implementation Plan

### 1. Add "Closed" Tab to Trading Journal

**File: `src/pages/trading-journey/TradingJournal.tsx`**

- Expand `TabsList` from `grid-cols-2` to `grid-cols-3`
- Add a new `TabsTrigger value="closed"` with History icon and a badge showing closed trade count
- Add `TabsContent value="closed"` that renders `TradeHistoryContent` (the same component currently used by the standalone page)
- Import required hooks: `useTradeEntriesPaginated`, `useTradeHistoryFilters`, `useTradeStats`, `useTradeEnrichment`, etc.
- The Closed tab will include:
  - Stats summary (from `TradeHistoryStats`)
  - Filter toolbar (from `TradeHistoryToolbar`)
  - Gallery/List content (from `TradeHistoryContent`)
  - Enrichment drawer integration
  - Infinite scroll via intersection observer

### 2. Remove Sidebar Entry

**File: `src/components/layout/AppSidebar.tsx`**

- Remove `{ title: "Trade History", url: "/history", icon: History }` from the Journal navigation group

### 3. Remove Standalone Route

**File: `src/App.tsx`**

- Remove `<Route path="/history" element={<TradeHistory />} />`
- Keep the lazy import removal for `TradeHistory`

### 4. Clean Up Related References

**File: `src/components/layout/DashboardLayout.tsx`**
- Remove `/history` from `routeHierarchy`

**File: `src/components/layout/NavGroup.tsx`**
- Remove `/history` from `ROUTE_SHORTCUTS`

**File: `src/components/layout/CommandPalette.tsx`**
- Remove Trade History from command palette navigation items
- Update trade search result navigation from `/history?trade=` to `/trading?tab=closed&trade=`

**File: `src/components/ui/keyboard-shortcut.tsx`**
- Remove `'h': { path: '/history', ... }` shortcut

**File: `src/components/trading/TradingOnboardingTour.tsx`**
- Update the Trade History tour step to reference the "Closed" tab within Trading Journal instead of `/history`

### 5. URL Tab State Support

**File: `src/pages/trading-journey/TradingJournal.tsx`**

- Read initial tab from URL search params (`?tab=closed`) so deep links and command palette navigation work
- Use `Tabs value={activeTab} onValueChange={setActiveTab}` (controlled) instead of `defaultValue`
- Update URL when tab changes for shareability

### 6. Keep the TradeHistory.tsx File (Refactored)

The standalone `TradeHistory.tsx` page file will be **deleted** since its content is now embedded in the Trading Journal. The sub-components (`TradeHistoryContent`, `TradeHistoryStats`, `TradeHistoryToolbar`, `TradeHistoryFilters`) remain unchanged -- they are simply rendered inside the new "Closed" tab.

---

## Technical Details

### Tab Structure (Updated TradingJournal.tsx)

```typescript
const [searchParams, setSearchParams] = useSearchParams();
const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'active');

// ... inside JSX:
<Tabs value={activeTab} onValueChange={(val) => {
  setActiveTab(val);
  setSearchParams(val === 'active' ? {} : { tab: val });
}}>
  <TabsList className="grid w-full grid-cols-3 max-w-md">
    <TabsTrigger value="pending">Pending</TabsTrigger>
    <TabsTrigger value="active">Active</TabsTrigger>
    <TabsTrigger value="closed">Closed</TabsTrigger>
  </TabsList>
  
  <TabsContent value="pending">...</TabsContent>
  <TabsContent value="active">...</TabsContent>
  <TabsContent value="closed">
    {/* Trade History content with stats, filters, toolbar, and list */}
  </TabsContent>
</Tabs>
```

### Closed Tab Content

The "Closed" tab will contain all functionality from `TradeHistory.tsx`:
- `TradeHistoryStats` -- summary cards
- `TradeHistoryToolbar` -- sort, filter toggle, view mode toggle
- `TradeHistoryFilters` -- collapsible filter panel
- `TradeHistoryContent` -- gallery/list with infinite scroll
- `TradeEnrichmentDrawer` -- shared with existing Active tab drawer
- Delete confirmation dialog

All hooks (`useTradeEntriesPaginated`, `useTradeStats`, `useTradeHistoryFilters`, etc.) will be called inside the TradingJournal component and passed as props or used directly.

### Files Modified

| File | Action |
|------|--------|
| `src/pages/trading-journey/TradingJournal.tsx` | Add "Closed" tab with Trade History content |
| `src/pages/TradeHistory.tsx` | Delete (standalone page removed) |
| `src/App.tsx` | Remove `/history` route |
| `src/components/layout/AppSidebar.tsx` | Remove Trade History sidebar item |
| `src/components/layout/DashboardLayout.tsx` | Remove `/history` from breadcrumb map |
| `src/components/layout/NavGroup.tsx` | Remove `/history` shortcut |
| `src/components/layout/CommandPalette.tsx` | Remove/update Trade History references |
| `src/components/ui/keyboard-shortcut.tsx` | Remove `h` shortcut |
| `src/components/trading/TradingOnboardingTour.tsx` | Update tour step |

