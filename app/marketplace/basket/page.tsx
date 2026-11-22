import type { Metadata } from "next";

import { MarketplacePageFrame } from "@/app/marketplace/_components/marketplace-page-frame";
import { MarketplaceBasketView } from "@/app/marketplace/_components/marketplace-basket-view";

export const metadata: Metadata = {
  title: "Your basket",
  description: "Send one basket to several suppliers.",
  robots: { index: false, follow: false },
};

export default function MarketplaceBasketPage() {
  return (
    <MarketplacePageFrame>
      <MarketplaceBasketView />
    </MarketplacePageFrame>
  );
}
