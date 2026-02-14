

# Sidebar & Integrated Components: Deep UX Analysis & Fixes

## Scope & Coverage

All files read in full:
- `src/components/layout/AppSidebar.tsx` (239 lines)
- `src/components/layout/NavGroup.tsx` (218 lines)
- `src/components/layout/NavUser.tsx` (133 lines)
- `src/components/layout/DashboardLayout.tsx` (231 lines)
- `src/components/layout/HeaderControls.tsx` (138 lines)
- `src/components/layout/CommandPalette.tsx` (400 lines)
- `src/components/layout/TradeModeSelector.tsx` (127 lines)
- `src/components/layout/CurrencyDisplay.tsx` (106 lines)
- `src/components/layout/GlobalSyncIndicator.tsx` (111 lines)
- `src/components/layout/SimulationBanner.tsx` (26 lines)
- `src/components/layout/LivePriceTicker.tsx` (175 lines)
- `src/components/layout/SessionContextModal.tsx` (175 lines)
- `src/components/risk/RiskAlertBanner.tsx` (80 lines)
- `src/components/wallet/WalletConnectButton.tsx` (106 lines)
- `src/components/ui/sidebar.tsx` (637 lines)
- `src/components/ui/keyboard-shortcut.tsx` (201 lines)
- `src/hooks/use-sidebar-persistence.ts` (45 lines)
- `src/hooks/use-mobile.tsx` (18 lines)

---

## Issues Found

### 1. "Top Movers" and "Import & Sync" Missing from Keyboard Shortcuts, Command Palette, and Breadcrumbs

**Top Movers** (`/top-movers`) is in the sidebar navigation but:
- Missing from `ROUTE_SHORTCUTS` in `NavGroup.tsx` -- no keyboard shortcut assigned
- Missing from `NAVIGATION_SHORTCUTS` in `keyboard-shortcut.tsx` -- G+key won't navigate to it
- Missing from `PAGES` array in `CommandPalette.tsx` -- not searchable in command palette
- Missing from `routeHierarchy` in `DashboardLayout.tsx` -- breadcrumb shows generic "Page" instead of "Top Movers > Market"

**Import & Sync** (`/import`) is in the sidebar but:
- Missing from `ROUTE_SHORTCUTS` in `NavGroup.tsx` -- no keyboard shortcut
- Missing from `NAVIGATION_SHORTCUTS` in `keyboard-shortcut.tsx`
- Missing from `PAGES` array in `CommandPalette.tsx`
- Missing from `routeHierarchy` in `DashboardLayout.tsx` -- breadcrumb shows generic "Page"

**Bulk Export** (`/export`) is in the sidebar but:
- Missing from `ROUTE_SHORTCUTS` in `NavGroup.tsx`
- Missing from `NAVIGATION_SHORTCUTS` in `keyboard-shortcut.tsx`
- Missing from `PAGES` array in `CommandPalette.tsx`
- Missing from `routeHierarchy` in `DashboardLayout.tsx`

### 2. Command Palette `PAGES` Array Has Items Without Shortcuts That Will Crash

In `CommandPalette.tsx` line 368, the grouped pages rendering assumes `page.shortcut` exists:
```tsx
<Kbd keys={["G", page.shortcut!]} className="opacity-60" />
```
The `!` assertion will pass `null` into `Kbd`, causing a rendering issue for any page without a shortcut (like "Closed Trades" at line 52 which has `shortcut: null`). This item is only in the standalone group currently (which has a conditional), but adding new pages to grouped domains without shortcuts would crash.

### 3. No Other Issues Found

- **Mode consistency**: Sidebar, header, and all integrated components are mode-agnostic in structure. The TradeModeSelector, SimulationBanner, and RiskAlertBanner correctly toggle based on mode context only -- no structural differences between Paper and Live.
- **Loading states**: NavUser has proper skeleton loading (lines 46-59). TradeModeSelector has skeleton (line 44). LivePriceTicker has skeleton (lines 90-103). GlobalSyncIndicator returns null when idle.
- **Empty states**: NotificationToggle shows "No notifications" empty state. CommandPalette shows "No results found."
- **Dropdown backgrounds**: NavUser dropdown has `bg-popover` (line 87). WalletConnectButton dropdown has default background. NotificationToggle popover has `bg-popover` (line 63). All correct.
- **Sidebar persistence**: `use-sidebar-persistence.ts` correctly reads/writes localStorage. NavGroup also persists collapse state per group.
- **Mobile behavior**: Sidebar closes on nav click via `setOpenMobile(false)`. Mobile Sheet rendering is correct.
- **Keyboard shortcuts**: G+key pattern, Ctrl+B sidebar toggle, Ctrl+K command palette -- all properly implemented with input-field guards.
- **Color tokens**: All semantic tokens (`text-profit`, `text-loss`, chart tokens) used correctly.
- **ARIA**: ThemeToggle, SimulationBanner, RiskAlertBanner, SidebarRail all have proper aria-labels.

---

## Implementation Plan

### File 1: `src/components/layout/NavGroup.tsx` (ROUTE_SHORTCUTS)
Add missing shortcuts:
```
"/top-movers": "O",
"/import": "N",
"/export": "W",
```

### File 2: `src/components/ui/keyboard-shortcut.tsx` (NAVIGATION_SHORTCUTS)
Add matching entries:
```
'o': { path: '/top-movers', label: 'Top Movers', domain: 'Market' },
'n': { path: '/import', label: 'Import & Sync', domain: 'Journal' },
'w': { path: '/export', label: 'Bulk Export', domain: 'Tools' },
```

### File 3: `src/components/layout/CommandPalette.tsx` (PAGES array)
Add three entries with matching shortcuts:
```
{ title: "Top Movers", url: "/top-movers", icon: Flame, shortcut: "O", domain: "Market" },
{ title: "Import & Sync", url: "/import", icon: Download, shortcut: "N", domain: "Journal" },
{ title: "Bulk Export", url: "/export", icon: Download, shortcut: "W", domain: "Tools" },
```
Also add missing icon imports (`Flame`, `Download`).

Fix the unsafe `page.shortcut!` assertion on line 368 by adding a conditional:
```tsx
{page.shortcut && <Kbd keys={["G", page.shortcut]} className="opacity-60" />}
```

### File 4: `src/components/layout/DashboardLayout.tsx` (routeHierarchy)
Add missing breadcrumb entries:
```
"/top-movers": { title: "Top Movers", domain: "Market", domainPath: "/market-data" },
"/import": { title: "Import & Sync", domain: "Journal", domainPath: "/trading" },
"/export": { title: "Bulk Export", domain: "Tools", domainPath: "/export" },
```

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/layout/NavGroup.tsx` | Add 3 entries to `ROUTE_SHORTCUTS` |
| `src/components/ui/keyboard-shortcut.tsx` | Add 3 entries to `NAVIGATION_SHORTCUTS` |
| `src/components/layout/CommandPalette.tsx` | Add 3 entries to `PAGES`, add icon imports, fix unsafe `!` assertion |
| `src/components/layout/DashboardLayout.tsx` | Add 3 entries to `routeHierarchy` |

Total: 4 files, ~15 lines added/changed. All changes are additive -- no existing functionality is modified.

