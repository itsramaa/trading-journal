import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, fireData, budgetData, goalsData, emergencyFundData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an AI Financial Freedom Coach specializing in FIRE (Financial Independence, Retire Early) planning. Your role is to provide personalized advice on achieving financial independence.

FINANCIAL CONTEXT:
${fireData ? `
FIRE CALCULATION DATA:
- Current Age: ${fireData.currentAge || 'Not set'}
- Target Retirement Age: ${fireData.targetRetirementAge || 'Not set'}
- Current Savings: $${fireData.currentSavings?.toLocaleString() || 0}
- Monthly Expenses: $${fireData.monthlyExpenses?.toLocaleString() || 0}
- FIRE Number: $${fireData.fireNumber?.toLocaleString() || 'Not calculated'}
- Progress: ${fireData.progressPercent?.toFixed(1) || 0}%
- Years to FIRE: ${fireData.yearsToFire || 'Not calculated'}
- Withdrawal Rate: ${fireData.withdrawalRate || 4}%
- Expected Return: ${fireData.expectedReturn || 7}%
` : 'No FIRE data available'}

${budgetData ? `
BUDGET DATA:
- Total Budgeted: $${budgetData.totalBudgeted?.toLocaleString() || 0}
- Total Spent: $${budgetData.totalSpent?.toLocaleString() || 0}
- Categories: ${budgetData.categories?.map((c: any) => `${c.name}: $${c.spent}/$${c.budgeted}`).join(', ') || 'None'}
` : 'No budget data available'}

${goalsData ? `
FINANCIAL GOALS:
${goalsData.map((g: any) => `- ${g.name}: $${g.currentAmount?.toLocaleString() || 0}/$${g.targetAmount?.toLocaleString() || 0} (${g.progress?.toFixed(1) || 0}%)`).join('\n') || 'No goals set'}
` : 'No goals data available'}

${emergencyFundData ? `
EMERGENCY FUND:
- Target: ${emergencyFundData.targetMonths || 6} months of expenses
- Current: $${emergencyFundData.currentAmount?.toLocaleString() || 0}
- Target Amount: $${emergencyFundData.targetAmount?.toLocaleString() || 0}
- Progress: ${emergencyFundData.progress?.toFixed(1) || 0}%
` : 'No emergency fund data available'}

GUIDELINES:
- Provide actionable advice based on the user's financial situation
- Explain FIRE concepts clearly (Lean FIRE, Fat FIRE, Coast FIRE, Barista FIRE)
- Help with budgeting strategies and expense optimization
- Discuss savings rate importance and how to increase it
- Explain compound interest and time value of money
- Provide motivation and realistic expectations
- Suggest specific next steps the user can take
- Use Bahasa Indonesia if the user writes in Indonesian
- Be encouraging but realistic
- Never give specific investment advice or guarantee returns
- Always recommend consulting a financial advisor for major decisions`;

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
    console.error("Financial freedom insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
