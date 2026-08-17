import { notFound } from "next/navigation";

import ShopAirtimeView from "@/components/storefront/shop-airtime-view";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata = {
  title: "Buy airtime",
  description: "Top up any Kenyan mobile line and pay with M-Pesa.",
};

export default async function ShopAirtimePage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }
  return <ShopAirtimeView slug={slug} />;
}
