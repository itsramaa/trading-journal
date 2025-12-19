import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Clock, Smile, Meh, Frown, Star, Calendar, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const moodIcons = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

const sessions = [
  {
    id: "1",
    date: "2024-01-15",
    startTime: "09:00",
    endTime: "12:00",
    mood: "positive",
    trades: 5,
    pnl: 2500000,
    rating: 4,
    tags: ["focused", "patient", "trend-following"],
    notes: "Great session. Followed my plan perfectly. Waited for high-confluence setups.",
    marketCondition: "Bullish",
  },
  {
    id: "2",
    date: "2024-01-14",
    startTime: "14:00",
    endTime: "18:00",
    mood: "neutral",
    trades: 8,
    pnl: -500000,
    rating: 2,
    tags: ["overtrading", "revenge-trading"],
    notes: "Started well but revenge traded after first loss. Need to stick to rules.",
    marketCondition: "Choppy",
  },
  {
    id: "3",
    date: "2024-01-13",
    startTime: "20:00",
    endTime: "23:00",
    mood: "positive",
    trades: 3,
    pnl: 1800000,
    rating: 5,
    tags: ["patient", "disciplined"],
    notes: "Perfect execution. Only took A+ setups. Best session this week.",
    marketCondition: "Trending",
  },
];

export default function TradingSessions() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const formatCurrency = (v: number) => v >= 0 ? `+Rp${(v/1000000).toFixed(1)}jt` : `-Rp${(Math.abs(v)/1000000).toFixed(1)}jt`;

  const avgRating = sessions.reduce((sum, s) => sum + s.rating, 0) / sessions.length;
  const totalPnl = sessions.reduce((sum, s) => sum + s.pnl, 0);
  const positiveSessions = sessions.filter(s => s.pnl > 0).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Sessions</h1>
            <p className="text-muted-foreground">Track your trading sessions with mood and performance</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Trading Session</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Date</Label><Input type="date" /></div>
                  <div><Label>Start Time</Label><Input type="time" /></div>
                  <div><Label>End Time</Label><Input type="time" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mood</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select mood" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive 😊</SelectItem>
                        <SelectItem value="neutral">Neutral 😐</SelectItem>
                        <SelectItem value="negative">Negative 😞</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rating (1-5)</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Rate session" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n} Star{n > 1 ? 's' : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Number of Trades</Label><Input type="number" /></div>
                  <div><Label>P&L (IDR)</Label><Input type="number" /></div>
                </div>
                <div><Label>Tags</Label><Input placeholder="focused, patient, disciplined..." /></div>
                <div><Label>Notes</Label><Textarea placeholder="Session reflection..." /></div>
              </div>
              <Button onClick={() => setIsAddOpen(false)}>Save Session</Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((positiveSessions / sessions.length) * 100).toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">{positiveSessions} profitable sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating.toFixed(1)}/5</div>
              <Progress value={avgRating * 20} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(totalPnl)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.map((session) => {
            const MoodIcon = moodIcons[session.mood as keyof typeof moodIcons];
            return (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        session.mood === "positive" ? "bg-green-500/10" :
                        session.mood === "neutral" ? "bg-yellow-500/10" : "bg-red-500/10"
                      }`}>
                        <MoodIcon className={`h-5 w-5 ${
                          session.mood === "positive" ? "text-green-500" :
                          session.mood === "neutral" ? "text-yellow-500" : "text-red-500"
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{session.date}</CardTitle>
                        <CardDescription>{session.startTime} - {session.endTime}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`h-4 w-4 ${n <= session.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
                        ))}
                      </div>
                      <span className={`font-bold ${session.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(session.pnl)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span><span className="text-muted-foreground">Trades:</span> {session.trades}</span>
                    <span><span className="text-muted-foreground">Market:</span> {session.marketCondition}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{session.notes}</p>
                  <div className="flex gap-2">
                    {session.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
