/**
 * Per-slug shopper PWA identity.
 *
 * Browsers key an installed app by origin + manifest `id`. Each shop therefore
 * needs a stable slug id, PNG icons, and — when the visitor is still on the
 * platform apex — a handoff onto that shop's own host so Palmart and Sunrise
 * never share one "Kiosk" home-screen icon.
 */

import { APP_ROUTES, hostDerivedShopUrl, PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import { stripLeadingWww, tenantHostsMatch } from "@/lib/tenant-host";

/** Fallback when a shop has not set a brand colour (matches platform green). */
const FALLBACK_THEME_COLOR = "#28A745";

const STOREFRONT_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function sanitizeShopperPwaSlug(
  raw: string | null | undefined,
): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "/" || s === "." || s === "..") return null;
  return STOREFRONT_SLUG_RE.test(s) ? s : null;
}

export const SHOPPER_PWA_ICON_SIZES = [180, 192, 512] as const;
export type ShopperPwaIconSize = (typeof SHOPPER_PWA_ICON_SIZES)[number];

export const SHOPPER_PWA_START_UTM = "/?utm_source=pwa";

const BARE_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export type ShopperPwaIcon = {
  src: string;
  sizes: string;
  type: "image/png";
  purpose: "any" | "maskable";
};

export type ShopperPwaScreenshot = {
  src: string;
  sizes: string;
  type: "image/png";
  form_factor: "narrow" | "wide";
  label: string;
};

export type ShopperPwaShortcut = {
  name: string;
  short_name: string;
  url: string;
  icons: ShopperPwaIcon[];
};

export type ShopperPwaManifest = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: "standalone";
  display_override: Array<"standalone" | "minimal-ui" | "browser">;
  orientation: "portrait-primary";
  background_color: string;
  theme_color: string;
  icons: ShopperPwaIcon[];
  screenshots: ShopperPwaScreenshot[];
  shortcuts: ShopperPwaShortcut[];
  categories: string[];
  lang: string;
  dir: "ltr";
  prefer_related_applications: false;
  handle_links: "preferred";
  launch_handler: { client_mode: Array<"focus-existing" | "auto"> };
};

export function shopperPwaPath(slug: string): string {
  return APP_ROUTES.shopperPwa(slug);
}

export function shopperPwaManifestPath(slug: string): string {
  return `${shopperPwaPath(slug)}/manifest.webmanifest`;
}

export function shopperPwaIconPath(
  slug: string,
  size: ShopperPwaIconSize,
  purpose: "any" | "maskable" = "any",
): string {
  const base = `${shopperPwaPath(slug)}/icon/${size}`;
  return purpose === "maskable" ? `${base}?purpose=maskable` : base;
}

export function shopperPwaScreenshotPath(
  slug: string,
  kind: "narrow" | "wide",
): string {
  return `${shopperPwaPath(slug)}/screenshot/${kind}`;
}

/** Manifest `id` — unique per shop on a given origin. */
export function shopperPwaId(slug: string): string {
  return `/pwa/${slug}`;
}

export function shopperPwaShortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 11).trimEnd()}…`;
}

function isBareLocalHost(host: string): boolean {
  return BARE_LOCAL_HOSTS.has(stripLeadingWww(host));
}

function isLocalishHost(host: string): boolean {
  const h = stripLeadingWww(host);
  return isBareLocalHost(h) || h.endsWith(".localhost");
}

/** True when this request host is already an origin that can own this shop's PWA. */
export function isShopperPwaHost(input: {
  slug: string;
  tenantHost?: string | null;
  currentHost: string;
}): boolean {
  const slug = sanitizeShopperPwaSlug(input.slug);
  if (!slug) return false;
  const host = stripLeadingWww(input.currentHost);
  if (tenantHostsMatch(host, `${slug}.localhost`)) return true;
  if (tenantHostsMatch(host, `${slug}.${PLATFORM_DOMAIN}`)) return true;
  const mapped = input.tenantHost?.trim();
  if (mapped && tenantHostsMatch(host, mapped)) return true;
  return false;
}

/**
 * Absolute URL on the shop's own host, or `null` when the visitor is
 * already there (so the current origin can be the installed app).
 */
export function shopperPwaHandoffUrl(input: {
  slug: string;
  tenantHost?: string | null;
  currentHost: string;
  path?: string;
}): string | null {
  const slug = sanitizeShopperPwaSlug(input.slug);
  if (!slug) return null;
  if (isShopperPwaHost({ ...input, slug })) return null;

  const path = input.path ?? shopperPwaPath(slug);
  let origin = "";
  if (isLocalishHost(input.currentHost)) {
    origin = hostDerivedShopUrl(`${slug}.localhost`);
  } else {
    const mapped = input.tenantHost?.trim();
    origin = mapped
      ? hostDerivedShopUrl(mapped)
      : slugDerivedShopUrl(slug);
  }
  if (!origin) {
    origin = slugDerivedShopUrl(slug);
  }
  if (!origin) return null;
  return `${origin.replace(/\/+$/, "")}${path}`;
}

export function shopperPwaStartUrl(onTenantHost: boolean): string {
  return onTenantHost ? SHOPPER_PWA_START_UTM : APP_ROUTES.shop;
}

export function parseShopperPwaIconSize(
  raw: string | null | undefined,
): ShopperPwaIconSize | null {
  const n = Number.parseInt((raw ?? "").replace(/\.(png|jpg|jpeg|webp)$/i, ""), 10);
  return (SHOPPER_PWA_ICON_SIZES as readonly number[]).includes(n)
    ? (n as ShopperPwaIconSize)
    : null;
}

function iconEntries(slug: string): ShopperPwaIcon[] {
  return [
    {
      src: shopperPwaIconPath(slug, 192),
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: shopperPwaIconPath(slug, 512),
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: shopperPwaIconPath(slug, 512, "maskable"),
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
}

export function buildShopperPwaManifest(input: {
  slug: string;
  name: string;
  description?: string | null;
  themeColor?: string | null;
  onTenantHost: boolean;
}): ShopperPwaManifest {
  const slug = sanitizeShopperPwaSlug(input.slug) ?? "shop";
  const name = input.name.trim() || "Shop";
  const theme = input.themeColor?.trim() || FALLBACK_THEME_COLOR;
  const icons = iconEntries(slug);
  const shortcutIcon: ShopperPwaIcon[] = [
    {
      src: shopperPwaIconPath(slug, 192),
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
  ];

  return {
    id: shopperPwaId(slug),
    name,
    short_name: shopperPwaShortName(name),
    description:
      input.description?.trim() || `Browse and order from ${name}.`,
    start_url: shopperPwaStartUrl(input.onTenantHost),
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait-primary",
    background_color: "#f4f5f4",
    theme_color: theme,
    icons,
    screenshots: [
      {
        src: shopperPwaScreenshotPath(slug, "narrow"),
        sizes: "720x1280",
        type: "image/png",
        form_factor: "narrow",
        label: `${name} on your phone`,
      },
      {
        src: shopperPwaScreenshotPath(slug, "wide"),
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: `${name} on a tablet`,
      },
    ],
    shortcuts: [
      {
        name: "Shop",
        short_name: "Shop",
        url: input.onTenantHost ? "/" : APP_ROUTES.shop,
        icons: shortcutIcon,
      },
      {
        name: "Cart",
        short_name: "Cart",
        url: APP_ROUTES.shopCart,
        icons: shortcutIcon,
      },
      {
        name: "Orders",
        short_name: "Orders",
        url: APP_ROUTES.shopAccount,
        icons: shortcutIcon,
      },
    ],
    categories: ["shopping", "food"],
    lang: "en-KE",
    dir: "ltr",
    prefer_related_applications: false,
    handle_links: "preferred",
    launch_handler: { client_mode: ["focus-existing", "auto"] },
  };
}
