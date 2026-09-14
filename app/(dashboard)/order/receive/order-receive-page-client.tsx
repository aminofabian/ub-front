"use client";

import { useState } from "react";

import { NewSupplyDrawer } from "@/app/(dashboard)/supplies/_components/new-supply-drawer";
import { useDashboard } from "@/components/dashboard-provider";
import { ReceivePathSwitcher } from "@/components/procurement/receive-path-switcher";
import { OrderPageLayout } from "../_components/order-page-layout";
import { OrderReceivePanel } from "../_components/order-receive-panel";
import { OrderReceiveStatsStrip } from "../_components/order-receive-stats-strip";

export function OrderReceivePageClient() {
  const [walkInOpen, setWalkInOpen] = useState(false);
  const { me } = useDashboard();
  const isStockFloor =
    me?.role?.key?.trim().toLowerCase() === "stock_manager";

  return (
    <>
      <OrderPageLayout
        header={
          <div className={isStockFloor ? "space-y-1.5" : "space-y-2"}>
            <ReceivePathSwitcher
              active={walkInOpen ? "walk-in" : "against-order"}
              onWalkIn={() => setWalkInOpen(true)}
              compact={isStockFloor}
            />
            <OrderReceiveStatsStrip compact={isStockFloor} />
          </div>
        }
      >
        <OrderReceivePanel floorMode={isStockFloor} />
      </OrderPageLayout>

      <NewSupplyDrawer
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        onPosted={() => setWalkInOpen(false)}
      />
    </>
  );
}
