import { http, HttpResponse, delay } from "msw";
import {
  mockBalanceData,
  mockPositionsData,
  mockIncomeData,
  mockTradesData,
} from "./binance";
import {
  mockTradeQualityResponse,
  mockConfluenceDetectionResponse,
  mockDashboardInsightsResponse,
  mockPostTradeAnalysisResponse,
  mockMacroAnalysisResponse,
  mockMarketSentimentResponse,
} from "./ai-responses";

const SUPABASE_URL = "https://ltlaznzrqsccmczhfism.supabase.co";

export const handlers = [
  // ==================== Binance Futures Edge Function ====================
  http.post(`${SUPABASE_URL}/functions/v1/binance-futures`, async ({ request }) => {
    await delay(100);
    
    const body = await request.json() as { action: string };
    const { action } = body;

    switch (action) {
      case "validate":
        // Default: return successful validation (credentials configured)
        return HttpResponse.json({
          success: true,
          data: {
            canTrade: true,
            permissions: ["futures"],
          },
        });

      case "balance":
        return HttpResponse.json({
          success: true,
          data: mockBalanceData,
        });

      case "positions":
        return HttpResponse.json({
          success: true,
          data: mockPositionsData,
        });

      case "income":
        return HttpResponse.json({
          success: true,
          data: mockIncomeData,
        });

      case "trades":
        return HttpResponse.json({
          success: true,
          data: mockTradesData,
        });

      default:
        return HttpResponse.json(
          { success: false, error: "Unknown action" },
          { status: 400 }
        );
    }
  }),

  // ==================== AI Edge Functions ====================
  http.post(`${SUPABASE_URL}/functions/v1/trade-quality`, async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      data: mockTradeQualityResponse,
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/confluence-detection`, async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      data: mockConfluenceDetectionResponse,
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/dashboard-insights`, async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      data: mockDashboardInsightsResponse,
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/post-trade-analysis`, async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      data: mockPostTradeAnalysisResponse,
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/macro-analysis`, async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      data: mockMacroAnalysisResponse,
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/market-insight`, async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      data: mockMarketSentimentResponse,
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/ai-preflight`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: {
        approved: true,
        warnings: [],
        risk_score: 3,
        recommendation: "proceed",
      },
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/backtest-strategy`, async () => {
    await delay(200);
    return HttpResponse.json({
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
      },
    });
  }),

  // ==================== Economic Calendar ====================
  http.post(`${SUPABASE_URL}/functions/v1/economic-calendar`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: {
        events: [
          {
            id: "1",
            title: "FOMC Meeting",
            date: new Date().toISOString(),
            impact: "high",
            currency: "USD",
            forecast: "5.25%",
            previous: "5.25%",
          },
          {
            id: "2",
            title: "Non-Farm Payrolls",
            date: new Date().toISOString(),
            impact: "high",
            currency: "USD",
            forecast: "180K",
            previous: "175K",
          },
        ],
      },
    });
  }),

  // ==================== Trading Analysis ====================
  http.post(`${SUPABASE_URL}/functions/v1/trading-analysis`, async () => {
    await delay(150);
    return HttpResponse.json({
      success: true,
      data: {
        analysis: "Market shows bullish momentum with strong volume.",
        signals: ["bullish_divergence", "support_bounce"],
        confidence: 75,
      },
    });
  }),

  // ==================== YouTube Strategy Import ====================
  http.post(`${SUPABASE_URL}/functions/v1/youtube-strategy-import`, async () => {
    await delay(200);
    return HttpResponse.json({
      success: true,
      data: {
        name: "ICT Strategy",
        description: "Inner Circle Trader methodology",
        entry_rules: [
          { type: "indicator", name: "Order Block", required: true },
          { type: "indicator", name: "Fair Value Gap", required: true },
        ],
        exit_rules: [
          { type: "target", value: "2R" },
          { type: "stoploss", value: "Previous swing" },
        ],
        timeframe: "15m",
      },
    });
  }),

  // ==================== Sync Trading Pairs ====================
  http.post(`${SUPABASE_URL}/functions/v1/sync-trading-pairs`, async () => {
    await delay(100);
    return HttpResponse.json({
      success: true,
      data: { synced: 150, updated: 5 },
    });
  }),

  // ==================== Check Permission ====================
  http.post(`${SUPABASE_URL}/functions/v1/check-permission`, async () => {
    await delay(50);
    return HttpResponse.json({
      success: true,
      data: { hasPermission: true },
    });
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = {
  // Credentials not configured response (HTTP 200 with error code)
  binanceNotConfigured: http.post(
    `${SUPABASE_URL}/functions/v1/binance-futures`,
    async () => {
      await delay(100);
      return HttpResponse.json({
        success: false,
        code: "CREDENTIALS_NOT_CONFIGURED",
        error: "Binance API credentials not configured",
        message: "Please configure your Binance API key and secret in Settings → Exchange to use this feature.",
      });
    }
  ),

  binanceFuturesError: http.post(
    `${SUPABASE_URL}/functions/v1/binance-futures`,
    async () => {
      await delay(100);
      return HttpResponse.json(
        { success: false, error: "API key invalid" },
        { status: 401 }
      );
    }
  ),

  networkError: http.post(
    `${SUPABASE_URL}/functions/v1/binance-futures`,
    async () => {
      await delay(100);
      return HttpResponse.error();
    }
  ),

  timeoutError: http.post(
    `${SUPABASE_URL}/functions/v1/binance-futures`,
    async () => {
      await delay(30000); // Simulate timeout
      return HttpResponse.json({ success: true });
    }
  ),
};
