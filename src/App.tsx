import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";

// Pages
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import TradingJournal from "./pages/trading-journey/TradingJournal";
import StrategyManagement from "./pages/trading-journey/StrategyManagement";
import Performance from "./pages/Performance";
import RiskManagement from "./pages/RiskManagement";
import Calendar from "./pages/Calendar";
import MarketInsight from "./pages/MarketInsight";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Components
import { AIChatbot } from "./components/chat/AIChatbot";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageViewTracker />
          <SessionTracker />
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Accounts */}
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
            
            {/* Trade Management */}
            <Route path="/trading" element={
              <ProtectedRoute>
                <TradingJournal />
              </ProtectedRoute>
            } />
            
            {/* Strategy & Rules (top-level) */}
            <Route path="/strategies" element={
              <ProtectedRoute>
                <StrategyManagement />
              </ProtectedRoute>
            } />
            
            {/* Performance (consolidated analytics hub) */}
            <Route path="/performance" element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            } />
            
            {/* Risk Management */}
            <Route path="/risk" element={
              <ProtectedRoute>
                <RiskManagement />
              </ProtectedRoute>
            } />
            
            {/* Calendar */}
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            
            {/* Market Insight */}
            <Route path="/market" element={
              <ProtectedRoute>
                <MarketInsight />
              </ProtectedRoute>
            } />
            
            {/* AI Assistant */}
            <Route path="/ai" element={
              <ProtectedRoute>
                <AIAssistant />
              </ProtectedRoute>
            } />
            
            {/* Settings */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatbot />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
