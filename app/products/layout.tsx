import type { Metadata } from "next";

import { StorefrontShell } from "@/components/storefront/storefront-shell";

export const metadata: Metadata = {
  manifest: "/storefront-manifest.webmanifest",
};

export default function StorefrontProductsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
