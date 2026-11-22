import { notFound } from "next/navigation";

import TradeOrderTrackView from "@/components/storefront/trade-order-track-view";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata = {
  title: "Your trade order",
  description: "See what the supplier has accepted on the order you placed.",
  robots: { index: false, follow: false },
};

export default async function ShopTradeOrderPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }
  return <TradeOrderTrackView slug={slug} />;
}
