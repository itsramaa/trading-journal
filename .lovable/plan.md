
# Plan: Fix Notification Spam Issues

## 1. Problem Summary

| Issue | Root Cause | Severity |
|-------|-----------|----------|
| Welcome notification spam (7503 duplicates) | Race condition + no atomic upsert + missing DB constraint | **CRITICAL** |
| Extreme Fear notification spam (167/day) | Memory-only deduplication resets on page reload | **HIGH** |

---

## 2. Solution Design

### 2.1 Welcome Notification Fix

**Approach: Database-Level Prevention + Atomic Upsert**

```text
┌─────────────────────────────────────────────────────────┐
│ CURRENT (BROKEN)                                         │
│                                                          │
│ onAuthStateChange → check exists → (race) → insert       │
│                     ↓                                    │
│              Multiple calls win the race                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ FIXED                                                    │
│                                                          │
│ 1. Add UNIQUE constraint: (user_id, title, type)         │
│ 2. Use INSERT ... ON CONFLICT DO NOTHING                 │
│ 3. Track "profile created" flag in useRef                │
└─────────────────────────────────────────────────────────┘
```

**Changes:**
1. **Database Migration**: Add unique constraint on `notifications` for system welcome message
2. **Code Change**: Replace check-then-insert with atomic upsert in `use-auth.ts`
3. **Add `profileCreated` ref**: Prevent multiple calls during same session

---

### 2.2 Extreme Fear Notification Limit (Max 3/day)

**Approach: Database-Level Daily Counter**

```text
┌─────────────────────────────────────────────────────────┐
│ CURRENT (BROKEN)                                         │
│                                                          │
│ useRef (memory) → lost on page reload                    │
│ Hour-based key → still allows 24 per day                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ FIXED                                                    │
│                                                          │
│ 1. Query DB: COUNT notifications WHERE                   │
│    - type = 'market_alert'                               │
│    - title LIKE '%Extreme Fear%'                         │
│    - created_at >= start of today                        │
│ 2. If count >= 3, skip notification                      │
│ 3. Delete memory-based deduplication                     │
└─────────────────────────────────────────────────────────┘
```

**Configuration:**
- Max 3 Extreme Fear notifications per day
- Max 3 Extreme Greed notifications per day
- (Total 6 extreme condition alerts per day maximum)

---

## 3. Implementation Steps

### Step 1: Database Migration

Add unique partial index to prevent Welcome duplicate:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_welcome_unique 
ON notifications (user_id) 
WHERE type = 'system' AND title = 'Welcome to Portfolio Manager!';
```

### Step 2: Fix `use-auth.ts`

1. Add `profileCreatedRef` to prevent multiple calls in same session
2. Change Welcome notification insert to use `ON CONFLICT DO NOTHING`
3. Remove separate check query (unnecessary with constraint)

```typescript
// Before
const { data: existingNotification } = await supabase
  .from('notifications')
  .select('id')
  .eq('user_id', user.id)
  .eq('title', 'Welcome to Portfolio Manager!')
  .maybeSingle();

if (!existingNotification) {
  await supabase.from('notifications').insert({...});
}

// After
await supabase.from('notifications').upsert({
  user_id: user.id,
  type: 'system',
  title: 'Welcome to Portfolio Manager!',
  message: '...',
}, { onConflict: 'user_id,type,title', ignoreDuplicates: true });
```

### Step 3: Fix `use-notification-triggers.ts`

1. Add `MAX_DAILY_EXTREME_ALERTS = 3` constant
2. Before sending extreme fear/greed notification, query database for today's count
3. Skip if count >= 3
4. Remove hour-based memory deduplication

```typescript
const MAX_DAILY_EXTREME_ALERTS = 3;

// Query today's extreme fear notifications
const { count } = await supabase
  .from('notifications')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('type', 'market_alert')
  .like('title', '%Extreme Fear%')
  .gte('created_at', todayStart);

if ((count ?? 0) >= MAX_DAILY_EXTREME_ALERTS) {
  return; // Skip, already sent 3 today
}
```

### Step 4: Cleanup Existing Duplicates

```sql
-- Delete duplicate Welcome notifications (keep oldest)
DELETE FROM notifications 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM notifications 
  WHERE title = 'Welcome to Portfolio Manager!'
  GROUP BY user_id
)
AND title = 'Welcome to Portfolio Manager!';

-- Delete excess Extreme Fear notifications (keep 3 newest per day)
-- (Optional - can leave historical data)
```

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-auth.ts` | Add ref guard, use upsert for welcome |
| `src/hooks/use-notification-triggers.ts` | Add DB-level daily limit check |
| Database Migration | Add partial unique index |

---

## 5. Testing Checklist

- [ ] Login/logout multiple times → only 1 Welcome notification
- [ ] Hot reload page → no duplicate Welcome
- [ ] Extreme Fear condition persists → max 3 notifications per day
- [ ] Page refresh during Extreme Fear → no additional notification if limit reached
- [ ] Next day → counter resets, allows 3 new notifications

---

## 6. Technical Details

### Why Database-Level is Better

1. **Atomic**: No race conditions possible
2. **Persistent**: Survives page reloads, HMR, multiple tabs
3. **Consistent**: Single source of truth
4. **Auditable**: Can query historical counts

### Constants

```typescript
const MAX_DAILY_EXTREME_FEAR = 3;
const MAX_DAILY_EXTREME_GREED = 3;
```
