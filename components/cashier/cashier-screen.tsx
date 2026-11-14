"use client";

import { QuickSaleWorkspace } from "@/components/cashier/quick-sale-workspace";
import { useDashboard } from "@/components/dashboard-provider";
import { useCashierTemplate } from "@/hooks/use-cashier-template";
import { isServiceBusiness, isServiceOnlyBusiness } from "@/lib/business-store-type";
import { cashierScreenFor } from "@/lib/cashier-templates";
import { IS_DESKTOP } from "@/lib/runtime";

import { FloorTill } from "./floor-till";

/** The till: the queue-and-chairs floor for a service shop, the product till for everyone else. */
export function CashierScreen() {
  const { branchId, business } = useDashboard();
  const { effective, localPick } = useCashierTemplate(branchId);
  // Service screens stay off the desktop build until its sync carries service sales.
  const sellsServices = !IS_DESKTOP && isServiceBusiness(business);
  const screen = cashierScreenFor({
    effective,
    localPick,
    sellsServices,
    serviceOnly: sellsServices && isServiceOnlyBusiness(business),
  });
  if (screen === "floor") {
    return <FloorTill />;
  }
  return <QuickSaleWorkspace variant="cashier" />;
}
