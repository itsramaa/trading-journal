/**
 * Mock Binance Futures API responses
 */

export const mockBalanceData = {
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
      positionInitialMargin: 1500,
      openOrderInitialMargin: 0,
      crossWalletBalance: 10000,
      crossUnPnl: 250,
      availableBalance: 8500,
      maxWithdrawAmount: 8500,
      marginAvailable: true,
      updateTime: Date.now(),
    },
  ],
  positions: [],
};

export const mockPositionsData = [
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
    updateTime: Date.now(),
  },
  {
    symbol: "ETHUSDT",
    positionSide: "SHORT",
    positionAmt: -1,
    entryPrice: 3200,
    markPrice: 3150,
    unrealizedProfit: 50,
    liquidationPrice: 3500,
    leverage: 5,
    marginType: "cross",
    isolatedMargin: 0,
    notional: 3150,
    isolatedWallet: 0,
    updateTime: Date.now(),
  },
];

export const mockIncomeData = [
  {
    symbol: "BTCUSDT",
    incomeType: "REALIZED_PNL",
    income: 150,
    asset: "USDT",
    time: Date.now() - 86400000,
    tranId: "1",
    tradeId: "100",
  },
  {
    symbol: "BTCUSDT",
    incomeType: "COMMISSION",
    income: -2.5,
    asset: "USDT",
    time: Date.now() - 86400000,
    tranId: "2",
    tradeId: "100",
  },
  {
    symbol: "ETHUSDT",
    incomeType: "REALIZED_PNL",
    income: -50,
    asset: "USDT",
    time: Date.now() - 172800000,
    tranId: "3",
    tradeId: "101",
  },
  {
    symbol: "ETHUSDT",
    incomeType: "FUNDING_FEE",
    income: -1.2,
    asset: "USDT",
    time: Date.now() - 172800000,
    tranId: "4",
    tradeId: "",
  },
];

export const mockTradesData = [
  {
    symbol: "BTCUSDT",
    id: 100,
    orderId: 1000,
    side: "BUY",
    price: 50000,
    qty: 0.1,
    realizedPnl: 150,
    marginAsset: "USDT",
    quoteQty: 5000,
    commission: 2.5,
    commissionAsset: "USDT",
    time: Date.now() - 86400000,
    positionSide: "LONG",
    maker: false,
    buyer: true,
  },
  {
    symbol: "ETHUSDT",
    id: 101,
    orderId: 1001,
    side: "SELL",
    price: 3200,
    qty: 1,
    realizedPnl: -50,
    marginAsset: "USDT",
    quoteQty: 3200,
    commission: 1.6,
    commissionAsset: "USDT",
    time: Date.now() - 172800000,
    positionSide: "SHORT",
    maker: true,
    buyer: false,
  },
];

/**
 * Mock Binance API error responses
 */
export const mockBinanceErrors = {
  invalidApiKey: {
    code: -2015,
    msg: "Invalid API-key, IP, or permissions for action.",
  },
  invalidSignature: {
    code: -1022,
    msg: "Signature for this request is not valid.",
  },
  rateLimitExceeded: {
    code: -1015,
    msg: "Too many requests; please use the websocket for live updates.",
  },
  insufficientBalance: {
    code: -2019,
    msg: "Margin is insufficient.",
  },
};

/**
 * Generate mock income data for a date range
 */
export function generateMockIncomeData(days: number) {
  const data = [];
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
  const incomeTypes = ["REALIZED_PNL", "COMMISSION", "FUNDING_FEE"];

  for (let i = 0; i < days; i++) {
    const numTrades = Math.floor(Math.random() * 5) + 1;
    
    for (let j = 0; j < numTrades; j++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const incomeType = incomeTypes[Math.floor(Math.random() * incomeTypes.length)];
      
      let income: number;
      if (incomeType === "REALIZED_PNL") {
        income = (Math.random() - 0.4) * 200; // -80 to +120
      } else if (incomeType === "COMMISSION") {
        income = -(Math.random() * 5); // -5 to 0
      } else {
        income = (Math.random() - 0.5) * 10; // -5 to +5
      }

      data.push({
        symbol,
        incomeType,
        income: parseFloat(income.toFixed(2)),
        asset: "USDT",
        time: Date.now() - i * 86400000 - j * 3600000,
        tranId: `${i}-${j}`,
        tradeId: incomeType === "FUNDING_FEE" ? "" : `${1000 + i * 10 + j}`,
      });
    }
  }

  return data.sort((a, b) => b.time - a.time);
}
