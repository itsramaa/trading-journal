

# URL Route Rename — Match Sidebar Labels

## Problem
Four route URLs don't match their sidebar labels, making navigation confusing and URLs non-descriptive.

## Route Renames

| Sidebar Label | Old URL | New URL |
|---|---|---|
| Flow & Liquidity | `/market-data` | `/flow-liquidity` |
| Market Bias | `/market` | `/market-bias` |
| Risk Calculator | `/calculator` | `/risk-calculator` |
| Risk Analytics | `/risk` | `/risk-analytics` |

Old URLs will get `<Navigate to="..." replace />` redirects so bookmarks and shared links keep working.

## Files to Modify

### 1. `src/App.tsx` — Route Definitions
- Rename the 4 route paths
- Add 4 legacy `<Navigate>` redirects (like the existing `/ai` redirect)

### 2. `src/components/layout/AppSidebar.tsx` — Sidebar URLs
- Update `url` in `navigationGroups`:
  - `/market-data` to `/flow-liquidity`
  - `/market` to `/market-bias`
  - `/calculator` to `/risk-calculator`
  - `/risk` to `/risk-analytics` (in "Analyze" group, labeled "Risk Analytics")

### 3. `src/components/layout/NavGroup.tsx` — Keyboard Shortcuts
- Update `ROUTE_SHORTCUTS` keys:
  - `/market` to `/market-bias`
  - `/market-data` to `/flow-liquidity`
  - `/risk` to `/risk-analytics`
  - `/calculator` to `/risk-calculator`

### 4. `src/components/layout/CommandPalette.tsx` — Command Palette URLs
- Update `PAGES` array URLs for the 4 routes

### 5. `src/components/layout/DashboardLayout.tsx` — Breadcrumb Config
- Update `PAGE_CONFIG` keys and `domainPath` references:
  - `/market-data` to `/flow-liquidity`
  - `/market` to `/market-bias`
  - `/risk` to `/risk-analytics`
  - `/calculator` to `/risk-calculator`

### 6. `src/components/dashboard/MarketScoreWidget.tsx` — Internal Link
- Line 172: Change `<Link to="/market">` to `<Link to="/market-bias">`

### 7. `src/components/layout/AppSidebar.tsx` — Bottom Standalone Items
- The Accounts, Export, Settings links remain unchanged (URLs already match labels)

## Technical Notes

- Legacy redirects use `<Navigate to="/new-path" replace />` — same pattern already used for `/ai` to `/trading`
- No database or backend changes needed
- No component file renames needed (page component names stay the same)
- Keyboard shortcuts (G+key) remain unchanged, only the route paths they point to change

