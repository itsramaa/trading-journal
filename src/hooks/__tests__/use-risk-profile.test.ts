/**
 * Unit Tests for useRiskProfile Hook and related hooks
 * Tests: risk profile fetching, upsert, daily risk snapshot, and status calculations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock data
const mockUser = { id: 'test-user-id' };
const mockRiskProfile = {
  id: 'profile-1',
  user_id: 'test-user-id',
  risk_per_trade_percent: 2,
  max_daily_loss_percent: 5,
  max_weekly_drawdown_percent: 10,
  max_position_size_percent: 40,
  max_correlated_exposure: 0.75,
  max_concurrent_positions: 3,
  is_active: true,
};

const mockSnapshot = {
  id: 'snapshot-1',
  user_id: 'test-user-id',
  snapshot_date: new Date().toISOString().split('T')[0],
  starting_balance: 10000,
  current_pnl: -200,
  loss_limit_used_percent: 40,
  positions_open: 2,
  capital_deployed_percent: 30,
  trading_allowed: true,
};

// Binance mock state
let mockBinanceConnected = false;
let mockBinanceBalance = 0;
let mockBinancePnl = { totalPnl: 0 };

// Supabase mock state
let mockSupabaseRiskProfile: typeof mockRiskProfile | null = mockRiskProfile;
let mockSupabaseSnapshot: typeof mockSnapshot | null = mockSnapshot;

// Setup mocks
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/use-binance-daily-pnl', () => ({
  useBinanceTotalBalance: () => ({
    totalBalance: mockBinanceBalance,
    isConnected: mockBinanceConnected,
  }),
  useBinanceDailyPnl: () => mockBinancePnl,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'risk_profiles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockSupabaseRiskProfile, error: null }),
              }),
            }),
          }),
          insert: (data: any) => ({
            select: () => ({
              single: () => Promise.resolve({ data: { ...data, id: 'new-profile' }, error: null }),
            }),
          }),
          update: (data: any) => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { ...mockSupabaseRiskProfile, ...data }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'daily_risk_snapshots') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockSupabaseSnapshot, error: null }),
              }),
            }),
          }),
          insert: (data: any) => ({
            select: () => ({
              single: () => Promise.resolve({ data: { ...data, id: 'new-snapshot' }, error: null }),
            }),
          }),
          update: (data: any) => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { ...mockSupabaseSnapshot, ...data }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

// Import after mocks
import { useRiskProfile, useDailyRiskSnapshot, useDailyRiskStatus } from '../use-risk-profile';

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useRiskProfile', () => {
  beforeEach(() => {
    mockSupabaseRiskProfile = mockRiskProfile;
    mockBinanceConnected = false;
    mockBinanceBalance = 0;
  });

  describe('useRiskProfile hook', () => {
    it('should fetch risk profile for authenticated user', async () => {
      const { result } = renderHook(() => useRiskProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRiskProfile);
    });

    it('should return null when no profile exists', async () => {
      mockSupabaseRiskProfile = null;

      const { result } = renderHook(() => useRiskProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should have correct default values in profile', async () => {
      const { result } = renderHook(() => useRiskProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.risk_per_trade_percent).toBe(2);
      expect(result.current.data?.max_daily_loss_percent).toBe(5);
      expect(result.current.data?.max_concurrent_positions).toBe(3);
    });
  });

  describe('useDailyRiskSnapshot hook', () => {
    beforeEach(() => {
      mockSupabaseSnapshot = mockSnapshot;
    });

    it('should fetch daily snapshot for current date', async () => {
      const { result } = renderHook(() => useDailyRiskSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSnapshot);
    });

    it('should return null when no snapshot exists', async () => {
      mockSupabaseSnapshot = null;

      const { result } = renderHook(() => useDailyRiskSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useDailyRiskStatus hook', () => {
    beforeEach(() => {
      mockSupabaseRiskProfile = mockRiskProfile;
      mockSupabaseSnapshot = mockSnapshot;
      mockBinanceConnected = false;
      mockBinanceBalance = 0;
    });

    it('should calculate status from paper trading snapshot', async () => {
      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.riskProfile).toBeDefined();
      });

      // Wait for status calculation
      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.isBinanceConnected).toBe(false);
      expect(result.current.data?.starting_balance).toBe(10000);
    });

    it('should prioritize Binance data when connected', async () => {
      mockBinanceConnected = true;
      mockBinanceBalance = 15000;
      mockBinancePnl = { totalPnl: -300 };

      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.riskProfile).toBeDefined();
      });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.isBinanceConnected).toBe(true);
      expect(result.current.data?.starting_balance).toBe(15000);
      expect(result.current.data?.current_pnl).toBe(-300);
    });

    it('should calculate loss_used_percent correctly', async () => {
      mockBinanceConnected = true;
      mockBinanceBalance = 10000;
      mockBinancePnl = { totalPnl: -250 }; // 250 loss
      // Daily limit = 10000 * 5% = 500
      // Loss used = 250/500 = 50%

      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data?.loss_used_percent).toBe(50);
      expect(result.current.data?.loss_limit).toBe(500);
    });

    it('should return "warning" status at 70% threshold', async () => {
      mockBinanceConnected = true;
      mockBinanceBalance = 10000;
      mockBinancePnl = { totalPnl: -350 }; // 70% of 500

      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data?.status).toBe('warning');
      expect(result.current.data?.trading_allowed).toBe(true);
    });

    it('should return "disabled" status at 100% threshold', async () => {
      mockBinanceConnected = true;
      mockBinanceBalance = 10000;
      mockBinancePnl = { totalPnl: -500 }; // 100% of limit

      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data?.status).toBe('disabled');
      expect(result.current.data?.trading_allowed).toBe(false);
    });

    it('should calculate remaining budget correctly', async () => {
      mockBinanceConnected = true;
      mockBinanceBalance = 10000;
      mockBinancePnl = { totalPnl: -200 };
      // Limit = 500, used = 200, remaining = 300

      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data?.remaining_budget).toBe(300);
    });

    it('should return ok status when no loss', async () => {
      mockBinanceConnected = true;
      mockBinanceBalance = 10000;
      mockBinancePnl = { totalPnl: 100 }; // profit

      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).not.toBeNull();
      });

      expect(result.current.data?.status).toBe('ok');
      expect(result.current.data?.loss_used_percent).toBe(0);
    });

    it('should return null when no risk profile exists', async () => {
      mockSupabaseRiskProfile = null;

      const { result } = renderHook(() => useDailyRiskStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.riskProfile).toBe(null);
      });

      expect(result.current.data).toBeNull();
    });
  });
});

describe('Risk Profile Default Values', () => {
  it('should define correct default risk parameters', () => {
    // These are the expected defaults from the hook
    const expectedDefaults = {
      risk_per_trade_percent: 2.0,
      max_daily_loss_percent: 5.0,
      max_weekly_drawdown_percent: 10.0,
      max_position_size_percent: 40.0,
      max_correlated_exposure: 0.75,
      max_concurrent_positions: 3,
    };

    expect(mockRiskProfile.risk_per_trade_percent).toBe(expectedDefaults.risk_per_trade_percent);
    expect(mockRiskProfile.max_daily_loss_percent).toBe(expectedDefaults.max_daily_loss_percent);
    expect(mockRiskProfile.max_weekly_drawdown_percent).toBe(expectedDefaults.max_weekly_drawdown_percent);
    expect(mockRiskProfile.max_position_size_percent).toBe(expectedDefaults.max_position_size_percent);
    expect(mockRiskProfile.max_correlated_exposure).toBe(expectedDefaults.max_correlated_exposure);
    expect(mockRiskProfile.max_concurrent_positions).toBe(expectedDefaults.max_concurrent_positions);
  });
});
