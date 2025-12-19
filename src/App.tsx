import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Portfolio Management Pages
import Index from "./pages/Index";
import Portfolio from "./pages/Portfolio";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import AssetDetail from "./pages/AssetDetail";

// Financial Freedom Pages
import FFDashboard from "./pages/financial-freedom/FFDashboard";
import Budget from "./pages/financial-freedom/Budget";
import DebtPayoff from "./pages/financial-freedom/DebtPayoff";
import EmergencyFund from "./pages/financial-freedom/EmergencyFund";
import Goals from "./pages/financial-freedom/Goals";

// Portfolio Management (Circle of Competence) Pages
import PMDashboard from "./pages/portfolio-management/PMDashboard";
import LearningPath from "./pages/portfolio-management/LearningPath";

// Trading Journey Pages
import TradingSummary from "./pages/trading-journey/TradingSummary";
import TradingJournal from "./pages/trading-journey/TradingJournal";
import TradingSessions from "./pages/trading-journey/TradingSessions";
import Performance from "./pages/trading-journey/Performance";
import Insights from "./pages/trading-journey/Insights";

// Other Pages
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* Portfolio Management Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/asset/:symbol" element={<AssetDetail />} />
            <Route path="/competence" element={<PMDashboard />} />
            <Route path="/learning" element={<LearningPath />} />
            
            {/* Financial Freedom Routes */}
            <Route path="/ff" element={<FFDashboard />} />
            <Route path="/ff/budget" element={<Budget />} />
            <Route path="/ff/debt" element={<DebtPayoff />} />
            <Route path="/ff/emergency" element={<EmergencyFund />} />
            <Route path="/ff/goals" element={<Goals />} />
            
            {/* Trading Journey Routes */}
            <Route path="/trading" element={<TradingSummary />} />
            <Route path="/trading/journal" element={<TradingJournal />} />
            <Route path="/trading/sessions" element={<TradingSessions />} />
            <Route path="/trading/performance" element={<Performance />} />
            <Route path="/trading/insights" element={<Insights />} />
            
            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
