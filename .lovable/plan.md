

# Header Search Icon + Currency/Exchange Rate Fixes

## Changes

### 1. Search Button -- Icon Only (all screen sizes)

Currently there are two search buttons:
- Desktop (`hidden md:flex`): Wide button with "Search..." text and keyboard shortcut badge
- Mobile (`md:hidden`): Icon-only button

**Fix**: Replace both with a single icon-only button (like the current mobile version), positioned to the left of the notification bell. Remove the wide text-based search button entirely.

### 2. Currency Popover Label -- Hardcode "Select Currency"

Line 52 in `CurrencyDisplay.tsx` uses `t('currency.select') || 'Select Currency'`. The i18n key `currency.select` is not guaranteed to resolve, causing a raw key to display. Replace with a plain string `"Select Currency"`.

### 3. Exchange Rate -- API-First, No Hardcoded Initial Display

Current behavior: `useExchangeRate` passes `initialData: storedRate || 16000` to `useQuery`. This means the UI immediately shows the hardcoded `16000` (or the stale persisted rate) before the API responds. The store also defaults to `15800`.

**Fix**:
- Remove `initialData` from the query config so it starts in a proper loading state
- Remove the hardcoded `exchangeRate: 15800` default from the Zustand store (set to `0`)
- Return `isLoading: true` until the API actually responds
- In `CurrencyDisplay`, show a loading skeleton/spinner for the rate while fetching
- The hourly auto-refresh (`refetchInterval: 60 * 60 * 1000`) is already correctly configured

---

## Technical Details

### File: `src/components/layout/DashboardLayout.tsx`
- Remove lines 193-210 (both search buttons)
- Add a single icon-only search button before `NotificationToggle`:
```tsx
<Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setCommandOpen(true)} aria-label="Search">
  <Search className="h-4 w-4" />
</Button>
<NotificationToggle />
```

### File: `src/components/layout/CurrencyDisplay.tsx`
- Line 52: Replace `{t('currency.select') || 'Select Currency'}` with `"Select Currency"`
- Remove unused `useTranslation` import
- Add loading state for exchange rate display: show `--` or a small spinner while `rateLoading` is true and rate is 0

### File: `src/hooks/exchange/use-exchange-rate.ts`
- Remove `initialData: storedRate || DEFAULT_USD_IDR_RATE` (line 74)
- Change return to: `rate: query.data ?? storedRate ?? DEFAULT_USD_IDR_RATE`
- `isLoading` will now be `true` on first mount until API responds

### File: `src/store/app-store.ts`
- Line 78: Change `exchangeRate: 15800` to `exchangeRate: 0` so it doesn't pretend to have a valid rate before API fetch

| File | Change |
|------|--------|
| `src/components/layout/DashboardLayout.tsx` | Replace 2 search buttons with 1 icon-only button before notification bell |
| `src/components/layout/CurrencyDisplay.tsx` | Hardcode "Select Currency", add rate loading state |
| `src/hooks/exchange/use-exchange-rate.ts` | Remove `initialData` for API-first behavior |
| `src/store/app-store.ts` | Set default `exchangeRate` to `0` |

