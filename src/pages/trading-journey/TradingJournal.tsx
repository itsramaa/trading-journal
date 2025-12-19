import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, TrendingDown, Calendar, Tag, Brain } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const journalEntries = [
  {
    id: "1",
    date: "2024-01-15",
    pair: "BTC/USDT",
    direction: "LONG",
    entry: 42500,
    exit: 43200,
    pnl: 1500000,
    rr: 2.5,
    result: "win",
    marketCondition: "Bullish",
    confluence: 8,
    entrySignal: "Break of structure + FVG",
    notes: "Perfect entry on the 4H FVG. Held through minor pullback. Exit at previous high.",
    tags: ["trend-following", "fvg", "bos"],
    mood: "confident",
  },
  {
    id: "2",
    date: "2024-01-14",
    pair: "ETH/USDT",
    direction: "SHORT",
    entry: 2280,
    exit: 2250,
    pnl: 800000,
    rr: 1.8,
    result: "win",
    marketCondition: "Ranging",
    confluence: 6,
    entrySignal: "Order block rejection",
    notes: "Took profit early due to uncertainty. Could have held for more.",
    tags: ["mean-reversion", "order-block"],
    mood: "cautious",
  },
];

export default function TradingJournal() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const formatCurrency = (v: number) => `Rp${(v/1000000).toFixed(1)}jt`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
            <p className="text-muted-foreground">Document every trade for continuous improvement</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Trade Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Pair</Label><Input placeholder="BTC/USDT" /></div>
                  <div><Label>Direction</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="LONG">LONG</SelectItem><SelectItem value="SHORT">SHORT</SelectItem></SelectContent>
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
                  <div><Label>Market Condition</Label><Input placeholder="Bullish, Bearish, Ranging" /></div>
                  <div><Label>Confluence Score (1-10)</Label><Input type="number" min="1" max="10" /></div>
                </div>
                <div><Label>Entry Signal</Label><Input placeholder="Break of structure, FVG, Order block..." /></div>
                <div><Label>Notes</Label><Textarea placeholder="Trade analysis and lessons learned..." /></div>
              </div>
              <Button onClick={() => setIsAddOpen(false)}>Save Entry</Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Journal Entries */}
        <div className="space-y-4">
          {journalEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={entry.direction === "LONG" ? "default" : "secondary"}>{entry.direction}</Badge>
                    <span className="font-bold text-lg">{entry.pair}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />{entry.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Confluence: {entry.confluence}/10</Badge>
                    <span className={`font-bold text-lg ${entry.result === "win" ? "text-green-500" : "text-red-500"}`}>
                      {entry.pnl >= 0 ? "+" : ""}{formatCurrency(entry.pnl)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Entry:</span> {entry.entry}</div>
                  <div><span className="text-muted-foreground">Exit:</span> {entry.exit}</div>
                  <div><span className="text-muted-foreground">R:R:</span> {entry.rr}:1</div>
                  <div><span className="text-muted-foreground">Market:</span> {entry.marketCondition}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Entry Signal: </span>
                  <span className="text-sm">{entry.entrySignal}</span>
                </div>
                <p className="text-sm text-muted-foreground">{entry.notes}</p>
                <div className="flex gap-2">
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
