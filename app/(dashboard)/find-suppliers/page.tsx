"use client";

import { OrderPageLayout } from "@/app/(dashboard)/order/_components/order-page-layout";
import { MarketplaceBrowseWorkspace } from "@/app/marketplace/_components/marketplace-browse-workspace";
import { useDashboard } from "@/components/dashboard-provider";

export default function FindSuppliersPage() {
  const { canConnectMarketplace } = useDashboard();

  return (
    <OrderPageLayout className="!bg-transparent px-0 sm:px-0">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <MarketplaceBrowseWorkspace
          variant="tenant"
          canInherit={canConnectMarketplace}
        />
      </div>
    </OrderPageLayout>
  );
}
