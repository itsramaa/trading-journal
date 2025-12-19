import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { StrategySelector, StrategyFilter } from "@/components/trading/StrategySelector";
import { OnboardingTooltip, QuickTip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Plus, Calendar, Tag, Target, Building2, TrendingUp, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { 
  demoTrades, 
  demoStrategies, 
  filterTradesByDateRange, 
  getTradeStrategies,
  Trade,
  Strategy 
} from "@/lib/trading-data";
import { useAccounts } from "@/hooks/use-accounts";
import { formatCurrency } from "@/lib/formatters";

const tradingOnboardingSteps = [
  {
    id: "welcome",
    title: "Welcome to Trading Journal",
    description: "Document every trade to learn from your wins and losses. Consistency is key to improvement.",
  },
  {
    id: "accounts",
    title: "Link Trading Accounts",
    description: "Connect your broker accounts to track PnL automatically and keep accurate records.",
  },
  {
    id: "strategies",
    title: "Tag Your Strategies",
    description: "Use strategy tags to analyze which setups work best for you over time.",
  },
  {
    id: "confluence",
    title: "Rate Your Confluence",
    description: "Score each trade's confluence (1-10) to understand when you have the highest edge.",
  },
];

export default function TradingJournal() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [newTradeStrategies, setNewTradeStrategies] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>(demoStrategies);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const { data: accounts, isLoading: accountsLoading } = useAccounts();

  // Filter accounts suitable for trading (broker type)
  const tradingAccounts = accounts?.filter(a => 
    a.is_active && (a.account_type === 'broker' || a.account_type === 'soft_wallet')
  );

  const filteredTrades = useMemo(() => {
    let trades = filterTradesByDateRange(demoTrades, dateRange.from, dateRange.to);
    
    if (selectedStrategyIds.length > 0) {
      trades = trades.filter(trade => 
        trade.strategyIds.some(id => selectedStrategyIds.includes(id))
      );
    }
    
    return trades;
  }, [dateRange, selectedStrategyIds]);

  const formatCurrencyLocal = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  const handleAddStrategy = (strategyData: Omit<Strategy, 'id' | 'createdAt'>) => {
    const newStrategy: Strategy = {
      ...strategyData,
      id: `s${Date.now()}`,
      createdAt: new Date(),
    };
    setStrategies(prev => [...prev, newStrategy]);
    setNewTradeStrategies(prev => [...prev, newStrategy.id]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
            <p className="text-muted-foreground">Document every trade for continuous improvement</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Trade Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Trading Account Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Trading Account
                  </Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={accountsLoading ? "Loading..." : "Select trading account"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tradingAccounts?.length === 0 && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No trading accounts found. Add a Broker or Soft Wallet account first.
                        </div>
                      )}
                      {tradingAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatCurrency(Number(account.balance), account.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    PnL will be tracked in this account
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Pair</Label><Input placeholder="BTC/USDT" /></div>
                  <div><Label>Direction</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONG">LONG</SelectItem>
                        <SelectItem value="SHORT">SHORT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date</Label><Input type="date" /></div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div><Label>Entry</Label><Input type="number" /></div>
                  <div><Label>Exit</Label><Input type="number" /></div>
                  <div><Label>Stop Loss</Label><Input type="number" /></div>
                  <div><Label>Take Profit</Label><Input type="number" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Position Size</Label><Input type="number" placeholder="1.0" /></div>
                  <div><Label>Fees</Label><Input type="number" placeholder="0.00" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Market Condition</Label><Input placeholder="Bullish, Bearish, Ranging" /></div>
                  <div><Label>Confluence Score (1-10)</Label><Input type="number" min="1" max="10" /></div>
                </div>
                
                {/* Strategy Selector */}
                <div className="space-y-2">
                  <Label>Strategies Used</Label>
                  <StrategySelector
                    selectedIds={newTradeStrategies}
                    onChange={setNewTradeStrategies}
                    strategies={strategies}
                    onAddStrategy={handleAddStrategy}
                  />
                </div>

                <div><Label>Entry Signal</Label><Input placeholder="Break of structure, FVG, Order block..." /></div>
                <div><Label>Notes</Label><Textarea placeholder="Trade analysis and lessons learned..." /></div>
              </div>
              <Button onClick={() => setIsAddOpen(false)}>Save Entry</Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Trading Accounts Summary */}
        {tradingAccounts && tradingAccounts.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">Trading Accounts</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {tradingAccounts.slice(0, 4).map((account) => (
                  <div key={account.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                    <span className="text-sm font-medium">{account.name}</span>
                    <Badge variant="secondary">
                      {formatCurrency(Number(account.balance), account.currency)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Tip - Nielsen H10 */}
        <QuickTip storageKey="trading_journal_tip" className="mb-2">
          <strong>Pro tip:</strong> Trades with confluence scores above 7 tend to have higher win rates. 
          Focus on quality setups and document your entry signals for pattern recognition.
        </QuickTip>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <StrategyFilter 
            selectedIds={selectedStrategyIds} 
            onChange={setSelectedStrategyIds}
            strategies={strategies}
          />
        </div>

        {/* Journal Entries */}
        <div className="space-y-4">
          {filteredTrades.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No trades found"
              description="No trades match your current filters. Try adjusting the date range or strategy filters, or add your first trade entry."
              action={{
                label: "Add New Entry",
                onClick: () => setIsAddOpen(true),
              }}
            />
          ) : (
            filteredTrades.map((entry) => {
              const entryStrategies = getTradeStrategies(entry);
              return (
                <Card key={entry.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Badge variant={entry.direction === "LONG" ? "default" : "secondary"}>
                          {entry.direction}
                        </Badge>
                        <span className="font-bold text-lg">{entry.pair}</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(entry.date, "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Confluence: {entry.confluence}/10</Badge>
                        <span className={`font-bold text-lg ${entry.result === "win" ? "text-green-500" : "text-red-500"}`}>
                          {entry.pnl >= 0 ? "+" : ""}{formatCurrencyLocal(entry.pnl)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Entry:</span> {entry.entry}</div>
                      <div><span className="text-muted-foreground">Exit:</span> {entry.exit}</div>
                      <div><span className="text-muted-foreground">R:R:</span> {entry.rr.toFixed(2)}:1</div>
                      <div><span className="text-muted-foreground">Market:</span> {entry.marketCondition}</div>
                    </div>
                    
                    {/* Strategies */}
                    {entryStrategies.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        {entryStrategies.map(strategy => (
                          <Badge key={strategy.id} variant="secondary">
                            {strategy.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div>
                      <span className="text-sm text-muted-foreground">Entry Signal: </span>
                      <span className="text-sm">{entry.entrySignal}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    <div className="flex gap-2 flex-wrap">
                      {entry.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
