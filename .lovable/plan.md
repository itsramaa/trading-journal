

# Plan: Multi-Fix untuk Dashboard, Accounts, dan Calendar

## Objective

Memperbaiki berbagai issue yang dilaporkan:
1. **Hapus Funding** - Hanya Real dan Paper (tidak ada funding)
2. **Dashboard Fixes**:
   - Integrasi System Status dengan benar
   - Market Session berdasarkan User Time (bukan UTC)
   - Fix "Open A New Trade" link
   - Fix "Ask AI For Details" membuka Floating AI
   - Benarkan text `t('nav.tradingJourney')` yang tidak terbaca
3. **Trading Account Form**:
   - Hapus currency select (otomatis dari navbar toggle)
   - Hapus Account ID field
4. **Economic Calendar**: Tambah AI-powered macro condition widget

---

## 1. Hapus Funding Account Type

### File: `src/types/account.ts`

**Sebelum:**
```typescript
export type AccountType = 'trading' | 'backtest' | 'funding';
```

**Sesudah:**
```typescript
export type AccountType = 'trading' | 'backtest';
```

Hapus semua referensi ke `funding` dari:
- `ACCOUNT_TYPE_LABELS`
- `ACCOUNT_TYPE_ICONS`

### File: `src/pages/Accounts.tsx`

- Ubah tabs dari 3 (Trading, Paper, Funding) menjadi 2 (Real, Paper)
- Hapus TabsContent untuk funding
- Update fundingCount logic

### File: `src/components/accounts/AddAccountForm.tsx`

- Hapus option "Funding Source" dari account_type select
- Hanya show "Real Trading" dan "Paper Trading" options
- Ubah schema agar `account_type` hanya `'trading'` (dengan flag `is_backtest` untuk differentiate)

---

## 2. Dashboard Fixes

### 2.1 System Status Integration

Saat ini SystemStatusIndicator sudah terintegrasi dengan benar ke Dashboard. Verifikasi tidak ada issue.

### 2.2 Market Session - User Time

**File: `src/components/dashboard/MarketSessionsWidget.tsx`**

Masalah: Saat ini menggunakan `new Date().getUTCHours()` (UTC time).
Solusi: Gunakan local time user.

```typescript
// Sebelum
const [currentHour, setCurrentHour] = useState(new Date().getUTCHours());

// Sesudah  
const [currentHour, setCurrentHour] = useState(new Date().getHours());
```

Update display dari "UTC" ke "Local":
```typescript
// Sebelum
{formatTime(currentHour)} UTC

// Sesudah
{formatTime(currentHour)} Local
```

### 2.3 Fix "Open A New Trade" Link

**File: `src/components/dashboard/ActivePositionsTable.tsx`**

Masalah: Link mengarah ke `/trading/journal` yang tidak ada.
Solusi: Ubah ke `/trading`.

```typescript
// Line 81
<Link to="/trading">Open a new trade</Link>

// Line 164
<Link to="/trading" className="flex items-center gap-1">
```

### 2.4 Fix "Ask AI For Details" Button

**Masalah:** Button tidak membuka Floating AI Chatbot.

**Solusi:** Buat global state untuk mengontrol chatbot dan trigger dari AIInsightsWidget.

**File: `src/store/app-store.ts`**
Tambah state untuk chatbot:
```typescript
// New state
isChatbotOpen: boolean;
setChatbotOpen: (open: boolean) => void;
chatbotInitialPrompt: string | null;
setChatbotInitialPrompt: (prompt: string | null) => void;
```

**File: `src/components/chat/AIChatbot.tsx`**
Subscribe ke global state:
```typescript
const { isChatbotOpen, setChatbotOpen, chatbotInitialPrompt } = useAppStore();

useEffect(() => {
  if (isChatbotOpen) {
    setIsOpen(true);
    if (chatbotInitialPrompt) {
      setInput(chatbotInitialPrompt);
      setChatbotInitialPrompt(null);
    }
  }
}, [isChatbotOpen, chatbotInitialPrompt]);
```

**File: `src/components/dashboard/AIInsightsWidget.tsx`**
Update button click handler:
```typescript
const { setChatbotOpen, setChatbotInitialPrompt } = useAppStore();

<Button 
  variant="outline" 
  size="sm" 
  className="w-full"
  onClick={() => {
    setChatbotInitialPrompt("Jelaskan detail insight trading saya");
    setChatbotOpen(true);
  }}
>
  <MessageCircle className="h-4 w-4 mr-2" />
  Ask AI for Details
  <ChevronRight className="h-4 w-4 ml-auto" />
</Button>
```

### 2.5 Fix `t('nav.tradingJourney')` Text

**File: `src/lib/i18n.ts`**

Masalah: Key `tradingJourney` tidak ada di translations.
Solusi: Tambahkan key ke both EN dan ID translations.

```typescript
// English
nav: {
  // ... existing
  tradingJourney: 'Trading Journey',
}

// Indonesian
nav: {
  // ... existing
  tradingJourney: 'Perjalanan Trading',
}
```

---

## 3. Trading Account Form Updates

**File: `src/components/accounts/AddAccountForm.tsx`**

### 3.1 Hapus Currency Select

- Hapus field `currency` dari form
- Auto-set currency dari user settings (navbar toggle)
- Fetch currency dari `useUserSettings()`

```typescript
const { data: settings } = useUserSettings();
const defaultCurrency = settings?.default_currency || 'USD';

// Remove currency field from form
// Auto-set in submit:
await createAccount.mutateAsync({
  ...data,
  currency: defaultCurrency, // Auto from settings
});
```

### 3.2 Hapus Account ID Field

- Hapus field `account_number` dari form schema
- Hapus FormField untuk Account ID
- Masih simpan di metadata jika diperlukan nanti

---

## 4. Economic Calendar - AI Macro Widget

**File: `src/pages/Calendar.tsx`**

Tambah widget baru untuk kondisi macro dengan AI-powered analysis.

### New Component Structure

```text
Calendar Page
├── Page Header
├── **AI Macro Conditions Widget (NEW)**
│   ├── Overall Market Mood (Bullish/Bearish/Neutral)
│   ├── Key Correlations:
│   │   - DXY (Dollar Index) → Impact on crypto
│   │   - S&P 500 → Risk sentiment
│   │   - 10Y Treasury → Rate expectations
│   │   - VIX → Volatility
│   ├── AI Summary paragraph
│   └── Refresh button
├── Economic Calendar Card
└── Footer disclaimer
```

### AI Edge Function Integration

Gunakan existing `dashboard-insights` atau buat query ke AI untuk macro analysis:
```typescript
const getMacroAnalysis = async () => {
  // Call AI to analyze current macro conditions
  // Return structured data for display
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/account.ts` | Remove 'funding' from AccountType |
| `src/pages/Accounts.tsx` | Remove funding tab, only Real & Paper |
| `src/components/accounts/AddAccountForm.tsx` | Remove currency select, remove Account ID, remove funding option |
| `src/components/dashboard/MarketSessionsWidget.tsx` | Use local time instead of UTC |
| `src/components/dashboard/ActivePositionsTable.tsx` | Fix "/trading/journal" → "/trading" |
| `src/components/dashboard/AIInsightsWidget.tsx` | Wire "Ask AI" button to open chatbot |
| `src/components/chat/AIChatbot.tsx` | Listen to global state for open trigger |
| `src/store/app-store.ts` | Add chatbot open state |
| `src/lib/i18n.ts` | Add 'tradingJourney' translation key |
| `src/pages/Calendar.tsx` | Add AI Macro Conditions widget |

---

## Technical Details

### Account Type Simplification

```text
Before: trading | backtest | funding (3 types)
After:  trading (is_backtest: false) → "Real"
        trading (is_backtest: true)  → "Paper"
```

### Chatbot Global State

```typescript
// app-store.ts
interface AppState {
  // ... existing
  isChatbotOpen: boolean;
  setChatbotOpen: (open: boolean) => void;
  chatbotInitialPrompt: string | null;
  setChatbotInitialPrompt: (prompt: string | null) => void;
}
```

### Market Sessions Time Logic

```text
Before: UTC time (getUTCHours)
After:  Local time (getHours)

Display:
- Show user's local timezone
- Convert session hours to user's timezone for accurate display
```

### AI Macro Widget Data Structure

```typescript
interface MacroConditions {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  correlations: {
    dxy: { value: number; change: number; impact: string };
    sp500: { value: number; change: number; impact: string };
    treasury10y: { value: number; change: number; impact: string };
    vix: { value: number; change: number; impact: string };
  };
  aiSummary: string;
  lastUpdated: Date;
}
```

---

## Summary

| Issue | Solution |
|-------|----------|
| Remove Funding | Simplify to Real/Paper only |
| Market Session UTC | Use local time |
| "Open New Trade" link | Change to /trading |
| "Ask AI" button | Wire to global chatbot state |
| tradingJourney text | Add i18n key |
| Currency select | Auto from user settings |
| Account ID field | Remove from form |
| AI Macro widget | Add to Calendar page |

