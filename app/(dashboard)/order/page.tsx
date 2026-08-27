import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderPageShell } from "./_components/order-page-shell";
import { OrderSubNav } from "./_components/order-sub-nav";

export const metadata: Metadata = {
  title: "Order · Procurement · Kiosk",
  description:
    "Stock-aware ordering from your suppliers. Place purchase orders and confirm them as supplies when goods arrive.",
};

export default function TenantOrderPage() {
  return (
    <Suspense fallback={null}>
      <div className="mx-auto w-full max-w-[1400px] space-y-3 px-3 pt-4 sm:px-5">
        <OrderSubNav />
        <OrderPageShell />
      </div>
    </Suspense>
  );
}
