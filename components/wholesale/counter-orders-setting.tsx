"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { useDashboard } from "@/components/dashboard-provider";
import { updateBusiness } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { isSupplierBusiness, SUPPLIER_COUNTER_ORDERS_FLAG } from "@/lib/business-store-type";

/**
 * A supplier's switch for counter orders: a clerk takes the order and prints the invoice, the cashier takes the
 * payment. Off by default. Shown only in a supplier shop, to people who can change business settings.
 */
export function CounterOrdersSetting() {
  const { business, canManageBusinessSettings, refreshSession } = useDashboard();
  const [busy, setBusy] = useState(false);

  if (!canManageBusinessSettings || !isSupplierBusiness(business)) {
    return null;
  }
  const on = business?.featureFlags?.[SUPPLIER_COUNTER_ORDERS_FLAG] === true;

  const change = async (next: boolean) => {
    setBusy(true);
    try {
      await updateBusiness({ featureFlags: { supplierCounterOrders: next } });
      await refreshSession();
      toast.success(next ? "Counter orders are on" : "Counter orders are off");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not go through");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <p className="mt-4 text-[13px]">
      <a href="/storefront/supplier-page" className="font-medium text-foreground underline underline-offset-4">
        Your marketplace page
      </a>
    </p>
    <div className="mt-2 flex items-start justify-between gap-4 border border-foreground/15 px-3 py-3">
      <div className="text-[13px]">
        <p className="font-medium text-foreground">Counter orders</p>
        <p className="mt-0.5 text-muted-foreground">
          A clerk takes the order and prints the invoice. The customer pays at the cashier.
          {on ? (
            <>
              {" "}
              <a href={APP_ROUTES.clerk} className="font-medium text-foreground underline underline-offset-4">
                Open the counter
              </a>
            </>
          ) : null}
        </p>
      </div>
      <Switch
        checked={on}
        disabled={busy}
        onCheckedChange={(next) => void change(next)}
        aria-label="Counter orders"
      />
    </div>
    </>
  );
}
