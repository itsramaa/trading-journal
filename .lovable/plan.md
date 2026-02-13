
# Fix: Eliminate Full-Screen Loading on Page Navigation

## Problem
Every protected page internally wraps itself with `<DashboardLayout>`. Since pages are lazy-loaded via `React.lazy`, when navigating between routes, React suspends the **entire component** -- including `DashboardLayout` (sidebar, header, ticker). This causes the full-screen loading spinner, unmounting the navigation shell on every transition.

The React warning "A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator" confirms this.

## Solution
Move `DashboardLayout` out of individual pages and into the routing layer as a **persistent layout wrapper**. This way, sidebar and header stay mounted while only the page content area shows a loading spinner via the existing `<Suspense>` inside `DashboardLayout`.

## Changes

### 1. Create a Layout Route Wrapper (`src/components/layout/ProtectedDashboardLayout.tsx`)
A new component combining `ProtectedRoute` + `DashboardLayout` + React Router `<Outlet />`:

```text
ProtectedRoute
  -> DashboardLayout (sidebar, header - always mounted)
       -> <Suspense> (already exists in DashboardLayout)
            -> <Outlet /> (renders the matched child route - lazy loaded)
```

### 2. Update `src/App.tsx` - Use nested Route layout
Convert flat routes to nested routes under the layout wrapper:

```text
Before:
  <Route path="/trading" element={<ProtectedRoute><TradingJournal /></ProtectedRoute>} />
  <Route path="/history" element={<ProtectedRoute><TradeHistory /></ProtectedRoute>} />

After:
  <Route element={<ProtectedDashboardLayout />}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/trading" element={<TradingJournal />} />
    <Route path="/history" element={<TradeHistory />} />
    ... all protected routes
  </Route>
```

### 3. Update all 23 page files - Remove DashboardLayout wrapper
Each page currently does:
```tsx
return (
  <DashboardLayout>
    <div className="space-y-6">...</div>
  </DashboardLayout>
);
```

Will become:
```tsx
return (
  <div className="space-y-6">...</div>
);
```

Remove the `import { DashboardLayout }` and the wrapping `<DashboardLayout>` tags from all 23 pages.

**Affected files:**
- `src/pages/Dashboard.tsx`
- `src/pages/Accounts.tsx`
- `src/pages/AccountDetail.tsx`
- `src/pages/trading-journey/TradingJournal.tsx`
- `src/pages/TradeHistory.tsx`
- `src/pages/trading-journey/StrategyManagement.tsx`
- `src/pages/Backtest.tsx`
- `src/pages/Performance.tsx`
- `src/pages/DailyPnL.tsx`
- `src/pages/TradingHeatmap.tsx`
- `src/pages/AIInsights.tsx`
- `src/pages/RiskManagement.tsx`
- `src/pages/PositionCalculator.tsx`
- `src/pages/MarketInsight.tsx`
- `src/pages/EconomicCalendar.tsx`
- `src/pages/MarketData.tsx`
- `src/pages/ImportTrades.tsx`
- `src/pages/TopMovers.tsx`
- `src/pages/BulkExport.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Notifications.tsx`
- `src/pages/SharedStrategy.tsx` (if applicable)

### 4. Update `DashboardLayout.tsx` - Use Outlet instead of children
Replace `{children}` with `<Outlet />` from react-router-dom inside the `<Suspense>` boundary. The `children` prop is no longer needed.

## Result
- Sidebar, header, ticker, and banners stay **permanently mounted** during navigation
- Only the content area shows a small spinner while the lazy page loads
- The React `startTransition` warning is resolved because the Suspense boundary is scoped to content only
- No behavioral changes -- all pages render identically once loaded

## Technical Notes
- Pages with multiple `<DashboardLayout>` returns (e.g., loading states in Profile, Notifications, TradingHeatmap, AIInsights) need all instances removed
- The `DashboardLayout` Suspense fallback already exists at line 218-224, so no new loading UI is needed
- Public routes (`/landing`, `/auth`) remain unchanged with their own `<Suspense>` wrappers
