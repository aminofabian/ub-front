import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { looksLikeKenyanMobilePath } from "@/lib/kenyan-phone";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ sku: string }>;
};

export default async function ShopItemLayout({ children, params }: LayoutProps) {
  const { sku } = await params;
  if (looksLikeKenyanMobilePath(sku)) {
    return children;
  }
  return <StorefrontShell>{children}</StorefrontShell>;
}
