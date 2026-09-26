/**
 * Social-share metadata for storefront product pages.
 *
 * Tuned for Kenyan retail link previews (Facebook / WhatsApp): price-led
 * `og:title`, payment + contact `og:description`, and a dedicated 1200×630
 * card at `/og/product`. Browser / SERP title stays the plain product name.
 *
 * Kept free of `public-storefront` / template imports so unit tests can load
 * this module without pulling Next font loaders.
 */

import type { Metadata } from "next";

import { APP_BASE_URL } from "@/lib/config";
import { cloudinaryTransformUrl } from "@/lib/cloudinary-transform";
import { joinProductNameParts } from "@/lib/catalog-display";
import { formatKenyanPhoneDisplay } from "@/lib/kenyan-phone";
import { resolveCurrencyCode } from "@/lib/money";
import { shopItemPathFromCard } from "@/lib/shop-item-url";

const OG_DESCRIPTION_MAX = 180;

/** Max gallery slides exposed as extra `og:image` tags / Web Share files. */
export const PRODUCT_SHARE_CAROUSEL_MAX = 5;

/** Cloudinary pad to Facebook's preferred 1.91:1 share size. */
const OG_CLOUDINARY_PAD = "c_pad,w_1200,h_630,b_rgb:f7f4ef,q_auto:good,f_jpg";

/** Square crop for WhatsApp / Instagram album slides. */
const CAROUSEL_SHARE_CROP = "c_fill,w_1080,h_1080,q_auto:good,f_jpg";

/** Minimal product fields needed for share cards (avoids public-storefront import). */
export type ProductShareItem = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  variantName: string | null;
  currency: string;
  price: number | null;
  images: readonly { url: string }[];
};

export type ProductShareContact = {
  phone?: string | null;
  whatsapp?: string | null;
};

export type ProductShareSeoInput = {
  item: ProductShareItem;
  shopLabel: string;
  /** Absolute origin for this request (custom domain preferred). */
  origin: string;
  contact?: ProductShareContact | null;
};

function hasSharePrice(amount: number | null | undefined): amount is number {
  return amount != null && Number.isFinite(amount);
}

/** Prefer WhatsApp, then phone — digits for display grouping. */
export function resolveShareContactPhone(
  contact?: ProductShareContact | null,
): string | null {
  const raw = contact?.whatsapp?.trim() || contact?.phone?.trim() || "";
  if (!raw) return null;
  const display = formatKenyanPhoneDisplay(raw);
  return display || raw.replace(/\s+/g, "");
}

/**
 * Kenyan social price: `KSh 2,999/=` (no decimals). Other currencies use
 * compact whole units with the ISO code.
 */
export function formatSharePrice(currency: string, amount: number): string {
  const code = resolveCurrencyCode(currency);
  const whole = Math.round(amount);
  if (code === "KES") {
    return `KSh ${whole.toLocaleString("en-KE")}/=`;
  }
  return `${code} ${whole.toLocaleString("en")}`;
}

export function productShareHeading(item: ProductShareItem): string {
  return item.variantName
    ? joinProductNameParts(item.name, item.variantName)
    : item.name;
}

/** Facebook / WhatsApp headline — price-first when catalog has a price. */
export function productShareOgTitle(item: ProductShareItem): string {
  if (hasSharePrice(item.price)) {
    return `🔥 ONLY ${formatSharePrice(item.currency, item.price)} — Order Now`;
  }
  return `✨ ${productShareHeading(item)}`;
}

/** Compact call-to-action blurb under the share title. */
export function productShareOgDescription(
  item: ProductShareItem,
  contact?: ProductShareContact | null,
): string {
  const heading = productShareHeading(item);
  const phone = resolveShareContactPhone(contact);
  const parts: string[] = [
    `✨ ${heading}`,
    "✅ Payment on delivery",
    "🚚 Fast delivery",
  ];
  if (phone) {
    parts.push(`📞 WhatsApp ${phone}`);
  }
  const joined = parts.join(" · ").replace(/\s+/g, " ").trim();
  if (joined.length <= OG_DESCRIPTION_MAX) return joined;
  return `${joined.slice(0, OG_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/**
 * Absolute `/og/product` card URL. Includes slug + item id so the image route
 * can load the right variant without reading the HTML query string.
 */
export function productShareOgImageUrl(input: {
  origin: string;
  slug: string;
  itemId: string;
}): string {
  const base = input.origin.replace(/\/+$/, "");
  const params = new URLSearchParams({
    slug: input.slug,
    item: input.itemId,
  });
  return `${base}/og/product?${params.toString()}`;
}

/**
 * Direct Cloudinary pad fallback when the dynamic card is unavailable
 * (e.g. desktop static export). Prefer {@link productShareOgImageUrl} in cloud.
 */
export function productShareCloudinaryOgImage(
  imageUrl: string | null | undefined,
): string | null {
  const raw = imageUrl?.trim();
  if (!raw) return null;
  return cloudinaryTransformUrl(raw, OG_CLOUDINARY_PAD) ?? raw;
}

/**
 * Gallery URLs sized for multi-photo shares (WhatsApp album / Instagram).
 * Dedupes and caps at {@link PRODUCT_SHARE_CAROUSEL_MAX}.
 */
export function productShareCarouselUrls(
  item: Pick<ProductShareItem, "images">,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const img of item.images) {
    const raw = img.url?.trim();
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    const sized = cloudinaryTransformUrl(raw, CAROUSEL_SHARE_CROP) ?? raw;
    out.push(sized);
    if (out.length >= PRODUCT_SHARE_CAROUSEL_MAX) break;
  }
  return out;
}

/**
 * Extra `og:image` entries (padded 1200×630) after the branded `/og/product`
 * card — some crawlers surface multiple images as a lightbox/carousel.
 */
export function productShareOgGalleryImages(
  item: ProductShareItem,
  heading: string,
): { url: string; width: number; height: number; alt: string }[] {
  const seen = new Set<string>();
  const out: { url: string; width: number; height: number; alt: string }[] = [];
  for (const img of item.images) {
    const padded = productShareCloudinaryOgImage(img.url);
    if (!padded || seen.has(padded)) continue;
    seen.add(padded);
    out.push({
      url: padded,
      width: 1200,
      height: 630,
      alt: `${heading} · ${out.length + 1}`,
    });
    if (out.length >= PRODUCT_SHARE_CAROUSEL_MAX) break;
  }
  return out;
}

/** Resolve share origin from the request Host (custom domain over APP_BASE_URL). */
export function absoluteOriginFromHost(host: string | null): string {
  if (host) {
    const lower = host.trim().toLowerCase();
    const localDev =
      lower.includes("localhost") ||
      lower.startsWith("127.0.0.1") ||
      lower.endsWith(".local");
    const protocol = localDev ? "http" : "https";
    try {
      return new URL(`${protocol}://${host.trim()}`).origin;
    } catch {
      /* fall through */
    }
  }
  return APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
}

/** Pre-filled WhatsApp body — *bold* markers render in WhatsApp. */
export function productShareMessage(
  item: ProductShareItem,
  productUrl: string,
  contact?: ProductShareContact | null,
  shopLabel?: string | null,
): string {
  const heading = productShareHeading(item);
  const price = hasSharePrice(item.price)
    ? formatSharePrice(item.currency, item.price)
    : null;
  const phone = resolveShareContactPhone(contact);
  const shop = shopLabel?.trim();

  const lines: string[] = [
    "✨ *NEW IN!*",
    "",
    shop ? `_${shop}_` : null,
    `*${heading}*`,
    "",
    price ? `💰 *ONLY ${price}*` : null,
    price ? "" : null,
    "✅ Payment on delivery",
    "🚚 Order online · delivered fast",
    phone ? `📞 WhatsApp: *${phone}*` : null,
    "",
    "👇 Tap to order:",
    productUrl,
  ].filter((line): line is string => line != null);

  return lines.join("\n");
}

export function buildProductShareMetadata(
  input: ProductShareSeoInput & { slug: string },
): Metadata {
  const { item, shopLabel, origin, contact, slug } = input;
  const heading = productShareHeading(item);
  const serpTitle = `${heading} · ${shopLabel}`;
  const ogTitle = productShareOgTitle(item);
  const ogDescription = productShareOgDescription(item, contact);
  const canonicalPath = shopItemPathFromCard(item);
  const canonical = `${origin.replace(/\/+$/, "")}${canonicalPath}`;
  const ogCard = productShareOgImageUrl({
    origin,
    slug,
    itemId: item.id,
  });
  const gallery = productShareOgGalleryImages(item, heading);

  const images = [
    {
      url: ogCard,
      width: 1200,
      height: 630,
      alt: heading,
    },
    ...gallery,
  ];

  return {
    title: serpTitle,
    description: ogDescription,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      type: "website",
      siteName: shopLabel,
      locale: "en_KE",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogCard],
    },
  };
}
