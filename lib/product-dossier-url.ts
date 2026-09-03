import { slugifyStorefrontItemSegment } from "@/lib/shop-item-url";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function productDossierPath(item: {
  id: string;
  name?: string | null;
}): string {
  const handle = slugifyStorefrontItemSegment(item.name ?? "") || "product";
  return `/products/p/${encodeURIComponent(`${handle}--${item.id}`)}`;
}

export function parseProductDossierSlug(slug: string): string | null {
  let decoded = slug.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // already decoded
  }
  if (UUID_RE.test(decoded)) return decoded;
  const idx = decoded.lastIndexOf("--");
  if (idx >= 0) {
    const id = decoded.slice(idx + 2).trim();
    if (UUID_RE.test(id)) return id;
  }
  return null;
}
