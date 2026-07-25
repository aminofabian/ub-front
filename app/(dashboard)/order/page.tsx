import type { Metadata } from "next";

import { TenantOrderWorkspace } from "./_components/tenant-order-workspace";

export const metadata: Metadata = {
  title: "Order · Procurement · Kiosk",
  description:
    "Stock-aware ordering from your suppliers. Place purchase orders and confirm them as supplies when goods arrive.",
};

export default function TenantOrderPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-0 sm:px-4 sm:py-3 lg:px-5">
      <TenantOrderWorkspace />
    </div>
  );
}
