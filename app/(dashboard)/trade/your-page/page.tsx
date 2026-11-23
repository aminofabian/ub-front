"use client";

import { TradeOnDesktop } from "@/components/wholesale/trade-on-desktop";
import { SupplierPagePanel } from "@/components/wholesale/supplier-page-panel";
import { IS_DESKTOP } from "@/lib/runtime";

// On the desktop till a supplier's trade work is done online; the page says so and where. See TradeOnDesktop.
export default function SupplierYourPageRoute() {
  return IS_DESKTOP ? <TradeOnDesktop /> : <SupplierPagePanel />;
}
