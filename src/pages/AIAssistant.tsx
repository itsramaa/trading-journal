/**
 * Trade Quality Checker Page
 * AI-powered trade setup validator - consolidated from AI Assistant
 */
import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Target, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { useAITradeQuality } from "@/features/ai/useAITradeQuality";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { cn } from "@/lib/utils";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

const AIAssistant = () => {
  // Trade Quality Checker state
  const [checkerPair, setCheckerPair] = useState("");
  const [checkerDirection, setCheckerDirection] = useState<"LONG" | "SHORT">("LONG");
  const [checkerEntry, setCheckerEntry] = useState("");
  const [checkerSL, setCheckerSL] = useState("");
  const [checkerTP, setCheckerTP] = useState("");
  const [checkerTimeframe, setCheckerTimeframe] = useState("1h");
  const { getQualityScore, isLoading: qualityLoading, result: qualityResult, reset: resetQuality } = useAITradeQuality();

  // Track when AI result is received
  useEffect(() => {
    if (qualityResult) {
      trackEvent(ANALYTICS_EVENTS.AI_INSIGHT_VIEW, {
        score: qualityResult.score,
        recommendation: qualityResult.recommendation,
        pair: checkerPair,
        confidence: qualityResult.confidence,
      });
    }
  }, [qualityResult, checkerPair]);

  const handleCheckQuality = async () => {
    const entryPrice = parseFloat(checkerEntry);
    const stopLoss = parseFloat(checkerSL);
    const takeProfit = parseFloat(checkerTP);

    if (!entryPrice || !stopLoss || !takeProfit) return;

    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    const rr = risk > 0 ? reward / risk : 0;

    await getQualityScore({
      tradeSetup: {
        pair: checkerPair,
        direction: checkerDirection,
        entryPrice,
        stopLoss,
        takeProfit,
        timeframe: checkerTimeframe,
        rr,
      },
      confluenceData: {
        confluences_detected: 3,
        confluences_required: 4,
        overall_confidence: 70,
        verdict: "PROCEED",
      },
      positionSizing: {
        position_size: 0.1,
        risk_amount: 100,
        risk_percent: 2,
        capital_deployment_percent: 10,
      },
      emotionalState: "calm",
      confidenceLevel: 7,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Trade Quality Checker
          </h1>
          <p className="text-muted-foreground">
            AI-powered trade setup validator — get quality scores before you trade
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Trade Setup</CardTitle>
              </div>
              <CardDescription>
                Enter your trade setup to get an AI quality score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trading Pair</Label>
                  <TradingPairCombobox
                    value={checkerPair}
                    onValueChange={setCheckerPair}
                    placeholder="Select pair..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={checkerDirection === "LONG" ? "default" : "outline"}
                      className={cn(checkerDirection === "LONG" && "bg-profit hover:bg-profit/90")}
                      onClick={() => setCheckerDirection("LONG")}
                      size="sm"
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      LONG
                    </Button>
                    <Button
                      type="button"
                      variant={checkerDirection === "SHORT" ? "default" : "outline"}
                      className={cn(checkerDirection === "SHORT" && "bg-loss hover:bg-loss/90")}
                      onClick={() => setCheckerDirection("SHORT")}
                      size="sm"
                    >
                      <TrendingDown className="h-4 w-4 mr-1" />
                      SHORT
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Entry Price</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={checkerEntry}
                    onChange={(e) => setCheckerEntry(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-loss">Stop Loss</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={checkerSL}
                    onChange={(e) => setCheckerSL(e.target.value)}
                    className="border-loss/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-profit">Take Profit</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={checkerTP}
                    onChange={(e) => setCheckerTP(e.target.value)}
                    className="border-profit/30"
                  />
                </div>
              </div>

              {/* Real-time R:R Preview */}
              {checkerEntry && checkerSL && checkerTP && (
                <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Calculated R:R Ratio</span>
                  <Badge variant="outline" className="text-base font-semibold">
                    {(() => {
                      const entry = parseFloat(checkerEntry);
                      const sl = parseFloat(checkerSL);
                      const tp = parseFloat(checkerTP);
                      if (!entry || !sl || !tp) return "—";
                      const risk = Math.abs(entry - sl);
                      const reward = Math.abs(tp - entry);
                      const rr = risk > 0 ? (reward / risk).toFixed(2) : "0";
                      return `1:${rr}`;
                    })()}
                  </Badge>
                </div>
              )}

              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Select value={checkerTimeframe} onValueChange={setCheckerTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCheckQuality} 
                disabled={qualityLoading || !checkerPair || !checkerEntry || !checkerSL || !checkerTP}
                className="w-full"
              >
                {qualityLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Check Trade Quality
                  </>
                )}
              </Button>

              {/* Results Section - Shows inline */}
              {qualityResult && (
                <div className="border-t pt-6 mt-6 space-y-6">
                  {/* Score Display */}
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className={cn(
                        "text-5xl font-bold",
                        qualityResult.score >= 8 && "text-profit",
                        qualityResult.score >= 6 && qualityResult.score < 8 && "text-yellow-500",
                        qualityResult.score < 6 && "text-loss"
                      )}>
                        {qualityResult.score}/10
                      </div>
                      <InfoTooltip 
                        content="Quality Score 1-10 berdasarkan setup, R:R, confluence, dan risk management. 8+ = Excellent, 6-7 = Good, <6 = Perlu review."
                      />
                    </div>
                    <Badge 
                      variant={qualityResult.recommendation === "execute" ? "default" : qualityResult.recommendation === "wait" ? "secondary" : "destructive"}
                      className="text-sm uppercase"
                    >
                      {qualityResult.recommendation}
                    </Badge>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      AI Confidence: {qualityResult.confidence}%
                      <InfoTooltip 
                        content="Tingkat kepercayaan AI terhadap analisis ini. Semakin tinggi, semakin yakin AI dengan rekomendasi."
                      />
                    </p>
                  </div>

                  {/* Factors */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Key Factors</h4>
                    {qualityResult.factors?.map((factor, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        {factor.impact === 'positive' ? (
                          <CheckCircle2 className="h-4 w-4 text-profit shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-loss shrink-0 mt-0.5" />
                        )}
                        <span className="text-muted-foreground">{factor.description}</span>
                      </div>
                    ))}
                  </div>

                  {/* Reasoning */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">AI Reasoning</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {qualityResult.reasoning}
                    </p>
                  </div>

                  <Button variant="outline" className="w-full" onClick={resetQuality}>
                    Check Another Trade
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Sidebar */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Tips</CardTitle>
              </div>
              <CardDescription>How to improve trade quality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0 mt-0.5" />
                  <span>Aim for R:R ratio of 2:1 or better</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0 mt-0.5" />
                  <span>Check multiple timeframe confluence</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0 mt-0.5" />
                  <span>Validate key support/resistance levels</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0 mt-0.5" />
                  <span>Consider market session timing</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-profit shrink-0 mt-0.5" />
                  <span>Follow your strategy rules strictly</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  💡 Need to chat with AI? Click the sparkles button in the bottom-right corner for the AI chatbot.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
