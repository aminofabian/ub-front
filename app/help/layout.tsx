import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { HelpShell } from "@/components/help/help-shell";
import { helpHubMetadata } from "@/lib/help/seo";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata: Metadata = helpHubMetadata();

export default async function HelpLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Platform host only — tenant storefronts should not expose the marketing help KB.
  const slug = await resolveStorefrontSlug();
  if (slug) {
    redirect("/");
  }

  return <HelpShell>{children}</HelpShell>;
}
