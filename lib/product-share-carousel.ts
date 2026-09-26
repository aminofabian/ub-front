/**
 * Client-side product share — WhatsApp-first promo text, plus optional photo
 * album (promo card + gallery) via the Web Share API.
 */

import {
  PRODUCT_SHARE_CAROUSEL_MAX,
  productShareCarouselUrls,
  productShareHeading,
  productShareMessage,
  productShareOgImageUrl,
  productShareSocialCaption,
  productShareTweetText,
  type ProductShareContact,
  type ProductShareItem,
} from "@/lib/product-share-seo";

export type ShareProductResult =
  | "shared-carousel"
  | "shared-link"
  | "opened-whatsapp"
  | "opened-facebook"
  | "opened-twitter"
  | "opened-instagram"
  | "copied"
  | "aborted";

/** @deprecated Use {@link ShareProductResult}. */
export type ShareProductCarouselResult = ShareProductResult;

function extensionForType(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

/** Fetch gallery / promo images as Files for `navigator.share({ files })`. */
export async function fetchProductShareFiles(
  imageUrls: readonly string[],
  fileStem = "product",
): Promise<File[]> {
  const files: File[] = [];
  const limit = Math.min(imageUrls.length, PRODUCT_SHARE_CAROUSEL_MAX + 1);
  for (let i = 0; i < limit; i++) {
    const url = imageUrls[i];
    if (!url) continue;
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/") && blob.size < 32) continue;
      const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
      files.push(
        new File([blob], `${fileStem}-${i + 1}.${extensionForType(type)}`, {
          type,
        }),
      );
    } catch {
      /* CORS / network — skip this slide */
    }
  }
  return files;
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function facebookShareUrl(productUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
}

export function twitterShareUrl(productUrl: string, text: string): string {
  const params = new URLSearchParams({
    url: productUrl,
    text,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

function openShareWindow(url: string): boolean {
  const opened = window.open(url, "_blank", "noopener,noreferrer,width=640,height=720");
  return Boolean(opened);
}

/**
 * Image list for album share: branded OG poster first, then gallery slides.
 */
export function productShareAlbumUrls(opts: {
  item: ProductShareItem;
  origin: string;
  slug: string;
}): string[] {
  const poster = productShareOgImageUrl({
    origin: opts.origin,
    slug: opts.slug,
    itemId: opts.item.id,
  });
  const gallery = productShareCarouselUrls(opts.item);
  const seen = new Set<string>([poster]);
  const out = [poster];
  for (const url of gallery) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= PRODUCT_SHARE_CAROUSEL_MAX + 1) break;
  }
  return out;
}

async function tryWebShare(data: ShareData): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
    return false;
  }
  await navigator.share(data);
  return true;
}

/** Open WhatsApp with the promo caption (+ link). */
export async function shareProductToWhatsApp(opts: {
  item: ProductShareItem;
  productUrl: string;
  contact?: ProductShareContact | null;
  shopLabel?: string | null;
}): Promise<ShareProductResult> {
  const message = productShareMessage(
    opts.item,
    opts.productUrl,
    opts.contact,
    opts.shopLabel,
  );
  const wa = whatsAppShareUrl(message);
  if (!openShareWindow(wa)) {
    try {
      await navigator.clipboard.writeText(message);
      return "copied";
    } catch {
      window.location.href = wa;
      return "opened-whatsapp";
    }
  }
  return "opened-whatsapp";
}

/** Facebook share dialog — OG card (poster + price) loads from the product URL. */
export async function shareProductToFacebook(opts: {
  productUrl: string;
}): Promise<ShareProductResult> {
  const url = facebookShareUrl(opts.productUrl);
  if (!openShareWindow(url)) {
    try {
      await navigator.clipboard.writeText(opts.productUrl);
      return "copied";
    } catch {
      window.location.href = url;
      return "opened-facebook";
    }
  }
  return "opened-facebook";
}

/** X (Twitter) intent with punchy text + link card. */
export async function shareProductToTwitter(opts: {
  item: ProductShareItem;
  productUrl: string;
  shopLabel?: string | null;
}): Promise<ShareProductResult> {
  const text = productShareTweetText(opts.item, opts.shopLabel);
  const url = twitterShareUrl(opts.productUrl, text);
  if (!openShareWindow(url)) {
    try {
      await navigator.clipboard.writeText(`${text}\n${opts.productUrl}`);
      return "copied";
    } catch {
      window.location.href = url;
      return "opened-twitter";
    }
  }
  return "opened-twitter";
}

/**
 * Instagram has no web share URL — copy a Stories/caption-ready line, then
 * hand off the promo poster (+ gallery) via the OS share sheet so the shopper
 * can pick Instagram.
 */
export async function shareProductToInstagram(opts: {
  item: ProductShareItem;
  productUrl: string;
  origin: string;
  slug: string;
  shopLabel?: string | null;
  contact?: ProductShareContact | null;
}): Promise<ShareProductResult> {
  const caption = productShareSocialCaption(
    opts.item,
    opts.productUrl,
    opts.shopLabel,
  );
  try {
    await navigator.clipboard.writeText(caption);
  } catch {
    /* clipboard optional — still try photo handoff */
  }

  const title = productShareHeading(opts.item);
  const urls = productShareAlbumUrls({
    item: opts.item,
    origin: opts.origin,
    slug: opts.slug,
  });

  try {
    const files = await fetchProductShareFiles(urls.slice(0, 3), "story");
    if (files.length > 0) {
      const shared = await tryWebShare({
        files,
        title,
        text: caption,
      });
      if (shared) return "opened-instagram";
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "aborted";
    }
  }

  // Caption already copied — shopper opens IG and pastes.
  return "opened-instagram";
}

/** Share promo poster + gallery as a photo album when the OS allows. */
export async function shareProductPhotos(opts: {
  item: ProductShareItem;
  productUrl: string;
  origin: string;
  slug: string;
  contact?: ProductShareContact | null;
  shopLabel?: string | null;
}): Promise<ShareProductResult> {
  const message = productShareMessage(
    opts.item,
    opts.productUrl,
    opts.contact,
    opts.shopLabel,
  );
  const title = productShareHeading(opts.item);
  const urls = productShareAlbumUrls({
    item: opts.item,
    origin: opts.origin,
    slug: opts.slug,
  });

  try {
    const files = await fetchProductShareFiles(urls, "deal");
    if (files.length > 0) {
      const shared = await tryWebShare({
        files,
        title,
        text: message,
      });
      if (shared) {
        return files.length > 1 ? "shared-carousel" : "shared-link";
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "aborted";
    }
  }

  return shareProductToWhatsApp(opts);
}

/**
 * Best-effort share: photo album when possible, else WhatsApp caption.
 * Kept for callers that want a single entry point.
 */
export async function shareProductCarousel(opts: {
  item: ProductShareItem;
  productUrl: string;
  contact?: ProductShareContact | null;
  shopLabel?: string | null;
  origin?: string;
  slug?: string;
  imageUrls?: readonly string[];
}): Promise<ShareProductResult> {
  const origin =
    opts.origin ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const slug = opts.slug?.trim();

  if (slug && origin) {
    return shareProductPhotos({
      item: opts.item,
      productUrl: opts.productUrl,
      origin,
      slug,
      contact: opts.contact,
      shopLabel: opts.shopLabel,
    });
  }

  const message = productShareMessage(
    opts.item,
    opts.productUrl,
    opts.contact,
    opts.shopLabel,
  );
  const title = productShareHeading(opts.item);
  const urls =
    opts.imageUrls?.length ?
      [...opts.imageUrls].slice(0, PRODUCT_SHARE_CAROUSEL_MAX)
    : productShareCarouselUrls(opts.item);

  try {
    if (urls.length > 0) {
      const files = await fetchProductShareFiles(urls, "deal");
      if (files.length > 0) {
        const shared = await tryWebShare({ files, title, text: message });
        if (shared) {
          return files.length > 1 ? "shared-carousel" : "shared-link";
        }
      }
    }
    const shared = await tryWebShare({
      title,
      text: message,
      url: opts.productUrl,
    });
    if (shared) return "shared-link";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "aborted";
    }
  }

  return shareProductToWhatsApp(opts);
}

export async function copyProductShareMessage(opts: {
  item: ProductShareItem;
  productUrl: string;
  contact?: ProductShareContact | null;
  shopLabel?: string | null;
}): Promise<"copied" | "failed"> {
  const message = productShareMessage(
    opts.item,
    opts.productUrl,
    opts.contact,
    opts.shopLabel,
  );
  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "failed";
  }
}
