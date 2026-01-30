

# Plan: End-to-End Design Fix - Strategy Management Page

## Overview

Melakukan perbaikan menyeluruh pada halaman Strategy Management berdasarkan prinsip **Design Thinking** (Empathize → Define → Ideate → Prototype → Test) dan **Design System** yang sudah ada di project.

---

## Analisis Masalah (Empathize & Define)

### Issues Teridentifikasi

1. **Visual Hierarchy Lemah**
   - Tidak ada visual distinction antara tab utama dan sub-tab (Backtest)
   - Stats cards terlalu plain, tidak menonjolkan data penting
   - Strategy cards tidak konsisten dengan design system

2. **Spacing Inkonsisten**
   - `space-y-6` digunakan tapi tidak mengikuti 8px grid secara konsisten
   - Gap antara sections tidak seragam
   - Card padding tidak uniform

3. **Missing Design Tokens**
   - Hardcoded colors seperti `bg-blue-500/20` tanpa menggunakan CSS variables
   - Tidak konsisten dengan profit/loss color dari design system
   - Chart colors tidak menggunakan `--chart-*` variables

4. **Component Structure**
   - Form dialog terlalu panjang tanpa visual breathing room
   - BacktestRunner tidak memiliki summary card header yang proper
   - BacktestComparison table headers tidak aligned

5. **Empty States & Loading**
   - Empty state messaging bisa lebih actionable
   - Loading skeleton tidak mencerminkan actual content layout

6. **Mobile Responsiveness**
   - Tabs label tersembunyi di mobile tapi iconnya kecil
   - Tables tidak optimal untuk viewport kecil

---

## Solusi Design (Ideate)

### Design Principles Applied

1. **F-Pattern Reading** - Info penting di kiri-atas, actions di kanan-atas
2. **Progressive Disclosure** - Summary first, details on demand
3. **Consistent Spacing** - 8px grid system (gap-2, gap-4, gap-6, gap-8)
4. **Design Token Usage** - Semua warna menggunakan CSS variables
5. **Card Header Pattern** - Icon + Title + Badge (optional)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/trading-journey/StrategyManagement.tsx` | Visual hierarchy, spacing, design tokens |
| `src/components/strategy/BacktestRunner.tsx` | Card structure, form layout |
| `src/components/strategy/BacktestResults.tsx` | Consistent color tokens, table styling |
| `src/components/strategy/BacktestComparison.tsx` | Table alignment, color tokens |
| `src/components/strategy/YouTubeStrategyImporter.tsx` | Progress UI, card structure |
| `src/components/strategy/EntryRulesBuilder.tsx` | Card design, spacing |
| `src/components/strategy/ExitRulesBuilder.tsx` | Card design, color consistency |

---

## Detailed Changes

### 1. StrategyManagement.tsx

**Page Header Enhancement**
- Add subtle gradient background untuk page header
- Consistent icon sizing (h-6 w-6) dengan primary color
- Badge untuk menunjukkan total strategies

**Tab Navigation Fix**
- Main tabs: Full-width grid dengan proper active states
- Backtest sub-tabs: Smaller, secondary styling untuk hierarchy
- Mobile: Icon-only tabs dengan tooltip

**Stats Cards Enhancement**
- Use `CardHeader` pattern dengan icon + title
- Add subtle background tint untuk profit stats (`bg-profit-muted`)
- Consistent text sizing: `text-2xl font-bold` untuk values

**Strategy Cards Redesign**
- Replace hardcoded `colorClasses` dengan design system approach
- Add hover state dengan `hover:shadow-md transition-shadow`
- Performance stats menggunakan `text-profit` / `text-loss` classes
- Consistent badge styling untuk metadata

**Color System Fix**
Replace:
```typescript
// Current hardcoded
const colorClasses = {
  blue: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  // ...
};
```
With design token approach:
```typescript
// Use design system colors
const strategyColorVars = {
  blue: 'bg-primary/10 text-primary border-primary/30',
  green: 'bg-profit/10 text-profit border-profit/30',
  red: 'bg-loss/10 text-loss border-loss/30',
  // Use chart colors for others
};
```

**Dialog Form Improvements**
- Add section dividers between form groups
- Consistent label + input spacing (`space-y-2`)
- Better visual grouping untuk related fields

### 2. BacktestRunner.tsx

**Card Header Pattern**
```text
Current:
CardTitle dengan inline icon

Proposed:
CardHeader
├─ Icon (h-5 w-5 text-primary) di flex container
├─ CardTitle
└─ Optional Badge (status indicator)
```

**Form Layout Fix**
- Group related inputs dengan subtle border
- Add helper text dibawah complex inputs
- Better date picker styling dengan consistent heights

**Run Button Enhancement**
- Use gradient untuk primary action
- Add subtle glow effect (`glow-primary` class)
- Loading state dengan skeleton placeholder

### 3. BacktestResults.tsx

**Metrics Cards Fix**
- Use consistent `pt-6` atau proper CardHeader
- Replace `bg-green-500/10` dengan `bg-profit-muted`
- Replace `text-green-500` dengan `text-profit`
- Replace `text-red-500` dengan `text-loss`

**Table Styling**
- Header cells: `font-medium text-muted-foreground`
- Data cells: `font-mono` untuk numbers
- Alternating rows dengan `hover:bg-muted/50`

**Chart Improvements**
- Use CSS variable colors: `hsl(var(--primary))`, `hsl(var(--chart-2))`
- Tooltip styling konsisten dengan design system
- Legend dengan proper spacing

### 4. BacktestComparison.tsx

**Selection Panel Fix**
- Checkbox list dengan proper hover states
- Selected items dengan `bg-muted` highlight
- Badge colors menggunakan design tokens

**Comparison Table Enhancement**
- Fixed first column untuk metric names
- Trophy icon dengan `text-amber-500` (warning color dari design system)
- Horizontal scroll dengan gradient fade pada mobile

**Equity Curves Chart**
- Line colors menggunakan `--chart-*` CSS variables
- Consistent tooltip styling
- Better legend positioning

**Summary Cards**
- Use `bg-muted/50` background
- Winner indicator dengan consistent color mapping
- Responsive grid: `grid-cols-2 lg:grid-cols-4`

### 5. YouTubeStrategyImporter.tsx

**Input Tabs Styling**
- Active tab dengan solid background
- Inactive tab dengan subtle hover

**Progress Indicator Enhancement**
- Use custom progress colors untuk stages
- Add stage labels dengan icons
- Error state dengan `bg-destructive/10`

**Strategy Preview Card**
- Consistent badge styling
- Entry/Exit conditions dengan proper icons
- Automation score menggunakan chart color

### 6. EntryRulesBuilder.tsx & ExitRulesBuilder.tsx

**Card Structure**
- Consistent CardHeader dengan badge count
- Rule items dengan proper border-radius
- Icon sizing: `h-4 w-4` untuk inline, `h-5 w-5` untuk standalone

**Color Consistency**
- Take profit: `text-profit` dengan `bg-profit-muted`
- Stop loss: `text-loss` dengan `bg-loss-muted`
- Trailing stop: Use `--chart-3` (orange/warning)
- Time-based: Use `--chart-6` (blue info)

**Add Rule UI**
- Select dengan icon previews
- Cancel/Add buttons dengan consistent sizing

---

## Spacing Standardization

### Section Gaps
- Between page sections: `space-y-8`
- Between cards in grid: `gap-4 md:gap-6`
- Inside card content: `space-y-4`

### Component Gaps
- Icon + text inline: `gap-2`
- Button icons: `mr-2` atau `gap-2`
- Badge icons: `mr-1`
- Form label to input: `space-y-2`

---

## Mobile Responsiveness Fixes

### Tabs
- Main tabs: Icon-only pada `sm:` breakpoint
- Label: `hidden sm:inline`
- Touch target: min `h-10` untuk tabs

### Tables
- Horizontal scroll dengan `-mx-4 px-4` trick
- Sticky first column untuk comparison
- Condensed mode untuk mobile

### Cards Grid
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` untuk strategy cards
- `grid-cols-2 md:grid-cols-4` untuk stats

---

## Accessibility Improvements

### Color Contrast
- Semua text memenuhi WCAG AA (4.5:1 ratio)
- Profit/loss colors sudah proper di design system

### Focus States
- Tabs dengan visible focus ring
- Cards dengan hover/focus state
- Form inputs dengan `focus-visible` outline

### Screen Readers
- Icon buttons dengan `sr-only` labels
- Badge announcements untuk status
- Table headers dengan proper scope

---

## Implementation Order

1. **Phase 1: Design Tokens** (Foundation)
   - Update color mapping di StrategyManagement
   - Create reusable color utility functions

2. **Phase 2: Layout & Spacing** (Structure)
   - Fix page layout spacing
   - Standardize card structures
   - Fix tab hierarchy

3. **Phase 3: Components** (Details)
   - BacktestRunner form improvements
   - BacktestResults color consistency
   - BacktestComparison table fixes

4. **Phase 4: Polish** (Refinement)
   - YouTubeStrategyImporter progress UI
   - Entry/Exit builders color fix
   - Mobile responsiveness

---

## Technical Notes

### Color Token Migration

Map hardcoded colors to design system:
- `bg-green-500/*` → `bg-profit` / `bg-profit-muted`
- `text-green-500` → `text-profit`
- `bg-red-500/*` → `bg-loss` / `bg-loss-muted`
- `text-red-500` → `text-loss`
- Chart lines → `hsl(var(--chart-N))`

### Tailwind Classes to Standardize

Page spacing:
- Section gaps: `space-y-8`
- Card grid: `gap-4 md:gap-6`

Card internals:
- CardContent: `pt-6` (tanpa header) atau `space-y-4` (dengan content)
- CardHeader: `pb-2` untuk compact, default untuk normal

---

## Summary

| Category | Files | Changes |
|----------|-------|---------|
| Main Page | 1 | Visual hierarchy, spacing, colors |
| Strategy Components | 4 | Card structure, colors, responsive |
| Builder Components | 2 | Colors, spacing, icons |
| **Total** | **7 files** | Design system alignment |

### Expected Outcomes

- Consistent visual language across all strategy components
- Proper use of design tokens (profit/loss colors, chart colors)
- Better mobile experience dengan responsive tables dan tabs
- Improved accessibility dengan proper focus states
- Cleaner code dengan reusable color utilities

