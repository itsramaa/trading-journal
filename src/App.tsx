import { lazy, Suspense, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eagerly loaded (always needed)
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MarketContextProvider } from "./contexts/MarketContext";
import { SolanaWalletProvider } from "./components/wallet/SolanaWalletProvider";
import { AIChatbot } from "./components/chat/AIChatbot";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Accounts = lazy(() => import("./pages/Accounts"));
const AccountDetail = lazy(() => import("./pages/AccountDetail"));
const TradingJournal = lazy(() => import("./pages/trading-journey/TradingJournal"));
const TradeHistory = lazy(() => import("./pages/TradeHistory"));
const StrategyManagement = lazy(() => import("./pages/trading-journey/StrategyManagement"));
const Backtest = lazy(() => import("./pages/Backtest"));
const Performance = lazy(() => import("./pages/Performance"));
const DailyPnL = lazy(() => import("./pages/DailyPnL"));
const TradingHeatmap = lazy(() => import("./pages/TradingHeatmap"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const RiskManagement = lazy(() => import("./pages/RiskManagement"));
const PositionCalculator = lazy(() => import("./pages/PositionCalculator"));
const MarketInsight = lazy(() => import("./pages/MarketInsight"));
const EconomicCalendar = lazy(() => import("./pages/EconomicCalendar"));
const MarketData = lazy(() => import("./pages/MarketData"));
const ImportTrades = lazy(() => import("./pages/ImportTrades"));
const TopMovers = lazy(() => import("./pages/TopMovers"));
const BulkExport = lazy(() => import("./pages/BulkExport"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Auth = lazy(() => import("./pages/Auth"));
const Landing = lazy(() => import("./pages/Landing"));
const SharedStrategy = lazy(() => import("./pages/SharedStrategy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Production-grade QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min — reduce unnecessary refetches
      gcTime: 1000 * 60 * 10,   // 10 min garbage collection
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false, // prevent excessive refetch on tab switch
    },
    mutations: {
      retry: 1,
    },
  },
});

// Full-page loading spinner for Suspense
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Analytics: Page View Tracker
function PageViewTracker() {
  const location = useLocation();
  
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
      path: location.pathname,
      timestamp: Date.now(),
    });
  }, [location.pathname]);
  
  return null;
}

// Analytics: Session Tracker
function SessionTracker() {
  const sessionStartRef = useRef(Date.now());
  
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.SESSION_START, {
      timestamp: sessionStartRef.current,
    });
    
    const handleBeforeUnload = () => {
      trackEvent(ANALYTICS_EVENTS.SESSION_END, {
        timestamp: Date.now(),
        duration: Date.now() - sessionStartRef.current,
      });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <SolanaWalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MarketContextProvider>
            <PageViewTracker />
            <SessionTracker />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/landing" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                
                {/* Market Domain */}
                <Route path="/market" element={<ProtectedRoute><MarketInsight /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><EconomicCalendar /></ProtectedRoute>} />
                <Route path="/market-data" element={<ProtectedRoute><MarketData /></ProtectedRoute>} />
                <Route path="/top-movers" element={<ProtectedRoute><TopMovers /></ProtectedRoute>} />
                
                {/* Journal Domain */}
                <Route path="/trading" element={<ProtectedRoute><TradingJournal /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><TradeHistory /></ProtectedRoute>} />
                <Route path="/import" element={<ProtectedRoute><ImportTrades /></ProtectedRoute>} />
                
                {/* Risk Domain */}
                <Route path="/risk" element={<ProtectedRoute><RiskManagement /></ProtectedRoute>} />
                <Route path="/calculator" element={<ProtectedRoute><PositionCalculator /></ProtectedRoute>} />
                
                {/* Strategy Domain */}
                <Route path="/strategies" element={<ProtectedRoute><StrategyManagement /></ProtectedRoute>} />
                <Route path="/backtest" element={<ProtectedRoute><Backtest /></ProtectedRoute>} />
                <Route path="/shared/strategy/:token" element={<ProtectedRoute><SharedStrategy /></ProtectedRoute>} />
                
                {/* Analytics Domain */}
                <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                <Route path="/daily-pnl" element={<ProtectedRoute><DailyPnL /></ProtectedRoute>} />
                <Route path="/heatmap" element={<ProtectedRoute><TradingHeatmap /></ProtectedRoute>} />
                <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
                
                {/* Accounts Domain */}
                <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
                <Route path="/accounts/:accountId" element={<ProtectedRoute><AccountDetail /></ProtectedRoute>} />
                <Route path="/export" element={<ProtectedRoute><BulkExport /></ProtectedRoute>} />
                
                {/* Settings Domain */}
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                
                {/* Legacy Redirects */}
                <Route path="/ai" element={<Navigate to="/trading" replace />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <AIChatbot />
            </MarketContextProvider>
          </BrowserRouter>
        </TooltipProvider>
        </SolanaWalletProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
