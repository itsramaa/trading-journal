# AI Floating Chatbot - Dokumentasi Lengkap

## Overview

AI Floating Chatbot adalah komponen chat AI yang tersedia di seluruh halaman aplikasi. Chatbot ini menyediakan analisis trading berbasis AI dengan streaming response real-time.

---

## Arsitektur Komponen

```
src/components/chat/
├── AIChatbot.tsx          # Main component dengan state management
├── ChatMessage.tsx        # Render individual chat message
├── QuickActionsPanel.tsx  # Panel quick actions (expanded mode)
└── TipsPanel.tsx          # Panel tips (expanded mode)
```

---

## States & Transitions

### State Diagram

```
┌─────────┐    click FAB    ┌─────────┐
│ CLOSED  │ ──────────────► │  OPEN   │
│ (FAB)   │ ◄────────────── │(Compact)│
└─────────┘    click X      └────┬────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │MINIMIZED │      │   OPEN   │      │ EXPANDED │
        │(Header)  │ ◄──► │(Compact) │ ◄──► │(Fullscr) │
        └──────────┘      └──────────┘      └──────────┘
```

### State Details

| State | Dimensions | Visible Elements |
|-------|------------|------------------|
| **Closed** | 56x56px (FAB) | Sparkles icon button |
| **Minimized** | 288x56px | Header only (title + controls) |
| **Open (Compact)** | 384x520px | Header + Chat + Input |
| **Expanded** | Full viewport (inset-4) | Header + Quick Actions + Chat + Tips + Input |

---

## Komponen Detail

### 1. AIChatbot.tsx (Main Component)

**Path:** `src/components/chat/AIChatbot.tsx`

**State Management:**
```typescript
const [isOpen, setIsOpen] = useState(false);      // Chatbot visibility
const [isMinimized, setIsMinimized] = useState(false);  // Header-only mode
const [isExpanded, setIsExpanded] = useState(false);    // Fullscreen mode
const [messages, setMessages] = useState<Message[]>([]); // Chat history
const [input, setInput] = useState('');           // Current input
const [isLoading, setIsLoading] = useState(false); // API loading state
```

**Trading Context:**
Chatbot secara otomatis mengirim context trading ke AI:
- Trade entries (closed trades dengan PnL, R:R, strategies)
- Trading strategies yang user miliki
- Account summary (total balance, account count)

**Streaming Response:**
Menggunakan `fetch` + `ReadableStream` untuk real-time streaming dari edge function `trading-analysis`.

### 2. ChatMessage.tsx

**Path:** `src/components/chat/ChatMessage.tsx`

**Props:**
```typescript
interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  ModeIcon: LucideIcon;
}
```

**Styling:**
- User messages: Primary background, aligned right
- Assistant messages: Muted background, aligned left
- Avatar icons berbeda untuk user vs AI

### 3. QuickActionsPanel.tsx

**Path:** `src/components/chat/QuickActionsPanel.tsx`

**Categories & Actions:**

| Category | Action | Prompt |
|----------|--------|--------|
| **Analisis** | Analisis Performa | "Analisis performa trading saya secara keseluruhan" |
| **Analisis** | Win Rate & Metrics | "Berapa win rate dan metrics trading saya?" |
| **Strategi** | Pattern Terbaik | "Pattern trading apa yang paling profitable untuk saya?" |
| **Strategi** | Strategi Rekomendasi | "Strategi mana yang sebaiknya saya fokuskan?" |
| **Improvement** | Kelemahan Trading | "Apa kelemahan utama dalam trading saya?" |
| **Improvement** | Tips Improvement | "Bagaimana cara meningkatkan kualitas entry saya?" |

### 4. TipsPanel.tsx

**Path:** `src/components/chat/TipsPanel.tsx`

**Tips yang ditampilkan:**
1. Sebutkan pair spesifik untuk analisis lebih akurat
2. Tanyakan tentang timeframe tertentu
3. Minta perbandingan antar strategi
4. Tanya tentang win rate di kondisi market tertentu
5. Minta analisis drawdown dan risk management
6. Tanyakan pattern yang sering loss untuk dihindari

---

## Layout Details

### Compact Mode Layout

```
┌──────────────────────────────────────┐
│ [Icon] Trading Analyst  [▢][▽][✕]   │ ← Header (56px)
├──────────────────────────────────────┤
│                                      │
│  AI: Greeting message...             │
│                                      │
│      [Suggestion 1] [Suggestion 2]   │ ← Inline suggestions
│      [Suggestion 3]                  │
│                                      │
│  User: Question...                   │
│                                      │
│  AI: Response with streaming...      │
│                                      │
├──────────────────────────────────────┤
│ [__________________] [Send]          │ ← Input (56px)
└──────────────────────────────────────┘
        ↑ 384px width ↑
```

### Expanded Mode Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ [Icon] Trading Analyst — Analisis pattern & performa  [▢][✕]      │
├─────────────────┬────────────────────────────────────┬─────────────┤
│ QUICK ACTIONS   │         CHAT MESSAGES              │ TIPS        │
│                 │                                    │             │
│ ─ ANALISIS ─    │  AI: Greeting...                   │ [💡] Tips   │
│ • Analisis Perf │                                    │             │
│ • Win Rate      │  Gunakan Quick Actions di panel    │ ✓ Pair...   │
│                 │  kiri atau ketik pertanyaan Anda.  │ ✓ Time...   │
│ ─ STRATEGI ─    │                                    │ ✓ Strat...  │
│ • Pattern       │  User: Question...                 │ ✓ Win...    │
│ • Rekomendasi   │                                    │ ✓ Draw...   │
│                 │  AI: Streaming response...         │ ✓ Pattern..│
│ ─ IMPROVEMENT ─ │                                    │             │
│ • Kelemahan     │                                    │             │
│ • Tips          │                                    │             │
│                 │                                    │             │
├─────────────────┼────────────────────────────────────┼─────────────┤
│                 │ [🗑] [____________________] [Send]  │             │
│                 │     Press Escape to collapse       │             │
└─────────────────┴────────────────────────────────────┴─────────────┘
     256px              Flexible (flex-1)                  256px
```

---

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Enter` | Send message | Input focused |
| `Escape` | Collapse expanded → Compact | Expanded mode |
| `Escape` | Close chatbot | Compact mode |

---

## API Integration

### Edge Function: `trading-analysis`

**Endpoint:** `${VITE_SUPABASE_URL}/functions/v1/trading-analysis`

**Request:**
```typescript
{
  trades: TradeForAI[],      // Array of closed trades
  strategies: Strategy[],    // User's trading strategies
  question: string           // User's question
}
```

**Response:** Server-Sent Events (SSE) stream

**Stream Format:**
```
data: {"choices":[{"delta":{"content":"..."}}]}
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

---

## Responsive Behavior

| Screen Size | Quick Actions Panel | Tips Panel |
|-------------|---------------------|------------|
| `< md` (768px) | Hidden | Hidden |
| `md - lg` | Visible (256px) | Hidden |
| `>= lg` (1024px) | Visible (256px) | Visible (256px) |

---

## User Flows

### Flow 1: Quick Question (Compact Mode)

```
1. User clicks FAB (Sparkles button)
2. Chatbot opens in compact mode
3. User sees greeting + inline suggestions
4. User clicks suggestion OR types question
5. AI responds with streaming text
6. User can continue conversation or close
```

### Flow 2: Deep Analysis (Expanded Mode)

```
1. User clicks FAB → Chatbot opens
2. User clicks Maximize button (▢)
3. Chatbot expands to fullscreen
4. User sees Quick Actions panel on left
5. User clicks a quick action OR types custom question
6. AI provides detailed analysis
7. User clicks Clear button to reset conversation
8. User presses Escape OR clicks Minimize to return to compact
```

### Flow 3: Minimize & Resume

```
1. Chatbot is open with ongoing conversation
2. User clicks Minimize button (▽)
3. Chatbot collapses to header-only view
4. User can navigate app freely
5. User clicks Expand (△) to resume conversation
6. All messages are preserved
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| API error | Shows "Maaf, terjadi kesalahan. Silakan coba lagi." |
| No reader available | Logs error, shows error message |
| Stream parsing error | Continues with buffer, attempts recovery |
| Empty response | Filters out empty messages |

---

## Performance Considerations

1. **Lazy Loading:** Chat messages only rendered when chatbot is open
2. **Streaming:** Real-time response reduces perceived latency
3. **Memoization:** `getTradingContext` wrapped in `useCallback`
4. **Conditional Rendering:** Panels only render in expanded mode
5. **Auto-scroll:** ScrollArea auto-scrolls to latest message

---

## Dependencies

```json
{
  "lucide-react": "Icons (Sparkles, Send, X, etc.)",
  "@radix-ui/react-scroll-area": "ScrollArea component",
  "class-variance-authority": "cn() utility",
  "@/hooks/use-trade-entries": "Trade data",
  "@/hooks/use-trading-strategies": "Strategy data",
  "@/hooks/use-accounts": "Account data"
}
```

---

## Testing Checklist

- [ ] FAB visible on all pages
- [ ] Click FAB opens chatbot
- [ ] Minimize collapses to header
- [ ] Expand opens fullscreen
- [ ] Quick actions populate input
- [ ] Messages send and receive
- [ ] Streaming response displays progressively
- [ ] Clear conversation resets messages
- [ ] Escape key works as expected
- [ ] Responsive panels hide/show correctly
- [ ] Error messages display on API failure

---

## Future Enhancements

1. **Export Chat:** Download conversation as text/markdown
2. **Chat History Persistence:** Save conversations to database
3. **Multiple AI Modes:** Add more specialized AI assistants
4. **Voice Input:** Speech-to-text for questions
5. **Markdown Rendering:** Rich text in AI responses
6. **Code Highlighting:** Syntax highlighting for code blocks
