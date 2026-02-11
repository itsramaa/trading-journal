import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// Pages
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import TradingJournal from "./pages/trading-journey/TradingJournal";
import TradeHistory from "./pages/TradeHistory";
import StrategyManagement from "./pages/trading-journey/StrategyManagement";
import Backtest from "./pages/Backtest";
import Performance from "./pages/Performance";
import DailyPnL from "./pages/DailyPnL";
import TradingHeatmap from "./pages/TradingHeatmap";
import AIInsights from "./pages/AIInsights";
import RiskManagement from "./pages/RiskManagement";
import PositionCalculator from "./pages/PositionCalculator";
import MarketInsight from "./pages/MarketInsight";
import EconomicCalendar from "./pages/EconomicCalendar";
import MarketData from "./pages/MarketData";
import ImportTrades from "./pages/ImportTrades";
import TopMovers from "./pages/TopMovers";
import BulkExport from "./pages/BulkExport";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import SharedStrategy from "./pages/SharedStrategy";
import NotFound from "./pages/NotFound";

// Components
import { AIChatbot } from "./components/chat/AIChatbot";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MarketContextProvider } from "./contexts/MarketContext";
import { SolanaWalletProvider } from "./components/wallet/SolanaWalletProvider";

const queryClient = new QueryClient();

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
            {/* Public routes */}
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Market Domain */}
            <Route path="/market" element={
              <ProtectedRoute>
                <MarketInsight />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <EconomicCalendar />
              </ProtectedRoute>
            } />
            <Route path="/market-data" element={
              <ProtectedRoute>
                <MarketData />
              </ProtectedRoute>
            } />
            <Route path="/top-movers" element={
              <ProtectedRoute>
                <TopMovers />
              </ProtectedRoute>
            } />
            
            {/* Journal Domain */}
            <Route path="/trading" element={
              <ProtectedRoute>
                <TradingJournal />
              </ProtectedRoute>
            } />
            {/* History Page - Standalone */}
            <Route path="/history" element={
              <ProtectedRoute>
                <TradeHistory />
              </ProtectedRoute>
            } />
            <Route path="/import" element={
              <ProtectedRoute>
                <ImportTrades />
              </ProtectedRoute>
            } />
            
            {/* Risk Domain */}
            <Route path="/risk" element={
              <ProtectedRoute>
                <RiskManagement />
              </ProtectedRoute>
            } />
            <Route path="/calculator" element={
              <ProtectedRoute>
                <PositionCalculator />
              </ProtectedRoute>
            } />
            
            {/* Strategy Domain */}
            <Route path="/strategies" element={
              <ProtectedRoute>
                <StrategyManagement />
              </ProtectedRoute>
            } />
            <Route path="/backtest" element={
              <ProtectedRoute>
                <Backtest />
              </ProtectedRoute>
            } />
            {/* Shared Strategy - requires auth but accessed via share link */}
            <Route path="/shared/strategy/:token" element={
              <ProtectedRoute>
                <SharedStrategy />
              </ProtectedRoute>
            } />
            
            {/* Analytics Domain */}
            <Route path="/performance" element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            } />
            <Route path="/daily-pnl" element={
              <ProtectedRoute>
                <DailyPnL />
              </ProtectedRoute>
            } />
            <Route path="/heatmap" element={
              <ProtectedRoute>
                <TradingHeatmap />
              </ProtectedRoute>
            } />
            <Route path="/ai-insights" element={
              <ProtectedRoute>
                <AIInsights />
              </ProtectedRoute>
            } />
            
            {/* Accounts Domain */}
            <Route path="/accounts" element={
              <ProtectedRoute>
                <Accounts />
              </ProtectedRoute>
            } />
            <Route path="/accounts/:accountId" element={
              <ProtectedRoute>
                <AccountDetail />
              </ProtectedRoute>
            } />
            <Route path="/export" element={
              <ProtectedRoute>
                <BulkExport />
              </ProtectedRoute>
            } />
            
            {/* Settings Domain */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            
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
);

export default App;
