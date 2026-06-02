"use client";

import { ChevronDown, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { APP_ROUTES } from "@/lib/config";

import { ShopCartDrawer } from "@/components/storefront/shop-cart-drawer";
import { ShopCheckoutDrawer } from "@/components/storefront/shop-checkout-drawer";
import { useMediaMd } from "@/hooks/use-media-md";
import { ShopCategoryRail } from "@/components/storefront/shop-category-rail";
import { ShopFooterMart } from "@/components/storefront/shop-footer-mart";
import { ShopHeaderBar } from "@/components/storefront/shop-header-bar";
import { ShopUtilityBar } from "@/components/storefront/shop-utility-bar";
import { ShopCartProvider, useShopCart } from "@/hooks/use-shop-cart";
import type { PublicCategory } from "@/lib/public-storefront";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function RailFallback() {
  return <div className="h-11 animate-pulse bg-primary/40" aria-hidden />;
}

function FloatingCartButton({ accentHex }: { accentHex?: string | null }) {
  const pathname = usePathname();
  const { itemCount, cart, drawerOpen, checkoutOpen, toggleDrawer, loading } =
    useShopCart();

  if (pathname === APP_ROUTES.shopCheckout || checkoutOpen) {
    return null;
  }
  const accent =
    accentHex && /^#[0-9a-fA-F]{6}$/.test(accentHex.trim()) ? accentHex.trim() : null;

  if (itemCount === 0 && !loading) {
    return null;
  }

  const subtotal =
    cart?.subtotal != null
      ? formatDisplayPrice(cart.currency, cart.subtotal)
      : null;

  return (
    <button
      type="button"
      onClick={toggleDrawer}
      className={cn(
        "fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[60] flex items-center gap-2.5 rounded-full border py-2.5 pl-3 pr-4 shadow-lg backdrop-blur-md transition-all duration-300 active:scale-[0.98] md:hidden",
        drawerOpen
          ? "border-primary/30 bg-background shadow-xl ring-2 ring-primary/20"
          : "border-border/80 bg-background/95 shadow-black/10 ring-1 ring-black/[0.04] hover:scale-[1.02]",
      )}
      aria-label={drawerOpen ? "Close cart" : `Open cart, ${itemCount} items`}
      aria-expanded={drawerOpen}
    >
      <span
        className={cn(
          "relative flex size-10 items-center justify-center rounded-full text-white shadow-md",
          !accent && "bg-primary",
        )}
        style={accent ? { backgroundColor: accent } : undefined}
      >
        <ShoppingBag className="size-5" aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 flex size-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      </span>
      {subtotal ? (
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {drawerOpen ? "Close" : "Cart"}
          </span>
          <span className="text-sm font-bold tabular-nums">{subtotal}</span>
        </span>
      ) : null}
      {drawerOpen ? (
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </button>
  );
}

/**
 * Storefront chrome rendered inside ShopCartProvider so header cart and drawers
 * share context (server-passed `children` alone does not receive client context).
 */
function useCompactStorefrontChrome(): boolean {
  const pathname = usePathname();
  const isMd = useMediaMd();
  if (isMd) {
    return false;
  }
  return (
    pathname === APP_ROUTES.shopCart || pathname === APP_ROUTES.shopCheckout
  );
}

export function ShopStorefrontChrome({
  slug,
  headerTitle,
  logoUrl,
  primaryHex,
  accentHex,
  locationHint,
  categories,
  storeName,
  children,
}: {
  slug: string;
  headerTitle: string;
  logoUrl: string | null;
  primaryHex: string | null;
  accentHex: string | null;
  locationHint?: string | null;
  categories: PublicCategory[];
  storeName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const compactChrome = useCompactStorefrontChrome();

  return (
    <ShopCartProvider slug={slug}>
      {!compactChrome ? (
        <>
          <ShopUtilityBar
            primaryHex={primaryHex}
            locationHint={locationHint}
            className="hidden sm:block"
          />
          <ShopHeaderBar
            slug={slug}
            headerTitle={headerTitle}
            logoUrl={logoUrl}
            primaryHex={primaryHex}
          />
        </>
      ) : null}
      {!compactChrome ? (
        <Suspense fallback={<RailFallback />}>
          <ShopCategoryRail
            categories={categories}
            primaryHex={primaryHex}
            accentHex={accentHex}
          />
        </Suspense>
      ) : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          compactChrome
            ? "overflow-hidden"
            : "overflow-y-auto overscroll-y-contain pb-[var(--shop-footer-offset,9.5rem)]",
        )}
      >
        {children}
      </div>
      {!compactChrome ? (
        <ShopFooterMart
          primaryHex={primaryHex}
          storeName={storeName}
          logoUrl={logoUrl}
        />
      ) : null}
      <ShopCartDrawer />
      <ShopCheckoutDrawer />
      <FloatingCartButton accentHex={accentHex} />
    </ShopCartProvider>
  );
}
