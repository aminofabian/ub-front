/**
 * Phase 15 — public storefront catalog (no JWT). Server components use BACKEND_ORIGIN.
 */

export type PublicCatalogItemCard = {
  id: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
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
};

export type PublicItemImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type PublicCatalogVariant = {
  id: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number | null;
};

export type PublicCatalogItemDetail = {
  id: string;
  name: string;
  description: string | null;
  variantName: string | null;
  parentItemId: string | null;
  currency: string;
  price: number | null;
  images: PublicItemImage[];
  variants: PublicCatalogVariant[];
};

export type PublicCatalogListPayload = {
  currency: string;
  items: PublicCatalogItemCard[];
  nextCursor: string | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  /** Emoji / key, or HTTPS URL for a custom icon image (Cloudinary). */
  icon?: string | null;
};

export type PublicCategoryListPayload = {
  categories: PublicCategory[];
};

export type TenantStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export type TenantBranding = {
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
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
};

const DEFAULT_REVALIDATE_SEC = 60;
const HOST_RESOLVE_REVALIDATE_SEC = 60;

/** Matches backend `Business` slug rules (lowercase alnum + hyphens). */
const PUBLIC_STOREFRONT_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Returns a safe catalog path slug, or `null` if the value cannot be used in
 * `/api/v1/public/businesses/{slug}/…` (e.g. `"/"`, `".."`, empty, or stray
 * punctuation). Prevents env typos like `NEXT_PUBLIC_STOREFRONT_SLUG=/` from
 * breaking the storefront with a misleading "catalog rejected slug" error.
 */
export function sanitizeStorefrontSlug(raw: string | null | undefined): string | null {
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

export function formatDisplayPrice(currency: string, amount: number | null): string {
  if (amount == null) {
    return "See in store";
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "KES",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function backendOrigin(): string | null {
  const a = process.env.BACKEND_ORIGIN?.trim();
  const b = process.env.API_BACKEND_ORIGIN?.trim();
  const raw = a || b || "";
  return raw.replace(/\/+$/, "") || null;
}

export async function fetchPublicStorefront(
  slug: string,
): Promise<PublicStorefrontPayload | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  if (!base || !s) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/storefront`;
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
    return (await res.json()) as PublicStorefrontPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicCatalogItems(
  slug: string,
  opts?: { cursor?: string | null; limit?: number; q?: string | null; categoryId?: string | null },
): Promise<PublicCatalogListPayload | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  if (!base || !s) {
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
  try {
    const res = await fetch(u.toString(), {
      next: { revalidate: DEFAULT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
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
  if (!base || !s) {
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
    statusRaw === "SUSPENDED" || statusRaw === "INACTIVE" ? statusRaw : "ACTIVE";

  const b = asObject(o.branding);
  const branding: TenantBranding = {
    displayName:
      typeof b?.displayName === "string" && b.displayName.trim().length > 0
        ? b.displayName.trim()
        : tenantName,
    logoUrl: typeof b?.logoUrl === "string" && b.logoUrl.trim() ? b.logoUrl.trim() : null,
    faviconUrl:
      typeof b?.faviconUrl === "string" && b.faviconUrl.trim() ? b.faviconUrl.trim() : null,
    primaryColor:
      typeof b?.primaryColor === "string" && b.primaryColor.trim() ? b.primaryColor.trim() : null,
    accentColor:
      typeof b?.accentColor === "string" && b.accentColor.trim() ? b.accentColor.trim() : null,
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
        Object.entries(ff).filter(([, v]) => typeof v === "boolean") as [string, boolean][],
      )
    : {};

  const storefrontEnabled = o.storefrontEnabled === true;
  const resolvedAt =
    typeof o.resolvedAt === "string" && o.resolvedAt.trim()
      ? o.resolvedAt.trim()
      : new Date().toISOString();

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
  };
}

export async function fetchTenantContext(
  host: string,
): Promise<TenantContext | null> {
  const base = backendOrigin();
  const h = host.trim();
  if (!base || !h) {
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

export async function fetchPublicItemDetail(
  slug: string,
  itemId: string,
): Promise<PublicCatalogItemDetail | null> {
  const base = backendOrigin();
  const s = sanitizeStorefrontSlug(slug);
  const id = itemId.trim();
  if (!base || !s || !id) {
    return null;
  }
  const url = `${base}/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items/${encodeURIComponent(id)}`;
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
    return (await res.json()) as PublicCatalogItemDetail;
  } catch {
    return null;
  }
}
