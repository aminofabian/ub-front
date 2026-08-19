"use client";

import { ChevronDown, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, type CSSProperties, type ReactNode, useEffect, useRef } from "react";

import { APP_ROUTES } from "@/lib/config";
import { hasAccessSession, hasSessionPresenceCookie } from "@/lib/auth";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";

import { ShopAirtimeLauncher } from "@/components/storefront/shop-airtime-launcher";
import { ShopCartDrawer } from "@/components/storefront/shop-cart-drawer";
import { ShopCheckoutDrawer } from "@/components/storefront/shop-checkout-drawer";
import { ShopLeadCaptureCard } from "@/components/storefront/shop-lead-capture-card";
import { MilkRunHeader } from "@/components/storefront/templates/store/milk-run-header";
import { MilkRunCheckoutChoice } from "@/components/storefront/templates/store/milk-run-checkout-choice";
import { milkRunFontVariables } from "@/components/storefront/templates/store/milk-run-fonts";
import milkRunStyles from "@/components/storefront/templates/store/milk-run.module.css";
import { OxideHeader } from "@/components/storefront/templates/store/oxide-header";
import { oxideFontVariables } from "@/components/storefront/templates/store/oxide-fonts";
import oxideStyles from "@/components/storefront/templates/store/oxide.module.css";
import { TintLabHeader } from "@/components/storefront/templates/store/tint-lab-header";
import { tintFontVariables } from "@/components/storefront/templates/store/tint-lab-fonts";
import tintStyles from "@/components/storefront/templates/store/tint-lab.module.css";
import { ButcherBoardHeader } from "@/components/storefront/templates/store/butcher-board-header";
import { butcherBoardFontVariables } from "@/components/storefront/templates/store/butcher-board-fonts";
import butcherBoardStyles from "@/components/storefront/templates/store/butcher-board.module.css";
import { CarbonDeskHeader } from "@/components/storefront/templates/store/carbon-desk-header";
import { carbonDeskFontVariables } from "@/components/storefront/templates/store/carbon-desk-fonts";
import carbonDeskStyles from "@/components/storefront/templates/store/carbon-desk.module.css";
import { BeautyEditHeader } from "@/components/storefront/templates/store/beauty-edit-header";
import { beautyEditFontVariables } from "@/components/storefront/templates/store/beauty-edit-fonts";
import beautyEditStyles from "@/components/storefront/templates/store/beauty-edit.module.css";
import { BoutiqueShelfHeader } from "@/components/storefront/templates/store/boutique-shelf-header";
import { boutiqueShelfFontVariables } from "@/components/storefront/templates/store/boutique-shelf-fonts";
import boutiqueShelfStyles from "@/components/storefront/templates/store/boutique-shelf.module.css";
import { ChemLabHeader } from "@/components/storefront/templates/store/chem-lab-header";
import { chemLabFontVariables } from "@/components/storefront/templates/store/chem-lab-fonts";
import chemLabStyles from "@/components/storefront/templates/store/chem-lab.module.css";
import { SpiritsCellarHeader } from "@/components/storefront/templates/store/spirits-cellar-header";
import { spiritsCellarFontVariables } from "@/components/storefront/templates/store/spirits-cellar-fonts";
import spiritsCellarStyles from "@/components/storefront/templates/store/spirits-cellar.module.css";
import { useMediaMd } from "@/hooks/use-media-md";
import { ShopCategoryRail } from "@/components/storefront/shop-category-rail";
import { ShopHeaderBar } from "@/components/storefront/shop-header-bar";
import { ShopUtilityBar } from "@/components/storefront/shop-utility-bar";
import { ShopCartProvider, useShopCart } from "@/hooks/use-shop-cart";
import type { PublicCategory, PublicDeliveryArea } from "@/lib/public-storefront";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { normalizeMilkRunWhatsApp } from "@/lib/milk-run-whatsapp-order";
import { cn } from "@/lib/utils";

function RailFallback() {
  return <div className="h-9 animate-pulse bg-primary/40" aria-hidden />;
}

function FloatingCartButton({ accentHex }: { accentHex?: string | null }) {
  const pathname = usePathname();
  const { itemCount, cart, drawerOpen, checkoutOpen, checkoutChoiceOpen, toggleDrawer, loading } =
    useShopCart();

  if (pathname === APP_ROUTES.shopCheckout || checkoutOpen || checkoutChoiceOpen) {
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
  whatsappNumber,
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
  chromeVariant?: "default" | "dark" | "soft" | "oxide" | "tint-lab" | "milk-run" | "butcher-board" | "carbon-desk" | "boutique-shelf" | "beauty-edit" | "chem-lab" | "spirits-cellar";
  storeThemeId?: string | null;
  /** Tenant WhatsApp for Milk Run dual-path checkout. */
  whatsappNumber?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const compactChrome = useCompactStorefrontChrome();
  const isOxide = chromeVariant === "oxide";
  const isTintLab = chromeVariant === "tint-lab";
  const isMilkRun = chromeVariant === "milk-run";
  const isButcherBoard = chromeVariant === "butcher-board";
  const isCarbonDesk = chromeVariant === "carbon-desk";
  const isBoutiqueShelf = chromeVariant === "boutique-shelf";
  const isBeautyEdit = chromeVariant === "beauty-edit";
  const isChemLab = chromeVariant === "chem-lab";
  const isSpiritsCellar = chromeVariant === "spirits-cellar";
  const isCustomChrome = isOxide || isTintLab || isMilkRun || isButcherBoard || isCarbonDesk || isBoutiqueShelf || isBeautyEdit || isChemLab || isSpiritsCellar;
  const showDefaultChrome = !compactChrome && !isCustomChrome;

  const restoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    // Gap G3: after native login we often land on the shop page with tokens
    // only in httpOnly cookies; restore must run client-side to populate
    // session claims used by the storefront header / UI.
    if (!hasSessionPresenceCookie()) return;
    if (hasAccessSession()) return;

    void restoreClientSessionFromCookie().catch(() => {});
  }, []);

  const milkRunDigits = isMilkRun
    ? normalizeMilkRunWhatsApp(whatsappNumber)
    : null;
  const milkRunCheckout =
    isMilkRun && milkRunDigits
      ? { storeName: headerTitle, whatsappDigits: milkRunDigits }
      : null;

  const shellStyle: CSSProperties | undefined = isOxide && accentHex
    ? ({ ["--oxide-accent" as string]: accentHex } as CSSProperties)
    : isTintLab && accentHex
      ? ({ ["--tint-accent" as string]: accentHex } as CSSProperties)
      : isMilkRun && accentHex
        ? ({ ["--milk-accent" as string]: accentHex } as CSSProperties)
        : isButcherBoard
          ? ({
              ["--bb-accent" as string]: accentHex || "#F5C518",
              ["--bb-gold" as string]: accentHex || "#F5C518",
              ["--bb-crimson" as string]: primaryHex || "#E31C23",
            } as CSSProperties)
          : isCarbonDesk
            ? ({
                ["--cd-stamp" as string]: primaryHex || "#B91C1C",
                ["--cd-carbon" as string]: accentHex || "#3D6B9E",
              } as CSSProperties)
            : isBoutiqueShelf
              ? ({
                  ["--bs-rose" as string]: primaryHex || "#DB2777",
                  ["--bs-brass" as string]: accentHex || "#C9A227",
                } as CSSProperties)
              : isBeautyEdit
                ? ({
                    ["--be-ink" as string]: primaryHex || "#0E0E0E",
                    ["--be-gold" as string]: accentHex || "#B5853A",
                  } as CSSProperties)
              : isChemLab
                ? ({
                    ["--cl-neon" as string]: primaryHex || "#84CC16",
                    ["--cl-amber" as string]: accentHex || "#F59E0B",
                  } as CSSProperties)
                : isSpiritsCellar
                  ? ({
                      ["--sc-wax" as string]: primaryHex || "#8B2635",
                      ["--sc-spirit" as string]: accentHex || "#C4B5FD",
                    } as CSSProperties)
        : undefined;

  return (
    <ShopCartProvider slug={slug} milkRunCheckout={milkRunCheckout}>
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
          isButcherBoard &&
            cn(
              butcherBoardStyles.root,
              butcherBoardStyles.body,
              butcherBoardFontVariables,
              "[--storefront-paper:#0C0708]",
            ),
          isCarbonDesk &&
            cn(
              carbonDeskStyles.root,
              carbonDeskStyles.body,
              carbonDeskFontVariables,
              "[--storefront-paper:#F5F0E4]",
            ),
          isBoutiqueShelf &&
            cn(
              boutiqueShelfStyles.root,
              boutiqueShelfStyles.body,
              boutiqueShelfFontVariables,
              "[--storefront-paper:#1F1020]",
            ),
          isBeautyEdit &&
            cn(
              beautyEditStyles.root,
              beautyEditStyles.body,
              beautyEditFontVariables,
              "[--storefront-paper:#FFFFFF]",
            ),
          isChemLab &&
            cn(
              chemLabStyles.root,
              chemLabStyles.body,
              chemLabFontVariables,
              "[--storefront-paper:#0A1218]",
            ),
          isSpiritsCellar &&
            cn(
              spiritsCellarStyles.root,
              spiritsCellarStyles.body,
              spiritsCellarFontVariables,
              "[--storefront-paper:#14100E]",
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
      {isButcherBoard && !compactChrome ? (
        <Suspense fallback={null}>
          <ButcherBoardHeader storeName={headerTitle} logoUrl={logoUrl} />
        </Suspense>
      ) : null}
      {isCarbonDesk && !compactChrome ? (
        <Suspense fallback={null}>
          <CarbonDeskHeader storeName={headerTitle} logoUrl={logoUrl} />
        </Suspense>
      ) : null}
      {isBoutiqueShelf && !compactChrome ? (
        <Suspense fallback={null}>
          <BoutiqueShelfHeader storeName={headerTitle} logoUrl={logoUrl} />
        </Suspense>
      ) : null}
      {isBeautyEdit && !compactChrome ? (
        <Suspense fallback={null}>
          <BeautyEditHeader
            slug={slug}
            storeName={headerTitle}
            logoUrl={logoUrl}
            whatsapp={whatsappNumber}
          />
        </Suspense>
      ) : null}
      {isChemLab && !compactChrome ? (
        <Suspense fallback={null}>
          <ChemLabHeader storeName={headerTitle} logoUrl={logoUrl} />
        </Suspense>
      ) : null}
      {isSpiritsCellar && !compactChrome ? (
        <Suspense fallback={null}>
          <SpiritsCellarHeader storeName={headerTitle} logoUrl={logoUrl} />
        </Suspense>
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
      {isMilkRun ? <MilkRunCheckoutChoice /> : null}
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
      {!compactChrome ? (
        <ShopAirtimeLauncher slug={slug} accentHex={accentHex} />
      ) : null}
      </div>
    </ShopCartProvider>
  );
}
