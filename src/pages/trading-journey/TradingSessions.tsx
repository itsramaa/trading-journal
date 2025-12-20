import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Clock, Smile, Meh, Frown, Star, Calendar, TrendingUp, MoreHorizontal, Edit, Trash2, Loader2, Brain, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingSessions, useCreateTradingSession, useUpdateTradingSession, useDeleteTradingSession, TradingSessionWithStats, CreateSessionInput } from "@/hooks/use-trading-sessions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SessionAIAnalysis } from "@/components/trading/SessionAIAnalysis";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";

const moodIcons = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

const sessionFormSchema = z.object({
  session_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  duration: z.string().min(1, "Duration is required"),
  mood: z.string().min(1, "Mood is required"),
  tags: z.string().optional(),
  notes: z.string().optional(),
  market_condition: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function TradingSessions() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useTradingSessions();
  const createSession = useCreateTradingSession();
  const updateSession = useUpdateTradingSession();
  const deleteSession = useDeleteTradingSession();
  const { data: userSettings } = useUserSettings();
  const { data: exchangeRate = 15500 } = useExchangeRate();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TradingSessionWithStats | null>(null);
  const [deletingSession, setDeletingSession] = useState<TradingSessionWithStats | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const defaultCurrency = userSettings?.default_currency || 'USD';

  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      session_date: new Date().toISOString().split("T")[0],
      start_time: getCurrentTime(),
      duration: "1",
      mood: "neutral",
      tags: "",
      notes: "",
      market_condition: "",
    },
  });

  // Currency conversion helper
  const convertCurrency = (value: number) => {
    if (defaultCurrency === 'IDR') {
      return value * exchangeRate;
    }
    return value;
  };

  const formatCurrency = (v: number) => formatCurrencyUtil(convertCurrency(v), defaultCurrency);

  const avgRating = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + Number(s.rating), 0) / sessions.length 
    : 0;
  // Use calculated P&L from linked trades
  const totalPnl = sessions.reduce((sum, s) => sum + (s.calculated_pnl || 0), 0);
  const positiveSessions = sessions.filter(s => (s.calculated_pnl || 0) > 0).length;
  const totalTrades = sessions.reduce((sum, s) => sum + (s.calculated_trades_count || 0), 0);

  const handleOpenAddDialog = () => {
    form.reset({
      session_date: new Date().toISOString().split("T")[0],
      start_time: getCurrentTime(),
      duration: "1",
      mood: "neutral",
      tags: "",
      notes: "",
      market_condition: "",
    });
    setEditingSession(null);
    setIsAddOpen(true);
  };

  const handleOpenEditDialog = (session: TradingSessionWithStats) => {
    // Calculate duration from start/end time if available
    let duration = "1";
    if (session.start_time && session.end_time) {
      const [startH] = session.start_time.split(':').map(Number);
      const [endH] = session.end_time.split(':').map(Number);
      const diff = endH - startH;
      if (diff >= 1 && diff <= 3) duration = String(diff);
    }
    
    form.reset({
      session_date: session.session_date,
      start_time: session.start_time,
      duration,
      mood: session.mood,
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

    // Calculate end_time from start_time + duration
    const [startH, startM] = values.start_time.split(':').map(Number);
    const durationHours = parseInt(values.duration, 10);
    const endH = (startH + durationHours) % 24;
    const end_time = `${endH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;

    const sessionData: CreateSessionInput = {
      session_date: values.session_date,
      start_time: values.start_time,
      end_time,
      mood: values.mood,
      rating: 3, // Default rating, user rates after session
      tags: tagsArray,
      notes: values.notes || undefined,
      market_condition: values.market_condition || undefined,
    };

    if (editingSession) {
      await updateSession.mutateAsync({
        id: editingSession.id,
        ...sessionData,
      });
      setIsAddOpen(false);
      setEditingSession(null);
      form.reset();
    } else {
      const newSession = await createSession.mutateAsync(sessionData);
      setIsAddOpen(false);
      setEditingSession(null);
      form.reset();
      // Navigate to the new session detail page
      if (newSession?.id) {
        navigate(`/trading/sessions/${newSession.id}`);
      }
    }
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
            <p className="text-muted-foreground">Track your trading sessions - trades and P&L are auto-calculated from linked journal entries</p>
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
              <p className="text-xs text-muted-foreground">{totalTrades} total trades</p>
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
              <p className="text-xs text-muted-foreground">From linked trades</p>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No trading sessions yet"
            description="Start tracking your trading sessions. Link trades from the Journal to auto-calculate performance."
            action={{
              label: "New Session",
              onClick: handleOpenAddDialog,
            }}
          />
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const MoodIcon = moodIcons[session.mood as keyof typeof moodIcons] || Meh;
              const sessionPnl = session.calculated_pnl || 0;
              const sessionTrades = session.calculated_trades_count || 0;
              
              return (
                <Collapsible
                  key={session.id}
                  open={expandedSessionId === session.id}
                  onOpenChange={(open) => setExpandedSessionId(open ? session.id : null)}
                >
                  <Card>
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
                            <button 
                              key={n} 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSession.mutate({ id: session.id, rating: n });
                              }}
                              className="hover:scale-110 transition-transform"
                            >
                              <Star className={`h-4 w-4 ${n <= Number(session.rating) ? "text-yellow-500 fill-yellow-500" : "text-muted hover:text-yellow-400"}`} />
                            </button>
                          ))}
                        </div>
                          <span className={`font-bold ${sessionPnl >= 0 ? "text-green-500" : "text-destructive"}`}>
                            {formatCurrency(sessionPnl)}
                          </span>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Brain className="h-4 w-4 text-primary" />
                            </Button>
                          </CollapsibleTrigger>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/trading/sessions/${session.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
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
                        <span>
                          <span className="text-muted-foreground">Trades:</span>{" "}
                          <span className="font-medium">{sessionTrades}</span>
                          {sessionTrades === 0 && (
                            <span className="text-muted-foreground text-xs ml-1">(link trades in Journal)</span>
                          )}
                        </span>
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
                      
                      {/* AI Analysis Panel */}
                      <CollapsibleContent className="pt-4">
                        <SessionAIAnalysis session={session} />
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
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
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 Hour</SelectItem>
                            <SelectItem value="2">2 Hours</SelectItem>
                            <SelectItem value="3">3 Hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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

                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <strong>Note:</strong> Number of trades and P&L are automatically calculated from journal entries linked to this session.
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
