import React, { ReactElement, ReactNode } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";

// Create a fresh QueryClient for each test
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Provider wrapper props
interface WrapperProps {
  children: ReactNode;
}

// Options for custom render
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  queryClient?: QueryClient;
  withRouter?: boolean;
}

// Custom render result with query client
interface CustomRenderResult extends RenderResult {
  queryClient: QueryClient;
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * Custom render function that wraps components with all necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult {
  const {
    initialEntries = ["/"],
    queryClient = createTestQueryClient(),
    withRouter = true,
    ...renderOptions
  } = options;

  function Wrapper({ children }: WrapperProps): ReactElement {
    const content = (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    if (withRouter) {
      return (
        <MemoryRouter initialEntries={initialEntries}>
          {content}
        </MemoryRouter>
      );
    }

    return content;
  }

  const user = userEvent.setup();

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    user,
  };
}

/**
 * Render with BrowserRouter for tests that need full routing
 */
export function renderWithBrowserRouter(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, "withRouter" | "initialEntries"> = {}
): CustomRenderResult {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: WrapperProps): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  const user = userEvent.setup();

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
    user,
  };
}

/**
 * Wait for loading states to resolve
 */
export async function waitForLoadingToFinish(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock authenticated session
 */
export function createMockSession(overrides = {}) {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: "mock-user-id",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
      ...overrides,
    },
  };
}

/**
 * Create mock trade entry data
 */
export function createMockTradeEntry(overrides = {}) {
  return {
    id: "mock-trade-id",
    user_id: "mock-user-id",
    pair: "BTCUSDT",
    direction: "long",
    entry_price: 50000,
    exit_price: 52000,
    quantity: 0.1,
    status: "closed",
    pnl: 200,
    realized_pnl: 200,
    trade_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock trading strategy data
 */
export function createMockStrategy(overrides = {}) {
  return {
    id: "mock-strategy-id",
    user_id: "mock-user-id",
    name: "Test Strategy",
    description: "A test trading strategy",
    is_active: true,
    min_confluences: 4,
    min_rr: 1.5,
    entry_rules: [],
    exit_rules: [],
    valid_pairs: ["BTC", "ETH"],
    timeframe: "4h",
    market_type: "futures",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock risk profile data
 */
export function createMockRiskProfile(overrides = {}) {
  return {
    id: "mock-risk-id",
    user_id: "mock-user-id",
    risk_per_trade_percent: 2,
    max_daily_loss_percent: 5,
    max_weekly_drawdown_percent: 10,
    max_position_size_percent: 40,
    max_concurrent_positions: 3,
    max_correlated_exposure: 0.75,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock account data
 */
export function createMockAccount(overrides = {}) {
  return {
    id: "mock-account-id",
    user_id: "mock-user-id",
    name: "Test Account",
    account_type: "trading" as const,
    balance: 10000,
    currency: "USDT",
    is_active: true,
    is_system: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock user settings data
 */
export function createMockUserSettings(overrides = {}) {
  return {
    id: "mock-settings-id",
    user_id: "mock-user-id",
    theme: "system",
    language: "id",
    default_currency: "IDR",
    notifications_enabled: true,
    subscription_plan: "free",
    subscription_status: "active",
    ai_settings: {
      quality_scoring: true,
      pattern_recognition: true,
      confluence_detection: true,
      post_trade_analysis: true,
      daily_suggestions: true,
      risk_monitoring: true,
      confidence_threshold: 75,
      suggestion_style: "balanced",
      learn_from_wins: true,
      learn_from_losses: true,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Re-export testing library utilities
export * from "@testing-library/react";
export { userEvent };
export { renderWithProviders as render };
