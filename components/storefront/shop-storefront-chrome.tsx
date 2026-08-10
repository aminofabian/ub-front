"use client";

import { ChevronDown, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, type CSSProperties, type ReactNode } from "react";

import { APP_ROUTES } from "@/lib/config";

import { ShopCartDrawer } from "@/components/storefront/shop-cart-drawer";
import { ShopCheckoutDrawer } from "@/components/storefront/shop-checkout-drawer";
import { ShopLeadCaptureCard } from "@/components/storefront/shop-lead-capture-card";
import { MilkRunHeader } from "@/components/storefront/templates/store/milk-run-header";
import { milkRunFontVariables } from "@/components/storefront/templates/store/milk-run-fonts";
import milkRunStyles from "@/components/storefront/templates/store/milk-run.module.css";
import { OxideHeader } from "@/components/storefront/templates/store/oxide-header";
import { oxideFontVariables } from "@/components/storefront/templates/store/oxide-fonts";
import oxideStyles from "@/components/storefront/templates/store/oxide.module.css";
import { TintLabHeader } from "@/components/storefront/templates/store/tint-lab-header";
import { tintFontVariables } from "@/components/storefront/templates/store/tint-lab-fonts";
import tintStyles from "@/components/storefront/templates/store/tint-lab.module.css";
import { useMediaMd } from "@/hooks/use-media-md";
import { ShopCategoryRail } from "@/components/storefront/shop-category-rail";
import { ShopHeaderBar } from "@/components/storefront/shop-header-bar";
import { ShopUtilityBar } from "@/components/storefront/shop-utility-bar";
import { ShopCartProvider, useShopCart } from "@/hooks/use-shop-cart";
import type { PublicCategory, PublicDeliveryArea } from "@/lib/public-storefront";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { cn } from "@/lib/utils";

function RailFallback() {
  return <div className="h-9 animate-pulse bg-primary/40" aria-hidden />;
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
  deliveryAreas = [],
  chromeVariant = "default",
  storeThemeId,
  children,
}: {
  slug: string;
  headerTitle: string;
  logoUrl: string | null;
  primaryHex: string | null;
  accentHex: string | null;
  locationHint?: string | null;
  categories: PublicCategory[];
  deliveryAreas?: PublicDeliveryArea[];
  chromeVariant?: "default" | "dark" | "soft" | "oxide" | "tint-lab" | "milk-run";
  storeThemeId?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const compactChrome = useCompactStorefrontChrome();
  const isOxide = chromeVariant === "oxide";
  const isTintLab = chromeVariant === "tint-lab";
  const isMilkRun = chromeVariant === "milk-run";
  const isCustomChrome = isOxide || isTintLab || isMilkRun;
  const showDefaultChrome = !compactChrome && !isCustomChrome;

  const shellStyle: CSSProperties | undefined = isOxide && accentHex
    ? ({ ["--oxide-accent" as string]: accentHex } as CSSProperties)
    : isTintLab && accentHex
      ? ({ ["--tint-accent" as string]: accentHex } as CSSProperties)
      : isMilkRun && accentHex
        ? ({ ["--milk-accent" as string]: accentHex } as CSSProperties)
        : undefined;

  return (
    <ShopCartProvider slug={slug}>
      <div
        data-store-theme-id={storeThemeId ?? undefined}
        className={cn(
          "storefront-browse flex min-h-0 flex-1 flex-col",
          chromeVariant === "dark" &&
            "bg-stone-950 text-stone-50 [--storefront-paper:theme(colors.stone.950)]",
          chromeVariant === "soft" &&
            "bg-rose-50/40 [--storefront-paper:theme(colors.rose.50)]",
          chromeVariant === "default" && "bg-[var(--storefront-paper)]",
          isOxide &&
            cn(
              oxideStyles.root,
              oxideStyles.body,
              oxideFontVariables,
              "[--storefront-paper:#EDEAE2]",
            ),
          isTintLab &&
            cn(
              tintStyles.root,
              tintStyles.body,
              tintFontVariables,
              "[--storefront-paper:#F6F1EA]",
            ),
          isMilkRun &&
            cn(
              milkRunStyles.root,
              milkRunStyles.body,
              milkRunFontVariables,
              "[--storefront-paper:#FFFCF5]",
            ),
        )}
        style={shellStyle}
      >
      {isOxide && !compactChrome ? (
        <OxideHeader storeName={headerTitle} />
      ) : null}
      {isTintLab && !compactChrome ? (
        <TintLabHeader storeName={headerTitle} />
      ) : null}
      {isMilkRun && !compactChrome ? (
        <MilkRunHeader
          storeName={headerTitle}
          locationNote={locationHint}
        />
      ) : null}
      {showDefaultChrome ? (
        <>
          <ShopUtilityBar
            slug={slug}
            storeName={headerTitle}
            primaryHex={primaryHex}
            locationHint={locationHint}
            className={cn(
              "hidden sm:block",
              chromeVariant === "dark" && "border-stone-800 bg-stone-950/95",
            )}
          />
          <ShopHeaderBar
            slug={slug}
            headerTitle={headerTitle}
            logoUrl={logoUrl}
            primaryHex={primaryHex}
          />
        </>
      ) : null}
      {showDefaultChrome ? (
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
          compactChrome ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain",
        )}
      >
        {children}
      </div>
      <ShopCartDrawer />
      <ShopCheckoutDrawer />
      {!isCustomChrome ? (
        <ShopLeadCaptureCard
          slug={slug}
          storeName={headerTitle}
          deliveryAreas={deliveryAreas}
          primaryHex={primaryHex}
          accentHex={accentHex}
        />
      ) : null}
      {!isCustomChrome ? <FloatingCartButton accentHex={accentHex} /> : null}
      </div>
    </ShopCartProvider>
  );
}
