

# Floating Chatbot: Deep UX Analysis & Fixes

## Scope & Coverage

All files read in full:
- `src/components/chat/AIChatbot.tsx` (780 lines)
- `src/components/chat/ChatMessage.tsx` (73 lines)
- `src/components/chat/QuickActionsPanel.tsx` (237 lines)
- `src/components/chat/TipsPanel.tsx` (35 lines)
- `src/store/app-store.ts` (chatbot state section)
- `src/App.tsx` (AIChatbot mount point)

---

## Issues Found

### 1. Mixed Language: Indonesian Strings in Otherwise English UI

The chatbot UI is entirely English **except** for three Indonesian strings:

| Location | Line | Current (Indonesian) | Should Be (English) |
|----------|------|---------------------|---------------------|
| `AIChatbot.tsx` | 595 | `title="Reset semua percakapan"` | `title="Reset all conversations"` |
| `AIChatbot.tsx` | 660 | `"Gunakan Quick Actions di panel kiri atau ketik pertanyaan Anda."` | `"Use Quick Actions on the left panel or type your question."` |
| `TipsPanel.tsx` | 6-11 | All 6 tips in Indonesian | (see issue #2 -- component is dead code) |

### 2. Dead Code: `TipsPanel.tsx` Is Never Used

`TipsPanel.tsx` exists with Indonesian tips, but it is **not imported or rendered anywhere**. The expanded right panel in `AIChatbot.tsx` (lines 732-773) renders its own inline tips in English. `TipsPanel.tsx` is dead code and should be deleted to avoid confusion.

### 3. No Other Issues Found

- **Mode consistency**: Chatbot uses `useModeFilteredTrades` (mode-aware). No structural differences between Paper/Live -- correct.
- **Per-mode history**: Each tab preserves its own message history independently. Switching tabs does not clear history. Correct.
- **Loading state**: Typing indicator with animated dots shows during AI response. Send button shows spinner. Input disabled during loading. All correct.
- **Error state**: Catch block in `sendMessage` removes empty assistant messages and appends error message. Correct.
- **Empty state**: Greeting + suggestions shown when no messages exist. Correct.
- **Streaming**: SSE parsing with proper buffer handling, progressive content update. Correct.
- **Auth**: Checks `user` and returns null if not logged in. Uses JWT for authenticated endpoints. Correct.
- **Keyboard**: Enter to send, Escape to collapse/close. Correct.
- **Global state sync**: `useAppStore` integration for external open/prompt triggers. Correct.
- **ChatMessage**: Markdown rendering with proper component overrides (headings, lists, code, blockquote, links). Correct.
- **QuickActionsPanel**: Filters actions by current mode, categories properly grouped. Correct.
- **ARIA**: Proper labels on all interactive elements, `role="log"`, `aria-live="polite"`, `aria-busy`. Correct.
- **Color tokens**: Uses `bg-primary/10`, `text-primary`, `bg-muted` -- semantic tokens. Correct.

---

## Implementation Plan

### File 1: `src/components/chat/AIChatbot.tsx`

**Line 595**: Change tooltip from Indonesian to English:
```
"Reset semua percakapan" -> "Reset all conversations"
```

**Line 660**: Change expanded-mode hint from Indonesian to English:
```
"Gunakan Quick Actions di panel kiri atau ketik pertanyaan Anda." -> "Use Quick Actions on the left panel or type your question."
```

### File 2: `src/components/chat/TipsPanel.tsx`

**Delete this file entirely.** It is not imported or used by any component. The expanded right panel in `AIChatbot.tsx` already renders its own inline tips in English.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/chat/AIChatbot.tsx` | Fix 2 Indonesian strings to English |
| `src/components/chat/TipsPanel.tsx` | Delete (dead code) |

Total: 2 lines changed, 1 file deleted. All changes are cosmetic/cleanup -- no logic changes.

