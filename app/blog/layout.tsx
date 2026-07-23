import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { BlogShell } from "@/components/blog/blog-shell";
import { blogHubMetadata } from "@/lib/blog/seo";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export const metadata: Metadata = blogHubMetadata();

export default async function BlogLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Platform host only — tenant storefronts should not expose the marketing blog.
  const slug = await resolveStorefrontSlug();
  if (slug) {
    redirect("/");
  }

  return <BlogShell>{children}</BlogShell>;
}
