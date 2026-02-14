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
import { ProtectedDashboardLayout } from "./components/layout/ProtectedDashboardLayout";
import { MarketContextProvider } from "./contexts/MarketContext";
import { SolanaWalletProvider } from "./components/wallet/SolanaWalletProvider";
import { AIChatbot } from "./components/chat/AIChatbot";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Accounts = lazy(() => import("./pages/Accounts"));
const AccountDetail = lazy(() => import("./pages/AccountDetail"));
const TradingJournal = lazy(() => import("./pages/trading-journey/TradingJournal"));
const TradeDetail = lazy(() => import("./pages/trading-journey/TradeDetail"));
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
            <Routes>
              {/* Public routes - need their own Suspense */}
              <Route path="/landing" element={<Suspense fallback={<PageLoader />}><Landing /></Suspense>} />
              <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
              
              {/* Protected routes - ProtectedDashboardLayout keeps shell mounted */}
              <Route element={<ProtectedDashboardLayout />}>
                <Route path="/" element={<Dashboard />} />
                
                {/* Market Domain */}
                <Route path="/market" element={<MarketInsight />} />
                <Route path="/calendar" element={<EconomicCalendar />} />
                <Route path="/market-data" element={<MarketData />} />
                <Route path="/top-movers" element={<TopMovers />} />
                
                {/* Journal Domain */}
                <Route path="/trading" element={<TradingJournal />} />
                <Route path="/trading/:tradeId" element={<TradeDetail />} />
                <Route path="/history" element={<TradeHistory />} />
                <Route path="/import" element={<ImportTrades />} />
                
                {/* Risk Domain */}
                <Route path="/risk" element={<RiskManagement />} />
                <Route path="/calculator" element={<PositionCalculator />} />
                
                {/* Strategy Domain */}
                <Route path="/strategies" element={<StrategyManagement />} />
                <Route path="/backtest" element={<Backtest />} />
                <Route path="/shared/strategy/:token" element={<SharedStrategy />} />
                
                {/* Analytics Domain */}
                <Route path="/performance" element={<Performance />} />
                <Route path="/daily-pnl" element={<DailyPnL />} />
                <Route path="/heatmap" element={<TradingHeatmap />} />
                <Route path="/ai-insights" element={<AIInsights />} />
                
                {/* Accounts Domain */}
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/accounts/:accountId" element={<AccountDetail />} />
                <Route path="/export" element={<BulkExport />} />
                
                {/* Settings Domain */}
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>
              
              {/* Legacy Redirects */}
              <Route path="/ai" element={<Navigate to="/trading" replace />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
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
