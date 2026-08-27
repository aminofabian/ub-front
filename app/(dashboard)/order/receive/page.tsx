import type { Metadata } from "next";

import { OrderReceivePanel } from "../_components/order-receive-panel";
import { OrderSubNav } from "../_components/order-sub-nav";

export const metadata: Metadata = {
  title: "Confirm orders · Procurement · Kiosk",
  description:
    "Confirm purchase order lines one-by-one or in bulk and post them as supplies.",
};

export default function OrderReceivePage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-3 px-3 py-4 sm:px-5">
      <OrderSubNav />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Receiving
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--pos-ink,#1c1915)]">
          Confirm orders
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Adjust quantities on arrival, confirm selected lines, and post them as
          a supply bill with stock movements.
        </p>
      </div>
      <OrderReceivePanel />
    </div>
  );
}
