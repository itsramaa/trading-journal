import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Holding {
  symbol: string;
  name: string;
  type: string;
  value: number;
  allocation: string;
  profitLoss: number;
  profitLossPercent: string;
}

interface PortfolioContext {
  portfolioName: string;
  currency: string;
  totalPortfolioValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: string;
  numberOfAssets: number;
  allocationByType: Record<string, number>;
  holdings: Holding[];
  targetAllocations?: Record<string, number>;
}

function generateRebalancingAnalysis(context: PortfolioContext): string {
  if (!context || !context.holdings || context.holdings.length === 0) {
    return 'No holdings data available for rebalancing analysis.';
  }

  const { allocationByType, targetAllocations, holdings, totalPortfolioValue } = context;
  
  // Default target allocations if not provided
  const defaultTargets: Record<string, number> = {
    'crypto': 20,
    'stock_us': 40,
    'stock_id': 25,
    'reksadana': 10,
    'other': 5,
  };
  
  const targets = targetAllocations || defaultTargets;
  
  // Calculate deviations
  const deviations: Array<{
    type: string;
    current: number;
    target: number;
    deviation: number;
    action: string;
    amountToRebalance: number;
  }> = [];

  Object.keys(targets).forEach(type => {
    const current = allocationByType[type] || 0;
    const target = targets[type] || 0;
    const deviation = current - target;
    
    if (Math.abs(deviation) > 1) { // Only significant deviations
      const amountToRebalance = (Math.abs(deviation) / 100) * totalPortfolioValue;
      deviations.push({
        type,
        current: Number(current.toFixed(2)),
        target,
        deviation: Number(deviation.toFixed(2)),
        action: deviation > 0 ? 'REDUCE' : 'INCREASE',
        amountToRebalance: Number(amountToRebalance.toFixed(2)),
      });
    }
  });

  // Sort by absolute deviation (largest first)
  deviations.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  // Find overweight assets
  const overweightAssets = holdings
    .filter(h => {
      const allocation = parseFloat(h.allocation);
      return allocation > 25; // More than 25% in single asset
    })
    .map(h => ({
      symbol: h.symbol,
      allocation: h.allocation,
      value: h.value,
    }));

  return `
REBALANCING ANALYSIS:

Current Allocation by Asset Type:
${Object.entries(allocationByType).map(([type, alloc]) => 
  `- ${type}: ${Number(alloc).toFixed(2)}% (Target: ${targets[type] || 'N/A'}%)`
).join('\n')}

Recommended Adjustments:
${deviations.length > 0 
  ? deviations.map(d => 
      `- ${d.type}: ${d.action} by ${Math.abs(d.deviation)}% (~${d.amountToRebalance.toLocaleString()} ${context.currency})`
    ).join('\n')
  : '- Portfolio is well-balanced within tolerance thresholds.'}

Concentration Warnings:
${overweightAssets.length > 0
  ? overweightAssets.map(a => 
      `- ${a.symbol}: ${a.allocation} allocation (consider diversifying)`
    ).join('\n')
  : '- No single-asset concentration issues detected.'}

Total Portfolio Value: ${totalPortfolioValue.toLocaleString()} ${context.currency}
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, portfolioContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const rebalancingAnalysis = portfolioContext 
      ? generateRebalancingAnalysis(portfolioContext as PortfolioContext)
      : '';

    const systemPrompt = `You are an AI investment advisor assistant for a portfolio management application. Your role is to provide helpful, educational investment insights based on the user's portfolio data.

PORTFOLIO CONTEXT:
${portfolioContext ? JSON.stringify(portfolioContext, null, 2) : 'No portfolio data available'}

${rebalancingAnalysis}

GUIDELINES:
- Provide actionable insights based on the portfolio data
- When discussing rebalancing, use the REBALANCING ANALYSIS section above
- Explain investment concepts in simple terms
- Suggest diversification strategies when relevant based on concentration warnings
- Discuss risk management principles
- For rebalancing questions, provide specific recommendations with amounts
- Never give specific buy/sell recommendations or guaranteed returns
- Always remind users to do their own research and consult financial advisors for major decisions
- Be encouraging and educational
- Use Bahasa Indonesia if the user writes in Indonesian
- Format responses with clear sections when appropriate
- Keep responses concise but informative`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Portfolio insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
