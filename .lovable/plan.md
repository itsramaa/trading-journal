

# Plan: AI Floating Chatbot dengan Expanded Full-Screen Mode

## Objective

Menambahkan mode "expanded" pada AI Floating Chatbot yang menampilkan fitur chat lengkap seperti page yang dihapus, termasuk:
- Full-width layout
- More suggestions/quick actions
- Conversation history sidebar
- Better UX untuk chat panjang

---

## Current States

| State | Size | Features |
|-------|------|----------|
| Closed | FAB 56x56px | Sparkles icon only |
| Minimized | w-72 h-14 | Header only |
| Open | w-96 h-[520px] | Chat dengan suggestions |

## New State: Expanded

| State | Size | Features |
|-------|------|----------|
| **Expanded** | Full viewport (inset-4) | Full chat + suggestions + tips + clear history |

---

## Implementation Plan

### Phase 1: Add Expanded State

**File: `src/components/chat/AIChatbot.tsx`**

1. Add new state: `isExpanded`
2. Add Expand button in header (alongside Minimize)
3. Update container classes for expanded mode

### Phase 2: Enhanced Expanded UI

When expanded, show:
- **Left Panel (optional)**: Quick actions / AI capabilities info
- **Center**: Full chat area (larger, more comfortable)
- **Right Panel (optional)**: Tips or context summary
- **Footer**: Input with clear history button

### Phase 3: Additional Features in Expanded Mode

- Clear conversation button
- More suggestion categories
- Export chat option
- Keyboard shortcut (Escape to minimize)

---

## Technical Details

### New State Logic

```typescript
// States: closed -> open (compact) -> expanded (fullscreen)
const [isOpen, setIsOpen] = useState(false);
const [isMinimized, setIsMinimized] = useState(false);
const [isExpanded, setIsExpanded] = useState(false);
```

### Container Classes

```typescript
const containerClasses = cn(
  "fixed z-50 shadow-2xl transition-all duration-300 flex flex-col bg-background border rounded-lg",
  isExpanded 
    ? "inset-4 md:inset-8" // Full screen with padding
    : isMinimized 
      ? "bottom-6 right-6 w-72 h-14" 
      : "bottom-6 right-6 w-96 h-[520px]"
);
```

### Header Controls Update

```tsx
<div className="flex items-center gap-1 shrink-0">
  {/* Expand/Collapse */}
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7"
    onClick={() => setIsExpanded(!isExpanded)}
    title={isExpanded ? "Compact mode" : "Expand"}
  >
    {isExpanded ? <Minimize2 /> : <Maximize2 />}
  </Button>
  
  {/* Minimize (only in compact mode) */}
  {!isExpanded && (
    <Button onClick={() => setIsMinimized(!isMinimized)}>
      {isMinimized ? <ChevronUp /> : <ChevronDown />}
    </Button>
  )}
  
  {/* Close */}
  <Button onClick={() => { setIsOpen(false); setIsExpanded(false); }}>
    <X />
  </Button>
</div>
```

---

## Expanded Mode Layout

```
┌──────────────────────────────────────────────────────────┐
│  Header: Trading Analyst       [Compact] [Minimize] [X]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐  ┌────────────────────────────────┐ │
│  │ Quick Actions   │  │        Chat Messages           │ │
│  │                 │  │                                │ │
│  │ • Analisis      │  │  AI: Greeting...               │ │
│  │ • Strategi      │  │                                │ │
│  │ • Pattern       │  │  User: Question...             │ │
│  │ • Kelemahan     │  │                                │ │
│  │                 │  │  AI: Response...               │ │
│  │ ─────────────── │  │                                │ │
│  │ Tips            │  │                                │ │
│  │ • Use specific  │  │                                │ │
│  │ • Include pairs │  │                                │ │
│  └─────────────────┘  └────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Clear Chat]  [________________________] [Send]         │
└──────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/chat/AIChatbot.tsx` | Add expanded state, new layout, clear chat, keyboard shortcuts |

---

## New Features in Expanded Mode

1. **Clear Conversation** - Button to reset chat
2. **Quick Actions Panel** - Predefined prompts categorized
3. **Tips Panel** - How to get better AI responses
4. **Keyboard Shortcuts** - Escape to close/minimize
5. **Better Message Display** - Larger area, markdown support ready

---

## Summary

| Feature | Compact Mode | Expanded Mode |
|---------|--------------|---------------|
| Size | 384x520px | Full viewport |
| Suggestions | 3 inline buttons | Sidebar panel |
| Tips | None | Sidebar panel |
| Clear Chat | None | Footer button |
| Layout | Single column | Multi-column |

