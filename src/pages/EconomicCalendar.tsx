/**
 * Economic Calendar Page - Standalone page for calendar tab content
 */
import { PageHeader } from "@/components/ui/page-header";
import { CalendarTab } from "@/components/market-insight/CalendarTab";
import { Calendar } from "lucide-react";

export default function EconomicCalendar() {
  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        icon={Calendar}
        title="Economic Calendar"
        description="Track upcoming economic events and their potential market impact"
      />
      <CalendarTab hideTitle />
    </div>
  );
}
