import type { Metadata } from "next";

import { OrderReceivePageClient } from "./order-receive-page-client";

export const metadata: Metadata = {
  title: "Receive · Buying · Kiosk",
  description:
    "Goods in: unpack against an open order, or post a walk-in supply with no purchase order.",
};

export default function OrderReceivePage() {
  return <OrderReceivePageClient />;
}
