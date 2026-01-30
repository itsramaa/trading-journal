/**
 * Mock AI Edge Function responses
 */

export const mockTradeQualityResponse = {
  score: 7,
  recommendation: "execute" as const,
  confidence: 85,
  factors: [
    {
      name: "Technical Setup",
      score: 8,
      weight: 0.3,
      reasoning: "Strong support level with bullish divergence on RSI",
    },
    {
      name: "Risk/Reward",
      score: 9,
      weight: 0.25,
      reasoning: "2.5:1 R:R ratio exceeds minimum threshold",
    },
    {
      name: "Market Context",
      score: 6,
      weight: 0.2,
      reasoning: "Neutral macro environment, moderate volatility",
    },
    {
      name: "Confluence",
      score: 7,
      weight: 0.25,
      reasoning: "4 out of 5 required confluences met",
    },
  ],
  reasoning: "Setup shows good technical alignment with acceptable risk parameters. Recommend execution with defined risk management.",
  suggestions: [
    "Consider scaling in with 50% position size initially",
    "Monitor BTC correlation during trade",
    "Set trailing stop after 1R profit",
  ],
};

export const mockConfluenceDetectionResponse = {
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
    {
      name: "Volume Spike",
      type: "volume",
      confidence: 75,
      description: "Volume 2x average on recent candle",
    },
    {
      name: "Trend Alignment",
      type: "trend",
      confidence: 80,
      description: "Weekly trend bullish, daily pullback",
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
};

export const mockDashboardInsightsResponse = {
  insights: [
    {
      id: "1",
      type: "performance" as const,
      title: "Winning Streak",
      message: "You're on a 5-trade winning streak. Great discipline!",
      priority: "high" as const,
      actionable: false,
    },
    {
      id: "2",
      type: "risk" as const,
      title: "Elevated Exposure",
      message: "Current exposure at 35% of capital. Consider reducing before adding new positions.",
      priority: "medium" as const,
      actionable: true,
      action: {
        label: "Review Positions",
        route: "/trading-journal",
      },
    },
    {
      id: "3",
      type: "opportunity" as const,
      title: "Pattern Detected",
      message: "Your best performing setup (Breakout Retest) has formed on ETHUSDT.",
      priority: "medium" as const,
      actionable: true,
      action: {
        label: "View Setup",
        route: "/ai-assistant",
      },
    },
  ],
  summary: {
    overallHealth: "good" as const,
    riskLevel: "moderate" as const,
    suggestion: "Continue current strategy with slight position size reduction.",
  },
  generatedAt: new Date().toISOString(),
};

export const mockPostTradeAnalysisResponse = {
  summary: {
    outcome: "win" as const,
    profitLoss: 250,
    profitLossPercent: 2.5,
    holdingTime: "4h 32m",
    riskRewardAchieved: 2.1,
  },
  analysis: {
    entryQuality: {
      score: 8,
      notes: "Entry near optimal level with good timing",
    },
    exitQuality: {
      score: 7,
      notes: "Exited slightly early, leaving 15% on table",
    },
    riskManagement: {
      score: 9,
      notes: "Stop loss properly placed and respected",
    },
    emotionalDiscipline: {
      score: 8,
      notes: "Trade executed according to plan",
    },
  },
  lessonsLearned: [
    "Patience paid off waiting for confirmation",
    "Consider trailing stop for similar setups",
    "Volume confirmation was key signal",
  ],
  improvements: [
    "Could have held longer for full target",
    "Add partial profit taking at 1R",
  ],
  similarTrades: [
    {
      date: "2024-01-15",
      pair: "BTCUSDT",
      result: "win",
      similarity: 85,
    },
  ],
};

export const mockMacroAnalysisResponse = {
  outlook: "neutral" as const,
  confidence: 70,
  keyFactors: [
    {
      name: "Interest Rates",
      impact: "negative",
      description: "Fed signaling higher for longer",
    },
    {
      name: "Inflation",
      impact: "neutral",
      description: "CPI trending down but above target",
    },
    {
      name: "Market Sentiment",
      impact: "positive",
      description: "Risk-on sentiment returning",
    },
  ],
  recommendations: [
    "Reduce position sizes by 20%",
    "Focus on short-term setups",
    "Avoid holding through FOMC",
  ],
  upcomingEvents: [
    {
      date: new Date(Date.now() + 86400000).toISOString(),
      event: "FOMC Minutes",
      expectedImpact: "high",
    },
  ],
};

export const mockMarketSentimentResponse = {
  overall: "bullish" as const,
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
    {
      metric: "Long/Short Ratio",
      direction: "up",
      change: 0.15,
      period: "24h",
    },
  ],
  alerts: [
    {
      type: "warning",
      message: "Funding rates elevated - potential long squeeze risk",
    },
  ],
};

/**
 * Generate mock AI response with delay simulation
 */
export function createDelayedAIResponse<T>(data: T, delayMs = 500): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delayMs);
  });
}

/**
 * Mock error responses for AI endpoints
 */
export const mockAIErrors = {
  rateLimited: {
    success: false,
    error: "Rate limit exceeded. Please try again in 60 seconds.",
    code: "RATE_LIMITED",
  },
  modelUnavailable: {
    success: false,
    error: "AI model temporarily unavailable. Please try again later.",
    code: "MODEL_UNAVAILABLE",
  },
  invalidInput: {
    success: false,
    error: "Invalid input parameters provided.",
    code: "INVALID_INPUT",
  },
  quotaExceeded: {
    success: false,
    error: "Monthly AI quota exceeded. Upgrade plan for more requests.",
    code: "QUOTA_EXCEEDED",
  },
};
