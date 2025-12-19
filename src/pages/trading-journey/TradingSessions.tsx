import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Clock, Smile, Meh, Frown, Star, Calendar, TrendingUp, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingSessions, useCreateTradingSession, useUpdateTradingSession, useDeleteTradingSession, TradingSession, CreateSessionInput } from "@/hooks/use-trading-sessions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const moodIcons = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

const sessionFormSchema = z.object({
  session_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().optional(),
  mood: z.string().min(1, "Mood is required"),
  rating: z.coerce.number().min(1).max(5),
  trades_count: z.coerce.number().min(0),
  pnl: z.coerce.number(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  market_condition: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function TradingSessions() {
  const { data: sessions = [], isLoading } = useTradingSessions();
  const createSession = useCreateTradingSession();
  const updateSession = useUpdateTradingSession();
  const deleteSession = useDeleteTradingSession();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TradingSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<TradingSession | null>(null);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      session_date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      mood: "neutral",
      rating: 3,
      trades_count: 0,
      pnl: 0,
      tags: "",
      notes: "",
      market_condition: "",
    },
  });

  const formatCurrency = (v: number) => v >= 0 ? `+Rp${(v/1000000).toFixed(1)}jt` : `-Rp${(Math.abs(v)/1000000).toFixed(1)}jt`;

  const avgRating = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + Number(s.rating), 0) / sessions.length 
    : 0;
  const totalPnl = sessions.reduce((sum, s) => sum + Number(s.pnl), 0);
  const positiveSessions = sessions.filter(s => Number(s.pnl) > 0).length;

  const handleOpenAddDialog = () => {
    form.reset({
      session_date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      mood: "neutral",
      rating: 3,
      trades_count: 0,
      pnl: 0,
      tags: "",
      notes: "",
      market_condition: "",
    });
    setEditingSession(null);
    setIsAddOpen(true);
  };

  const handleOpenEditDialog = (session: TradingSession) => {
    form.reset({
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time || "",
      mood: session.mood,
      rating: Number(session.rating),
      trades_count: Number(session.trades_count),
      pnl: Number(session.pnl),
      tags: session.tags?.join(", ") || "",
      notes: session.notes || "",
      market_condition: session.market_condition || "",
    });
    setEditingSession(session);
    setIsAddOpen(true);
  };

  const handleSubmit = async (values: SessionFormValues) => {
    const tagsArray = values.tags 
      ? values.tags.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const sessionData: CreateSessionInput = {
      session_date: values.session_date,
      start_time: values.start_time,
      end_time: values.end_time || undefined,
      mood: values.mood,
      rating: values.rating,
      trades_count: values.trades_count,
      pnl: values.pnl,
      tags: tagsArray,
      notes: values.notes || undefined,
      market_condition: values.market_condition || undefined,
    };

    if (editingSession) {
      await updateSession.mutateAsync({
        id: editingSession.id,
        ...sessionData,
      });
    } else {
      await createSession.mutateAsync(sessionData);
    }
    setIsAddOpen(false);
    setEditingSession(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (deletingSession) {
      await deleteSession.mutateAsync(deletingSession.id);
      setDeletingSession(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <MetricsGridSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Sessions</h1>
            <p className="text-muted-foreground">Track your trading sessions with mood and performance</p>
          </div>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />New Session
          </Button>
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
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.length > 0 ? ((positiveSessions / sessions.length) * 100).toFixed(0) : 0}%
              </div>
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
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-green-500" : "text-destructive"}`}>
                {formatCurrency(totalPnl)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No trading sessions yet"
            description="Start tracking your trading sessions to analyze your performance and mood patterns."
            action={{
              label: "New Session",
              onClick: handleOpenAddDialog,
            }}
          />
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const MoodIcon = moodIcons[session.mood as keyof typeof moodIcons] || Meh;
              return (
                <Card key={session.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          session.mood === "positive" ? "bg-green-500/10" :
                          session.mood === "neutral" ? "bg-yellow-500/10" : "bg-destructive/10"
                        }`}>
                          <MoodIcon className={`h-5 w-5 ${
                            session.mood === "positive" ? "text-green-500" :
                            session.mood === "neutral" ? "text-yellow-500" : "text-destructive"
                          }`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {new Date(session.session_date).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </CardTitle>
                          <CardDescription>
                            {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5) || "ongoing"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} className={`h-4 w-4 ${n <= Number(session.rating) ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} />
                          ))}
                        </div>
                        <span className={`font-bold ${Number(session.pnl) >= 0 ? "text-green-500" : "text-destructive"}`}>
                          {formatCurrency(Number(session.pnl))}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(session)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeletingSession(session)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span><span className="text-muted-foreground">Trades:</span> {session.trades_count}</span>
                      {session.market_condition && (
                        <span><span className="text-muted-foreground">Market:</span> {session.market_condition}</span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-sm text-muted-foreground">{session.notes}</p>
                    )}
                    {session.tags && session.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {session.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add/Edit Session Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSession ? "Edit Session" : "Log Trading Session"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="session_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mood</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mood" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="positive">Positive 😊</SelectItem>
                            <SelectItem value="neutral">Neutral 😐</SelectItem>
                            <SelectItem value="negative">Negative 😞</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating (1-5)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Rate session" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1,2,3,4,5].map(n => (
                              <SelectItem key={n} value={n.toString()}>{n} Star{n > 1 ? 's' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trades_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Trades</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pnl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>P&L (IDR)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="market_condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bullish">Bullish</SelectItem>
                          <SelectItem value="Bearish">Bearish</SelectItem>
                          <SelectItem value="Trending">Trending</SelectItem>
                          <SelectItem value="Choppy">Choppy</SelectItem>
                          <SelectItem value="Ranging">Ranging</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="focused, patient, disciplined..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Session reflection..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSession.isPending || updateSession.isPending}>
                    {(createSession.isPending || updateSession.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingSession ? "Save Changes" : "Save Session"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingSession}
          onOpenChange={() => setDeletingSession(null)}
          title="Delete Session"
          description={`Are you sure you want to delete this trading session from ${deletingSession?.session_date}? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          variant="destructive"
        />
      </div>
    </DashboardLayout>
  );
}
