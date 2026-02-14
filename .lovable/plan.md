
# Notifications Page: Deep UX Analysis & Fixes

## Scope & Coverage

Analyzed files (all read in full):
- `src/pages/Notifications.tsx` (220 lines, page with 2 tabs: All / Unread)
- `src/hooks/use-notifications.ts` (provided in context, DB queries + realtime)
- `src/hooks/use-notification-triggers.ts` (provided in context, auto-create notifications)
- `src/hooks/use-push-notifications.ts` (provided in context, Web Push)
- `src/hooks/use-weekly-report-export.ts` (weekly PDF export, used inline)
- `src/lib/constants/notification-config.ts` (provided in context, type-to-color mapping)
- `src/store/app-store.ts` (provided in context, legacy local notifications)

## Issue Found

### 1. Uncontrolled Tabs -- No URL Persistence

**Line 168**: `<Tabs defaultValue="all">` uses uncontrolled `defaultValue`. No `useSearchParams` is imported or used anywhere in the file.

This means:
- Switching between "All" and "Unread" tabs does not update the URL
- Browser back/forward and bookmarking after tab switch are broken
- Deep-linking (e.g., `/notifications?tab=unread`) does not work
- Inconsistent with the controlled `useSearchParams` pattern now established on Settings, Profile, Bulk Export, Strategies, Backtest, Performance, Risk, Position Calculator, AI Insights, and Import pages

**Fix**: Import `useSearchParams`, derive `activeTab`, replace `defaultValue` with controlled `value`/`onValueChange`.

### 2. No Other Issues Found

- **Loading state**: Proper skeleton UI rendered when `isLoading` is true (lines 79-96). Clean layout with icon + text placeholders.
- **Empty states**: Both tabs have contextual empty states -- "No notifications" with `BellOff` icon for All, "All caught up!" with `Check` icon for Unread.
- **Color tokens**: Uses `text-profit` (valid), `text-muted-foreground` (valid), `text-primary` (valid). No broken `text-warning` usage.
- **Mode consistency**: Notifications are user-scoped (filtered by `user_id`), not mode-dependent. Both Paper and Live see the same notification list. No fix needed.
- **Weekly Report section**: Properly integrated with loading spinner during generation. Buttons disabled while generating. Clean.
- **NotificationCard**: Inline component with proper read/unread styling (opacity-60 for read), mark-as-read button with pending state, asset symbol badge. No issues.
- **Action buttons**: "Mark all as read" conditionally shown when unread > 0. "Clear all" conditionally shown when notifications exist. Both disable during pending mutation. Correct.

---

## Implementation Plan

### File: `src/pages/Notifications.tsx`
1. Import `useSearchParams` from `react-router-dom`
2. Destructure `[searchParams, setSearchParams]` in the component
3. Derive `activeTab` from `searchParams.get('tab') || 'all'`
4. Create `setActiveTab` callback that updates search params
5. Replace `<Tabs defaultValue="all">` with `<Tabs value={activeTab} onValueChange={setActiveTab}>`

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/Notifications.tsx` | Controlled tabs via `useSearchParams` (4 lines added/changed) |
