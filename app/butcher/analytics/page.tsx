"use client";

import { AnalyticsWorkspace } from "@/app/(dashboard)/analytics/analytics-workspace";

export default function ButcherAnalyticsPage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background text-foreground">
      <AnalyticsWorkspace />
    </div>
  );
}
