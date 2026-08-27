import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderPageLayout } from "./_components/order-page-layout";
import { OrderPageShell } from "./_components/order-page-shell";

export const metadata: Metadata = {
  title: "Order · Procurement · Kiosk",
  description:
    "Stock-aware ordering from your suppliers. Place purchase orders and confirm them as supplies when goods arrive.",
};

export default function TenantOrderPage() {
  return (
    <Suspense fallback={null}>
      <OrderPageLayout
        showHeader
        title="New order"
        description="Pick a supplier, add products from their shelf, then save and send the purchase order on WhatsApp."
      >
        <OrderPageShell />
      </OrderPageLayout>
    </Suspense>
  );
}
