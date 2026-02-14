

# Floating Chatbot: Complete UX Consistency Audit & Fixes

## Scope & Coverage

All files read in full (100% coverage):
- `src/components/chat/AIChatbot.tsx` (780 lines)
- `src/components/chat/ChatMessage.tsx` (73 lines)
- `src/components/chat/QuickActionsPanel.tsx` (237 lines)
- `src/store/app-store.ts` (chatbot state)
- `src/components/dashboard/AIInsightsWidget.tsx` (chatbot trigger)
- `src/App.tsx` (mount point)
- `supabase/functions/trading-analysis/index.ts` (218 lines)
- `supabase/functions/market-analysis/index.ts` (158 lines)
- `supabase/functions/confluence-chat/index.ts` (282 lines)
- `supabase/functions/post-trade-chat/index.ts` (214 lines)
- `supabase/functions/_shared/sanitize.ts` (45 lines)

---

## Issues Found

### 1. Indonesian Fallback Prompts in All 4 Edge Functions

When no user question is provided, each edge function falls back to an Indonesian prompt sent to the AI. This means the AI will respond in Indonesian even though the system prompts say "Always respond in English."

| Edge Function | Line | Current (Indonesian) | Should Be (English) |
|---|---|---|---|
| `trading-analysis` | 186 | `"Berikan analisis lengkap performa trading saya dan identifikasi pola-pola penting."` | `"Provide a complete analysis of my trading performance and identify key patterns."` |
| `market-analysis` | 121 | `"Bagaimana kondisi market crypto saat ini? Berikan analisis lengkap."` | `"What are the current crypto market conditions? Provide a complete analysis."` |
| `confluence-chat` | 245 | `"Tolong analisis setup trading saya."` | `"Please analyze my trade setup."` |
| `post-trade-chat` | 177 | `"Analisis trade terakhir saya dan berikan lessons learned."` | `"Analyze my last trade and provide lessons learned."` |

### 2. Indonesian Keywords in Setup Parser (`confluence-chat`)

The `parseTradeSetup` function in `confluence-chat/index.ts` contains Indonesian keywords mixed with English:
- Line 28: `\bbeli\b` (Indonesian for "buy") -- should remain for backward compatibility but is inconsistent
- Line 29: `\bjual\b` (Indonesian for "sell") -- same
- Line 32: `masuk` (Indonesian for "entry") -- same

These should be **kept** since they provide broader parsing coverage and don't affect the UI, but this is noted for completeness.

### 3. No Conversation History Sent to AI -- Broken Multi-Turn Chat

This is the **most critical UX issue**. The chatbot maintains per-mode message history in the UI (`messageHistory` state), but when `sendMessage` is called, it only sends:
```
messages: [
  { role: "system", content: systemPrompt },
  { role: "user", content: question }
]
```

The AI has **zero memory** of previous messages. If a user asks "What's my win rate?" then follows up with "Break it down by strategy," the AI has no idea what "it" refers to. This completely breaks the conversational UX that the chat interface promises.

**Fix**: Send the full conversation history (from `messageHistory[aiMode]`) as part of the request body, and have each edge function include prior messages in the AI API call.

### 4. `market-analysis` Has No Auth Check

`trading-analysis` and `post-trade-chat` both verify the user's JWT token. `market-analysis` does not -- it accepts any request with no authentication. While market data is less sensitive, this is inconsistent and allows unauthenticated access to the AI gateway (cost exposure).

### 5. `confluence-chat` Has No Auth Check

Same issue as market-analysis. The function accepts unauthenticated requests, which is inconsistent with the other two modes and exposes AI gateway costs.

### 6. `post-trade-chat` Does Not Filter by `trade_mode`

The `post-trade-chat` edge function fetches the user's last 20 closed trades:
```sql
.eq('status', 'closed')
```
But it does not filter by `trade_mode`. This means if the user is in Paper mode, the AI will still analyze Live trades (and vice versa), violating the strict data isolation rule. The chatbot frontend sends mode-filtered trades for the `trading` mode via `useModeFilteredTrades`, but `post-trade-chat` fetches its own data server-side without mode awareness.

**Fix**: The frontend must send the current `trade_mode` to `post-trade-chat`, and the edge function must filter by it.

### 7. No Issues Found (Verified Correct)

- Mode tab UI consistency between Paper/Live -- correct (mode is context only)
- Per-mode message history preservation -- correct
- Loading/error/empty states -- all correct
- Streaming SSE parsing -- correct
- Keyboard shortcuts (Enter/Escape) -- correct
- ARIA accessibility -- correct
- ChatMessage markdown rendering -- correct
- QuickActionsPanel mode filtering -- correct
- Global state sync (AIInsightsWidget trigger) -- correct
- Color tokens (semantic) -- correct

---

## Implementation Plan

### File 1: `supabase/functions/trading-analysis/index.ts`

**Line 186**: Replace Indonesian fallback with English:
```
"Berikan analisis lengkap performa trading saya..."
-> "Provide a complete analysis of my trading performance and identify key patterns."
```

**Add conversation history support**: Accept `history` array in request body and include prior messages in the AI call.

### File 2: `supabase/functions/market-analysis/index.ts`

**Line 121**: Replace Indonesian fallback with English:
```
"Bagaimana kondisi market crypto saat ini?..."
-> "What are the current crypto market conditions? Provide a complete analysis."
```

**Add auth check**: Mirror the pattern from `trading-analysis` (verify JWT via `supabase.auth.getClaims`).

**Add conversation history support**: Accept and forward `history` array.

### File 3: `supabase/functions/confluence-chat/index.ts`

**Line 245**: Replace Indonesian fallback with English:
```
"Tolong analisis setup trading saya."
-> "Please analyze my trade setup."
```

**Add auth check**: Mirror the pattern from `trading-analysis`.

**Add conversation history support**: Accept and forward `history` array.

### File 4: `supabase/functions/post-trade-chat/index.ts`

**Line 177**: Replace Indonesian fallback with English:
```
"Analisis trade terakhir saya dan berikan lessons learned."
-> "Analyze my last trade and provide lessons learned."
```

**Add `trade_mode` filter**: Accept `tradeMode` from request body and add `.eq('trade_mode', tradeMode)` to the query.

**Add conversation history support**: Accept and forward `history` array.

### File 5: `src/components/chat/AIChatbot.tsx`

**`sendMessage` function (lines 267-407)**: Send conversation history with each request:
- Include `messageHistory[aiMode]` (excluding the just-added user message) as `history` in the request body
- For `posttrade` mode, also send `tradeMode` from `useAppStore` so the edge function can filter by mode

---

## Technical Summary

| File | Change |
|---|---|
| `supabase/functions/trading-analysis/index.ts` | Fix Indonesian fallback, add conversation history support |
| `supabase/functions/market-analysis/index.ts` | Fix Indonesian fallback, add auth check, add conversation history |
| `supabase/functions/confluence-chat/index.ts` | Fix Indonesian fallback, add auth check, add conversation history |
| `supabase/functions/post-trade-chat/index.ts` | Fix Indonesian fallback, add `trade_mode` filter, add conversation history |
| `src/components/chat/AIChatbot.tsx` | Send conversation history + tradeMode in requests |

Total: 5 files modified. Fixes cover language consistency (4 edge functions), security consistency (2 auth gaps), data isolation (1 mode filter), and core UX (conversation memory).

