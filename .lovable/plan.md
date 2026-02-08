
# Audit Report: Profile Page & Notification Page

## Executive Summary

Audit dilakukan terhadap **Profile Page** (`/profile`) dan **Notification Page** (`/notifications`) beserta seluruh komponen, hook, dan service terkait. **Kedua halaman ini memiliki arsitektur yang BAIK** dengan:

- Data hooks menggunakan pattern yang konsisten (`useUserProfile`, `useUserSettings`, `useNotifications`)
- Mutation hooks dengan proper query invalidation
- React Query untuk caching dan state management
- Supabase realtime subscription untuk notifications

**Risiko keseluruhan: LOW** - Kedua halaman sudah memiliki arsitektur yang solid dengan minor hardcode yang tidak mempengaruhi akurasi data.

---

## STEP 1 — HARDCODE DETECTION

### 1.1 Profile.tsx Page

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 97 | Password min length | Logic | `< 6` |
| 98 | Password error message | UI | `"Password must be at least 6 characters"` |
| 145 | Tab width | UI | `lg:w-[300px]` |
| 186 | Accepted file types | Data | `image/jpeg,image/png,image/gif,image/webp` |
| 209 | File size limit text | UI | `"Max 2MB"` |
| 250 | Currency fallback | Data | `settings?.default_currency \|\| "USD"` |
| 257-260 | Currency options | Data | `["USD", "IDR", "BTC_USD", "BTC_IDR"]` inline |
| 267 | Language fallback | Data | `settings?.language \|\| "en"` |
| 274-275 | Language options | Data | `["en", "id"]` inline |
| 354 | 2FA badge | UI | `"Coming Soon"` |

### 1.2 Notifications.tsx Page

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 26-37 | `getTypeColor` function | Logic | Type-to-color mapping inline |
| 28-29 | Type match: `"success"`, `"price_alert"` | Data | Notification types inline |
| 31 | Type match: `"warning"` | Data | Inline |
| 33 | Type match: `"error"` | Data | Inline |
| 99-101 | Skeleton count | UI | `[1, 2, 3]` for loading state |
| 157-158 | Weekly report description | UI | `"Download your trading performance summary as PDF"` |

### 1.3 use-notifications.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 34 | Query limit | Data | `limit(50)` |
| 40 | Stale time | Data | `30_000` (30 seconds) |
| - | ✅ Uses centralized query key | - | `NOTIFICATIONS_KEY` constant |

### 1.4 use-user-settings.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 68 | Default currency | Data | `'USD'` |
| 69 | Default theme | Data | `'dark'` |
| 70 | Default language | Data | `'en'` |
| 72-73 | Default subscription | Data | `'free'`, `'active'` |
| 86 | Stale time | Data | `5 * 60 * 1000` (5 minutes) |
| 130-133 | Display name fallback chain | Logic | `user_metadata?.full_name \|\| name \|\| email?.split('@')[0] \|\| 'User'` |
| 153 | Stale time | Data | `5 * 60 * 1000` (5 minutes) |
| 194 | File size limit | Logic | `2 * 1024 * 1024` (2MB) |
| 198-200 | Allowed image types | Data | `['image/jpeg', 'image/png', 'image/gif', 'image/webp']` |
| 269-271 | Plan expiration calculation | Logic | `30 * 24 * 60 * 60 * 1000` (30 days) |

### 1.5 use-weekly-report-export.ts Hook

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 93 | Top pairs slice | Logic | `slice(0, 5)` |
| 144-148 | PDF colors (zinc-900) | UI | `[24, 24, 27]` |
| 167-168 | PDF colors (zinc-800) | UI | `[39, 39, 42]` |
| 175 | Profit color | UI | `[34, 197, 94]` (green) |
| 175 | Loss color | UI | `[239, 68, 68]` (red) |
| 195 | Table header color | UI | `[59, 130, 246]` (blue) |
| 221-224 | Green header color | UI | `[34, 197, 94]` |
| 267-270 | Purple header color | UI | `[147, 51, 234]` |
| 299 | Footer text | UI | `"Trading Journey Weekly Report"` |
| 320 | Week starts on | Data | `weekStartsOn: 1` (Monday) |

### 1.6 notification-service.ts (Shared Service)

| Line | Hardcode | Jenis | Nilai |
|------|----------|-------|-------|
| 10-18 | NotificationType enum | Data | Type literals inline |
| 71-72 | Result emoji mapping | UI | `🟢`, `🔴`, `⚪` |
| 101-102 | Warning messages | UI | `"70%"`, `"90%"` inline |
| 139-148 | Alert emoji mapping | UI | `😨`, `🤑`, `⚔️` |
| 175-176 | Weekly report emoji | UI | `📈`, `📉` |
| 207 | Email trigger threshold | Logic | `failureCount >= 3` |

---

## STEP 2 — HARDCODE IMPACT ANALYSIS

### 2.1 Positive Findings: Architecture Strong ✅

**React Query Pattern - Consistent:**
- `useUserProfile`, `useUserSettings` use consistent query patterns
- `useNotifications` uses centralized query key constant
- Proper `queryClient.invalidateQueries` on mutations
- **Impact:** Excellent cache management

**Hooks - Clean Separation:**
- `useUploadAvatar` handles upload + profile update in single mutation
- `useUpdatePassword` wraps Supabase auth API
- `useDeleteAccount` handles sign out (dengan catatan: actual deletion belum implemented)
- **Impact:** Clean API surface

**Realtime Subscription:**
- `useNotificationsRealtime` menggunakan Supabase channel
- Proper cleanup on unmount
- **Impact:** Live notification updates

### 2.2 Minor Hardcodes - LOW Impact

**Currency Options (Profile.tsx line 257-260):**
```typescript
<SelectItem value="USD">USD</SelectItem>
<SelectItem value="IDR">IDR</SelectItem>
<SelectItem value="BTC_USD">BTC/USD</SelectItem>
<SelectItem value="BTC_IDR">BTC/IDR</SelectItem>
```

**Dampak:**
- Options inline, tidak tersentralisasi
- Jika menambah currency baru, harus update di component

**Risiko:** LOW - Currency options rarely change, acceptable inline

---

**Language Options (Profile.tsx line 274-275):**
```typescript
<SelectItem value="en">English</SelectItem>
<SelectItem value="id">Bahasa Indonesia</SelectItem>
```

**Dampak:**
- i18n options inline
- Consistent with i18next configuration

**Risiko:** LOW - Language list is stable

---

**Notification Type Colors (Notifications.tsx line 26-37):**
```typescript
const getTypeColor = (type: string) => {
  switch (type) {
    case "success":
    case "price_alert":
      return "bg-profit/10 text-profit";
    ...
  }
};
```

**Dampak:**
- Type-to-color mapping inline
- TIDAK SINKRON dengan `NotificationType` di `notification-service.ts`
- Service defines: `trade_closed`, `daily_loss_warning`, `market_alert`, etc.
- UI handles: `success`, `price_alert`, `warning`, `error`

**Risiko:** MEDIUM - Type mismatch bisa menyebabkan warna salah

---

**Password Minimum Length (Profile.tsx line 97):**
```typescript
if (newPassword.length < 6) {
  toast.error("Password must be at least 6 characters");
}
```

**Dampak:**
- Same validation in `Auth.tsx` menggunakan Zod schema
- Duplicated validation rule

**Risiko:** LOW - Auth.tsx uses centralized zod schema, Profile.tsx uses inline check

---

**PDF Export Colors (use-weekly-report-export.ts):**
```typescript
doc.setFillColor(24, 24, 27); // zinc-900
doc.setTextColor(isProfit ? 34 : 239, isProfit ? 197 : 68, isProfit ? 94 : 68);
```

**Dampak:**
- Colors hardcoded for jsPDF (tidak bisa pakai CSS variables)
- Warna berbeda dari Tailwind theme

**Risiko:** LOW - PDF is separate context, acceptable

---

**File Upload Constraints (use-user-settings.ts line 194-200):**
```typescript
if (file.size > 2 * 1024 * 1024) {
  throw new Error('File size must be less than 2MB');
}
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
```

**Dampak:**
- UI text says "Max 2MB" - konsisten
- Same types displayed in accept attribute - konsisten

**Risiko:** NONE - Consistent across UI and validation

---

**Notification Query Limit (use-notifications.ts line 34):**
```typescript
.limit(50)
```

**Dampak:**
- Arbitrary limit, tidak configurable
- May truncate old notifications

**Risiko:** LOW - Reasonable default for UX

---

### 2.3 Medium Risk: Notification Type Mismatch

**Issue:** `getTypeColor()` di Notifications.tsx handles types yang berbeda dari `NotificationType` di notification-service.ts

| notification-service.ts types | Notifications.tsx getTypeColor |
|------------------------------|--------------------------------|
| `trade_closed` | ❌ Not handled |
| `daily_loss_warning` | ❌ Not handled |
| `daily_loss_limit` | ❌ Not handled |
| `market_alert` | ❌ Not handled |
| `weekly_report` | ❌ Not handled |
| `sync_error` | Maps to `"error"` |
| `sync_warning` | Maps to `"warning"` |
| `system` | Falls through to default |
| - | `success` (custom) |
| - | `price_alert` (custom) |

**Dampak:**
- Sebagian besar notification types akan mendapat warna default (primary)
- User tidak mendapat visual cue yang tepat

**Risiko:** MEDIUM - Visual inconsistency, tidak mempengaruhi data

---

## STEP 3 — RESPONSIBILITY & STRUCTURE AUDIT

### 3.1 Single Responsibility - EXCELLENT ✅

| Component/Hook | Status | Notes |
|----------------|--------|-------|
| `Profile.tsx` | ✅ Page | Orchestrates profile + security tabs |
| `Notifications.tsx` | ✅ Page | Orchestrates notification list + weekly export |
| `useUserProfile` | ✅ Data Hook | Profile CRUD |
| `useUserSettings` | ✅ Data Hook | Settings CRUD |
| `useUploadAvatar` | ✅ Action Hook | Single-purpose: upload avatar |
| `useUpdatePassword` | ✅ Action Hook | Single-purpose: password change |
| `useNotifications` | ✅ Data Hook | Notification list fetch |
| `useMarkAsRead` | ✅ Action Hook | Single-purpose |
| `useWeeklyReportExport` | ⚠️ Mixed | Data fetch + PDF generation + download |

### 3.2 DRY Compliance - GOOD ✅

| Pattern | Status | Notes |
|---------|--------|-------|
| Query keys | ✅ Centralized | `NOTIFICATIONS_KEY`, `userSettingsKeys` |
| Password validation | ⚠️ Duplicated | Profile uses inline, Auth uses Zod |
| Notification types | ⚠️ Not synced | Service vs UI mismatch |
| File constraints | ✅ Consistent | UI text matches validation |

### 3.3 Data Flow - EXCELLENT ✅

```text
[Profile Page]
├── useAuth() → Current user
├── useUserProfile() → Supabase users_profile
├── useUserSettings() → Supabase user_settings
├── useUploadAvatar() → Supabase Storage + users_profile
├── useUpdatePassword() → Supabase Auth
└── useDeleteAccount() → Supabase Auth sign out

[Notifications Page]
├── useNotifications() → Supabase notifications
├── useUnreadCount() → Derived from useNotifications
├── useMarkAsRead() → Supabase notifications update
├── useMarkAllAsRead() → Supabase notifications update
├── useClearAllNotifications() → Supabase notifications delete
└── useWeeklyReportExport()
    ├── calculateWeeklyStats() → Supabase trade_entries
    └── generatePDF() → jsPDF output
```

---

## STEP 4 — REFACTOR DIRECTION (HIGH-LEVEL)

### 4.1 Quick Win: Centralize Notification Type Configuration

**Current:** `getTypeColor()` inline di Notifications.tsx, `NotificationType` di notification-service.ts

**Ideal:**
```text
src/lib/constants/notification-config.ts
├── NOTIFICATION_TYPES (with metadata)
│   ├── trade_closed: { color: 'profit', icon: 'CheckCircle' }
│   ├── daily_loss_warning: { color: 'warning', icon: 'AlertTriangle' }
│   ├── sync_error: { color: 'loss', icon: 'XCircle' }
│   └── ...
```

**Priority:** MEDIUM - Ensures visual consistency

### 4.2 Optional: Extract Password Validation Constant

**Current:** `< 6` in Profile.tsx, `min(6)` in Auth.tsx zod schema

**Potential:**
```text
src/lib/constants/auth-config.ts
├── AUTH_CONFIG
│   ├── MIN_PASSWORD_LENGTH: 6
│   └── PASSWORD_ERROR_MESSAGE: "Password must be at least 6 characters"
```

**Recommendation:** LOW Priority - Both locations work independently

### 4.3 Optional: Centralize Currency/Language Options

**Current:** Inline di Profile.tsx

**Potential:**
```text
src/lib/constants/user-preferences.ts
├── CURRENCY_OPTIONS: [{ value: 'USD', label: 'USD' }, ...]
├── LANGUAGE_OPTIONS: [{ value: 'en', label: 'English' }, ...]
```

**Recommendation:** SKIP - Options are stable, inline acceptable

### 4.4 useWeeklyReportExport Refactor

**Current:** Hook does data fetching + PDF generation + file download

**Potential Split:**
```text
src/services/weekly-report.service.ts
├── calculateWeeklyStats() - Pure function
├── generatePDF() - Pure function

src/hooks/use-weekly-report-export.ts
├── Uses service functions
├── Manages loading state
├── Triggers toast notifications
```

**Recommendation:** LOW Priority - Current structure works, hook is self-contained

---

## STEP 5 — RISK LEVEL ASSESSMENT

### Profile Page: **LOW** ✅

**Justifikasi:**
- Uses centralized hooks correctly ✅
- File upload validation consistent ✅
- Password validation works (duplicate but functional) ✅
- 2FA marked as "Coming Soon" correctly ✅
- Delete account properly shows confirmation ✅

**Minor Issues:**
- Currency/language options inline (acceptable)
- Password validation duplicated (functional)

### Notification Page: **LOW** ✅

**Justifikasi:**
- Uses React Query hooks correctly ✅
- Realtime subscription available ✅
- Weekly report export functional ✅
- Empty states handled properly ✅

**Minor Issues:**
- `getTypeColor()` tidak sinkron dengan `NotificationType` (MEDIUM)
- Weekly export PDF colors hardcoded (acceptable - jsPDF context)

---

## Summary Table

| Category | Profile Page | Notification Page |
|----------|--------------|-------------------|
| Hardcode Count | ~10 minor | ~8 minor |
| DRY Violations | 1 minor (password) | 1 medium (type colors) |
| SRP Violations | 0 | 0 |
| Data Accuracy Risk | **NONE** | **NONE** |
| Hook Architecture | ✅ Excellent | ✅ Excellent |
| Data Flow | ✅ Clean | ✅ Clean |

---

## Recommended Priority

### Recommended Fix (Low Effort, Medium Impact)
1. **MEDIUM**: Sync `getTypeColor()` dengan `NotificationType` - Buat constant yang shared antara notification-service.ts dan Notifications.tsx

### Optional (Low Effort, Low Impact)
2. **LOW**: Extract password min length ke constant

### Not Recommended (Over-Engineering)
- ❌ Centralize currency/language options - Stable, inline acceptable
- ❌ Refactor useWeeklyReportExport - Works correctly as-is
- ❌ Extract PDF colors - jsPDF context is different from CSS

---

## Final Risk Assessment

| Page | Risk Level | Justification |
|------|------------|---------------|
| **Profile** | **LOW** ✅ | Hooks clean, data flow correct, minor duplications acceptable |
| **Notification** | **LOW** ✅ | Realtime works, type color mismatch is visual-only |

---

## Key Architecture Highlights

### 1. User Settings Hook Pattern ✅
```text
use-user-settings.ts
├── useUserSettings - Settings query with auto-create
├── useUpdateUserSettings - Partial update mutation
├── useUserProfile - Profile query with auto-create
├── useUpdateUserProfile - Profile mutation
├── useUploadAvatar - Storage + profile mutation
├── useUpdatePassword - Auth mutation
├── useDeleteAccount - Auth sign out (TODO: full deletion)
```

### 2. Notifications Hook Pattern ✅
```text
use-notifications.ts
├── useNotifications - List query with limit
├── useNotificationsRealtime - Supabase channel subscription
├── useUnreadCount - Derived from query
├── useMarkAsRead - Single update mutation
├── useMarkAllAsRead - Bulk update mutation
├── useClearAllNotifications - Bulk delete mutation
```

### 3. Data Auto-Creation Pattern ✅
Both `useUserSettings` dan `useUserProfile` implement auto-creation pattern:
- Query checks for existing record
- If `PGRST116` (not found), creates with defaults
- Returns new record immediately
- No manual setup required for new users

---

## Conclusion

Kedua halaman ini memiliki **arsitektur yang solid**:

1. ✅ React Query hooks dengan proper caching
2. ✅ Supabase realtime untuk notifications
3. ✅ Auto-creation pattern untuk new users
4. ✅ Single responsibility di hooks
5. ✅ Clean data flow dari database ke UI

**Satu fix yang direkomendasikan:**
- Sinkronisasi `getTypeColor()` dengan `NotificationType` untuk memastikan semua notification types mendapat warna yang tepat.

Selain itu, kedua halaman sudah **PRODUCTION-READY**.

