/**
 * Economic Calendar Page - Standalone page for calendar tab content
 */
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarTab } from "@/components/market-insight/CalendarTab";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Calendar } from "lucide-react";

export default function EconomicCalendar() {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        icon={Calendar}
        title="Economic Calendar"
        description="Track upcoming economic events and their potential market impact"
      />
      <ErrorBoundary
        title="Economic Calendar"
        onRetry={() => setRetryKey(k => k + 1)}
      >
        <CalendarTab key={retryKey} hideTitle />
      </ErrorBoundary>
    </div>
  );
}
