/**
 * AI Insights Page - Standalone page for AI pattern insights
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Brain } from "lucide-react";
import { AIPatternInsights } from "@/components/analytics/AIPatternInsights";
import { CryptoRanking } from "@/components/analytics/CryptoRanking";

export default function AIInsights() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground">
            AI-powered pattern recognition and trading recommendations
          </p>
        </div>

        {/* AI Pattern Insights */}
        <AIPatternInsights />

        {/* Crypto Ranking */}
        <CryptoRanking />
      </div>
    </DashboardLayout>
  );
}
