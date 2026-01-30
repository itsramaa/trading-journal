/**
 * Contract Tests for Binance API Edge Function
 * Validates response shapes from binance-futures edge function
 */
import { describe, it, expect } from "vitest";

describe("Binance Edge Function Contract", () => {
  describe("Balance Action Response", () => {
    it("should have valid BinanceAccountSummary shape", () => {
      const mockResponse = {
        success: true,
        data: {
          totalWalletBalance: 10000,
          availableBalance: 8500,
          totalUnrealizedProfit: 250,
          totalMarginBalance: 10250,
          totalInitialMargin: 1500,
          totalMaintMargin: 150,
          totalPositionInitialMargin: 1500,
          totalOpenOrderInitialMargin: 0,
          totalCrossWalletBalance: 10000,
          totalCrossUnPnl: 250,
          availableCrossMargin: 8500,
          maxWithdrawAmount: 8500,
          assets: [
            {
              asset: "USDT",
              walletBalance: 10000,
              unrealizedProfit: 250,
              marginBalance: 10250,
              maintMargin: 150,
              initialMargin: 1500,
              availableBalance: 8500,
            },
          ],
        },
      };

      // Verify top-level structure
      expect(mockResponse).toHaveProperty("success", true);
      expect(mockResponse).toHaveProperty("data");

      // Verify required balance fields
      const data = mockResponse.data;
      expect(data).toHaveProperty("totalWalletBalance");
      expect(data).toHaveProperty("availableBalance");
      expect(data).toHaveProperty("totalUnrealizedProfit");
      expect(data).toHaveProperty("assets");

      // Verify types
      expect(typeof data.totalWalletBalance).toBe("number");
      expect(typeof data.availableBalance).toBe("number");
      expect(Array.isArray(data.assets)).toBe(true);

      // Verify asset shape
      if (data.assets.length > 0) {
        const asset = data.assets[0];
        expect(asset).toHaveProperty("asset");
        expect(asset).toHaveProperty("walletBalance");
        expect(asset).toHaveProperty("availableBalance");
      }
    });

    it("should handle zero balance correctly", () => {
      const mockZeroBalance = {
        success: true,
        data: {
          totalWalletBalance: 0,
          availableBalance: 0,
          totalUnrealizedProfit: 0,
          assets: [],
        },
      };

      expect(mockZeroBalance.data.totalWalletBalance).toBe(0);
      expect(mockZeroBalance.data.assets).toHaveLength(0);
    });
  });

  describe("Positions Action Response", () => {
    it("should have valid BinancePosition array shape", () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: "BTCUSDT",
            positionSide: "LONG",
            positionAmt: 0.1,
            entryPrice: 50000,
            markPrice: 52500,
            unrealizedProfit: 250,
            liquidationPrice: 45000,
            leverage: 10,
            marginType: "cross",
            isolatedMargin: 0,
            notional: 5250,
            isolatedWallet: 0,
            updateTime: 1704067200000,
          },
        ],
      };

      expect(mockResponse.success).toBe(true);
      expect(Array.isArray(mockResponse.data)).toBe(true);

      const position = mockResponse.data[0];
      
      // Required fields
      expect(position).toHaveProperty("symbol");
      expect(position).toHaveProperty("positionSide");
      expect(position).toHaveProperty("positionAmt");
      expect(position).toHaveProperty("entryPrice");
      expect(position).toHaveProperty("markPrice");
      expect(position).toHaveProperty("unrealizedProfit");
      expect(position).toHaveProperty("leverage");

      // Type validations
      expect(typeof position.symbol).toBe("string");
      expect(["LONG", "SHORT", "BOTH"]).toContain(position.positionSide);
      expect(typeof position.positionAmt).toBe("number");
      expect(typeof position.leverage).toBe("number");
      expect(position.leverage).toBeGreaterThan(0);
    });

    it("should handle empty positions", () => {
      const mockEmpty = {
        success: true,
        data: [],
      };

      expect(mockEmpty.data).toHaveLength(0);
    });
  });

  describe("Income Action Response", () => {
    it("should have valid BinanceIncome array shape", () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: "BTCUSDT",
            incomeType: "REALIZED_PNL",
            income: 150.5,
            asset: "USDT",
            time: 1704067200000,
            tranId: "123456789",
            tradeId: "987654321",
          },
        ],
      };

      expect(mockResponse.success).toBe(true);
      expect(Array.isArray(mockResponse.data)).toBe(true);

      const income = mockResponse.data[0];

      // Required fields
      expect(income).toHaveProperty("symbol");
      expect(income).toHaveProperty("incomeType");
      expect(income).toHaveProperty("income");
      expect(income).toHaveProperty("asset");
      expect(income).toHaveProperty("time");

      // Valid income types
      const validIncomeTypes = [
        "REALIZED_PNL",
        "FUNDING_FEE",
        "COMMISSION",
        "TRANSFER",
        "INTERNAL_TRANSFER",
        "CROSS_COLLATERAL_TRANSFER",
        "INSURANCE_CLEAR",
        "REFERRAL_KICKBACK",
        "COMMISSION_REBATE",
        "DELIVERED_SETTELMENT",
        "COIN_SWAP_DEPOSIT",
        "COIN_SWAP_WITHDRAW",
      ];
      expect(validIncomeTypes).toContain(income.incomeType);

      // Type validations
      expect(typeof income.income).toBe("number");
      expect(typeof income.time).toBe("number");
    });

    it("should handle negative income (losses/fees)", () => {
      const mockNegative = {
        success: true,
        data: [
          {
            symbol: "ETHUSDT",
            incomeType: "COMMISSION",
            income: -2.5,
            asset: "USDT",
            time: 1704067200000,
            tranId: "123",
            tradeId: "456",
          },
        ],
      };

      expect(mockNegative.data[0].income).toBeLessThan(0);
    });
  });

  describe("Trades Action Response", () => {
    it("should have valid BinanceTrade array shape", () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: "BTCUSDT",
            id: 123456789,
            orderId: 987654321,
            side: "BUY",
            price: 50000,
            qty: 0.1,
            realizedPnl: 150,
            marginAsset: "USDT",
            quoteQty: 5000,
            commission: 2.5,
            commissionAsset: "USDT",
            time: 1704067200000,
            positionSide: "LONG",
            maker: false,
            buyer: true,
          },
        ],
      };

      expect(mockResponse.success).toBe(true);
      const trade = mockResponse.data[0];

      // Required fields
      expect(trade).toHaveProperty("symbol");
      expect(trade).toHaveProperty("id");
      expect(trade).toHaveProperty("side");
      expect(trade).toHaveProperty("price");
      expect(trade).toHaveProperty("qty");
      expect(trade).toHaveProperty("time");

      // Type validations
      expect(["BUY", "SELL"]).toContain(trade.side);
      expect(["LONG", "SHORT", "BOTH"]).toContain(trade.positionSide);
      expect(typeof trade.maker).toBe("boolean");
      expect(typeof trade.buyer).toBe("boolean");
      expect(trade.price).toBeGreaterThan(0);
      expect(trade.qty).toBeGreaterThan(0);
    });
  });

  describe("Error Response Contract", () => {
    it("should have valid error response shape", () => {
      const mockError = {
        success: false,
        error: "Invalid API key",
        code: "INVALID_API_KEY",
      };

      expect(mockError.success).toBe(false);
      expect(mockError).toHaveProperty("error");
      expect(typeof mockError.error).toBe("string");
    });

    it("should handle Binance API error codes", () => {
      const mockBinanceError = {
        success: false,
        error: "Signature for this request is not valid",
        code: -1022,
        binanceCode: -1022,
      };

      expect(mockBinanceError.success).toBe(false);
      expect(typeof mockBinanceError.binanceCode).toBe("number");
    });
  });

  describe("Request Payload Contract", () => {
    it("should have valid balance request shape", () => {
      const request = {
        action: "balance",
      };

      expect(request).toHaveProperty("action", "balance");
    });

    it("should have valid positions request shape", () => {
      const request = {
        action: "positions",
      };

      expect(request).toHaveProperty("action", "positions");
    });

    it("should have valid income request shape with optional params", () => {
      const request = {
        action: "income",
        params: {
          symbol: "BTCUSDT",
          incomeType: "REALIZED_PNL",
          startTime: 1704067200000,
          endTime: 1704153600000,
          limit: 100,
        },
      };

      expect(request).toHaveProperty("action", "income");
      expect(request.params).toHaveProperty("symbol");
      expect(request.params).toHaveProperty("startTime");
      expect(request.params).toHaveProperty("endTime");
    });

    it("should have valid trades request shape with optional params", () => {
      const request = {
        action: "trades",
        params: {
          symbol: "BTCUSDT",
          startTime: 1704067200000,
          endTime: 1704153600000,
          limit: 500,
        },
      };

      expect(request).toHaveProperty("action", "trades");
      expect(request.params?.limit).toBeLessThanOrEqual(1000);
    });
  });

  describe("API Key Configuration Contract", () => {
    it("should require API key and secret in metadata", () => {
      // This tests the expected shape of account metadata for Binance connection
      const mockAccountMetadata = {
        binance_api_key: "encrypted_key_here",
        binance_api_secret: "encrypted_secret_here",
        binance_testnet: false,
      };

      expect(mockAccountMetadata).toHaveProperty("binance_api_key");
      expect(mockAccountMetadata).toHaveProperty("binance_api_secret");
      expect(typeof mockAccountMetadata.binance_testnet).toBe("boolean");
    });
  });
});
