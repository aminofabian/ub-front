import type { Metadata } from "next";

import { OrderPageLayout } from "../_components/order-page-layout";
import { OrderReceivePanel } from "../_components/order-receive-panel";
import { OrderReceiveStatsStrip } from "../_components/order-receive-stats-strip";

export const metadata: Metadata = {
  title: "Confirm order · Procurement · Kiosk",
  description:
    "Mark shipment arrived, then unpack quantities into stock against open purchase orders.",
};

export default function OrderReceivePage() {
  return (
    <OrderPageLayout header={<OrderReceiveStatsStrip />}>
      <OrderReceivePanel />
    </OrderPageLayout>
  );
}
