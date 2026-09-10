"use client";

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ThemeTryOnPhone } from "@/components/business/theme-try-on-phone";
import { ShopStorefrontChrome } from "@/components/storefront/shop-storefront-chrome";
import { StorefrontThemeScope } from "@/components/storefront/storefront-theme-scope";
import {
  resolveLandingPage,
  resolveStoreChromeVariant,
  resolveStoreHome,
} from "@/components/storefront/templates/registry";
import type {
  LandingTemplateProps,
  StoreHomeTemplateProps,
} from "@/components/storefront/templates/types";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import type { StorefrontDesign } from "@/lib/storefront-design";
import type {
  LandingContent,
  LandingTemplateId,
  StorefrontTemplateMeta,
  StoreThemeId,
} from "@/lib/storefront-templates";
import type { ThemeTryOnProduct } from "@/lib/theme-try-on";
import { cn } from "@/lib/utils";
import { resolveLogoForTemplate } from "@/lib/branding-themed-logo";

const VIEW_W = 390;
const VIEW_H = 844;

const FRAME_WIDTH: Record<"md" | "sm" | "tile", number> = {
  md: 180,
  sm: 120,
  tile: 132,
};

function toCatalogCards(
  products: readonly ThemeTryOnProduct[],
): PublicCatalogItemCard[] {
  return products.map((product, index) => ({
    id: `theme-preview-${index}`,
    sku: `PREVIEW-${index + 1}`,
    name: product.name,
    variantName: null,
    imageUrl: product.imageUrl ?? null,
    price: product.priceValue ?? null,
    weighed: product.price?.includes("/kg") === true,
    unitType: product.price?.includes("/kg") ? "kg" : null,
  }));
}

class PreviewBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function VisibleOnce({
  children,
  placeholder,
}: {
  children: ReactNode;
  placeholder: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? children : placeholder}</div>;
}

export function ThemeLiveFrame({
  item,
  kind,
  storeName,
  logoUrl,
  logoDarkUrl,
  brandPrimary,
  landingContent,
  products,
  heroUrl,
  slug,
  currency,
  design,
  size = "md",
  frame = "phone",
  lazy = false,
}: {
  item: StorefrontTemplateMeta;
  kind: "store" | "landing";
  storeName: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  brandPrimary?: string | null;
  landingContent?: LandingContent | null;
  products?: readonly ThemeTryOnProduct[];
  heroUrl?: string | null;
  slug?: string | null;
  currency?: string | null;
  design?: StorefrontDesign | null;
  size?: "md" | "sm" | "tile";
  frame?: "phone" | "card";
  lazy?: boolean;
}) {
  const width = FRAME_WIDTH[size];
  const isCard = frame === "card";
  const height = isCard ? width * (5 / 4) : width * (19.2 / 9);
  const scale = width / VIEW_W;
  const shopSlug = slug?.trim() || "preview";
  const money = currency?.trim() || "KES";
  const catalog = toCatalogCards(products ?? []).slice(0, isCard ? 4 : 8);
  const featured = catalog.slice(0, 3);
  const markUrl = resolveLogoForTemplate(
    { logoUrl, logoDarkUrl },
    { id: item.id, kind },
  );
  const fallback = (
    <ThemeTryOnPhone
      item={item}
      kind={kind}
      storeName={storeName}
      logoUrl={logoUrl}
      logoDarkUrl={logoDarkUrl}
      brandPrimary={brandPrimary}
      landingContent={landingContent}
      products={products}
      heroUrl={heroUrl}
      currency={money}
      size={size === "tile" ? "tile" : size}
      frame={frame}
    />
  );

  const shop = (
    <StorefrontThemeScope
      primaryHex={brandPrimary}
      design={design}
      applyToDocument={false}
      className="min-h-0 bg-[var(--background,#fff)]"
    >
      {kind === "store" ? (
        <StoreHomePreview
          themeId={item.id as StoreThemeId}
          slug={shopSlug}
          currency={money}
          catalog={catalog}
          featured={featured}
          storeName={storeName}
          logoUrl={logoUrl ?? null}
          logoDarkUrl={logoDarkUrl ?? null}
          brandPrimary={brandPrimary ?? null}
          heroUrl={heroUrl ?? null}
          landingContent={landingContent}
          design={design}
        />
      ) : (
        <LandingPreview
          templateId={item.id as LandingTemplateId}
          storeName={storeName}
          logoUrl={markUrl}
          brandPrimary={brandPrimary}
          landingContent={landingContent}
          catalog={catalog}
          featured={featured}
          currency={money}
          heroUrl={heroUrl}
        />
      )}
    </StorefrontThemeScope>
  );

  const frameBody = (
    <PreviewBoundary key={item.id} fallback={fallback}>
      <div
        className={cn(
          isCard
            ? "w-full overflow-hidden border border-black/12"
            : "mx-auto overflow-hidden rounded-[2.1em] border border-black/70 bg-[#15161a] p-[0.55em]",
        )}
        style={{ width }}
        aria-hidden
      >
        <div
          className={cn(
            "relative overflow-hidden",
            !isCard && "rounded-[1.7em]",
          )}
          style={{ width, height }}
        >
          <div
            className="origin-top-left pointer-events-none isolate [contain:layout_paint]"
            style={{
              width: VIEW_W,
              height: VIEW_H,
              transform: `scale(${scale})`,
            }}
          >
            <Suspense fallback={fallback}>{shop}</Suspense>
          </div>
        </div>
      </div>
    </PreviewBoundary>
  );

  if (!lazy) return frameBody;

  return (
    <VisibleOnce
      placeholder={
        <div
          className={cn(
            isCard
              ? "w-full animate-pulse bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,white)]"
              : "mx-auto animate-pulse rounded-[2.1em] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,white)]",
          )}
          style={{ width, height: isCard ? height : height + 12 }}
          aria-hidden
        />
      }
    >
      {frameBody}
    </VisibleOnce>
  );
}

function StoreHomePreview({
  themeId,
  slug,
  currency,
  catalog,
  featured,
  storeName,
  logoUrl,
  logoDarkUrl,
  brandPrimary,
  heroUrl,
  landingContent,
  design,
}: {
  themeId: StoreThemeId;
  slug: string;
  currency: string;
  catalog: PublicCatalogItemCard[];
  featured: PublicCatalogItemCard[];
  storeName: string;
  logoUrl: string | null;
  logoDarkUrl?: string | null;
  brandPrimary: string | null;
  heroUrl: string | null;
  landingContent?: StoreHomeTemplateProps["landingContent"];
  design?: StorefrontDesign | null;
}) {
  const Home = resolveStoreHome(themeId);
  const props: StoreHomeTemplateProps = {
    themeId,
    slug,
    currency,
    catalogItems: catalog,
    nextCursor: null,
    totalCount: catalog.length,
    categories: [],
    types: [],
    featured,
    heroTitle: storeName,
    announcement: null,
    primaryHex: brandPrimary,
    accentHex: brandPrimary,
    logoUrl,
    logoDarkUrl: logoDarkUrl ?? null,
    heroBannerUrls: heroUrl ? [heroUrl] : null,
    showcaseImage: heroUrl,
    storefront: {
      businessName: storeName,
      slug,
      currency,
      catalogBranchId: "",
      catalogBranchName: "",
      label: null,
      announcement: null,
      featured,
    },
    landingContent: landingContent ?? undefined,
    design: design ?? null,
  };
  return (
    <ShopStorefrontChrome
      preview
      slug={slug}
      headerTitle={storeName}
      logoUrl={logoUrl}
      logoDarkUrl={logoDarkUrl ?? null}
      primaryHex={brandPrimary}
      accentHex={brandPrimary}
      categories={[]}
      chromeVariant={resolveStoreChromeVariant(themeId)}
      storeThemeId={themeId}
      hasPresence={false}
      whatsappNumber={landingContent?.whatsapp ?? null}
      initialDesign={design ?? null}
      announcement={null}
    >
      <Home {...props} />
    </ShopStorefrontChrome>
  );
}

function LandingPreview({
  templateId,
  storeName,
  logoUrl,
  brandPrimary,
  landingContent,
  catalog,
  featured,
  currency,
  heroUrl,
}: {
  templateId: LandingTemplateId;
  storeName: string;
  logoUrl?: string | null;
  brandPrimary?: string | null;
  landingContent?: LandingTemplateProps["landingContent"];
  catalog: PublicCatalogItemCard[];
  featured: PublicCatalogItemCard[];
  currency: string;
  heroUrl?: string | null;
}) {
  const Page = resolveLandingPage(templateId);
  const props: LandingTemplateProps = {
    storeName,
    logoUrl,
    primaryHex: brandPrimary,
    accentHex: brandPrimary,
    landingContent: landingContent ?? undefined,
    templateId,
    catalogItems: catalog,
    featured,
    currency,
    totalCount: catalog.length,
    heroFallbackUrl: heroUrl ?? null,
  };
  return <Page {...props} />;
}
