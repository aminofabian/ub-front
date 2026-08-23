import { notFound } from "next/navigation";

import ShopOrderTrackView from "@/components/storefront/shop-order-track-view";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata = {
  title: "Track your order",
  description:
    "Check the status of your order by quoting the code from your WhatsApp message.",
};

export default async function ShopOrderTrackPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }
  return <ShopOrderTrackView slug={slug} />;
}
