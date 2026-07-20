/**
 * Phase 15 — public storefront catalog (no JWT). Server components use {@link getServerApiOrigin}.
 */

import { getServerApiOrigin } from "@/lib/config";
import { resolvePublicItemIdFromShopUrlSegment } from "@/lib/shop-item-url";

export type PublicCatalogItemCard = {
  id: string;
  sku: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
  /** Sum of active inventory batch qty remaining at the storefront catalog branch. */
  qtyOnHand?: number | null;
  /** Latest buying price across all suppliers (most recent effectiveFrom). */
  buyingPrice?: number | null;
  /** web_cart | in_store_only — weighed butcher cuts are in-store only (P5). */
  onlinePurchaseMode?: string | null;
};

export type PublicDeliveryArea = {
  id: string;
  name: string;
  active: boolean;
};

export type PublicStorefrontPayload = {
  businessName: string;
  slug: string;
  currency: string;
  catalogBranchId: string;
  catalogBranchName: string;
  label: string | null;
  announcement: string | null;
  featured: PublicCatalogItemCard[];
  /** Catalog item types (departments) with in-stock published counts. */
  types?: PublicCatalogType[];
  /** Active delivery areas shoppers may select. */
  deliveryAreas?: PublicDeliveryArea[];
};

export type PublicCatalogType = {
  id: string;
  label: string;
  icon?: string | null;
  itemCount?: number;
};

/** @deprecated Use {@link PublicCatalogType}. */
export type PublicDepartment = PublicCatalogType;

export type PublicItemImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type PublicCatalogVariant = {
  id: string;
  sku: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
  qtyOnHand?: number | null;
  onlinePurchaseMode?: string | null;
};

export type PublicBarcodeLookup = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string | null;
  brand: string | null;
  size: string | null;
  businessName: string;
  businessSlug: string;
  currency: string;
  price: number | null;
  qtyOnHand: number | null;
  images: PublicItemImage[];
  /** Non-null when this is a variant — the parent item's name. */
  parentName: string | null;
  /** The variant's own label (e.g. "500ml"). Null for standalone items. */
  variantName: string | null;
};

export type PublicCatalogItemDetail = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  variantName: string | null;
  parentItemId: string | null;
  currency: string;
  price: number | null;
  qtyOnHand?: number | null;
  images: PublicItemImage[];
  variants: PublicCatalogVariant[];
  onlinePurchaseMode?: string | null;
};

export const STOREFRONT_ONLINE_IN_STORE_ONLY = "in_store_only";

export function isStorefrontInStoreOnly(
  mode: string | null | undefined,
): boolean {
  return (mode ?? "").toLowerCase() === STOREFRONT_ONLINE_IN_STORE_ONLY;
}

export type PublicCatalogListPayload = {
  currency: string;
  items: PublicCatalogItemCard[];
  nextCursor: string | null;
  /** Present on the first page; omitted on cursor pages (clients keep the initial total). */
  totalCount?: number | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  /** Emoji / key, or HTTPS URL for a custom icon image (Cloudinary). */
  icon?: string | null;
  itemCount?: number;
};

export type PublicCategoryListPayload = {
  categories: PublicCategory[];
};

export type PublicDepartmentListPayload = {
  types: PublicCatalogType[];
};

export type TenantStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export type TenantBranding = {
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  /** Custom SEO title override for the storefront */
  metaTitle: string | null;
  /** Custom meta description for search-engine snippets */
  metaDescription: string | null;
  /** Dedicated Open Graph image URL (overrides logo for social previews) */
  ogImage: string | null;
  /** Comma-separated meta keywords */
  metaKeywords: string | null;
  /** Hero banner image URLs for the storefront carousel */
  heroBannerUrls: string[] | null;
};

export type TenantPasswordPolicy = {
  minLength: number;
  requireNumber: boolean;
  requireSymbol: boolean;
};

export type TenantAuthConfig = {
  methods: string[];
  ssoProviders: string[];
  passwordPolicy: TenantPasswordPolicy;
};

/**
 * Single tenant-context payload returned by the public host-resolve endpoint.
 * Drives storefront branding, auth-method UI, and feature gates.
 */
export type TenantContext = {
  tenantId: string;
  tenantName: string;
  slug: string;
  status: TenantStatus;
  branding: TenantBranding;
  authConfig: TenantAuthConfig;
  featureFlags: Record<string, boolean>;
  storefrontEnabled: boolean;
  resolvedAt: string;
  /** ISO-3166 alpha-2 when known (e.g. KE). */
  countryCode: string | null;
  /**
   * Short area/locality labels from onboarding + active branches
   * (e.g. Westlands) for SEO snippets.
   */
  branchLocalities: string[];
};

const DEFAULT_REVALIDATE_SEC = 60;
const HOST_RESOLVE_REVALIDATE_SEC = 60;

/** Catalog, PDP, and storefront payload include live prices — avoid Data Cache staleness. */
const STORE_PRICE_FETCH_INIT = {
  cache: "no-store" as const,
  headers: { Accept: "application/json" },
};

/** Matches backend `Business` slug rules (lowercase alnum + hyphens). */
const PUBLIC_STOREFRONT_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Returns a safe catalog path slug, or `null` if the value cannot be used in
 * `/api/v1/public/businesses/{slug}/…` (e.g. `"/"`, `".."`, empty, or stray
 * punctuation). Prevents env typos like `NEXT_PUBLIC_STOREFRONT_SLUG=/` from
 * breaking the storefront with a misleading "catalog rejected slug" error.
 */
export function sanitizeStorefrontSlug(
  raw: string | null | undefined,
): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "/" || s === "." || s === "..") {
    return null;
  }
  return PUBLIC_STOREFRONT_SLUG_RE.test(s) ? s : null;
}

function slugifyTenantNameForCatalog(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/^-+|-+$/g, "");
  const cleaned = sanitizeStorefrontSlug(base);
  if (cleaned) {
    return cleaned;
  }
  return "store";
}

export function storefrontSlugFromEnv(): string | null {
  return sanitizeStorefrontSlug(process.env.NEXT_PUBLIC_STOREFRONT_SLUG);
}

export type CatalogStockStatus = "in_stock" | "low_stock" | "out_of_stock";

const PACKAGING_VARIANT_KEYWORDS = new Set([
  "nylon",
  "glass",
  "jar",
  "bag",
  "sack",
  "tin",
  "box",
  "bottle",
  "packet",
  "pouch",
  "can",
  "carton",
  "crate",
  "tray",
  "tub",
]);

const COLOR_VARIANT_KEYWORDS = new Set([
  "white",
  "red",
  "black",
  "brown",
  "green",
  "yellow",
]);

/** Customer-facing stock state for catalog cards (no raw quantities). */
export function catalogStockStatus(
  qtyOnHand: number | null | undefined,
): CatalogStockStatus | null {
  if (qtyOnHand == null || !Number.isFinite(qtyOnHand)) {
    return null;
  }
  if (qtyOnHand <= 0) {
    return "out_of_stock";
  }
  if (qtyOnHand <= 5) {
    return "low_stock";
  }
  return "in_stock";
}

export function formatCatalogStockLabel(
  qtyOnHand: number | null | undefined,
): string | null {
  const status = catalogStockStatus(qtyOnHand);
  if (!status) {
    return null;
  }
  switch (status) {
    case "out_of_stock":
      return "Out of stock";
    case "low_stock":
      return "Low stock";
    case "in_stock":
      return "In stock";
  }
}

/**
 * Turn raw variant labels (e.g. "Nylon", "1Kg", "Kg") into a readable subtitle.
 */
export function formatCatalogVariantSubtitle(
  variantName: string | null | undefined,
): string | null {
  const raw = variantName?.trim();
  if (!raw) {
    return null;
  }

  const compactWeight = raw.match(/^(\d+(?:\.\d+)?)\s*(kg|g|lb|oz|l|ml)$/i);
  if (compactWeight) {
    const [, amount, unit] = compactWeight;
    return `${amount} ${unit.toLowerCase()}`;
  }

  const spacedWeight = raw.match(/^(\d+(?:\.\d+)?)\s+(kg|g|lb|oz|l|ml)$/i);
  if (spacedWeight) {
    const [, amount, unit] = spacedWeight;
    return `${amount} ${unit.toLowerCase()}`;
  }

  const lower = raw.toLowerCase();
  if (/^(kg|g|lb|oz|l|ml)$/.test(lower)) {
    return `Sold by ${lower}`;
  }
  if (PACKAGING_VARIANT_KEYWORDS.has(lower)) {
    return `${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()} pack`;
  }
  if (COLOR_VARIANT_KEYWORDS.has(lower)) {
    return `${raw.charAt(0).toUpperCase()}${raw.slice(1).toLowerCase()}`;
  }

  return raw;
}

/** On-hand quantity at the storefront catalog branch (public catalog API). */
export function formatStoreQty(
  qtyOnHand: number | null | undefined,
): string | null {
  if (qtyOnHand == null || !Number.isFinite(qtyOnHand)) {
    return null;
  }
  const q = qtyOnHand;
  if (q <= 0) {
    return "0 in store";
  }
  const isInt = Math.abs(q - Math.round(q)) < 1e-6;
  const label = isInt
    ? String(Math.round(q))
    : String(Math.round(q * 1000) / 1000)
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "");
  return `${label} in store`;
}

export function hasCatalogPrice(
  amount: number | null | undefined,
): amount is number {
  return amount != null && Number.isFinite(amount);
}

export function formatDisplayPrice(
  currency: string,
  amount: number | null,
): string {
  if (!hasCatalogPrice(amount)) {
    return "";
  }
  const code = currency.length === 3 ? currency : "KES";
  try {
    // Force en-KE so KES stays consistent (avoids locale NBSP / grouping quirks).
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function computeMargin(
  selling: number | null | undefined,
  buying: number | null | undefined,
): { percent: number | null; profit: number | null } {
  if (
    selling == null ||
    buying == null ||
    !Number.isFinite(selling) ||
    !Number.isFinite(buying)
  ) {
    return { percent: null, profit: null };
  }
  if (buying <= 0) {
    return { percent: null, profit: null };
  }
  const profit = selling - buying;
  const percent = (profit / buying) * 100;
  return {
    percent: Math.round(percent * 10) / 10,
    profit: Math.round(profit * 100) / 100,
  };
}

export function marginTone(
  percent: number | null,
): "good" | "thin" | "bad" | "none" {
  if (percent == null) return "none";
  if (percent < 0) return "bad";
  if (percent < 10) return "thin";
  if (percent < 30) return "thin";
  return "good";
}

function backendOrigin(): string {
  return getServerApiOrigin();
}

export async function fetchPublicStorefront(
  slug: string,
): Promise<PublicStorefrontPayload | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/storefront`;
  try {
    const res = await fetch(url, STORE_PRICE_FETCH_INIT);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicStorefrontPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicCatalogItems(
  slug: string,
  opts?: {
    cursor?: string | null;
    limit?: number;
    q?: string | null;
    categoryId?: string | null;
    departmentId?: string | null;
    typeId?: string | null;
  },
): Promise<PublicCatalogListPayload | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  const u = new URL(
    `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items`,
  );
  const lim = opts?.limit;
  if (lim != null && lim > 0) {
    u.searchParams.set("limit", String(Math.min(lim, 100)));
  }
  const cur = opts?.cursor?.trim();
  if (cur) {
    u.searchParams.set("cursor", cur);
  }
  const q = opts?.q?.trim();
  if (q) {
    u.searchParams.set("q", q);
  }
  const cat = opts?.categoryId?.trim();
  if (cat) {
    u.searchParams.set("categoryId", cat);
  }
  const dept = opts?.departmentId?.trim() || opts?.typeId?.trim();
  if (dept) {
    u.searchParams.set("departmentId", dept);
  }
  try {
    const res = await fetch(u.toString(), STORE_PRICE_FETCH_INIT);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogListPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicCategories(
  slug: string,
): Promise<PublicCategoryListPayload | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/categories`;
  try {
    const res = await fetch(url, {
      next: { revalidate: DEFAULT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCategoryListPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicTypes(
  slug: string,
): Promise<PublicDepartmentListPayload | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/types`;
  try {
    const res = await fetch(url, {
      next: { revalidate: DEFAULT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicDepartmentListPayload;
  } catch {
    return null;
  }
}

/** @deprecated Use {@link fetchPublicTypes}. */
export async function fetchPublicDepartments(
  slug: string,
): Promise<PublicDepartmentListPayload | null> {
  return fetchPublicTypes(slug);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * Coerces the host-resolve JSON into a complete {@link TenantContext}. Older
 * API versions or partial payloads may omit nested objects; without this,
 * `tenant.branding.displayName` throws at runtime on the platform host.
 */
export function normalizeTenantContext(raw: unknown): TenantContext | null {
  const o = asObject(raw);
  if (!o) {
    return null;
  }
  const tenantId = String(o.tenantId ?? "").trim();
  if (!tenantId) {
    return null;
  }
  const tenantName = String(o.tenantName ?? "Tenant").trim() || "Tenant";
  const slugFromApi = sanitizeStorefrontSlug(String(o.slug ?? ""));
  const slug = slugFromApi ?? slugifyTenantNameForCatalog(tenantName);

  const statusRaw = String(o.status ?? "ACTIVE").toUpperCase();
  const status: TenantStatus =
    statusRaw === "SUSPENDED" || statusRaw === "INACTIVE"
      ? statusRaw
      : "ACTIVE";

  const b = asObject(o.branding);
  const branding: TenantBranding = {
    displayName:
      typeof b?.displayName === "string" && b.displayName.trim().length > 0
        ? b.displayName.trim()
        : tenantName,
    logoUrl:
      typeof b?.logoUrl === "string" && b.logoUrl.trim()
        ? b.logoUrl.trim()
        : null,
    faviconUrl:
      typeof b?.faviconUrl === "string" && b.faviconUrl.trim()
        ? b.faviconUrl.trim()
        : null,
    primaryColor:
      typeof b?.primaryColor === "string" && b.primaryColor.trim()
        ? b.primaryColor.trim()
        : null,
    accentColor:
      typeof b?.accentColor === "string" && b.accentColor.trim()
        ? b.accentColor.trim()
        : null,
    metaTitle:
      typeof b?.metaTitle === "string" && b.metaTitle.trim().length > 0
        ? b.metaTitle.trim()
        : null,
    metaDescription:
      typeof b?.metaDescription === "string" &&
      b.metaDescription.trim().length > 0
        ? b.metaDescription.trim()
        : null,
    ogImage:
      typeof b?.ogImage === "string" && b.ogImage.trim()
        ? b.ogImage.trim()
        : null,
    metaKeywords:
      typeof b?.metaKeywords === "string" && b.metaKeywords.trim().length > 0
        ? b.metaKeywords.trim()
        : null,
    heroBannerUrls: Array.isArray(b?.heroBannerUrls)
      ? (b.heroBannerUrls as string[]).filter(
          (u: unknown) => typeof u === "string" && u.trim(),
        )
      : null,
  };

  const a = asObject(o.authConfig);
  const pp = asObject(a?.passwordPolicy);
  const passwordPolicy: TenantPasswordPolicy = {
    minLength:
      typeof pp?.minLength === "number" && Number.isFinite(pp.minLength)
        ? Math.max(1, Math.min(128, pp.minLength as number))
        : 8,
    requireNumber: pp?.requireNumber === true,
    requireSymbol: pp?.requireSymbol === true,
  };
  const methodsRaw = a?.methods;
  const methods =
    Array.isArray(methodsRaw) && methodsRaw.length > 0
      ? methodsRaw.filter((m): m is string => typeof m === "string")
      : ["password"];
  const ssoRaw = a?.ssoProviders;
  const ssoProviders = Array.isArray(ssoRaw)
    ? ssoRaw.filter((m): m is string => typeof m === "string")
    : [];
  const authConfig: TenantAuthConfig = {
    methods,
    ssoProviders,
    passwordPolicy,
  };

  const ff = asObject(o.featureFlags);
  const featureFlags: Record<string, boolean> = ff
    ? Object.fromEntries(
        Object.entries(ff).filter(([, v]) => typeof v === "boolean") as [
          string,
          boolean,
        ][],
      )
    : {};

  const storefrontEnabled = o.storefrontEnabled === true;
  const resolvedAt =
    typeof o.resolvedAt === "string" && o.resolvedAt.trim()
      ? o.resolvedAt.trim()
      : new Date().toISOString();

  const countryRaw =
    typeof o.countryCode === "string" ? o.countryCode.trim().toUpperCase() : "";
  const countryCode = countryRaw.length === 2 ? countryRaw : null;

  const localitiesRaw = o.branchLocalities;
  const branchLocalities = Array.isArray(localitiesRaw)
    ? localitiesRaw
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    : [];

  return {
    tenantId,
    tenantName,
    slug,
    status,
    branding,
    authConfig,
    featureFlags,
    storefrontEnabled,
    resolvedAt,
    countryCode,
    branchLocalities,
  };
}

export async function fetchTenantContext(
  host: string,
): Promise<TenantContext | null> {
  const base = backendOrigin();
  const h = host.trim();
  if (!h) {
    return null;
  }
  const u = new URL(`${base}/api/v1/public/host/resolve`);
  u.searchParams.set("host", h);
  try {
    const res = await fetch(u.toString(), {
      next: { revalidate: HOST_RESOLVE_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return null;
    }
    return normalizeTenantContext(await res.json());
  } catch {
    return null;
  }
}

export async function fetchPublicBarcode(
  barcode: string,
): Promise<PublicBarcodeLookup | null> {
  const base = backendOrigin();
  const code = barcode.trim();
  if (!code) return null;
  const url = `${base}/api/v1/public/barcode/${encodeURIComponent(code)}`;
  try {
    const res = await fetch(url, STORE_PRICE_FETCH_INIT);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as PublicBarcodeLookup;
  } catch {
    return null;
  }
}

export async function fetchPublicItemByBarcode(
  slug: string,
  barcode: string,
): Promise<PublicCatalogItemDetail | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  const code = barcode.trim();
  if (!s || !code) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items/by-barcode/${encodeURIComponent(code)}`;
  try {
    const res = await fetch(url, STORE_PRICE_FETCH_INIT);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogItemDetail;
  } catch {
    return null;
  }
}

export async function fetchPublicItemDetail(
  slug: string,
  urlSegment: string,
): Promise<PublicCatalogItemDetail | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  const itemId =
    resolvePublicItemIdFromShopUrlSegment(urlSegment) || urlSegment;
  if (!s || !itemId) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items/${encodeURIComponent(itemId)}`;
  try {
    const res = await fetch(url, STORE_PRICE_FETCH_INIT);
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogItemDetail;
  } catch {
    return null;
  }
}

// ─── Payment Display Instructions (public) ────────────────────────────

export type PublicPaymentInstruction = {
  configId: string;
  type: string | null;
  label: string | null;
  instructions: string | null;
  tillNumber: string | null;
  businessNumber: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branchName: string | null;
  accountName: string | null;
  swiftCode: string | null;
};

export type PublicOnlinePaymentMethod = {
  configId: string;
  gatewayType: string;
  label: string | null;
  displayName: string;
};

export type PublicCheckoutPaymentOptions = {
  manual: PublicPaymentInstruction[];
  online: PublicOnlinePaymentMethod[];
};

export type PublicWebStkPushResult = {
  accepted: boolean;
  gatewayType: string | null;
  checkoutRequestId: string | null;
  message: string | null;
};

/** Server-side fetch. Client components must use {@link fetchPublicPaymentInstructionsBrowser}. */
export async function fetchPublicPaymentInstructions(
  slug: string,
): Promise<PublicPaymentInstruction[]> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  if (!s) return [];
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/payments/display-instructions`;
  try {
    const res = await fetch(url, STORE_PRICE_FETCH_INIT);
    if (!res.ok) return [];
    return (await res.json()) as PublicPaymentInstruction[];
  } catch {
    return [];
  }
}
