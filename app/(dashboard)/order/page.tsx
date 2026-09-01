import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderPageLayout } from "./_components/order-page-layout";
import { OrderPageShell } from "./_components/order-page-shell";
import { OrderStatsStrip } from "./_components/order-stats-strip";

export const metadata: Metadata = {
  title: "Order · Procurement · Kiosk",
  description:
    "Stock-aware ordering from your suppliers. Place purchase orders and confirm them as supplies when goods arrive.",
};

export default function TenantOrderPage() {
  return (
    <Suspense fallback={null}>
      <OrderPageLayout header={<OrderStatsStrip />}>
        <OrderPageShell />
      </OrderPageLayout>
    </Suspense>
  );
}
