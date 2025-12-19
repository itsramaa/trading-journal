import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Portfolio from "./pages/Portfolio";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import FireCalculator from "./pages/FireCalculator";
import Settings from "./pages/Settings";
import AssetDetail from "./pages/AssetDetail";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          {/* Protected routes disabled for testing */}
          <Route path="/" element={<Index />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/fire" element={<FireCalculator />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/asset/:symbol" element={<AssetDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
