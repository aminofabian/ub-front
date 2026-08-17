import { apiUrl } from "@/lib/config";
import { getPageSealUnlock } from "@/lib/page-seal";

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
  walletCredited?: number | string | null;
  lines: PublicTabPurchaseLine[];
};

export type PublicCustomerTab = {
  customerName: string | null;
  phoneDisplay: string;
  shopName: string;
  currency: string;
  balanceOwed: number | string | null;
  walletBalance?: number | string | null;
  purchases: PublicTabPurchaseRow[];
  pageSealed?: boolean;
  pageUnlocked?: boolean;
};

export type PublicTabStk = {
  intentId: string;
  checkoutRequestId: string | null;
  status: string;
  amount: number | string;
  balanceOwed: number | string;
  walletBalance?: number | string | null;
};

export type PublicTabManualPayment = {
  claimId: string;
  status: string;
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
    const headers = { ...tenantHostHeaders() } as Record<string, string>;
    const unlock = getPageSealUnlock("customer-tab", p);
    if (unlock) headers["X-Page-Unlock"] = unlock;
    const res = await fetch(
      apiUrl(
        `/api/v1/public/credits/tabs/${encodeURIComponent(p)}?t=${Date.now()}`,
      ),
      {
        headers,
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

export async function initiatePublicWalletStk(
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
    apiUrl(
      `/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/wallet/stk`,
    ),
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

export async function submitPublicTabManualPayment(
  phone: string,
  amount: number,
  reference?: string,
): Promise<PublicTabManualPayment> {
  const body: { amount: number; reference?: string } = { amount };
  const ref = reference?.trim();
  if (ref) {
    body.reference = ref;
  }
  const res = await fetch(
    apiUrl(
      `/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/payment-claims`,
    ),
    {
      method: "POST",
      headers: {
        ...(tenantHostHeaders() as Record<string, string>),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  return readJson<PublicTabManualPayment>(res);
}

export type PublicTabAirtimeRecents = {
  recipients: string[];
  payers: string[];
  lastRecipient: string | null;
  lastPayer: string | null;
  lastAmount: number | null;
};

export const EMPTY_TAB_AIRTIME_RECENTS: PublicTabAirtimeRecents = {
  recipients: [],
  payers: [],
  lastRecipient: null,
  lastPayer: null,
  lastAmount: null,
};

export type PublicTabAirtimeConfig = {
  available: boolean;
  minAmount: number;
  maxAmount: number;
  currency: string;
  quickAmounts: number[];
  reason: string | null;
  recents?: PublicTabAirtimeRecents | null;
};

function toPositiveAmount(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function tabAirtimeRecentsFromConfig(
  config: PublicTabAirtimeConfig | null | undefined,
): PublicTabAirtimeRecents {
  const recents = config?.recents;
  if (!recents) return EMPTY_TAB_AIRTIME_RECENTS;
  const recipients = Array.isArray(recents.recipients)
    ? recents.recipients.map(String)
    : [];
  const payers = Array.isArray(recents.payers) ? recents.payers.map(String) : [];
  return {
    recipients,
    payers,
    lastRecipient: recents.lastRecipient ? String(recents.lastRecipient) : null,
    lastPayer: recents.lastPayer ? String(recents.lastPayer) : null,
    lastAmount: toPositiveAmount(recents.lastAmount),
  };
}

export type PublicTabAirtimeOrder = {
  orderId: string;
  phoneNumber: string;
  network: string | null;
  amount: number;
  currency: string;
  status: string;
  delivered: boolean;
  failed: boolean;
  awaitingPayment: boolean;
  checkoutRequestId: string | null;
  receipt: string | null;
  message: string | null;
};

export async function fetchPublicTabAirtimeConfig(
  phone: string,
): Promise<PublicTabAirtimeConfig | null> {
  const p = phone.trim();
  if (!p) return null;
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/credits/tabs/${encodeURIComponent(p)}/airtime`),
      { headers: tenantHostHeaders(), cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicTabAirtimeConfig;
  } catch {
    return null;
  }
}

export async function createPublicTabAirtimeOrder(
  tabPhone: string,
  body: { phoneNumber: string; amount: number; payerPhone?: string },
): Promise<PublicTabAirtimeOrder> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/credits/tabs/${encodeURIComponent(tabPhone.trim())}/airtime/orders`,
    ),
    {
      method: "POST",
      headers: {
        ...(tenantHostHeaders() as Record<string, string>),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  return readJson<PublicTabAirtimeOrder>(res);
}

export async function fetchPublicTabAirtimeOrder(
  tabPhone: string,
  orderId: string,
): Promise<PublicTabAirtimeOrder | null> {
  const id = orderId.trim();
  if (!id) return null;
  try {
    const res = await fetch(
      apiUrl(
        `/api/v1/public/credits/tabs/${encodeURIComponent(tabPhone.trim())}/airtime/orders/${encodeURIComponent(id)}`,
      ),
      { headers: tenantHostHeaders(), cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicTabAirtimeOrder;
  } catch {
    return null;
  }
}

export type PublicTabKplcMeter = {
  meterNumber: string;
  lastUsedAt: string | null;
};

export type PublicTabKplcConfig = {
  purchaseAvailable: boolean;
  purchaseMessage: string;
  meters: PublicTabKplcMeter[];
};

export type PublicTabKplcConcept = {
  code: string;
  label: string;
  kind: string;
  amount: number | string | null;
};

export type PublicTabKplcToken = {
  purchasedAt: string | null;
  amount: number | string | null;
  units: number | string | null;
  tokenNo: string;
  receiptNo: string | null;
  paymentMethod: string | null;
  concepts: PublicTabKplcConcept[];
};

export type PublicTabKplcHistory = {
  meterNumber: string;
  purchaseAvailable: boolean;
  purchaseMessage: string;
  tokens: PublicTabKplcToken[];
  stats?: PublicTabKplcStats | null;
  depletion?: PublicTabKplcDepletion | null;
};

export type PublicTabKplcDepletion = {
  estimatedEmptyAt: string | null;
  remainingUnits: number | string | null;
  lastPurchaseUnits: number | string | null;
  dailyUseUnits: number | string | null;
  sampleIntervals: number;
  alreadyEmpty: boolean;
  alertsEnabled: boolean;
};

export type PublicTabKplcMonthSpend = {
  yearMonth: string;
  label: string;
  amount: number | string;
  units: number | string;
  tokenCount: number;
};

export type PublicTabKplcStats = {
  thisMonthAmount: number | string;
  thisMonthUnits: number | string;
  thisMonthCount: number;
  allTimeAmount: number | string;
  allTimeCount: number;
  months: PublicTabKplcMonthSpend[];
};

export async function fetchPublicTabKplcConfig(
  phone: string,
): Promise<PublicTabKplcConfig | null> {
  const p = phone.trim();
  if (!p) return null;
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/credits/tabs/${encodeURIComponent(p)}/kplc`),
      { headers: tenantHostHeaders(), cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicTabKplcConfig;
  } catch {
    return null;
  }
}

export async function savePublicTabKplcMeter(
  phone: string,
  meterNumber: string,
): Promise<PublicTabKplcConfig> {
  const res = await fetch(
    apiUrl(`/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/kplc/meters`),
    {
      method: "PUT",
      headers: {
        ...(tenantHostHeaders() as Record<string, string>),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ meterNumber }),
      cache: "no-store",
    },
  );
  return readJson<PublicTabKplcConfig>(res);
}

export async function removePublicTabKplcMeter(
  phone: string,
  meterNumber: string,
): Promise<PublicTabKplcConfig> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/kplc/meters/${encodeURIComponent(meterNumber.trim())}`,
    ),
    {
      method: "DELETE",
      headers: tenantHostHeaders(),
      cache: "no-store",
    },
  );
  return readJson<PublicTabKplcConfig>(res);
}

export async function fetchPublicTabKplcTokens(
  phone: string,
  meterNumber: string,
): Promise<PublicTabKplcHistory> {
  const params = new URLSearchParams({ meter: meterNumber.trim() });
  const res = await fetch(
    apiUrl(
      `/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/kplc/tokens?${params}`,
    ),
    { headers: tenantHostHeaders(), cache: "no-store" },
  );
  return readJson<PublicTabKplcHistory>(res);
}

export async function setPublicTabKplcDepletionAlerts(
  phone: string,
  meterNumber: string,
  enabled: boolean,
): Promise<PublicTabKplcDepletion> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/credits/tabs/${encodeURIComponent(phone.trim())}/kplc/meters/${encodeURIComponent(meterNumber.trim())}/depletion-alerts`,
    ),
    {
      method: "PUT",
      headers: {
        ...(tenantHostHeaders() as Record<string, string>),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
      cache: "no-store",
    },
  );
  return readJson<PublicTabKplcDepletion>(res);
}
