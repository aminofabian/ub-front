import { notFound } from "next/navigation";

import { ShopTableOrderView } from "@/components/storefront/shop-table-order-view";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata = {
  title: "Order from your table",
  description: "Choose what you would like; a member of staff will confirm your order.",
  // The address carries the table's code; it must not be indexed or shared in previews.
  robots: { index: false, follow: false },
};

/** Reached by scanning the QR code on a table: `/shop/table?t=<code>`. */
export default async function ShopTableOrderPage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  const slug = await resolveStorefrontSlug();
  const { t } = await searchParams;
  const token = Array.isArray(t) ? t[0] : t;
  if (!slug || !token || !/^[0-9a-f]{32,64}$/.test(token)) {
    notFound();
  }
  return <ShopTableOrderView slug={slug} token={token} />;
}
