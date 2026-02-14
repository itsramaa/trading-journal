

# Strategies Page: Deep UX Analysis & Fixes

## Scope & Coverage

Analyzed files (all read in full):
- `src/pages/trading-journey/StrategyManagement.tsx` (310 lines, page orchestrator)
- `src/components/strategy/StrategyCard.tsx` (255 lines)
- `src/components/strategy/StrategyStats.tsx` (74 lines)
- `src/components/strategy/StrategyFormDialog.tsx` (583 lines)
- `src/components/strategy/StrategyDetailDrawer.tsx` (397 lines)
- `src/components/strategy/StrategyShareDialog.tsx` (256 lines)
- `src/components/strategy/StrategyLeaderboard.tsx` (482 lines)
- `src/components/strategy/YouTubeStrategyImporter.tsx` (618 lines)
- `src/components/strategy/YouTubeImportDebugInfo.tsx` (debug UI)
- `src/components/strategy/StrategyValidationBadge.tsx` (validation badge)
- `src/components/dashboard/StrategyCloneStatsWidget.tsx` (172 lines)
- `src/hooks/trading/use-trading-strategies.ts` (strategy CRUD hooks)
- `src/components/strategy/index.ts` (barrel export)

## Issues Found

### 1. Uncontrolled Tabs -- No URL Persistence

**Line 39**: `const [activeTab, setActiveTab] = useState('library')` uses local state. This means:
- Deep links like `/strategies?tab=leaderboard` or `/strategies?tab=import` do not work
- The CommandPalette already generates `/strategies?strategy=...` (line 184 of CommandPalette.tsx) but the page ignores search params
- After YouTube import completion, `onStrategyImported` calls `setActiveTab('library')` which works locally but cannot be bookmarked
- Inconsistent with the `useSearchParams` pattern now established on AI Insights, Performance, Risk, Position Calculator, and Import pages

**Fix**: Replace `useState('library')` with `useSearchParams`. Import `useSearchParams` from `react-router-dom` (already partially imported via `useNavigate`).

### 2. Hardcoded Methodology Colors in YouTubeStrategyImporter

**Lines 42-50**: `METHODOLOGY_CONFIG` uses raw Tailwind color values for each methodology:
- `bg-purple-500/20 text-purple-400 border-purple-500/30` (SMC)
- `bg-blue-500/20 text-blue-400 border-blue-500/30` (ICT)
- `bg-green-500/20 text-green-400 border-green-500/30` (Indicator)
- `bg-orange-500/20 text-orange-400 border-orange-500/30` (Price Action)
- `bg-cyan-500/20 text-cyan-400 border-cyan-500/30` (Wyckoff)
- `bg-pink-500/20 text-pink-400 border-pink-500/30` (Elliott Wave)
- `bg-yellow-500/20 text-yellow-400 border-yellow-500/30` (Hybrid)

These should use semantic chart tokens for consistency with the design system established in StrategyDetailDrawer (lines 42-51), which already maps strategy colors to `hsl(var(--chart-N))` tokens.

**Fix**: Replace with chart semantic tokens:
- SMC: `bg-[hsl(var(--chart-3))]/20 text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3))]/30`
- ICT: `bg-[hsl(var(--chart-5))]/20 text-[hsl(var(--chart-5))] border-[hsl(var(--chart-5))]/30`
- Indicator: `bg-profit/20 text-profit border-profit/30`
- Price Action: `bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30`
- Wyckoff: `bg-[hsl(var(--chart-1))]/20 text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1))]/30`
- Elliott Wave: `bg-[hsl(var(--chart-6))]/20 text-[hsl(var(--chart-6))] border-[hsl(var(--chart-6))]/30`
- Hybrid: `bg-[hsl(var(--chart-2))]/20 text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/30`

### 3. Leaderboard & Warning Colors (No Fix Needed)

- **Leaderboard rank colors** (`text-yellow-500`, `text-slate-400`, `text-amber-600`): These represent gold/silver/bronze medals -- a universally understood gamification convention, not financial data. Semantic chart tokens would lose this meaning.
- **Warning alerts** (`text-yellow-500`, `border-yellow-500/50`): Standard warning pattern used across the entire app for alerts. Consistent with Alert component conventions.
- **`text-yellow-200`/`text-yellow-400`** in YouTube importer warning text: Dark-mode optimized warning text inside alert containers. Acceptable.

### 4. Mode Consistency (No Issues Found)

Strategies are a user-level domain entity, not mode-dependent. The page does not reference `useModeFilteredTrades`, `useModeVisibility`, or any mode-specific hooks -- this is correct because strategies exist independently of Paper/Live mode. Both modes share the same strategy library, form, detail drawer, sharing, leaderboard, and YouTube import. No fix needed.

### 5. Other Observations (No Fix Needed)

- **StrategyCard**: YouTube source badge correctly uses `text-[hsl(var(--chart-5))]` (already semantic)
- **StrategyDetailDrawer**: `colorClasses` map already uses semantic tokens throughout
- **StrategyShareDialog**: Clean implementation with proper loading/empty states
- **StrategyCloneStatsWidget**: Correctly returns `null` when user has no shared strategies (this is appropriate since it's a supplementary widget, not a tab section)
- **StrategyFormDialog**: Inner tabs use `defaultValue="basic"` but this is acceptable because it's a dialog (short-lived, modal context -- URL persistence would be counterproductive)

---

## Implementation Plan

### File: `src/pages/trading-journey/StrategyManagement.tsx`
1. Import `useSearchParams` from `react-router-dom`
2. Replace `useState('library')` with `useSearchParams` for URL-persistent tab state
3. Update `onStrategyImported` callback to use `setSearchParams({ tab: 'library' })`

### File: `src/components/strategy/YouTubeStrategyImporter.tsx`
1. Replace 7 hardcoded methodology color strings in `METHODOLOGY_CONFIG` with semantic chart tokens

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/trading-journey/StrategyManagement.tsx` | Controlled tabs via `useSearchParams` (3 lines changed) |
| `src/components/strategy/YouTubeStrategyImporter.tsx` | Replace 7 hardcoded methodology colors with semantic chart tokens |

