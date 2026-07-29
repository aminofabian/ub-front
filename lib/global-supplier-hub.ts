import { API_ROUTES, apiUrl, PLATFORM_DOMAIN } from "@/lib/config";
import {
  fetchMarketplaceSupplierDetail,
  searchMarketplaceSuppliers,
  type MarketplaceSupplierDetail,
  type MarketplaceSupplierSearchRow,
} from "@/lib/marketplace-api";
import { isSessionRelatedProblem } from "@/lib/problem";
import {
  getSupplierPortalAccessToken,
  signOutSupplierPortalAndRedirectToLogin,
} from "@/lib/supplier-portal-session";
import type { PublicSupplierSupplyRow } from "@/lib/public-supplier-portal";

export type GlobalSupplierHubTotals = {
  owed: number | string;
  paid: number | string;
  pending: number | string;
};

export type GlobalSupplierHubShopCard = {
  businessId: string;
  shopName: string;
  slugHost: string | null;
  localSupplierId: string;
  owed: number | string;
  paid: number | string;
  pending: number | string;
  lastSupplyAt: string | null;
  tenantPortalPath: string;
};

export type GlobalSupplierHub = {
  username: string;
  displayName: string;
  shopCount: number;
  currency: string;
  totals: GlobalSupplierHubTotals;
  shops: GlobalSupplierHubShopCard[];
};

export type GlobalHubShopDetail = {
  businessId: string;
  shopName: string;
  localSupplierId: string;
  localSupplierName: string;
  currency: string;
  summary: {
    totalSpent: number | string;
    totalPaid: number | string;
    openBalance: number | string;
    invoiceCount: number;
    lastInvoiceDate: string | null;
  };
  supplies: PublicSupplierSupplyRow[];
};

export type GlobalSupplierStorefront = {
  hub: GlobalSupplierHub | null;
  detail: MarketplaceSupplierDetail | null;
  /** claimed passport catalogue vs public directory name match */
  source: "claimed" | "directory" | null;
};

async function readJson<T>(
  res: Response,
  options?: { supplierAuth?: boolean },
): Promise<T> {
  if (!res.ok) {
    let body: unknown = {};
    let detail = res.statusText;
    try {
      body = await res.json();
      const problem = body as { detail?: string; title?: string };
      detail = problem.detail || problem.title || detail;
    } catch {
      /* ignore */
    }
    if (options?.supplierAuth && isSessionRelatedProblem(res.status, body)) {
      signOutSupplierPortalAndRedirectToLogin(detail || "session expired");
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function shopPortalAbsoluteUrl(shop: GlobalSupplierHubShopCard): string {
  const path = shop.tenantPortalPath.startsWith("/")
    ? shop.tenantPortalPath
    : `/${shop.tenantPortalPath}`;
  if (shop.slugHost) {
    const h = shop.slugHost.toLowerCase();
    const local = h.endsWith(".localhost") || h.startsWith("localhost");
    return `${local ? "http" : "https"}://${h}${path}`;
  }
  return `https://${PLATFORM_DOMAIN}${path}`;
}

export function usernameToSearchQuery(username: string): string {
  return username.replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function slugifyLoose(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function directoryMatchScore(
  row: MarketplaceSupplierSearchRow,
  username: string,
): number {
  const u = username.toLowerCase();
  const nameSlug = slugifyLoose(row.name);
  const slug = (row.slug ?? "").toLowerCase();
  let score = row.productCount;
  if (nameSlug === u || slug.startsWith(`${u}--`)) score += 1000;
  else if (nameSlug.startsWith(u) || slug.startsWith(u)) score += 500;
  else if (nameSlug.includes(u)) score += 200;
  return score;
}

async function detailFromDirectory(
  username: string,
): Promise<MarketplaceSupplierDetail | null> {
  const q = usernameToSearchQuery(username);
  if (!q) return null;
  try {
    const page = await searchMarketplaceSuppliers({ q, size: 12 });
    const ranked = [...page.content].sort(
      (a, b) => directoryMatchScore(b, username) - directoryMatchScore(a, username),
    );
    const best = ranked[0];
    if (!best) return null;
    return await fetchMarketplaceSupplierDetail(best.id);
  } catch {
    return null;
  }
}

async function detailFromClaimedHub(
  hub: GlobalSupplierHub,
): Promise<MarketplaceSupplierDetail | null> {
  for (const shop of hub.shops) {
    try {
      return await fetchMarketplaceSupplierDetail(shop.localSupplierId);
    } catch {
      /* try next linked shop */
    }
  }
  return detailFromDirectory(hub.username || hub.displayName);
}

export async function fetchGlobalSupplierHub(
  username: string,
): Promise<GlobalSupplierHub | null> {
  const u = username.trim();
  if (!u) return null;
  try {
    const res = await fetch(
      apiUrl(
        `${API_ROUTES.publicMarketplace}/suppliers/by-username/${encodeURIComponent(u)}`,
      ),
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (res.status === 404) return null;
    return await readJson<GlobalSupplierHub>(res);
  } catch {
    return null;
  }
}

/** Passport (if claimed) + orderable catalogue for apex /s/{username}. */
export async function resolveGlobalSupplierStorefront(
  username: string,
): Promise<GlobalSupplierStorefront> {
  const u = username.trim();
  if (!u) {
    return { hub: null, detail: null, source: null };
  }
  const hub = await fetchGlobalSupplierHub(u);
  if (hub) {
    const detail = await detailFromClaimedHub(hub);
    return {
      hub,
      detail,
      source: detail ? "claimed" : null,
    };
  }
  const detail = await detailFromDirectory(u);
  return {
    hub: null,
    detail,
    source: detail ? "directory" : null,
  };
}

export async function fetchHubShopSupplies(
  localSupplierId: string,
): Promise<GlobalHubShopDetail> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    signOutSupplierPortalAndRedirectToLogin("missing access token");
    throw new Error("Sign in required");
  }
  const res = await fetch(
    apiUrl(
      `${API_ROUTES.supplierPortalHub}/shops/${encodeURIComponent(localSupplierId)}/supplies`,
    ),
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );
  return readJson<GlobalHubShopDetail>(res, { supplierAuth: true });
}

export async function submitHubShopComplaint(
  localSupplierId: string,
  body: { name?: string; phone?: string; message: string },
): Promise<void> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    signOutSupplierPortalAndRedirectToLogin("missing access token");
    throw new Error("Sign in required");
  }
  const res = await fetch(
    apiUrl(
      `${API_ROUTES.supplierPortalHub}/shops/${encodeURIComponent(localSupplierId)}/complaints`,
    ),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...body,
        website: "",
      }),
    },
  );
  await readJson<{ ok: boolean }>(res, { supplierAuth: true });
}
