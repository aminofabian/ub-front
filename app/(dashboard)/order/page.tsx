import type { Metadata } from "next";

import { TenantOrderWorkspace } from "./_components/tenant-order-workspace";

export const metadata: Metadata = {
  title: "Order · Procurement · Kiosk",
  description:
    "Stock-aware ordering from your suppliers. Place purchase orders and confirm them as supplies when goods arrive.",
};

export default function TenantOrderPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-3 px-3 py-4 sm:px-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Procurement
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
          Order
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Browse your linked supplier catalogues with live stock, place an
          order, then confirm arrival to post it as a supply.
        </p>
      </div>
      <TenantOrderWorkspace />
    </div>
  );
}
