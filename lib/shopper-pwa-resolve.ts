import "server-only";

import { getServerApiOrigin } from "@/lib/config";
import { formatMoney } from "@/lib/money";

export type ShopperPwaProduct = {
  name: string;
  price: string | null;
};

export type ShopperPwaProfile = {
  slug: string;
  name: string;
  description: string | null;
  themeColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  appIconUrl: string | null;
  tenantHost: string | null;
  products: ShopperPwaProduct[];
};

/** Keep this module free of next/font — ImageResponse routes import it. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function sanitizeSlug(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "/" || s === "." || s === "..") return null;
  return SLUG_RE.test(s) ? s : null;
}

function parseHex(value?: string | null): string | null {
  const raw = value?.trim() ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const body = raw.slice(1);
    return `#${body.split("").map((c) => c + c).join("")}`.toLowerCase();
  }
  return null;
}

type MobileJson = {
  displayName?: string | null;
  tenantHost?: string | null;
  branding?: {
    displayName?: string | null;
    metaDescription?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    appIconUrl?: string | null;
  };
};

type StorefrontJson = {
  label?: string | null;
  businessName?: string | null;
  currency?: string | null;
  featured?: Array<{
    name?: string | null;
    sku?: string | null;
    price?: number | null;
  }>;
};

const JSON_FETCH = {
  headers: { Accept: "application/json" },
  next: { revalidate: 60 },
} as const;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getServerApiOrigin()}${path}`, JSON_FETCH);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function fallbackProfile(slug: string): ShopperPwaProfile {
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    slug,
    name,
    description: null,
    themeColor: "#0D9488",
    accentColor: null,
    logoUrl: null,
    faviconUrl: null,
    appIconUrl: null,
    tenantHost: null,
    products: [],
  };
}

export async function resolveShopperPwaProfile(
  rawSlug: string,
): Promise<ShopperPwaProfile | null> {
  const slug = sanitizeSlug(rawSlug);
  if (!slug) return null;

  const encoded = encodeURIComponent(slug);
  const [config, storefront] = await Promise.all([
    fetchJson<MobileJson>(`/api/v1/public/businesses/${encoded}/mobile`),
    fetchJson<StorefrontJson>(
      `/api/v1/public/businesses/${encoded}/storefront`,
    ),
  ]);

  if (config || storefront) {
    const name =
      config?.displayName?.trim() ||
      config?.branding?.displayName?.trim() ||
      storefront?.label?.trim() ||
      storefront?.businessName?.trim() ||
      slug;

    const products: ShopperPwaProduct[] = (storefront?.featured ?? [])
      .slice(0, 4)
      .map((item) => ({
        name: item.name?.trim() || item.sku?.trim() || "Item",
        price:
          item.price != null
            ? formatMoney(item.price, storefront?.currency)
            : null,
      }));

    return {
      slug,
      name,
      description: config?.branding?.metaDescription?.trim() || null,
      themeColor: parseHex(config?.branding?.primaryColor),
      accentColor: parseHex(config?.branding?.accentColor),
      logoUrl: config?.branding?.logoUrl?.trim() || null,
      faviconUrl: config?.branding?.faviconUrl?.trim() || null,
      appIconUrl: config?.branding?.appIconUrl?.trim() || null,
      tenantHost: config?.tenantHost?.trim() || null,
      products,
    };
  }

  return fallbackProfile(slug);
}

export type ShopperPwaMarkSource = {
  src: string | null;
  fillFrame: boolean;
};

async function rasterDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/") || type.includes("svg")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength < 32 || bytes.byteLength > 1_500_000) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function loadShopperPwaMarkSrc(
  profile: ShopperPwaProfile,
): Promise<ShopperPwaMarkSource> {
  const app = profile.appIconUrl?.trim();
  if (app) {
    const src = await rasterDataUrl(app);
    if (src) return { src, fillFrame: true };
  }
  for (const url of [profile.faviconUrl, profile.logoUrl]) {
    const trimmed = url?.trim();
    if (!trimmed) continue;
    const src = await rasterDataUrl(trimmed);
    if (src) return { src, fillFrame: false };
  }
  return { src: null, fillFrame: false };
}
