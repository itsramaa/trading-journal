/**
 * AI Assistant Page - Chat interface with quick actions and Trade Quality Checker
 * Improved: Better responsive layout, stacked sidebar on mobile, quality checker tab
 */
import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Loader2, Sparkles, TrendingUp, Shield, Lightbulb, Brain, Target, MessageSquare, CheckCircle2, AlertCircle, TrendingDown } from "lucide-react";
import { useAITradeQuality } from "@/features/ai/useAITradeQuality";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your Trading AI Assistant. I can help you analyze trades, review your performance, suggest strategies, and answer questions about risk management. What would you like to discuss?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Trade Quality Checker state
  const [checkerPair, setCheckerPair] = useState("BTC/USDT");
  const [checkerDirection, setCheckerDirection] = useState<"LONG" | "SHORT">("LONG");
  const [checkerEntry, setCheckerEntry] = useState("");
  const [checkerSL, setCheckerSL] = useState("");
  const [checkerTP, setCheckerTP] = useState("");
  const [checkerTimeframe, setCheckerTimeframe] = useState("1h");
  const { getQualityScore, isLoading: qualityLoading, result: qualityResult, reset: resetQuality } = useAITradeQuality();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("trading-analysis", {
        body: { 
          message: userMessage.content,
          context: "general_assistant"
        },
      });

      if (response.error) throw response.error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data?.response || "I apologize, but I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const quickActions = [
    { label: "Analyze performance", icon: TrendingUp, prompt: "Analyze my recent trading performance and identify patterns" },
    { label: "Risk assessment", icon: Shield, prompt: "Review my current risk exposure and suggest improvements" },
    { label: "Strategy tips", icon: Lightbulb, prompt: "Based on my trading history, what strategies should I focus on?" },
    { label: "Trade quality check", icon: Target, prompt: "How can I improve the quality of my trade entries?" },
  ];

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Your intelligent trading companion for analysis and insights
          </p>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Quality Checker</span>
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>

            {/* Chat Area */}
            <div className="grid gap-6 lg:grid-cols-4">
              <Card className="lg:col-span-3 flex flex-col h-[calc(100vh-24rem)]">
                <CardHeader className="pb-2 shrink-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Trading Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-4 pt-0 min-h-0">
                  <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                    <div className="space-y-4 pb-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {message.role === "assistant" && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 max-w-[80%] ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-50 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          {message.role === "user" && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3 justify-start">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="rounded-lg px-4 py-2 bg-muted">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2 pt-4 border-t shrink-0">
                    <Input
                      placeholder="Ask about your trades, strategies, or risk management..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar - AI Capabilities */}
              <div className="space-y-4 lg:block">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      AI Capabilities
                    </CardTitle>
                    <CardDescription>What I can help with</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-3">
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>Performance analysis & pattern recognition</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>Risk assessment & position sizing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>Strategy optimization tips</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>Trade quality scoring</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>Market sentiment insights</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="hidden lg:block">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Tips for Better Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs text-muted-foreground space-y-2">
                      <li>• Be specific about timeframes</li>
                      <li>• Mention specific pairs or strategies</li>
                      <li>• Ask follow-up questions</li>
                      <li>• Request concrete action items</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Trade Quality Checker Tab */}
          <TabsContent value="quality" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Input Form */}
              <Card>
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
                      <Select value={checkerPair} onValueChange={setCheckerPair}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                          <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                          <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                          <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                        </SelectContent>
                      </Select>
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
                    disabled={qualityLoading || !checkerEntry || !checkerSL || !checkerTP}
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
                </CardContent>
              </Card>

              {/* Results */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">AI Analysis</CardTitle>
                  </div>
                  <CardDescription>
                    Quality score and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!qualityResult ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-muted p-4">
                          <Target className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enter a trade setup and click "Check Trade Quality" to get AI analysis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Score Display */}
                      <div className="text-center space-y-2">
                        <div className={cn(
                          "text-5xl font-bold",
                          qualityResult.score >= 8 && "text-profit",
                          qualityResult.score >= 6 && qualityResult.score < 8 && "text-yellow-500",
                          qualityResult.score < 6 && "text-loss"
                        )}>
                          {qualityResult.score}/10
                        </div>
                        <Badge 
                          variant={qualityResult.recommendation === "execute" ? "default" : qualityResult.recommendation === "wait" ? "secondary" : "destructive"}
                          className="text-sm uppercase"
                        >
                          {qualityResult.recommendation}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          AI Confidence: {qualityResult.confidence}%
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AIAssistant;
