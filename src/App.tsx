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
import Insights from "./pages/trading-journey/Insights";

// Other Pages
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Upgrade from "./pages/Upgrade";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Components
import { AIChatbot } from "./components/chat/AIChatbot";

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
            
            {/* General Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/accounts" element={<Accounts />} />
            
            {/* Portfolio Management Routes */}
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/asset/:symbol" element={<AssetDetail />} />
            
            {/* Financial Freedom Routes */}
            <Route path="/ff" element={<FFProgress />} />
            <Route path="/ff/fire-calculator" element={<FireCalculator />} />
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
            
            {/* Settings & Account */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/notifications" element={<Notifications />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatbot />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
