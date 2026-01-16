import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Accounts Page (Base feature)
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";

// Trading Journey Pages
import TradingSummary from "./pages/trading-journey/TradingSummary";
import TradingJournal from "./pages/trading-journey/TradingJournal";
import TradingSessions from "./pages/trading-journey/TradingSessions";
import SessionDetail from "./pages/trading-journey/SessionDetail";
import Performance from "./pages/trading-journey/Performance";
import StrategyManagement from "./pages/trading-journey/StrategyManagement";
import Insights from "./pages/trading-journey/Insights";

// Other Pages
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Upgrade from "./pages/Upgrade";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

// Components
import { AIChatbot } from "./components/chat/AIChatbot";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FEATURES } from "./hooks/use-permissions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes - Dashboard redirects to Trading Summary */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Accounts */}
            <Route path="/accounts" element={
              <ProtectedRoute requiredFeature={FEATURES.ACCOUNTS_VIEW}>
                <Accounts />
              </ProtectedRoute>
            } />
            <Route path="/accounts/:accountId" element={
              <ProtectedRoute requiredFeature={FEATURES.ACCOUNTS_VIEW}>
                <AccountDetail />
              </ProtectedRoute>
            } />
            
            {/* Trading Journey */}
            <Route path="/trading" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL}>
                <TradingSummary />
              </ProtectedRoute>
            } />
            <Route path="/trading/journal" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL}>
                <TradingJournal />
              </ProtectedRoute>
            } />
            <Route path="/trading/sessions" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_SESSIONS}>
                <TradingSessions />
              </ProtectedRoute>
            } />
            <Route path="/trading/sessions/:sessionId" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_SESSIONS}>
                <SessionDetail />
              </ProtectedRoute>
            } />
            <Route path="/trading/performance" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL}>
                <Performance />
              </ProtectedRoute>
            } />
            <Route path="/trading/strategies" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL}>
                <StrategyManagement />
              </ProtectedRoute>
            } />
            <Route path="/trading/insights" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_AI_ANALYSIS}>
                <Insights />
              </ProtectedRoute>
            } />
            
            {/* Settings & Account */}
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            } />
            <Route path="/upgrade" element={
              <ProtectedRoute>
                <Upgrade />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredFeature={FEATURES.ADMIN_USERS}>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requiredFeature={FEATURES.ADMIN_USERS}>
                <Admin />
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
