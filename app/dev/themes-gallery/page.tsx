import { notFound } from "next/navigation";

import { resolveLandingPage, resolveStoreChromeVariant, resolveStoreHome } from "@/components/storefront/templates/registry";
import type {
  LandingTemplateProps,
  StoreHomeTemplateProps,
} from "@/components/storefront/templates/types";
import { ShopStorefrontChrome } from "@/components/storefront/shop-storefront-chrome";
import { StorefrontSignInProvider } from "@/components/storefront/storefront-sign-in-sheet";
import { ShopCartPreviewProvider } from "@/hooks/use-shop-cart";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import {
  LANDING_TEMPLATE_META,
  STORE_THEME_META,
  type LandingTemplateId,
  type StoreThemeId,
} from "@/lib/storefront-templates";

const DEMO_ITEMS: PublicCatalogItemCard[] = [
  {
    id: "1",
    sku: "DEMO-1",
    name: "Linen notebook",
    variantName: null,
    imageUrl: "/window.svg",
    price: 850,
  },
  {
    id: "2",
    sku: "DEMO-2",
    name: "Gel pen set",
    variantName: null,
    imageUrl: "/window.svg",
    price: 420,
  },
  {
    id: "3",
    sku: "DEMO-3",
    name: "Gift wrap roll",
    variantName: null,
    imageUrl: "/window.svg",
    price: 300,
  },
  {
    id: "4",
    sku: "DEMO-4",
    name: "Greeting cards",
    variantName: null,
    imageUrl: "/window.svg",
    price: 250,
  },
];

const DEMO_CATEGORIES = [
  { id: "c1", name: "Notebooks", slug: "notebooks", parentId: null },
  { id: "c2", name: "Pens", slug: "pens", parentId: null },
  { id: "c3", name: "Gift wrap", slug: "gift-wrap", parentId: null },
  { id: "c4", name: "Cards", slug: "cards", parentId: null },
];

const DEMO_TYPES = [
  { id: "t1", label: "Notebooks" },
  { id: "t2", label: "Pens" },
  { id: "t3", label: "Gift wrap" },
  { id: "t4", label: "Cards" },
];

const STORE_NAME = "Paper & Co";
const PRIMARY = "#0F766E";
const ACCENT = "#5EEAD4";
const LANDING_CONTENT = {
  headline: "Something worth waiting for.",
  subheadline: "Opening soon — be first to shop.",
  hours: "Mon–Sat · 9am–6pm",
  address: "14 Riverside Lane, Westlands",
  phone: "+254712000000",
  whatsapp: "254712000000",
  ctaLabel: "Message us",
};

export default async function ThemesGalleryPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    theme?: string;
    landing?: string;
    desktop?: string;
    signedIn?: string;
  }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const sp = await searchParams;
  const desktop = sp.desktop === "1";
  /** Simulate the server-rendered presence hint so "Account" can be checked. */
  const signedIn = sp.signedIn === "1";
  const themeId = (
    sp.theme && STORE_THEME_META.some((m) => m.id === sp.theme)
      ? sp.theme
      : "mart"
  ) as StoreThemeId;
  const landingId = (
    sp.landing && LANDING_TEMPLATE_META.some((m) => m.id === sp.landing)
      ? sp.landing
      : null
  ) as LandingTemplateId | null;

  if (landingId) {
    const Landing = resolveLandingPage(landingId);
    const landingProps: LandingTemplateProps = {
      storeName: STORE_NAME,
      templateId: landingId,
      primaryHex: PRIMARY,
      accentHex: ACCENT,
      logoUrl: null,
      logoDarkUrl: null,
      currency: "KES",
      countryCode: "KE",
      totalCount: DEMO_ITEMS.length,
      areaLabel: "Westlands, Nairobi",
      announcement: "Opening soon on the high street",
      catalogItems: DEMO_ITEMS,
      featured: DEMO_ITEMS,
      categories: DEMO_CATEGORIES,
      types: DEMO_TYPES,
      landingContent: LANDING_CONTENT,
      heroFallbackUrl: null,
    };
    return (
      <ShopCartPreviewProvider>
        <StorefrontSignInProvider
          surface="landing"
          storeName={STORE_NAME}
          hasPresence={signedIn}
        >
          <div className="min-h-screen bg-white">
            <Landing {...landingProps} />
          </div>
        </StorefrontSignInProvider>
      </ShopCartPreviewProvider>
    );
  }

  const Home = resolveStoreHome(themeId);
  const storeProps: StoreHomeTemplateProps = {
    themeId,
    slug: "preview",
    currency: "KES",
    catalogItems: DEMO_ITEMS,
    nextCursor: null,
    totalCount: DEMO_ITEMS.length,
    categories: DEMO_CATEGORIES,
    types: DEMO_TYPES,
    featured: DEMO_ITEMS,
    heroTitle: STORE_NAME,
    announcement: "Opening soon on the high street",
    primaryHex: PRIMARY,
    accentHex: ACCENT,
    logoUrl: null,
    logoDarkUrl: null,
    heroBannerUrls: null,
    showcaseImage: null,
    storefront: {
      businessName: STORE_NAME,
      slug: "preview",
      currency: "KES",
      catalogBranchId: "",
      catalogBranchName: "",
      label: null,
      announcement: "Opening soon on the high street",
      featured: DEMO_ITEMS,
    },
    landingContent: LANDING_CONTENT,
    design: null,
  };

  return (
    <ShopCartPreviewProvider>
      <StorefrontSignInProvider
        surface="storefront"
        storeName={STORE_NAME}
        hasPresence={signedIn}
      >
        <div
          data-gallery-theme={themeId}
          className="min-h-screen bg-[#e9e9e4] p-0 sm:p-6"
        >
          <div
            className={
              desktop
                ? "mx-auto w-full max-w-[1440px] overflow-hidden bg-white shadow-xl"
                : "mx-auto w-full max-w-[390px] overflow-hidden bg-white shadow-xl"
            }
          >
            <ShopStorefrontChrome
              preview
              slug="preview"
              headerTitle={STORE_NAME}
              logoUrl={null}
              logoDarkUrl={null}
              primaryHex={PRIMARY}
              accentHex={ACCENT}
              locationHint="Westlands, Nairobi"
              categories={DEMO_CATEGORIES}
              deliveryAreas={[]}
              chromeVariant={resolveStoreChromeVariant(themeId)}
              storeThemeId={themeId}
              hasPresence={signedIn}
              whatsappNumber="254712000000"
              initialDesign={null}
              announcement="Opening soon on the high street"
            >
              <Home {...storeProps} />
            </ShopStorefrontChrome>
          </div>
        </div>
      </StorefrontSignInProvider>
    </ShopCartPreviewProvider>
  );
}
