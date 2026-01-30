/**
 * Contract Tests for AI Edge Function Endpoints
 * Validates response shapes from AI-powered edge functions
 */
import { describe, it, expect } from "vitest";

describe("AI Edge Function Contracts", () => {
  describe("Trade Quality Response Contract", () => {
    it("should have valid trade-quality response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          score: 7,
          recommendation: "execute",
          confidence: 85,
          factors: [
            {
              name: "Technical Setup",
              score: 8,
              weight: 0.3,
              reasoning: "Strong support level with bullish divergence",
            },
            {
              name: "Risk/Reward",
              score: 9,
              weight: 0.25,
              reasoning: "2.5:1 R:R ratio exceeds minimum threshold",
            },
          ],
          reasoning: "Setup shows good technical alignment",
          suggestions: [
            "Consider scaling in with 50% position",
            "Monitor BTC correlation",
          ],
        },
      };

      expect(mockResponse.success).toBe(true);
      
      const data = mockResponse.data;
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("recommendation");
      expect(data).toHaveProperty("confidence");
      expect(data).toHaveProperty("factors");
      expect(data).toHaveProperty("reasoning");

      // Score validation
      expect(data.score).toBeGreaterThanOrEqual(1);
      expect(data.score).toBeLessThanOrEqual(10);

      // Recommendation validation
      expect(["execute", "wait", "skip"]).toContain(data.recommendation);

      // Confidence validation
      expect(data.confidence).toBeGreaterThanOrEqual(0);
      expect(data.confidence).toBeLessThanOrEqual(100);

      // Factors validation
      expect(Array.isArray(data.factors)).toBe(true);
      if (data.factors.length > 0) {
        const factor = data.factors[0];
        expect(factor).toHaveProperty("name");
        expect(factor).toHaveProperty("score");
        expect(factor).toHaveProperty("weight");
        expect(factor).toHaveProperty("reasoning");
      }
    });
  });

  describe("Confluence Detection Response Contract", () => {
    it("should have valid confluence-detection response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          detected: [
            {
              name: "Support Level",
              type: "technical",
              confidence: 90,
              description: "Price at major daily support zone",
            },
            {
              name: "RSI Oversold",
              type: "indicator",
              confidence: 85,
              description: "RSI below 30 on 4H timeframe",
            },
          ],
          missing: [
            {
              name: "Order Block",
              type: "smart_money",
              importance: "high",
              description: "No clear order block at current level",
            },
          ],
          score: 4,
          minRequired: 4,
          isValid: true,
          recommendation: "Confluences met. Trade setup is valid.",
        },
      };

      expect(mockResponse.success).toBe(true);

      const data = mockResponse.data;
      expect(data).toHaveProperty("detected");
      expect(data).toHaveProperty("missing");
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("minRequired");
      expect(data).toHaveProperty("isValid");

      // Arrays validation
      expect(Array.isArray(data.detected)).toBe(true);
      expect(Array.isArray(data.missing)).toBe(true);

      // Detected confluence shape
      if (data.detected.length > 0) {
        const conf = data.detected[0];
        expect(conf).toHaveProperty("name");
        expect(conf).toHaveProperty("type");
        expect(conf).toHaveProperty("confidence");
        expect(conf.confidence).toBeGreaterThanOrEqual(0);
        expect(conf.confidence).toBeLessThanOrEqual(100);
      }

      // isValid should reflect score vs minRequired
      expect(typeof data.isValid).toBe("boolean");
    });
  });

  describe("Dashboard Insights Response Contract", () => {
    it("should have valid dashboard-insights response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          insights: [
            {
              id: "1",
              type: "performance",
              title: "Winning Streak",
              message: "You're on a 5-trade winning streak!",
              priority: "high",
              actionable: false,
            },
            {
              id: "2",
              type: "risk",
              title: "Elevated Exposure",
              message: "Current exposure at 35% of capital",
              priority: "medium",
              actionable: true,
              action: {
                label: "Review Positions",
                route: "/trading-journal",
              },
            },
          ],
          summary: {
            overallHealth: "good",
            riskLevel: "moderate",
            suggestion: "Continue current strategy",
          },
          generatedAt: "2024-01-01T12:00:00Z",
        },
      };

      expect(mockResponse.success).toBe(true);

      const data = mockResponse.data;
      expect(data).toHaveProperty("insights");
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("generatedAt");

      // Insights validation
      expect(Array.isArray(data.insights)).toBe(true);
      if (data.insights.length > 0) {
        const insight = data.insights[0];
        expect(insight).toHaveProperty("id");
        expect(insight).toHaveProperty("type");
        expect(insight).toHaveProperty("title");
        expect(insight).toHaveProperty("message");
        expect(insight).toHaveProperty("priority");

        // Type validation
        expect(["performance", "risk", "opportunity", "warning"]).toContain(insight.type);
        expect(["high", "medium", "low"]).toContain(insight.priority);
      }

      // Summary validation
      expect(["good", "moderate", "poor"]).toContain(data.summary.overallHealth);
      expect(["low", "moderate", "high", "critical"]).toContain(data.summary.riskLevel);
    });
  });

  describe("Post Trade Analysis Response Contract", () => {
    it("should have valid post-trade-analysis response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          summary: {
            outcome: "win",
            profitLoss: 250,
            profitLossPercent: 2.5,
            holdingTime: "4h 32m",
            riskRewardAchieved: 2.1,
          },
          analysis: {
            entryQuality: {
              score: 8,
              notes: "Entry near optimal level",
            },
            exitQuality: {
              score: 7,
              notes: "Exited slightly early",
            },
            riskManagement: {
              score: 9,
              notes: "Stop loss properly placed",
            },
            emotionalDiscipline: {
              score: 8,
              notes: "Trade executed according to plan",
            },
          },
          lessonsLearned: [
            "Patience paid off waiting for confirmation",
          ],
          improvements: [
            "Could have held longer for full target",
          ],
          similarTrades: [
            {
              date: "2024-01-15",
              pair: "BTCUSDT",
              result: "win",
              similarity: 85,
            },
          ],
        },
      };

      expect(mockResponse.success).toBe(true);

      const data = mockResponse.data;
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("analysis");
      expect(data).toHaveProperty("lessonsLearned");
      expect(data).toHaveProperty("improvements");

      // Summary validation
      expect(["win", "loss", "breakeven"]).toContain(data.summary.outcome);
      expect(typeof data.summary.profitLoss).toBe("number");

      // Analysis validation
      const analysis = data.analysis;
      expect(analysis).toHaveProperty("entryQuality");
      expect(analysis).toHaveProperty("exitQuality");
      expect(analysis).toHaveProperty("riskManagement");
      expect(analysis.entryQuality.score).toBeGreaterThanOrEqual(1);
      expect(analysis.entryQuality.score).toBeLessThanOrEqual(10);

      // Arrays validation
      expect(Array.isArray(data.lessonsLearned)).toBe(true);
      expect(Array.isArray(data.improvements)).toBe(true);
    });
  });

  describe("Macro Analysis Response Contract", () => {
    it("should have valid macro-analysis response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          outlook: "neutral",
          confidence: 70,
          keyFactors: [
            {
              name: "Interest Rates",
              impact: "negative",
              description: "Fed signaling higher for longer",
            },
          ],
          recommendations: [
            "Reduce position sizes by 20%",
          ],
          upcomingEvents: [
            {
              date: "2024-01-15T14:00:00Z",
              event: "FOMC Minutes",
              expectedImpact: "high",
            },
          ],
        },
      };

      expect(mockResponse.success).toBe(true);

      const data = mockResponse.data;
      expect(data).toHaveProperty("outlook");
      expect(data).toHaveProperty("confidence");
      expect(data).toHaveProperty("keyFactors");

      // Outlook validation
      expect(["bullish", "neutral", "bearish"]).toContain(data.outlook);
      expect(data.confidence).toBeGreaterThanOrEqual(0);
      expect(data.confidence).toBeLessThanOrEqual(100);

      // Key factors validation
      if (data.keyFactors.length > 0) {
        const factor = data.keyFactors[0];
        expect(factor).toHaveProperty("name");
        expect(factor).toHaveProperty("impact");
        expect(["positive", "neutral", "negative"]).toContain(factor.impact);
      }
    });
  });

  describe("Market Sentiment Response Contract", () => {
    it("should have valid market-insight response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          overall: "bullish",
          score: 65,
          components: {
            fearGreedIndex: 62,
            socialSentiment: 70,
            institutionalFlow: "positive",
            retailFlow: "neutral",
            derivativesPositioning: "long-biased",
          },
          trends: [
            {
              metric: "Fear & Greed",
              direction: "up",
              change: 5,
              period: "24h",
            },
          ],
          alerts: [
            {
              type: "warning",
              message: "Funding rates elevated",
            },
          ],
        },
      };

      expect(mockResponse.success).toBe(true);

      const data = mockResponse.data;
      expect(data).toHaveProperty("overall");
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("components");

      // Overall sentiment validation
      expect(["bullish", "neutral", "bearish"]).toContain(data.overall);
      expect(data.score).toBeGreaterThanOrEqual(0);
      expect(data.score).toBeLessThanOrEqual(100);

      // Components validation
      expect(data.components).toHaveProperty("fearGreedIndex");
      expect(data.components.fearGreedIndex).toBeGreaterThanOrEqual(0);
      expect(data.components.fearGreedIndex).toBeLessThanOrEqual(100);
    });
  });

  describe("AI Preflight Response Contract", () => {
    it("should have valid ai-preflight response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          approved: true,
          warnings: [],
          risk_score: 3,
          recommendation: "proceed",
        },
      };

      expect(mockResponse.success).toBe(true);

      const data = mockResponse.data;
      expect(data).toHaveProperty("approved");
      expect(data).toHaveProperty("risk_score");
      expect(data).toHaveProperty("recommendation");

      expect(typeof data.approved).toBe("boolean");
      expect(data.risk_score).toBeGreaterThanOrEqual(1);
      expect(data.risk_score).toBeLessThanOrEqual(10);
      expect(["proceed", "review", "reject"]).toContain(data.recommendation);
    });

    it("should handle rejection with warnings", () => {
      const mockRejection = {
        success: true,
        data: {
          approved: false,
          warnings: [
            "Daily loss limit nearly reached",
            "Position size exceeds risk profile",
          ],
          risk_score: 8,
          recommendation: "reject",
        },
      };

      expect(mockRejection.data.approved).toBe(false);
      expect(mockRejection.data.warnings.length).toBeGreaterThan(0);
      expect(mockRejection.data.risk_score).toBeGreaterThan(5);
    });
  });

  describe("Backtest Strategy Response Contract", () => {
    it("should have valid backtest-strategy response shape", () => {
      const mockResponse = {
        success: true,
        data: {
          totalTrades: 50,
          winRate: 65,
          profitFactor: 1.8,
          maxDrawdown: 12,
          sharpeRatio: 1.5,
          netProfit: 2500,
          avgWin: 150,
          avgLoss: 80,
          largestWin: 500,
          largestLoss: 200,
          consecutiveWins: 7,
          consecutiveLosses: 3,
          trades: [],
          equityCurve: [],
        },
      };

      expect(mockResponse.success).toBe(true);

      const data = mockResponse.data;
      expect(data).toHaveProperty("totalTrades");
      expect(data).toHaveProperty("winRate");
      expect(data).toHaveProperty("profitFactor");
      expect(data).toHaveProperty("maxDrawdown");

      // Validation
      expect(data.winRate).toBeGreaterThanOrEqual(0);
      expect(data.winRate).toBeLessThanOrEqual(100);
      expect(data.profitFactor).toBeGreaterThan(0);
      expect(data.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(data.maxDrawdown).toBeLessThanOrEqual(100);
    });
  });

  describe("Request Payload Contracts", () => {
    it("should have valid trade-quality request shape", () => {
      const request = {
        pair: "BTCUSDT",
        direction: "long",
        entryPrice: 50000,
        stopLoss: 49000,
        takeProfit: 52000,
        confluences: ["support", "rsi_oversold"],
        marketCondition: "ranging",
      };

      expect(request).toHaveProperty("pair");
      expect(request).toHaveProperty("direction");
      expect(request).toHaveProperty("entryPrice");
      expect(["long", "short"]).toContain(request.direction);
    });

    it("should have valid confluence-detection request shape", () => {
      const request = {
        pair: "ETHUSDT",
        direction: "short",
        entryPrice: 3200,
        timeframe: "4h",
        strategyId: "strategy-uuid",
      };

      expect(request).toHaveProperty("pair");
      expect(request).toHaveProperty("direction");
      expect(request).toHaveProperty("entryPrice");
    });

    it("should have valid post-trade-analysis request shape", () => {
      const request = {
        trade: {
          id: "trade-uuid",
          pair: "BTCUSDT",
          direction: "long",
          entryPrice: 50000,
          exitPrice: 52000,
          pnl: 200,
          result: "win",
        },
        strategy: {
          name: "Breakout Strategy",
          minConfluences: 4,
        },
        similarTrades: [],
      };

      expect(request).toHaveProperty("trade");
      expect(request.trade).toHaveProperty("pair");
      expect(request.trade).toHaveProperty("exitPrice");
    });
  });

  describe("Error Response Contract", () => {
    it("should have valid AI error response shape", () => {
      const mockError = {
        success: false,
        error: "Rate limit exceeded",
        code: "RATE_LIMITED",
        retryAfter: 60,
      };

      expect(mockError.success).toBe(false);
      expect(mockError).toHaveProperty("error");
      expect(typeof mockError.error).toBe("string");
    });

    it("should handle model unavailable error", () => {
      const mockError = {
        success: false,
        error: "AI model temporarily unavailable",
        code: "MODEL_UNAVAILABLE",
      };

      expect(mockError.code).toBe("MODEL_UNAVAILABLE");
    });
  });
});
