# Trading Journey - Test Suite Documentation

> Comprehensive testing infrastructure untuk memastikan reliability, maintainability, dan correctness aplikasi Trading Journey.

**Last Updated:** January 2025  
**Total Tests:** 226  
**Test Framework:** Vitest + React Testing Library  
**Status:** ✅ All Passing

---

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Phase 1: Contract Tests](#phase-1-contract-tests)
4. [Phase 2: Mock Infrastructure](#phase-2-mock-infrastructure)
5. [Phase 3: Integration Tests](#phase-3-integration-tests)
6. [Phase 4: State Consistency Tests](#phase-4-state-consistency-tests)
7. [Phase 5: E2E Tests](#phase-5-e2e-tests)
8. [Phase 6: Observability Tests](#phase-6-observability-tests)
9. [Running Tests](#running-tests)
10. [Test Utilities](#test-utilities)
11. [Best Practices](#best-practices)

---

## Overview

Test suite ini dibangun dengan pendekatan **layered testing** yang mencakup:

| Layer | Purpose | Speed | Isolation |
|-------|---------|-------|-----------|
| Contract | Validate API/data contracts | ⚡ Fast | High |
| Integration | Test hook + service interactions | 🔄 Medium | Medium |
| State | Verify state management consistency | ⚡ Fast | High |
| E2E | Simulate user journeys | 🐢 Slow | Low |
| Observability | Test analytics & error handling | ⚡ Fast | High |

### Test Distribution

```
src/test/
├── contracts/          # 61 tests - API & data contracts
│   ├── ai-endpoints.contract.test.ts
│   ├── binance-api.contract.test.ts
│   ├── hooks.contract.test.tsx
│   └── supabase-tables.contract.test.ts
├── integration/        # 15 tests - Hook integrations
│   ├── auth-flow.integration.test.tsx
│   ├── binance-sync.integration.test.tsx
│   ├── risk-profile.integration.test.tsx
│   ├── strategy-crud.integration.test.tsx
│   └── trade-entry.integration.test.tsx
├── state/              # 44 tests - State management
│   ├── app-store.state.test.ts
│   ├── query-cache.state.test.ts
│   └── realtime-sync.state.test.tsx
├── e2e/                # 35 tests - User journeys
│   ├── auth.e2e.test.tsx
│   ├── performance-export.e2e.test.tsx
│   └── trade-entry.e2e.test.tsx
├── observability/      # 71 tests - Analytics & errors
│   ├── analytics-events.test.ts
│   ├── error-boundaries.test.tsx
│   └── performance-metrics.test.ts
├── mocks/              # Mock factories
│   ├── handlers.ts
│   ├── supabase.ts
│   ├── ai-responses.ts
│   └── binance.ts
├── setup.ts            # Global test setup
└── utils.tsx           # Test utilities & helpers
```

---

## Test Architecture

### Technology Stack

- **Vitest** - Test runner dengan native ESM support
- **React Testing Library** - Component testing utilities
- **MSW (Mock Service Worker)** - API mocking
- **userEvent** - User interaction simulation

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "src/test/**/*.test.{ts,tsx}"
    ],
    testTimeout: 10000,
  },
});
```

---

## Phase 1: Contract Tests

**Purpose:** Validasi struktur data dan API contracts tanpa network calls.

### Files & Test Count

| File | Tests | Coverage |
|------|-------|----------|
| `supabase-tables.contract.test.ts` | 19 | Database schema contracts |
| `binance-api.contract.test.ts` | 14 | Binance Futures API types |
| `ai-endpoints.contract.test.ts` | 14 | AI endpoint request/response |
| `hooks.contract.test.tsx` | 14 | React hooks return types |

### Key Test Cases

#### Supabase Tables (19 tests)
```typescript
describe("Trade Entries Table", () => {
  it("should have correct required fields");
  it("should have correct optional fields");
  it("should match direction enum values");
  it("should match status enum values");
});

describe("Trading Strategies Table", () => {
  it("should have correct strategy structure");
  it("should support entry/exit rules as JSON");
});
```

#### Binance API (14 tests)
```typescript
describe("Account Balance Response", () => {
  it("should have required balance fields");
  it("should parse numeric strings correctly");
});

describe("Position Risk Response", () => {
  it("should have position sizing fields");
  it("should include unrealized PnL");
});
```

#### AI Endpoints (14 tests)
```typescript
describe("Dashboard Insights", () => {
  it("should have greeting and summary");
  it("should include risk alerts array");
});

describe("Trade Quality Score", () => {
  it("should return score between 0-100");
  it("should include factor breakdown");
});
```

---

## Phase 2: Mock Infrastructure

**Purpose:** Provide reusable mocks untuk isolasi tests.

### Mock Files

#### `handlers.ts` - MSW Request Handlers
```typescript
export const handlers = [
  // Supabase Auth
  http.post("*/auth/v1/token*", () => {...}),
  
  // Database queries
  http.get("*/rest/v1/trade_entries*", () => {...}),
  
  // Edge Functions
  http.post("*/functions/v1/dashboard-insights", () => {...}),
];
```

#### `supabase.ts` - Chainable Supabase Client Mock
```typescript
export const createMockSupabaseClient = (overrides) => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  auth: mockAuthClient,
  channel: vi.fn(() => mockChannel),
});
```

#### `ai-responses.ts` - AI Response Fixtures
```typescript
export const mockDashboardInsights = {
  greeting: "Good morning, Trader!",
  summary: "You had 3 winning trades yesterday...",
  riskAlerts: [],
  suggestions: ["Consider reducing position size"],
};
```

#### `binance.ts` - Binance API Fixtures
```typescript
export const mockAccountBalance = [{
  asset: "USDT",
  balance: "10000.00",
  availableBalance: "8500.00",
}];

export const mockPositionRisk = [{
  symbol: "BTCUSDT",
  positionAmt: "0.1",
  entryPrice: "50000",
  unrealizedProfit: "500",
}];
```

---

## Phase 3: Integration Tests

**Purpose:** Test hook interactions dengan mocked services.

### Files & Test Count

| File | Tests | Scope |
|------|-------|-------|
| `auth-flow.integration.test.tsx` | 4 | Authentication lifecycle |
| `trade-entry.integration.test.tsx` | 2 | Trade CRUD operations |
| `binance-sync.integration.test.tsx` | 4 | Binance data sync |
| `risk-profile.integration.test.tsx` | 2 | Risk settings |
| `strategy-crud.integration.test.tsx` | 3 | Strategy management |

### Key Test Patterns

#### Auth Flow Integration
```typescript
describe("Authentication Flow", () => {
  it("should handle session state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBeDefined();
  });

  it("should call signInWithPassword", async () => {
    // Validates mock is called correctly
  });

  it("should handle onAuthStateChange", () => {
    // Validates subscription setup
  });
});
```

#### Trade Entry Integration
```typescript
describe("Trade Entry Hooks", () => {
  it("should initialize useTradeEntries", async () => {
    const { result } = renderHook(() => useTradeEntries(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });

  it("should provide create mutation", () => {
    const { result } = renderHook(() => useCreateTradeEntry(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
```

---

## Phase 4: State Consistency Tests

**Purpose:** Validate state management across Zustand and React Query.

### Files & Test Count

| File | Tests | Scope |
|------|-------|-------|
| `app-store.state.test.ts` | 18 | Zustand global store |
| `query-cache.state.test.ts` | 12 | React Query cache |
| `realtime-sync.state.test.tsx` | 14 | Supabase realtime |

### Key Test Cases

#### Zustand Store (18 tests)
```typescript
describe("Currency State", () => {
  it("should set and persist currency preference");
  it("should provide converted values");
});

describe("Notifications State", () => {
  it("should add notifications with auto-generated ID");
  it("should mark as read");
  it("should clear all notifications");
});

describe("UI State", () => {
  it("should toggle chatbot visibility");
  it("should persist search query");
});
```

#### Query Cache (12 tests)
```typescript
describe("Cache Invalidation", () => {
  it("should invalidate trade-entries queries");
  it("should support partial key matching");
  it("should update cache manually");
});

describe("Query Keys", () => {
  it("should use consistent key patterns");
  it("should support user-scoped queries");
});
```

#### Realtime Sync (14 tests)
```typescript
describe("Channel Subscription", () => {
  it("should create channel with user filter");
  it("should subscribe to postgres_changes");
  it("should cleanup on unmount");
});
```

---

## Phase 5: E2E Tests

**Purpose:** Simulate complete user journeys.

### Files & Test Count

| File | Tests | User Flow |
|------|-------|-----------|
| `auth.e2e.test.tsx` | 15 | Sign in, Sign up, Password reset |
| `trade-entry.e2e.test.tsx` | 10 | Trade wizard flow |
| `performance-export.e2e.test.tsx` | 10 | CSV/PDF export |

### Key Test Scenarios

#### Authentication Flow (15 tests)
```typescript
describe("Sign In Flow", () => {
  it("should render sign in form by default");
  it("should show validation errors for empty form");
  it("should submit valid credentials");
  it("should show Google sign in option");
  it("should trigger Google sign in");
});

describe("Sign Up Flow", () => {
  it("should switch to sign up tab");
  it("should validate password confirmation");
  it("should submit valid sign up");
});

describe("Forgot Password Flow", () => {
  it("should navigate to forgot password");
  it("should submit reset password request");
  it("should allow navigation back to sign in");
});

describe("Password Recovery Mode", () => {
  it("should show new password form in recovery mode");
  it("should validate password match in recovery");
  it("should submit new password");
});
```

#### Trade Entry Wizard (10 tests)
```typescript
describe("Wizard Structure", () => {
  it("should render wizard with progress indicator");
  it("should have accessible description");
  it("should track wizard start event");
});

describe("Trading Gate Integration", () => {
  it("should render wizard when trading is allowed");
});

describe("Wizard Steps", () => {
  it("should be the initial step");
  it("should have 5 steps total");
});

describe("Analytics", () => {
  it("should track wizard abandonment on close");
  it("should track wizard completion");
});
```

#### Performance Export (10 tests)
```typescript
describe("Export Hook", () => {
  it("should provide export functions");
});

describe("Data Contracts", () => {
  it("should have correct stats structure");
  it("should have correct export data structure");
  it("should support symbol breakdown");
  it("should support weekly data");
});

describe("Export Integration", () => {
  it("should have correct export button labels");
  it("should export with filtered data");
  it("should handle empty trade list gracefully");
  it("should handle negative PnL values");
  it("should handle trades with missing optional fields");
});
```

---

## Phase 6: Observability Tests

**Purpose:** Validate analytics tracking, error handling, and performance calculations.

### Files & Test Count

| File | Tests | Scope |
|------|-------|-------|
| `analytics-events.test.ts` | 23 | Event tracking |
| `error-boundaries.test.tsx` | 18 | Error handling patterns |
| `performance-metrics.test.ts` | 30 | Trading calculations |

### Key Test Cases

#### Analytics Events (23 tests)
```typescript
describe("Event Constants", () => {
  it("should have all required trade entry events");
  it("should have all required navigation events");
  it("should have all required AI events");
  it("should have all required risk management events");
});

describe("trackEvent", () => {
  it("should store event in localStorage");
  it("should include timestamp in event");
  it("should include optional data in event");
  it("should limit events to MAX_EVENTS (100)");
  it("should handle localStorage errors gracefully");
});

describe("Event Queries", () => {
  it("should filter events by name");
  it("should count events by name");
  it("should clear all events");
});
```

#### Error Boundaries (18 tests)
```typescript
describe("Error Boundary Behavior", () => {
  it("should render children when no error");
  it("should catch and display error");
  it("should render custom fallback when provided");
});

describe("React Query Error Handling", () => {
  it("should handle query errors gracefully");
  it("should handle successful queries");
});

describe("API Error Response Handling", () => {
  it("should handle 401 Unauthorized");
  it("should extract error message from API response");
});

describe("Supabase Error Handling", () => {
  it("should handle Supabase auth errors");
  it("should handle Supabase database errors");
});
```

#### Performance Metrics (30 tests)
```typescript
describe("Win Rate", () => {
  it("should calculate win rate correctly");
  it("should return 0 for empty trades");
  it("should ignore open trades");
});

describe("Profit Factor", () => {
  it("should calculate profit factor correctly");
  it("should return Infinity when no losses");
});

describe("Max Drawdown", () => {
  it("should calculate max drawdown correctly");
  it("should return 0 when only profits");
});

describe("Risk-Adjusted Metrics", () => {
  it("should calculate R multiple");
  it("should calculate position size based on risk");
});
```

---

## Running Tests

### All Tests
```bash
npx vitest run
```

### Specific Category
```bash
# Contract tests only
npx vitest run src/test/contracts

# E2E tests only
npx vitest run src/test/e2e

# Integration tests only
npx vitest run src/test/integration
```

### Watch Mode
```bash
npx vitest
```

### With Coverage
```bash
npx vitest run --coverage
```

---

## Test Utilities

### `renderWithProviders`
Standard render with QueryClient and Router:
```typescript
import { renderWithProviders } from "@/test/utils";

const { queryClient, user } = renderWithProviders(<MyComponent />, {
  initialEntries: ["/dashboard"],
});
```

### Mock Factories
```typescript
import { createMockTradeEntry, createMockStrategy } from "@/test/utils";

const trade = createMockTradeEntry({ pnl: 500 });
const strategy = createMockStrategy({ name: "Scalping" });
```

### Wait Utilities
```typescript
import { waitFor, waitForLoadingToFinish } from "@/test/utils";

await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});
```

---

## Best Practices

### 1. Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Avoid shared mutable state

### 2. Naming
- Describe what the test validates
- Use "should" prefix for clarity
- Group related tests with `describe`

### 3. Assertions
- One logical assertion per test
- Use specific matchers
- Test behavior, not implementation

### 4. Mocking
- Mock at the boundary (API, localStorage)
- Use factory functions for consistency
- Keep mocks simple and focused

### 5. Async Testing
- Always use `waitFor` for async assertions
- Handle loading states explicitly
- Set appropriate timeouts

---

## Future Improvements

1. **Component Tests** - Add tests for critical UI components
2. **Visual Regression** - Screenshot testing dengan Playwright
3. **Performance Benchmarks** - Track render performance
4. **Coverage Thresholds** - Enforce minimum coverage
5. **CI Integration** - Run tests on pull requests

---

## Contributors

- Trading Journey Development Team
- Generated with Lovable AI

---

*This documentation is auto-generated and should be kept in sync with the test suite.*
