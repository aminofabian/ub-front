import { API_ROUTES, apiUrl, PLATFORM_DOMAIN } from "@/lib/config";
import {
  getSupplierPortalAccessToken,
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

export async function fetchHubShopSupplies(
  localSupplierId: string,
): Promise<GlobalHubShopDetail> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
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
  return readJson<GlobalHubShopDetail>(res);
}

export async function submitHubShopComplaint(
  localSupplierId: string,
  body: { name?: string; phone?: string; message: string },
): Promise<void> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
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
  await readJson<{ ok: boolean }>(res);
}
