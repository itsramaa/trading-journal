/**
 * Unit Tests for useContextAwareRisk Hook
 * Tests: volatility, event, sentiment, momentum, and performance multipliers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock data that can be modified per test
const mockRiskProfile = {
  data: { risk_per_trade_percent: 2, max_daily_loss_percent: 5 },
  isLoading: false,
};

const mockMarketScore = {
  score: 50,
  bias: 'NEUTRAL' as string,
  components: { fearGreed: 50, technical: 50, macro: 50, eventSafety: 50 },
  volatilityLabel: 'medium',
  hasHighImpactEvent: false,
  isLoading: false,
};

const mockVolatilityData = {
  data: {
    atrPercent: 2.5,
    risk: { level: 'medium' as string },
  },
  isLoading: false,
};

const mockTradeEntries: any[] = [];

// Setup mocks before imports
vi.mock('@/hooks/use-risk-profile', () => ({
  useRiskProfile: () => mockRiskProfile,
}));

vi.mock('@/hooks/use-unified-market-score', () => ({
  useUnifiedMarketScore: () => mockMarketScore,
}));

vi.mock('@/features/binance/useBinanceAdvancedAnalytics', () => ({
  useBinanceVolatility: () => mockVolatilityData,
}));

vi.mock('@/hooks/use-trade-entries', () => ({
  useTradeEntries: () => ({ data: mockTradeEntries, isLoading: false }),
}));

// Import after mocks
import { useContextAwareRisk, AdjustmentFactor } from '../use-context-aware-risk';

describe('useContextAwareRisk', () => {
  beforeEach(() => {
    // Reset to neutral defaults
    mockRiskProfile.data = { risk_per_trade_percent: 2, max_daily_loss_percent: 5 };
    mockMarketScore.score = 50;
    mockMarketScore.bias = 'NEUTRAL';
    mockMarketScore.components = { fearGreed: 50, technical: 50, macro: 50, eventSafety: 50 };
    mockMarketScore.hasHighImpactEvent = false;
    mockVolatilityData.data = { atrPercent: 2.5, risk: { level: 'medium' } };
    mockTradeEntries.length = 0;
  });

  describe('Base Risk', () => {
    it('should use risk profile value as base risk', () => {
      mockRiskProfile.data.risk_per_trade_percent = 3;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.baseRisk).toBe(3);
    });

    it('should override with baseRiskPercent option', () => {
      const { result } = renderHook(() => useContextAwareRisk({ baseRiskPercent: 1.5 }));
      
      expect(result.current.baseRisk).toBe(1.5);
    });

    it('should default to 2% if no risk profile', () => {
      mockRiskProfile.data = null as any;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.baseRisk).toBe(2);
    });
  });

  describe('Volatility Adjustment', () => {
    it('should apply 0.5x multiplier for extreme volatility', () => {
      mockVolatilityData.data.risk.level = 'extreme';
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.volatilityMultiplier).toBe(0.5);
      
      const volFactor = result.current.adjustmentFactors.find(f => f.id === 'volatility');
      expect(volFactor?.level).toBe('danger');
    });

    it('should apply 0.75x multiplier for high volatility', () => {
      mockVolatilityData.data.risk.level = 'high';
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.volatilityMultiplier).toBe(0.75);
    });

    it('should apply 1.0x multiplier for medium volatility', () => {
      mockVolatilityData.data.risk.level = 'medium';
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.volatilityMultiplier).toBe(1.0);
    });

    it('should apply 1.1x multiplier for low volatility', () => {
      mockVolatilityData.data.risk.level = 'low';
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.volatilityMultiplier).toBe(1.1);
    });
  });

  describe('Event Adjustment', () => {
    it('should apply 0.5x multiplier for high-impact event', () => {
      mockMarketScore.hasHighImpactEvent = true;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.eventMultiplier).toBe(0.5);
      expect(result.current.hasHighImpactEvent).toBe(true);
      
      const eventFactor = result.current.adjustmentFactors.find(f => f.id === 'event');
      expect(eventFactor?.level).toBe('danger');
    });

    it('should apply 1.0x multiplier when no event', () => {
      mockMarketScore.hasHighImpactEvent = false;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.eventMultiplier).toBe(1.0);
    });
  });

  describe('Sentiment Adjustment', () => {
    it('should apply 0.5x multiplier when bias is AVOID', () => {
      mockMarketScore.bias = 'AVOID';
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.sentimentMultiplier).toBe(0.5);
    });

    it('should apply 0.8x multiplier for extreme fear (F&G < 25)', () => {
      mockMarketScore.components.fearGreed = 20;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.sentimentMultiplier).toBe(0.8);
    });

    it('should apply 0.9x multiplier for extreme greed (F&G > 75)', () => {
      mockMarketScore.components.fearGreed = 80;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.sentimentMultiplier).toBe(0.9);
    });

    it('should apply 1.0x multiplier for neutral sentiment', () => {
      mockMarketScore.components.fearGreed = 50;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.sentimentMultiplier).toBe(1.0);
    });
  });

  describe('Momentum Adjustment', () => {
    it('should apply 1.1x multiplier for strong momentum (score >= 70)', () => {
      mockMarketScore.score = 75;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.momentumMultiplier).toBe(1.1);
    });

    it('should apply 0.8x multiplier for weak momentum (score <= 30)', () => {
      mockMarketScore.score = 25;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.momentumMultiplier).toBe(0.8);
    });

    it('should apply 1.0x multiplier for neutral momentum', () => {
      mockMarketScore.score = 50;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.momentumMultiplier).toBe(1.0);
    });
  });

  describe('Historical Performance Adjustment', () => {
    it('should apply 1.15x multiplier for strong performance (>= 60% win rate)', () => {
      // Add 5 closed trades for BTCUSDT with 4 wins
      mockTradeEntries.push(
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'loss' },
      );
      
      const { result } = renderHook(() => useContextAwareRisk({ symbol: 'BTCUSDT' }));
      
      expect(result.current.performanceMultiplier).toBe(1.15);
      expect(result.current.pairWinRate).toBe(80);
      expect(result.current.pairTradeCount).toBe(5);
    });

    it('should apply 0.7x multiplier for poor performance (< 40% win rate)', () => {
      mockTradeEntries.push(
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'loss' },
        { pair: 'BTC/USDT', status: 'closed', result: 'loss' },
        { pair: 'BTC/USDT', status: 'closed', result: 'loss' },
        { pair: 'BTC/USDT', status: 'closed', result: 'loss' },
      );
      
      const { result } = renderHook(() => useContextAwareRisk({ symbol: 'BTCUSDT' }));
      
      expect(result.current.performanceMultiplier).toBe(0.7);
      expect(result.current.pairWinRate).toBe(20);
    });

    it('should return null win rate with insufficient data', () => {
      mockTradeEntries.push(
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'loss' },
      );
      
      const { result } = renderHook(() => useContextAwareRisk({ symbol: 'BTCUSDT' }));
      
      expect(result.current.pairWinRate).toBeNull();
      expect(result.current.pairTradeCount).toBe(2);
    });

    it('should normalize symbol formats for matching', () => {
      mockTradeEntries.push(
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTCUSDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
      );
      
      const { result } = renderHook(() => useContextAwareRisk({ symbol: 'BTCUSDT' }));
      
      expect(result.current.pairTradeCount).toBe(3);
      expect(result.current.pairWinRate).toBe(100);
    });
  });

  describe('Combined Multiplier & Recommendations', () => {
    it('should calculate total multiplier correctly', () => {
      // Set up: medium vol (1.0), no event (1.0), neutral sentiment (1.0), neutral momentum (1.0)
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.totalMultiplier).toBe(1.0);
      expect(result.current.adjustedRisk).toBe(2.0);
    });

    it('should recommend "significantly_reduce" when total < 0.5', () => {
      mockVolatilityData.data.risk.level = 'extreme'; // 0.5
      mockMarketScore.hasHighImpactEvent = true; // 0.5
      // Total = 0.5 * 0.5 = 0.25
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.recommendation).toBe('significantly_reduce');
      expect(result.current.totalMultiplier).toBeLessThan(0.5);
    });

    it('should recommend "reduce" when total between 0.5 and 0.8', () => {
      mockVolatilityData.data.risk.level = 'high'; // 0.75
      mockMarketScore.score = 25; // 0.8 momentum
      // Total = 0.75 * 0.8 = 0.6
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.recommendation).toBe('reduce');
    });

    it('should recommend "increase" when total > 1.05', () => {
      mockVolatilityData.data.risk.level = 'low'; // 1.1
      // Total = 1.1 with no negative factors
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.recommendation).toBe('increase');
      expect(result.current.totalMultiplier).toBeGreaterThan(1.05);
    });

    it('should recommend "normal" for standard conditions', () => {
      // All neutral settings already set in beforeEach
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.recommendation).toBe('normal');
    });

    it('should calculate adjusted risk correctly', () => {
      mockRiskProfile.data.risk_per_trade_percent = 2;
      mockVolatilityData.data.risk.level = 'high'; // 0.75
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      // Base 2% * 0.75 volatility = 1.5%
      expect(result.current.adjustedRisk).toBe(1.5);
    });
  });

  describe('Adjustment Factors Array', () => {
    it('should include all factor types', () => {
      const { result } = renderHook(() => useContextAwareRisk());
      
      const factorIds = result.current.adjustmentFactors.map(f => f.id);
      
      expect(factorIds).toContain('volatility');
      expect(factorIds).toContain('event');
      expect(factorIds).toContain('sentiment');
      expect(factorIds).toContain('momentum');
    });

    it('should include performance factor when sufficient data', () => {
      mockTradeEntries.push(
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
        { pair: 'BTC/USDT', status: 'closed', result: 'win' },
      );
      
      const { result } = renderHook(() => useContextAwareRisk({ symbol: 'BTCUSDT' }));
      
      const factorIds = result.current.adjustmentFactors.map(f => f.id);
      expect(factorIds).toContain('performance');
    });

    it('should have correct structure for each factor', () => {
      const { result } = renderHook(() => useContextAwareRisk());
      
      result.current.adjustmentFactors.forEach((factor: AdjustmentFactor) => {
        expect(factor).toHaveProperty('id');
        expect(factor).toHaveProperty('name');
        expect(factor).toHaveProperty('multiplier');
        expect(factor).toHaveProperty('reason');
        expect(factor).toHaveProperty('level');
        expect(['positive', 'neutral', 'warning', 'danger']).toContain(factor.level);
      });
    });
  });

  describe('Context Flags', () => {
    it('should expose hasHighImpactEvent flag', () => {
      mockMarketScore.hasHighImpactEvent = true;
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.hasHighImpactEvent).toBe(true);
    });

    it('should expose market bias', () => {
      mockMarketScore.bias = 'BULLISH';
      
      const { result } = renderHook(() => useContextAwareRisk());
      
      expect(result.current.marketBias).toBe('BULLISH');
    });
  });
});
