
# Implementation Plan: Final Touches & Notification System

## Scope Overview

Menyelesaikan sisa item dari audit dan memperbaiki halaman Notifications yang masih menggunakan dummy data.

---

## Task 1: Accounts Page - Add Risk Settings Link

**File:** `src/pages/Accounts.tsx`

**Perubahan:**
- Tambahkan quick link ke Risk Settings di header area
- Posisi: Setelah "API Settings" button
- Icon: Shield (dari lucide-react)

```text
Header buttons order:
[Refresh] [API Settings] [Risk Settings]
```

**Reasoning:** Balance impacts daily loss limits, jadi quick access ke Risk Settings membantu user untuk menyesuaikan limit setelah melihat balance.

---

## Task 2: Notifications Page - Connect to Real Data

**Current Problem:**
- `Notifications.tsx` menggunakan `dummyNotifications` array
- Tidak ada persistence
- Settings state tidak tersimpan

**Proposed Solution:**

### Option A: Basic LocalStorage Persistence (Quick)
- Store notifications di localStorage
- Simple implementation, no DB changes

### Option B: Full Database Integration (Recommended)
- Buat table `notifications` di Supabase
- Real-time updates via subscription
- Proper read/unread tracking

**Recommended: Option A untuk sekarang** (Quick win, bisa di-upgrade nanti)

**Implementation:**
1. Create `useNotifications` hook dengan localStorage persistence
2. Update `Notifications.tsx` untuk menggunakan hook
3. Integrate dengan existing toast/alert system untuk push notifications

---

## Task 3: Update Plan Documentation

**File:** `.lovable/plan.md`

**Updates:**
- Mark all phases as complete
- Add "Minor Improvements" section
- Document Notifications enhancement

---

## Implementation Order

```text
1. Accounts.tsx - Add Risk Settings link (~5 min)
2. Notifications.tsx - Replace dummy data with localStorage hook (~15 min)
3. Update plan.md - Document completion (~2 min)
```

---

## Technical Details

### Task 1: Accounts Risk Link

```tsx
// Add to imports
import { Shield } from "lucide-react";

// Add button in header
<Button variant="outline" asChild>
  <Link to="/risk">
    <Shield className="h-4 w-4 mr-2" />
    Risk Settings
  </Link>
</Button>
```

### Task 2: useNotifications Hook

```typescript
// New file: src/hooks/use-notifications.ts
interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  timestamp: string;
  createdAt: Date;
}

// Functions:
// - getNotifications()
// - addNotification(notification)
// - markAsRead(id)
// - markAllAsRead()
// - deleteNotification(id)
// - clearAll()
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/pages/Accounts.tsx` | Add Risk Settings button |
| `src/hooks/use-notifications.ts` | NEW - LocalStorage hook |
| `src/pages/Notifications.tsx` | Replace dummy data with hook |
| `.lovable/plan.md` | Update completion status |

---

## Success Criteria

1. Accounts page has Risk Settings quick link in header
2. Notifications page persists data in localStorage
3. Adding notification via toast also stores in notification center
4. All phases documented as complete in plan.md
