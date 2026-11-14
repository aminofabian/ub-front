import { notFound } from "next/navigation";

import { ShopBookingView } from "@/components/storefront/shop-booking-view";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata = {
  title: "Book a visit",
  description: "Choose a service, a time and who you would like to see.",
};

export default async function ShopBookPage() {
  const slug = await resolveStorefrontSlug();
  if (!slug) {
    notFound();
  }
  return <ShopBookingView slug={slug} />;
}
