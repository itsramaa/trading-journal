/**
 * Position Calculator Page - Standalone page for position size calculator
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PositionSizeCalculator } from "@/components/risk";
import { Calculator } from "lucide-react";

export default function PositionCalculator() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Position Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate optimal position sizes based on your risk parameters
          </p>
        </div>

        {/* Calculator Content */}
        <PositionSizeCalculator />
      </div>
    </DashboardLayout>
  );
}
