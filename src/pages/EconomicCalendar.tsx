/**
 * Economic Calendar Page - Standalone page for calendar tab content
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CalendarTab } from "@/components/market-insight/CalendarTab";
import { Calendar } from "lucide-react";

export default function EconomicCalendar() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Economic Calendar
          </h1>
          <p className="text-muted-foreground">
            Track upcoming economic events and their potential market impact
          </p>
        </div>

        {/* Calendar Content */}
        <CalendarTab />
      </div>
    </DashboardLayout>
  );
}
