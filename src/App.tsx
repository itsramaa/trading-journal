import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import AssetDetail from "./pages/AssetDetail";

// Accounts Page (Base feature)
import Accounts from "./pages/Accounts";

// Financial Freedom Pages
import FFProgress from "./pages/financial-freedom/FFProgress";
import FireCalculator from "./pages/financial-freedom/FireCalculator";
import Budget from "./pages/financial-freedom/Budget";
import DebtPayoff from "./pages/financial-freedom/DebtPayoff";
import EmergencyFund from "./pages/financial-freedom/EmergencyFund";
import Goals from "./pages/financial-freedom/Goals";


// Trading Journey Pages
import TradingSummary from "./pages/trading-journey/TradingSummary";
import TradingJournal from "./pages/trading-journey/TradingJournal";
import TradingSessions from "./pages/trading-journey/TradingSessions";
import Performance from "./pages/trading-journey/Performance";
import StrategyManagement from "./pages/trading-journey/StrategyManagement";
import Insights from "./pages/trading-journey/Insights";

// Other Pages
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
            
            {/* Protected routes - Free tier */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/accounts" element={
              <ProtectedRoute requiredFeature={FEATURES.ACCOUNTS_VIEW}>
                <Accounts />
              </ProtectedRoute>
            } />
            <Route path="/portfolio" element={
              <ProtectedRoute requiredFeature={FEATURES.PORTFOLIO_VIEW}>
                <Portfolio />
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={
              <ProtectedRoute requiredFeature={FEATURES.TRANSACTIONS_VIEW}>
                <Transactions />
              </ProtectedRoute>
            } />
            <Route path="/asset/:symbol" element={
              <ProtectedRoute requiredFeature={FEATURES.PORTFOLIO_VIEW}>
                <AssetDetail />
              </ProtectedRoute>
            } />
            
            {/* Protected routes - Pro tier (Analytics) */}
            <Route path="/analytics" element={
              <ProtectedRoute requiredFeature={FEATURES.ANALYTICS_ADVANCED} requiredTier="pro">
                <Analytics />
              </ProtectedRoute>
            } />
            
            {/* Protected routes - Pro tier (Financial Freedom) */}
            <Route path="/ff" element={
              <ProtectedRoute requiredFeature={FEATURES.FIRE_CALCULATOR} requiredTier="pro">
                <FFProgress />
              </ProtectedRoute>
            } />
            <Route path="/ff/fire-calculator" element={
              <ProtectedRoute requiredFeature={FEATURES.FIRE_CALCULATOR} requiredTier="pro">
                <FireCalculator />
              </ProtectedRoute>
            } />
            <Route path="/ff/budget" element={
              <ProtectedRoute requiredFeature={FEATURES.FIRE_BUDGET} requiredTier="pro">
                <Budget />
              </ProtectedRoute>
            } />
            <Route path="/ff/debt" element={
              <ProtectedRoute requiredFeature={FEATURES.FIRE_GOALS} requiredTier="pro">
                <DebtPayoff />
              </ProtectedRoute>
            } />
            <Route path="/ff/emergency" element={
              <ProtectedRoute requiredFeature={FEATURES.FIRE_GOALS} requiredTier="pro">
                <EmergencyFund />
              </ProtectedRoute>
            } />
            <Route path="/ff/goals" element={
              <ProtectedRoute requiredFeature={FEATURES.FIRE_GOALS} requiredTier="pro">
                <Goals />
              </ProtectedRoute>
            } />
            
            {/* Protected routes - Pro tier (Trading Journey) */}
            <Route path="/trading" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL} requiredTier="pro">
                <TradingSummary />
              </ProtectedRoute>
            } />
            <Route path="/trading/journal" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL} requiredTier="pro">
                <TradingJournal />
              </ProtectedRoute>
            } />
            <Route path="/trading/sessions" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_SESSIONS} requiredTier="pro">
                <TradingSessions />
              </ProtectedRoute>
            } />
            <Route path="/trading/performance" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL} requiredTier="pro">
                <Performance />
              </ProtectedRoute>
            } />
            <Route path="/trading/strategies" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_JOURNAL} requiredTier="pro">
                <StrategyManagement />
              </ProtectedRoute>
            } />
            <Route path="/trading/insights" element={
              <ProtectedRoute requiredFeature={FEATURES.TRADING_AI_ANALYSIS} requiredTier="pro">
                <Insights />
              </ProtectedRoute>
            } />
            
            {/* Settings & Account - Free tier (always accessible) */}
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
