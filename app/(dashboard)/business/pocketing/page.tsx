"use client";

import { Suspense } from "react";

import { PocketingCalendarPage } from "@/components/business-hub/pocketing-calendar-page";
import { DashboardLoading } from "@/components/dashboard-page-ui";

export default function Page() {
  return (
    <Suspense fallback={<DashboardLoading label="Loading pocketing…" />}>
      <PocketingCalendarPage />
    </Suspense>
  );
}
