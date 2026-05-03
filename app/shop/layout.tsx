import Link from "next/link";

import ShopCartLink from "@/components/storefront/shop-cart-link";
import { APP_ROUTES } from "@/lib/config";
import { fetchPublicStorefront } from "@/lib/public-storefront";
import { resolveStorefrontSlug } from "@/lib/storefront-slug";

export default async function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const slug = await resolveStorefrontSlug();
  const storefront = slug ? await fetchPublicStorefront(slug) : null;
  const title = storefront?.label?.trim() || storefront?.businessName || "Shop";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href={APP_ROUTES.shop}
            className="text-center text-base font-semibold tracking-tight hover:opacity-90"
          >
            {title}
          </Link>
          {slug ? <ShopCartLink slug={slug} /> : <span className="h-10 w-10" aria-hidden />}
        </div>
      </header>
      {children}
    </div>
  );
}
