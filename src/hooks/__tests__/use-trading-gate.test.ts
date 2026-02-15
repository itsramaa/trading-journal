/**
 * Unit Tests for useTradingGate Hook
 * Tests: loss thresholds, AI quality gates, gate state calculations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock dependencies before importing the hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

vi.mock('@/hooks/use-risk-profile', () => ({
  useRiskProfile: () => ({
    data: { max_daily_loss_percent: 5, risk_per_trade_percent: 2 },
    isLoading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useMutation: ({ mutationFn }: { mutationFn: Function }) => ({
    mutate: mutationFn,
    mutateAsync: mutationFn,
    isLoading: false,
  }),
}));

// These will be controlled per-test
const mockBalanceData = {
  balance: 10000,
  source: 'binance' as string,
  isLoading: false,
};

const mockDailyPnl = {
  totalPnl: 0,
  totalTrades: 5,
  wins: 3,
  losses: 2,
  winRate: 60,
  isLoading: false,
};

const mockTradeEntries: any[] = [];

vi.mock('@/hooks/use-combined-balance', () => ({
  useBestAvailableBalance: () => mockBalanceData,
  AccountSourceType: {},
}));

vi.mock('@/hooks/use-unified-daily-pnl', () => ({
  useUnifiedDailyPnl: () => mockDailyPnl,
}));

vi.mock('@/hooks/use-mode-filtered-trades', () => ({
  useModeFilteredTrades: () => ({ data: mockTradeEntries, isLoading: false }),
}));

// Import after mocks
import { useTradingGate, TradingGateState } from '../use-trading-gate';

describe('useTradingGate', () => {
  beforeEach(() => {
    // Reset to defaults
    mockBalanceData.balance = 10000;
    mockBalanceData.source = 'binance';
    mockDailyPnl.totalPnl = 0;
    mockTradeEntries.length = 0;
  });

  describe('Gate Status Calculations', () => {
    it('should return "ok" status when no loss', () => {
      mockDailyPnl.totalPnl = 0;
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.status).toBe('ok');
      expect(result.current.canTrade).toBe(true);
      expect(result.current.reason).toBeNull();
      expect(result.current.lossUsedPercent).toBe(0);
    });

    it('should return "ok" status when in profit', () => {
      mockDailyPnl.totalPnl = 500; // profit
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.status).toBe('ok');
      expect(result.current.canTrade).toBe(true);
      expect(result.current.lossUsedPercent).toBe(0);
    });

    it('should return "warning" status at 70% threshold', () => {
      // Daily loss limit = 10000 * 5% = 500
      // 70% of 500 = 350
      mockDailyPnl.totalPnl = -350;
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.status).toBe('warning');
      expect(result.current.canTrade).toBe(true);
      expect(result.current.lossUsedPercent).toBeCloseTo(70, 0);
    });

    it('should return "warning" status at 90% threshold (danger)', () => {
      // 90% of 500 = 450
      mockDailyPnl.totalPnl = -450;
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.status).toBe('warning');
      expect(result.current.canTrade).toBe(true);
      expect(result.current.lossUsedPercent).toBeCloseTo(90, 0);
      expect(result.current.reason).toContain('Danger');
    });

    it('should return "disabled" status at 100% threshold', () => {
      // 100% of 500 = 500
      mockDailyPnl.totalPnl = -500;
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.status).toBe('disabled');
      expect(result.current.canTrade).toBe(false);
      expect(result.current.lossUsedPercent).toBe(100);
      expect(result.current.reason).toContain('Daily loss limit reached');
    });

    it('should cap lossUsedPercent at 100%', () => {
      mockDailyPnl.totalPnl = -1000; // 200% of limit
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.lossUsedPercent).toBe(100);
    });
  });

  describe('Budget Calculations', () => {
    it('should calculate remaining budget correctly', () => {
      mockDailyPnl.totalPnl = -200;
      
      const { result } = renderHook(() => useTradingGate());
      
      // Daily limit = 500, used = 200, remaining = 300
      expect(result.current.dailyLossLimit).toBe(500);
      expect(result.current.remainingBudget).toBe(300);
    });

    it('should return 0 remaining budget when limit exceeded', () => {
      mockDailyPnl.totalPnl = -600;
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.remainingBudget).toBe(0);
    });

    it('should return full budget when in profit', () => {
      mockDailyPnl.totalPnl = 200;
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.remainingBudget).toBe(500);
    });
  });

  describe('AI Quality Gate', () => {
    it('should not trigger AI warning with insufficient data', () => {
      // Less than 3 trades
      mockTradeEntries.push(
        { status: 'closed', ai_quality_score: 20, trade_date: '2024-01-01' },
        { status: 'closed', ai_quality_score: 20, trade_date: '2024-01-02' },
      );
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.aiQualityWarning).toBe(false);
      expect(result.current.aiQualityBlocked).toBe(false);
    });

    it('should trigger AI warning when avg quality < 50%', () => {
      mockTradeEntries.push(
        { status: 'closed', ai_quality_score: 45, trade_date: '2024-01-03' },
        { status: 'closed', ai_quality_score: 40, trade_date: '2024-01-02' },
        { status: 'closed', ai_quality_score: 42, trade_date: '2024-01-01' },
      );
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.aiQualityWarning).toBe(true);
      expect(result.current.aiQualityBlocked).toBe(false);
      expect(result.current.canTrade).toBe(true);
    });

    it('should block trading when avg quality < 30%', () => {
      mockTradeEntries.push(
        { status: 'closed', ai_quality_score: 25, trade_date: '2024-01-03' },
        { status: 'closed', ai_quality_score: 28, trade_date: '2024-01-02' },
        { status: 'closed', ai_quality_score: 22, trade_date: '2024-01-01' },
      );
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.aiQualityBlocked).toBe(true);
      expect(result.current.canTrade).toBe(false);
      expect(result.current.status).toBe('disabled');
      expect(result.current.reason).toContain('Low AI quality');
    });

    it('should not trigger AI gate when quality is good', () => {
      mockTradeEntries.push(
        { status: 'closed', ai_quality_score: 75, trade_date: '2024-01-03' },
        { status: 'closed', ai_quality_score: 80, trade_date: '2024-01-02' },
        { status: 'closed', ai_quality_score: 70, trade_date: '2024-01-01' },
      );
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.aiQualityWarning).toBe(false);
      expect(result.current.aiQualityBlocked).toBe(false);
      expect(result.current.avgRecentQuality).toBe(75);
    });
  });

  describe('Data Source', () => {
    it('should report source correctly', () => {
      mockBalanceData.source = 'binance';
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.source).toBe('binance');
    });

    it('should report paper source when using paper trading', () => {
      mockBalanceData.source = 'paper';
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.source).toBe('paper');
    });
  });

  describe('Thresholds', () => {
    it('should expose threshold values', () => {
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.thresholds).toEqual({
        WARNING: 70,
        DANGER: 90,
        DISABLED: 100,
      });
    });
  });

  describe('Daily Stats', () => {
    it('should expose daily statistics', () => {
      mockDailyPnl.totalTrades = 10;
      mockDailyPnl.wins = 6;
      mockDailyPnl.losses = 4;
      mockDailyPnl.winRate = 60;
      
      const { result } = renderHook(() => useTradingGate());
      
      expect(result.current.dailyStats).toEqual({
        totalTrades: 10,
        wins: 6,
        losses: 4,
        winRate: 60,
      });
    });
  });
});
