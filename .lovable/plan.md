
# Comprehensive Testing Implementation Plan

## Executive Summary

Implementasi testing menyeluruh untuk semua 13 pages dengan 5 kategori testing: **Contract Testing**, **Integration Testing**, **State Consistency Testing**, **E2E Testing**, dan **Observability**. Plan ini dibagi menjadi 6 phase untuk memastikan konsistensi dan kelengkapan.

---

## Page Inventory

| # | Page | File Path | Priority |
|---|------|-----------|----------|
| 1 | Dashboard | `src/pages/Dashboard.tsx` | HIGH |
| 2 | Trading Journal | `src/pages/trading-journey/TradingJournal.tsx` | HIGH |
| 3 | Strategy Management | `src/pages/trading-journey/StrategyManagement.tsx` | HIGH |
| 4 | Performance | `src/pages/Performance.tsx` | HIGH |
| 5 | Risk Management | `src/pages/RiskManagement.tsx` | HIGH |
| 6 | Accounts | `src/pages/Accounts.tsx` | MEDIUM |
| 7 | Account Detail | `src/pages/AccountDetail.tsx` | MEDIUM |
| 8 | Market Insight | `src/pages/MarketInsight.tsx` | MEDIUM |
| 9 | Calendar | `src/pages/Calendar.tsx` | MEDIUM |
| 10 | AI Assistant | `src/pages/AIAssistant.tsx` | MEDIUM |
| 11 | Settings | `src/pages/Settings.tsx` | MEDIUM |
| 12 | Auth | `src/pages/Auth.tsx` | HIGH |
| 13 | Notifications | `src/pages/Notifications.tsx` | LOW |

---

## Testing Categories Deep Dive

### 1. Contract Testing

**Purpose:** Validate that hook/service return types match expected interfaces.

**Target Areas:**
- All custom hooks return correct data shapes
- Edge function responses match TypeScript interfaces
- Supabase table data maps correctly to types

**Files to Create:**
```text
src/test/contracts/
  hooks.contract.test.ts        # Hook return type validation
  binance-api.contract.test.ts  # Binance edge function contracts
  supabase-tables.contract.test.ts  # Table -> Type mapping
  ai-endpoints.contract.test.ts # AI edge function contracts
```

### 2. Integration Testing

**Purpose:** Verify components integrate correctly with hooks and external services.

**Target Areas:**
- React Query hooks with Supabase
- Binance API integration flow
- AI feature edge functions
- Realtime subscription handling

**Files to Create:**
```text
src/test/integration/
  auth-flow.integration.test.ts
  trade-entry.integration.test.ts
  binance-sync.integration.test.ts
  risk-profile.integration.test.ts
  strategy-crud.integration.test.ts
```

### 3. State Consistency Testing

**Purpose:** Ensure state remains consistent across navigation and operations.

**Target Areas:**
- Zustand app-store persistence
- React Query cache invalidation
- Optimistic updates rollback
- Cross-component state sync

**Files to Create:**
```text
src/test/state/
  app-store.state.test.ts
  query-cache.state.test.ts
  realtime-sync.state.test.ts
```

### 4. E2E Testing (Browser-based)

**Purpose:** Full user journey validation from UI interaction to data persistence.

**Target Areas:**
- Critical user flows (trade entry, position close)
- Navigation and routing
- Form submissions and validation
- Error handling and recovery

**Flows to Test:**
```text
1. Auth: Login -> Dashboard -> Logout
2. Trade: Dashboard -> Trading Journal -> Add Trade -> Close Position
3. Strategy: Strategy Management -> Create -> Backtest -> Delete
4. Risk: Risk Management -> Set Profile -> Calculator -> Events
5. Performance: Performance -> Export CSV/PDF -> Verify download
```

### 5. Observability

**Purpose:** Ensure monitoring, error tracking, and analytics are functional.

**Target Areas:**
- Analytics event tracking (already implemented)
- Console error monitoring
- Network request logging
- Performance metrics collection

**Files to Create:**
```text
src/test/observability/
  analytics-events.test.ts
  error-boundaries.test.ts
  performance-metrics.test.ts
```

---

## Phase 1: Testing Infrastructure Setup

### 1.1 Install Testing Dependencies

**File:** `package.json` (devDependencies addition)

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^20.0.3",
    "vitest": "^3.2.4",
    "msw": "^2.6.0"
  }
}
```

### 1.2 Create Vitest Configuration

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "src/**/*.spec.{ts,tsx}",
      "src/test/**/*.test.ts"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/**/*.d.ts"]
    }
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### 1.3 Create Test Setup File

**File:** `src/test/setup.ts`

```typescript
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### 1.4 Create Test Utilities

**File:** `src/test/utils.tsx`

```typescript
import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

// Custom render with providers
interface WrapperProps {
  children: React.ReactNode;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

// Re-export testing library
export * from "@testing-library/react";
export { renderWithProviders as render };
```

### 1.5 Update TypeScript Config

**File:** `tsconfig.app.json` (add to compilerOptions.types)

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

---

## Phase 2: Contract Testing

### 2.1 Hook Contracts

**File:** `src/test/contracts/hooks.contract.test.ts`

**Tests:**
- `useTradeEntries` returns `TradeEntry[]`
- `useTradingStrategies` returns `TradingStrategy[]`
- `useRiskProfile` returns `RiskProfile | null`
- `useBinanceDailyPnl` returns correct stats shape
- `useBinanceWeeklyPnl` returns daily aggregates
- `useUserSettings` returns settings with all fields

```typescript
// Example structure
describe("Hook Contracts", () => {
  describe("useTradeEntries", () => {
    it("should return array of TradeEntry objects", async () => {
      // Mock Supabase response
      // Render hook
      // Assert return type matches TradeEntry interface
    });
    
    it("should include strategies relationship", async () => {
      // Verify nested strategies array
    });
  });
  
  describe("useBinanceDailyPnl", () => {
    it("should return BinanceDailyPnlStats shape", async () => {
      // Verify: grossPnl, netPnl, bySymbol, byIncomeType
    });
  });
  
  // ... 15+ hook contracts
});
```

### 2.2 Edge Function Contracts

**File:** `src/test/contracts/binance-api.contract.test.ts`

**Tests:**
- `binance-futures` action: balance
- `binance-futures` action: positions
- `binance-futures` action: income
- `binance-futures` action: trades

```typescript
describe("Binance Edge Function Contract", () => {
  describe("balance action", () => {
    it("should return BinanceAccountSummary shape", () => {
      const expectedShape = {
        totalWalletBalance: expect.any(Number),
        availableBalance: expect.any(Number),
        totalUnrealizedProfit: expect.any(Number),
        assets: expect.any(Array),
      };
      // Validate against schema
    });
  });
});
```

### 2.3 AI Endpoint Contracts

**File:** `src/test/contracts/ai-endpoints.contract.test.ts`

**Tests:**
- `trade-quality` response shape
- `confluence-detection` response shape
- `dashboard-insights` response shape
- `post-trade-analysis` response shape

---

## Phase 3: Integration Testing

### 3.1 Auth Flow Integration

**File:** `src/test/integration/auth-flow.integration.test.ts`

```typescript
describe("Auth Flow Integration", () => {
  it("should redirect unauthenticated users to /auth", async () => {
    // Render protected route without auth
    // Assert redirect to /auth
  });
  
  it("should persist session after login", async () => {
    // Mock successful login
    // Verify session stored
    // Navigate to protected route
    // Assert access granted
  });
  
  it("should clear session on logout", async () => {
    // Login -> Logout
    // Verify localStorage cleared
    // Verify redirect to /auth
  });
});
```

### 3.2 Trade Entry Integration

**File:** `src/test/integration/trade-entry.integration.test.ts`

```typescript
describe("Trade Entry Integration", () => {
  it("should create trade via wizard and persist to database", async () => {
    // Open wizard dialog
    // Fill each step
    // Submit
    // Verify Supabase insert called
    // Verify cache invalidated
    // Verify toast shown
  });
  
  it("should close position and trigger post-trade analysis", async () => {
    // Select open position
    // Enter exit price
    // Submit close
    // Verify status changed to 'closed'
    // Verify post-trade-analysis edge function called
  });
  
  it("should rollback on error", async () => {
    // Mock Supabase error
    // Attempt create
    // Verify optimistic update rolled back
    // Verify error toast shown
  });
});
```

### 3.3 Binance Sync Integration

**File:** `src/test/integration/binance-sync.integration.test.ts`

```typescript
describe("Binance Sync Integration", () => {
  it("should auto-sync on mount when enabled", async () => {
    // Render TradingJournal with connected Binance
    // Verify sync initiated
    // Verify trades inserted/updated
  });
  
  it("should handle connection failure gracefully", async () => {
    // Mock connection error
    // Verify fallback UI shown
    // Verify no crash
  });
});
```

### 3.4 Risk Profile Integration

**File:** `src/test/integration/risk-profile.integration.test.ts`

```typescript
describe("Risk Profile Integration", () => {
  it("should save profile and update calculator defaults", async () => {
    // Set risk per trade to 2%
    // Save
    // Navigate to calculator
    // Verify 2% pre-filled
  });
  
  it("should log risk events when thresholds crossed", async () => {
    // Set daily loss limit 5%
    // Simulate loss exceeding 70%
    // Verify warning_70 event logged
    // Verify banner shown
  });
});
```

### 3.5 Strategy CRUD Integration

**File:** `src/test/integration/strategy-crud.integration.test.ts`

```typescript
describe("Strategy CRUD Integration", () => {
  it("should create strategy with rules", async () => {
    // Fill form with entry/exit rules
    // Submit
    // Verify strategy created with rules persisted
  });
  
  it("should update strategy and refresh performance", async () => {
    // Edit existing strategy
    // Change min_confluences
    // Save
    // Verify performance recalculated
  });
  
  it("should delete strategy and unlink from trades", async () => {
    // Delete strategy
    // Verify trade_entry_strategies junction cleared
  });
});
```

---

## Phase 4: State Consistency Testing

### 4.1 Zustand App Store

**File:** `src/test/state/app-store.state.test.ts`

```typescript
describe("App Store State Consistency", () => {
  it("should persist currency preference to localStorage", () => {
    // Set currency to IDR
    // Verify localStorage updated
    // Reload store
    // Verify IDR restored
  });
  
  it("should maintain notification order after additions", () => {
    // Add 3 notifications
    // Verify newest first
    // Add 4th
    // Verify order maintained
  });
  
  it("should sync chatbot state across components", () => {
    // Open chatbot from header
    // Verify state in dashboard widget
  });
});
```

### 4.2 React Query Cache

**File:** `src/test/state/query-cache.state.test.ts`

```typescript
describe("Query Cache Consistency", () => {
  it("should invalidate trade-entries after create", async () => {
    // Create trade
    // Verify queryClient.invalidateQueries called
    // Verify list refreshed
  });
  
  it("should update related caches on account transaction", async () => {
    // Add deposit to account
    // Verify accounts cache updated
    // Verify account-transactions cache updated
  });
  
  it("should handle stale data during concurrent updates", async () => {
    // Simulate race condition
    // Verify latest data wins
  });
});
```

### 4.3 Realtime Sync

**File:** `src/test/state/realtime-sync.state.test.ts`

```typescript
describe("Realtime Sync Consistency", () => {
  it("should update UI when trade_entries changes", async () => {
    // Subscribe to realtime
    // Trigger external update (simulate)
    // Verify UI reflects change without refresh
  });
  
  it("should handle reconnection after disconnect", async () => {
    // Disconnect channel
    // Reconnect
    // Verify subscription active
  });
});
```

---

## Phase 5: E2E Testing

### 5.1 Critical User Flows

**File:** `src/test/e2e/auth.e2e.test.ts`

```typescript
describe("E2E: Authentication", () => {
  it("should complete login flow", async () => {
    // Navigate to /auth
    // Enter credentials
    // Submit
    // Verify redirected to /
    // Verify user info in header
  });
  
  it("should show validation errors", async () => {
    // Submit empty form
    // Verify email/password errors shown
  });
});
```

**File:** `src/test/e2e/trade-entry.e2e.test.ts`

```typescript
describe("E2E: Trade Entry Wizard", () => {
  it("should complete 5-step wizard flow", async () => {
    // Step 1: Select pair, direction
    // Step 2: Enter prices, SL/TP
    // Step 3: Position sizing
    // Step 4: Confluence validation
    // Step 5: Confirm
    // Verify trade appears in journal
  });
});
```

**File:** `src/test/e2e/performance-export.e2e.test.ts`

```typescript
describe("E2E: Performance Export", () => {
  it("should export CSV with correct data", async () => {
    // Navigate to /performance
    // Click Export CSV
    // Verify download triggered
    // Parse CSV, verify headers and data
  });
  
  it("should export PDF report", async () => {
    // Click Export PDF
    // Verify PDF generated
  });
});
```

### 5.2 Page-Specific E2E Tests

| Page | Test File | Key Scenarios |
|------|-----------|---------------|
| Dashboard | `dashboard.e2e.test.ts` | Quick actions work, stats load, sections expand |
| Trading Journal | `trading-journal.e2e.test.ts` | Tab switching, filters apply, table pagination |
| Strategy | `strategy.e2e.test.ts` | Create/edit/delete, rules builder, backtest run |
| Performance | `performance.e2e.test.ts` | Tab navigation, date filter, export |
| Risk | `risk.e2e.test.ts` | Calculator works, profile saves, events log |
| Accounts | `accounts.e2e.test.ts` | Binance tab loads, paper account CRUD |
| Market Insight | `market-insight.e2e.test.ts` | Refresh works, sentiment loads |
| Calendar | `calendar.e2e.test.ts` | Events load, AI predictions expand |
| Settings | `settings.e2e.test.ts` | All tabs work, settings persist |

---

## Phase 6: Observability Testing

### 6.1 Analytics Events

**File:** `src/test/observability/analytics-events.test.ts`

```typescript
describe("Analytics Events Observability", () => {
  it("should track page views on navigation", () => {
    // Navigate to /performance
    // Verify PAGE_VIEW event logged
    // Check path in event data
  });
  
  it("should track wizard completion", async () => {
    // Complete trade wizard
    // Verify TRADE_ENTRY_WIZARD_COMPLETE event
    // Check duration in event data
  });
  
  it("should track position size calculations", () => {
    // Use calculator
    // Verify POSITION_SIZE_CALCULATE event
    // Check parameters logged
  });
  
  it("should respect MAX_EVENTS limit", () => {
    // Generate 150 events
    // Verify only last 100 stored
  });
});
```

### 6.2 Error Boundaries

**File:** `src/test/observability/error-boundaries.test.ts`

```typescript
describe("Error Boundary Observability", () => {
  it("should catch component render errors", () => {
    // Render component that throws
    // Verify error boundary UI shown
    // Verify error logged to console
  });
  
  it("should recover on retry", () => {
    // Trigger error
    // Click retry
    // Verify component renders
  });
});
```

### 6.3 Performance Metrics

**File:** `src/test/observability/performance-metrics.test.ts`

```typescript
describe("Performance Metrics", () => {
  it("should log slow queries", async () => {
    // Mock slow Supabase response (>2s)
    // Verify warning logged
  });
  
  it("should track component render times", () => {
    // Use React Profiler API
    // Verify render times reasonable (<100ms)
  });
});
```

---

## File Structure After Implementation

```text
src/
├── test/
│   ├── setup.ts                          # Test setup & mocks
│   ├── utils.tsx                         # Render utilities
│   ├── mocks/
│   │   ├── handlers.ts                   # MSW handlers
│   │   ├── supabase.ts                   # Supabase mocks
│   │   └── binance.ts                    # Binance API mocks
│   ├── contracts/
│   │   ├── hooks.contract.test.ts        # 15+ hook contracts
│   │   ├── binance-api.contract.test.ts  # Binance contracts
│   │   ├── ai-endpoints.contract.test.ts # AI contracts
│   │   └── supabase-tables.contract.test.ts
│   ├── integration/
│   │   ├── auth-flow.integration.test.ts
│   │   ├── trade-entry.integration.test.ts
│   │   ├── binance-sync.integration.test.ts
│   │   ├── risk-profile.integration.test.ts
│   │   └── strategy-crud.integration.test.ts
│   ├── state/
│   │   ├── app-store.state.test.ts
│   │   ├── query-cache.state.test.ts
│   │   └── realtime-sync.state.test.ts
│   ├── e2e/
│   │   ├── auth.e2e.test.ts
│   │   ├── trade-entry.e2e.test.ts
│   │   ├── performance-export.e2e.test.ts
│   │   ├── dashboard.e2e.test.ts
│   │   ├── trading-journal.e2e.test.ts
│   │   ├── strategy.e2e.test.ts
│   │   ├── risk.e2e.test.ts
│   │   ├── accounts.e2e.test.ts
│   │   ├── market-insight.e2e.test.ts
│   │   ├── calendar.e2e.test.ts
│   │   └── settings.e2e.test.ts
│   └── observability/
│       ├── analytics-events.test.ts
│       ├── error-boundaries.test.ts
│       └── performance-metrics.test.ts
├── vitest.config.ts                      # Vitest configuration
└── package.json                          # Updated with test deps
```

---

## Test Coverage Targets

| Category | Target Coverage | Priority |
|----------|----------------|----------|
| Hooks | 90% | HIGH |
| Edge Functions | 85% | HIGH |
| State Management | 80% | MEDIUM |
| Components | 70% | MEDIUM |
| Utils | 95% | HIGH |

---

## Implementation Order (Recommended)

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Infrastructure | 1 session | vitest.config.ts, setup.ts, utils.tsx, mocks/ |
| Phase 2: Contracts | 1 session | All contract tests (4 files) |
| Phase 3: Integration | 2 sessions | All integration tests (5 files) |
| Phase 4: State | 1 session | All state tests (3 files) |
| Phase 5: E2E | 2 sessions | All E2E tests (11 files) |
| Phase 6: Observability | 1 session | All observability tests (3 files) |

**Total: 8 implementation sessions**

---

## Technical Notes

### MSW Setup for API Mocking

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  // Binance Futures
  http.post("*/functions/v1/binance-futures", async ({ request }) => {
    const { action } = await request.json();
    switch (action) {
      case "balance":
        return HttpResponse.json({
          success: true,
          data: mockBalanceData,
        });
      // ... other actions
    }
  }),
  
  // AI Endpoints
  http.post("*/functions/v1/trade-quality", () => {
    return HttpResponse.json({
      success: true,
      data: {
        score: 7,
        recommendation: "execute",
        confidence: 85,
        factors: [],
        reasoning: "Good setup",
      },
    });
  }),
];
```

### Supabase Mock

```typescript
// src/test/mocks/supabase.ts
import { vi } from "vitest";

export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  channel: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};
```

---

## Not Included (Out of Scope)

| Item | Reason |
|------|--------|
| Visual Regression Testing | Requires additional tooling (Chromatic/Percy) |
| Load Testing | Better suited for separate performance testing phase |
| Security Testing | Covered by Supabase RLS; separate security audit recommended |
| Mobile Device Testing | Requires BrowserStack/Sauce Labs integration |

