import type { SupplierRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeDecode(segment: string): string {
  const t = segment.trim();
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

/** Tenant supplier URL segment from display name (e.g. Jamro → jamro). */
export function slugifySupplierSegment(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}

/** Canonical path slug for a tenant supplier — name-based. */
export function supplierSlug(
  supplier: Pick<SupplierRecord, "name" | "code">,
): string {
  const fromName = slugifySupplierSegment(supplier.name);
  if (fromName) return fromName;
  const fromCode = supplier.code?.trim()
    ? slugifySupplierSegment(supplier.code)
    : "";
  return fromCode || "supplier";
}

export function supplierReceivePath(
  supplier: Pick<SupplierRecord, "name" | "code">,
): string {
  return APP_ROUTES.supplier(supplierSlug(supplier));
}

export function isSupplierIdSegment(segment: string): boolean {
  return UUID_RE.test(safeDecode(segment));
}

export function supplierMatchesSlug(
  supplier: Pick<SupplierRecord, "id" | "name" | "code">,
  segment: string,
): boolean {
  const needle = safeDecode(segment).toLowerCase();
  if (!needle) return false;
  if (UUID_RE.test(needle) && supplier.id.toLowerCase() === needle) {
    return true;
  }
  if (supplierSlug(supplier) === needle) return true;
  const codeSlug = supplier.code?.trim()
    ? slugifySupplierSegment(supplier.code)
    : "";
  return Boolean(codeSlug && codeSlug === needle);
}

export type ResolveSupplierSlugResult = {
  match: SupplierRecord | null;
  candidates: SupplierRecord[];
};

/** Pick the unique supplier for a slug, or return all ambiguous candidates. */
export function resolveSupplierFromSlug(
  suppliers: SupplierRecord[],
  segment: string,
): ResolveSupplierSlugResult {
  const needle = safeDecode(segment);
  if (!needle) {
    return { match: null, candidates: [] };
  }

  const candidates = suppliers.filter((s) => supplierMatchesSlug(s, needle));
  if (candidates.length === 1) {
    return { match: candidates[0]!, candidates };
  }
  return { match: null, candidates };
}

/** Search hint derived from a slug (jamro-ltd → "jamro ltd"). */
export function supplierSlugSearchHint(segment: string): string {
  return safeDecode(segment).replace(/-/g, " ").trim();
}
