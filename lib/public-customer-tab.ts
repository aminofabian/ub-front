import { apiUrl } from "@/lib/config";

export type PublicTabPurchaseLine = {
  name: string;
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

export async function fetchPublicCustomerTab(
  phone: string,
): Promise<PublicCustomerTab | null> {
  const p = phone.trim();
  if (!p) return null;
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/credits/tabs/${encodeURIComponent(p)}`),
      {
        headers: { Accept: "application/json" },
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
): Promise<PublicTabStk> {
  const res = await fetch(
    apiUrl(`/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/stk`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ amount }),
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
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );
  return readJson<PublicTabStk>(res);
}
