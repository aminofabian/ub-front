"use client";

import {
  GuestSupportLauncher,
  type GuestSupportContext,
} from "@/components/support/guest-support-chat";

/**
 * Storefront buyer chat — a floating chat button on every shop page. Buyers
 * talk to the tenant's staff, who answer from the dashboard's support page
 * ("Storefront buyers" tab).
 */
export function StorefrontSupportLauncher({
  slug,
  label,
  primaryHex,
}: {
  slug: string | null;
  label: string | null;
  primaryHex: string | null;
}) {
  if (!slug) return null;

  const shopLabel = label?.trim() || "Shop";
  const context: GuestSupportContext = {
    ns: `storefront:${slug}`,
    type: "STOREFRONT",
    businessSlug: slug,
    title: shopLabel,
    teamName: `${shopLabel} team`,
    blurb: "Questions about an order, a product, or delivery? We're here to help.",
    accentHex: primaryHex || null,
    quickPrompts: [
      "Is this item in stock?",
      "Can I get it delivered?",
      "Do you accept M-Pesa?",
    ],
  };

  return <GuestSupportLauncher context={context} />;
}
