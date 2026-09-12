"use client";

import { useState } from "react";

import { NewSupplyDrawer } from "@/app/(dashboard)/supplies/_components/new-supply-drawer";
import { ReceivePathSwitcher } from "@/components/procurement/receive-path-switcher";
import { OrderPageLayout } from "../_components/order-page-layout";
import { OrderReceivePanel } from "../_components/order-receive-panel";
import { OrderReceiveStatsStrip } from "../_components/order-receive-stats-strip";

export function OrderReceivePageClient() {
  const [walkInOpen, setWalkInOpen] = useState(false);

  return (
    <>
      <OrderPageLayout
        header={
          <div className="space-y-2">
            <ReceivePathSwitcher
              active={walkInOpen ? "walk-in" : "against-order"}
              onWalkIn={() => setWalkInOpen(true)}
            />
            <OrderReceiveStatsStrip />
          </div>
        }
      >
        <OrderReceivePanel />
      </OrderPageLayout>

      <NewSupplyDrawer
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        onPosted={() => setWalkInOpen(false)}
      />
    </>
  );
}
