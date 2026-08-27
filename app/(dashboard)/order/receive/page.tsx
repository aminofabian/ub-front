import type { Metadata } from "next";

import { OrderPageLayout } from "../_components/order-page-layout";
import { OrderReceivePanel } from "../_components/order-receive-panel";

export const metadata: Metadata = {
  title: "Confirm orders · Procurement · Kiosk",
  description:
    "Confirm purchase order lines one-by-one or in bulk and post them as supplies.",
};

export default function OrderReceivePage() {
  return (
    <OrderPageLayout
      showHeader
      title="Confirm orders"
      description="Adjust quantities and prices on arrival, add missing lines, then confirm selected items as a supply bill with stock movements."
    >
      <OrderReceivePanel />
    </OrderPageLayout>
  );
}
