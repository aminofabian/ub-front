import { apiUrl } from "@/lib/config";

export type PublicTabPurchaseLine = {
  itemName: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
};

export type PublicTabPurchaseRow = {
  saleId: string;
  receiptNo: number | null;
  soldAt: string;
  status: string;
  creditAmount: number | string;
  grandTotal: number | string;
  lines: PublicTabPurchaseLine[];
};

export type PublicCustomerTab = {
  customerName: string | null;
  phoneDisplay: string;
  shopName: string;
  currency: string;
  balanceOwed: number | string;
  purchases: PublicTabPurchaseRow[];
};

export type PublicTabStk = {
  intentId: string;
  checkoutRequestId: string | null;
  status: string;
  amount: number | string;
  balanceOwed: number | string;
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

export async function fetchPublicCustomerTab(
  phone: string,
): Promise<PublicCustomerTab | null> {
  const p = phone.trim();
  if (!p) return null;
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/credits/tabs/${encodeURIComponent(p)}`),
      {
        headers: tenantHostHeaders(),
        cache: "no-store",
      },
    );
    if (res.status === 404) return null;
    return await readJson<PublicCustomerTab>(res);
  } catch {
    return null;
  }
}

export async function initiatePublicTabStk(
  phone: string,
  amount: number,
  idempotencyKey: string,
  stkPhone?: string,
): Promise<PublicTabStk> {
  const headers: Record<string, string> = {
    ...(tenantHostHeaders() as Record<string, string>),
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  };
  const body: { amount: number; phone?: string } = { amount };
  const payPhone = stkPhone?.trim();
  if (payPhone) {
    body.phone = payPhone;
  }
  const res = await fetch(
    apiUrl(`/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/stk`),
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  return readJson<PublicTabStk>(res);
}

export async function fetchPublicTabStkStatus(
  phone: string,
  intentId: string,
): Promise<PublicTabStk> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/stk/${encodeURIComponent(intentId)}`,
    ),
    {
      headers: tenantHostHeaders(),
      cache: "no-store",
    },
  );
  return readJson<PublicTabStk>(res);
}
