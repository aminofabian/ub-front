import { apiUrl } from "@/lib/config";

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
  invoiceCount: number;
  supplies: PublicSupplierSupplyRow[];
  movements: PublicSupplierMovementRow[];
  linkedProducts: string[];
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

function tenantHostHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { Accept: "application/json" };
  }
  const host = window.location.hostname?.trim();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (host) {
    headers["X-Tenant-Host"] = host;
  }
  return headers;
}

export async function fetchPublicSupplierPortal(
  slug: string,
): Promise<PublicSupplierPortal | null> {
  const s = slug.trim();
  if (!s) return null;
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/suppliers/${encodeURIComponent(s)}`),
      {
        headers: tenantHostHeaders(),
        cache: "no-store",
      },
    );
    if (res.status === 404) return null;
    return await readJson<PublicSupplierPortal>(res);
  } catch {
    return null;
  }
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
