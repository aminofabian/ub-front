import { StorefrontShell } from "@/components/storefront/storefront-shell";

export default function ShopItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
