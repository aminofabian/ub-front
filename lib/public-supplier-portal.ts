import { apiUrl } from "@/lib/config";
import { getPageSealUnlock } from "@/lib/page-seal";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

export type PublicSupplierSupplyLine = {
  description: string;
  quantity: number | string;
  unitCost: number | string;
  lineTotal: number | string;
};

export type PublicSupplierSupplyRow = {
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number | string;
  amountPaid: number | string;
  balanceOpen: number | string;
  paymentStatus: string;
  sourceType: string;
  lines?: PublicSupplierSupplyLine[];
};

export type PublicSupplierMovementRow = {
  description: string;
  quantity: number | string;
  unitCost: number | string;
  lineTotal: number | string;
  invoiceDate: string;
  invoiceNumber: string;
};

export type PublicSupplierPortal = {
  supplierName: string;
  supplierSlug: string;
  shopName: string;
  currency: string;
  openBalance: number | string;
  totalSpent: number | string;
  totalPaid: number | string;
  /** Unapplied advance / overpayment credit. */
  advanceCredit?: number | string | null;
  invoiceCount: number;
  supplies: PublicSupplierSupplyRow[];
  movements: PublicSupplierMovementRow[];
  linkedProducts: string[];
  /**
   * True when the figures were withheld: the page was not unlocked with its PIN
   * and the viewer is not a signed-in supplier this shop connected.
   */
  restricted?: boolean;
};

export type PublicSupplierSellingPeriod = "today" | "week" | "month";

export type PublicSupplierProductSellingRow = {
  itemId: string;
  name: string;
  sku: string | null;
  unitsSold: number | string;
  revenue: number | string;
  currentStock: number | string;
  lastSoldAt: string | null;
};

export type PublicSupplierProductsSelling = {
  period: PublicSupplierSellingPeriod | string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  sort: "units" | "revenue" | string;
  products: PublicSupplierProductSellingRow[];
};

/**
 * Sends the supplier portal sign-in when this browser has one, so a connected
 * supplier sees its own figures. A stale sign-in must not break a public page,
 * so a 401 is retried once without it.
 */
async function fetchAsSupplierWhenSignedIn(
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  const token = getSupplierPortalAccessToken();
  if (token) {
    const res = await fetch(url, {
      headers: { ...headers, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status !== 401) return res;
  }
  return fetch(url, { headers, cache: "no-store" });
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string; title?: string };
      detail = body.detail || body.title || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function tenantHostHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (typeof window !== "undefined") {
    const host = window.location.hostname?.trim();
    if (host) headers["X-Tenant-Host"] = host;
  }
  return headers;
}

export async function fetchPublicSupplierPortal(
  slug: string,
): Promise<PublicSupplierPortal | null> {
  const s = slug.trim();
  if (!s) return null;
  const unlock = getPageSealUnlock("shop-supplier", s);
  const headers = tenantHostHeaders();
  if (unlock) headers["X-Page-Unlock"] = unlock;
  const res = await fetchAsSupplierWhenSignedIn(
    apiUrl(`/api/v1/public/suppliers/${encodeURIComponent(s)}`),
    headers,
  );
  if (res.status === 404) return null;
  return await readJson<PublicSupplierPortal>(res);
}

export async function fetchPublicSupplierProductsSelling(
  slug: string,
  period: PublicSupplierSellingPeriod = "today",
  sort: "units" | "revenue" = "units",
): Promise<PublicSupplierProductsSelling | null> {
  const s = slug.trim();
  if (!s) return null;
  const unlock = getPageSealUnlock("shop-supplier", s);
  const headers = tenantHostHeaders();
  if (unlock) headers["X-Page-Unlock"] = unlock;
  const params = new URLSearchParams({ period, sort });
  const res = await fetchAsSupplierWhenSignedIn(
    apiUrl(
      `/api/v1/public/suppliers/${encodeURIComponent(s)}/products-selling?${params}`,
    ),
    headers,
  );
  if (res.status === 404) return null;
  return await readJson<PublicSupplierProductsSelling>(res);
}

export async function submitPublicSupplierComplaint(
  slug: string,
  body: { name?: string; phone?: string; message: string },
): Promise<void> {
  const headers: Record<string, string> = {
    ...(tenantHostHeaders() as Record<string, string>),
    "Content-Type": "application/json",
  };
  const res = await fetch(
    apiUrl(`/api/v1/public/suppliers/${encodeURIComponent(slug.trim())}/complaints`),
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: body.name?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        message: body.message.trim(),
        website: "",
      }),
      cache: "no-store",
    },
  );
  await readJson<{ ok: boolean }>(res);
}

/** Absolute portal URL on the current tenant host. */
export function publicSupplierPortalPath(slug: string): string {
  return `/s/${encodeURIComponent(slug.trim())}`;
}

export function publicSupplierPortalUrl(slug: string, origin?: string): string {
  const path = publicSupplierPortalPath(slug);
  if (origin?.trim()) {
    return `${origin.replace(/\/+$/, "")}${path}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}
