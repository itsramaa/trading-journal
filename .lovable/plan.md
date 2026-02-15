

# Contextual Status Card Messages

Small but meaningful improvement to the "no trades" status card in `AccountDetailMetrics.tsx`.

---

## Current State

The status card shows:
- **Title**: "No closed trades yet" (always the same)
- **Subtitle**: Context-aware (shows position count for live, generic prompt for paper)

## Change

Make both the title AND subtitle contextually aware of account state:

**Live account with open positions:**
- Title: "No closed trades yet"
- Subtitle: "{N} open position(s) active. Metrics update after first close."

**Live account with no positions:**
- Title: "No closed trades yet"
- Subtitle: "Open a position to start tracking performance."

**Paper account:**
- Title: "No closed trades yet"
- Subtitle: "Start trading or import history."

---

## Technical Detail

**File:** `src/components/accounts/detail/AccountDetailMetrics.tsx` (lines 80-84)

Update the subtitle text in the status card:

```typescript
<p className="text-xs text-muted-foreground mt-1">
  {isBinanceVirtual && activePositionsCount > 0
    ? `${activePositionsCount} open position${activePositionsCount > 1 ? 's' : ''} active. Metrics update after first close.`
    : isBinanceVirtual
      ? 'Open a position to start tracking performance.'
      : 'Start trading or import history.'}
</p>
```

One file, one edit. No structural changes needed -- the existing conditional logic just needs a third branch and better copy.
