import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Components
import { AIChatbot } from "./components/chat/AIChatbot";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
            
            {/* Trading Journey */}
            <Route path="/trading" element={
              <ProtectedRoute>
                <TradingSummary />
              </ProtectedRoute>
            } />
            <Route path="/trading/journal" element={
              <ProtectedRoute>
                <TradingJournal />
              </ProtectedRoute>
            } />
            <Route path="/trading/sessions" element={
              <ProtectedRoute>
                <TradingSessions />
              </ProtectedRoute>
            } />
            <Route path="/trading/sessions/:sessionId" element={
              <ProtectedRoute>
                <SessionDetail />
              </ProtectedRoute>
            } />
            <Route path="/trading/performance" element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            } />
            <Route path="/trading/strategies" element={
              <ProtectedRoute>
                <StrategyManagement />
              </ProtectedRoute>
            } />
            <Route path="/trading/insights" element={
              <ProtectedRoute>
                <Insights />
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
