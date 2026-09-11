import type { ReactNode } from "react";

import { StorefrontShell } from "@/components/storefront/storefront-shell";

export default function StorefrontProductsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
