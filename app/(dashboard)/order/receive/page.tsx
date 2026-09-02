import type { Metadata } from "next";

import { OrderPageLayout } from "../_components/order-page-layout";
import { OrderReceivePanel } from "../_components/order-receive-panel";
import { OrderReceiveStatsStrip } from "../_components/order-receive-stats-strip";

export const metadata: Metadata = {
  title: "Confirm supply · Procurement · Kiosk",
  description:
    "Confirm purchase order lines one-by-one or in bulk and post them as supplies.",
};

export default function OrderReceivePage() {
  return (
    <OrderPageLayout header={<OrderReceiveStatsStrip />}>
      <OrderReceivePanel />
    </OrderPageLayout>
  );
}
