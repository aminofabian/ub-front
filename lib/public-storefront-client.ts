import { apiUrl } from "@/lib/config";
import type {
  PublicBarcodeLookup,
  PublicCatalogItemDetail,
  PublicCatalogListPayload,
  PublicCheckoutPaymentOptions,
  PublicPaymentInstruction,
  PublicWebStkPushResult,
  PublicStorefrontPayload,
} from "@/lib/public-storefront";
import { sanitizeStorefrontSlug } from "@/lib/public-storefront";

export type StorefrontItemPricePatch = {
  price: number | null;
  qtyOnHand?: number | null;
};

function catalogItemsPath(
  slug: string,
  opts?: {
    cursor?: string | null;
    limit?: number;
    q?: string | null;
    categoryId?: string | null;
    typeId?: string | null;
    departmentId?: string | null;
  },
): string | null {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  const params = new URLSearchParams();
  const lim = opts?.limit;
  if (lim != null && lim > 0) {
    params.set("limit", String(Math.min(lim, 100)));
  }
  const cur = opts?.cursor?.trim();
  if (cur) {
    params.set("cursor", cur);
  }
  const q = opts?.q?.trim();
  if (q) {
    params.set("q", q);
  }
  const cat = opts?.categoryId?.trim();
  if (cat) {
    params.set("categoryId", cat);
  }
  const dept = opts?.typeId?.trim() || opts?.departmentId?.trim();
  if (dept) {
    params.set("typeId", dept);
  }
  const qs = params.toString();
  return `/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items${qs ? `?${qs}` : ""}`;
}

export async function fetchPublicCatalogPageBrowser(
  slug: string,
  opts?: {
    cursor?: string | null;
    limit?: number;
    q?: string | null;
    categoryId?: string | null;
    typeId?: string | null;
    departmentId?: string | null;
  },
): Promise<PublicCatalogListPayload | null> {
  const path = catalogItemsPath(slug, opts);
  if (!path) {
    return null;
  }
  try {
    const res = await fetch(apiUrl(path), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogListPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicStorefrontBrowser(
  slug: string,
): Promise<PublicStorefrontPayload | null> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/businesses/${encodeURIComponent(s)}/storefront`),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicStorefrontPayload;
  } catch {
    return null;
  }
}

export async function fetchPublicItemDetailBrowser(
  slug: string,
  itemId: string,
): Promise<PublicCatalogItemDetail | null> {
  const s = sanitizeStorefrontSlug(slug);
  const id = itemId.trim();
  if (!s || !id) {
    return null;
  }
  try {
    const res = await fetch(
      apiUrl(
        `/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items/${encodeURIComponent(id)}`,
      ),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogItemDetail;
  } catch {
    return null;
  }
}

export async function fetchPublicBarcodeBrowser(
  barcode: string,
): Promise<PublicBarcodeLookup | null> {
  const code = barcode.trim();
  if (!code) return null;
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/barcode/${encodeURIComponent(code)}`),
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicBarcodeLookup;
  } catch {
    return null;
  }
}

/** Search published products by name across all businesses. */
export async function fetchPublicBarcodeSearchBrowser(
  q: string,
  limit = 20,
): Promise<PublicBarcodeLookup[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(
      apiUrl(`/api/v1/public/barcode/search?${params.toString()}`),
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return [];
    return (await res.json()) as PublicBarcodeLookup[];
  } catch {
    return [];
  }
}

// ── Storefront airtime ──────────────────────────────────────────────

export type PublicAirtimeConfig = {
  available: boolean;
  minAmount: number;
  maxAmount: number;
  currency: string;
  quickAmounts: number[];
  reason: string | null;
};

export type PublicAirtimeOrder = {
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

export async function fetchPublicAirtimeConfigBrowser(
  slug: string,
): Promise<PublicAirtimeConfig | null> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return null;
  }
  try {
    const res = await fetch(
      apiUrl(`/api/v1/public/businesses/${encodeURIComponent(s)}/airtime`),
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicAirtimeConfig;
  } catch {
    return null;
  }
}

export async function createPublicAirtimeOrderBrowser(
  slug: string,
  body: {
    phoneNumber: string;
    amount: number;
    payerPhone?: string;
    configId?: string;
  },
): Promise<PublicAirtimeOrder> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    throw new Error("This store could not be identified.");
  }
  const res = await fetch(
    apiUrl(`/api/v1/public/businesses/${encodeURIComponent(s)}/airtime/orders`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    let message = "Could not start the airtime purchase.";
    try {
      const payload = (await res.json()) as { message?: string; detail?: string };
      message = payload.message || payload.detail || message;
    } catch {
      // Keep the generic message when the error body is not JSON.
    }
    throw new Error(message);
  }
  return (await res.json()) as PublicAirtimeOrder;
}

export async function fetchPublicAirtimeOrderBrowser(
  slug: string,
  orderId: string,
): Promise<PublicAirtimeOrder | null> {
  const s = sanitizeStorefrontSlug(slug);
  const id = orderId.trim();
  if (!s || !id) {
    return null;
  }
  try {
    const res = await fetch(
      apiUrl(
        `/api/v1/public/businesses/${encodeURIComponent(s)}/airtime/orders/${encodeURIComponent(id)}`,
      ),
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicAirtimeOrder;
  } catch {
    return null;
  }
}

/** Checkout payment options: manual instructions + online gateways (e.g. KopoKopo). */
export async function fetchPublicCheckoutPaymentOptionsBrowser(
  slug: string,
): Promise<PublicCheckoutPaymentOptions> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return { manual: [], online: [], tillListenEnabled: true };
  }
  try {
    const res = await fetch(
      apiUrl(
        `/api/v1/public/businesses/${encodeURIComponent(s)}/payments/checkout-options`,
      ),
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) {
      return { manual: [], online: [], tillListenEnabled: true };
    }
    const body = (await res.json()) as PublicCheckoutPaymentOptions;
    return {
      manual: body.manual ?? [],
      online: body.online ?? [],
      tillListenEnabled: body.tillListenEnabled !== false,
      whatsappCheckout: body.whatsappCheckout,
    };
  } catch {
    return { manual: [], online: [], tillListenEnabled: true };
  }
}

export type PublicOrderTracking = {
  orderId: string;
  orderCode: string;
  status: string;
  fulfillmentStatus: string | null;
  grandTotal: number | string;
  currency: string;
  catalogBranchName: string;
  createdAt: string;
};

/** Guest order tracking by short code + phone last-4 (scope §15). */
export async function fetchPublicOrderTracking(
  slug: string,
  code: string,
  phoneLast4: string,
): Promise<PublicOrderTracking | null> {
  const s = sanitizeStorefrontSlug(slug);
  const c = code.trim();
  const last4 = phoneLast4.replace(/\D/g, "");
  if (!s || !c || last4.length !== 4) return null;
  try {
    const res = await fetch(
      apiUrl(
        `/api/v1/public/businesses/${encodeURIComponent(s)}/orders/by-code/${encodeURIComponent(c)}`,
      ) +
        `?phoneLast4=${encodeURIComponent(last4)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicOrderTracking;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget "the shopper opened the chat" marker (scope §15). Best
 * effort with `keepalive` — never blocks the redirect to wa.me.
 */
export function recordWhatsAppOrderHandoff(slug: string, orderId: string): void {
  const s = sanitizeStorefrontSlug(slug);
  if (!s || !orderId.trim()) return;
  try {
    void fetch(
      apiUrl(
        `/api/v1/public/businesses/${encodeURIComponent(s)}/orders/${encodeURIComponent(orderId.trim())}/whatsapp-handoff`,
      ),
      { method: "POST", headers: { Accept: "application/json" }, keepalive: true },
    ).catch(() => {
      /* analytics-style best effort */
    });
  } catch {
    /* ignore */
  }
}

export async function registerPublicTillAwait(
  slug: string,
  body: { amount: number | string; phoneNumber?: string | null },
): Promise<{
  accepted: boolean;
  listenEnabled: boolean;
  checkoutRequestId: string | null;
  message: string;
}> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s) {
    return {
      accepted: false,
      listenEnabled: false,
      checkoutRequestId: null,
      message: "Missing store",
    };
  }
  const res = await fetch(
    apiUrl(
      `/api/v1/public/businesses/${encodeURIComponent(s)}/payments/till-await`,
    ),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: body.amount,
        phoneNumber: body.phoneNumber ?? null,
      }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    return {
      accepted: false,
      listenEnabled: true,
      checkoutRequestId: null,
      message: "Could not start till listen",
    };
  }
  return (await res.json()) as {
    accepted: boolean;
    listenEnabled: boolean;
    checkoutRequestId: string | null;
    message: string;
  };
}

export async function fetchPublicTillAwaitStatus(
  slug: string,
  checkoutRequestId: string,
): Promise<{
  status: string;
  checkoutRequestId: string | null;
  gatewayTransactionId: string | null;
  failureReason: string | null;
  success: boolean;
  failed: boolean;
  pending: boolean;
} | null> {
  const s = sanitizeStorefrontSlug(slug);
  const id = checkoutRequestId.trim();
  if (!s || !id) return null;
  try {
    const q = new URLSearchParams({ checkoutRequestId: id });
    const res = await fetch(
      apiUrl(
        `/api/v1/public/businesses/${encodeURIComponent(s)}/payments/till-await/status?${q}`,
      ),
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as {
      status: string;
      checkoutRequestId: string | null;
      gatewayTransactionId: string | null;
      failureReason: string | null;
      success: boolean;
      failed: boolean;
      pending: boolean;
    };
  } catch {
    return null;
  }
}

/** @deprecated Use {@link fetchPublicCheckoutPaymentOptionsBrowser}. */
export async function fetchPublicPaymentInstructionsBrowser(
  slug: string,
): Promise<PublicPaymentInstruction[]> {
  const opts = await fetchPublicCheckoutPaymentOptionsBrowser(slug);
  return opts.manual;
}

export async function initiatePublicWebOrderStkPush(
  slug: string,
  orderId: string,
  body: { configId?: string; phoneNumber?: string },
): Promise<PublicWebStkPushResult> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s || !orderId.trim()) {
    throw new Error("Missing store or order");
  }
  const res = await fetch(
    apiUrl(
      `/api/v1/public/businesses/${encodeURIComponent(s)}/orders/${encodeURIComponent(orderId)}/stk-push`,
    ),
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = (await res.json().catch(() => ({}))) as PublicWebStkPushResult & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" && data.message
        ? data.message
        : "Could not send M-Pesa prompt",
    );
  }
  return data;
}

export type PublicPaystackCheckoutResult = {
  checkoutId: string | null;
  reference: string | null;
  status: string | null;
  authorizationUrl: string | null;
  message: string | null;
};

/** Initialize a Paystack hosted checkout for a placed web order. */
export async function initiatePublicWebOrderPaystackCheckout(
  slug: string,
  orderId: string,
  body: { configId?: string; email?: string; returnOrigin?: string },
): Promise<PublicPaystackCheckoutResult> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s || !orderId.trim()) {
    throw new Error("Missing store or order");
  }
  const res = await fetch(
    apiUrl(
      `/api/v1/public/businesses/${encodeURIComponent(s)}/orders/${encodeURIComponent(orderId)}/paystack-checkout`,
    ),
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        configId: body.configId ?? null,
        email: body.email ?? null,
        returnOrigin: body.returnOrigin ?? null,
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as PublicPaystackCheckoutResult & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" && data.message
        ? data.message
        : "Could not start Paystack checkout",
    );
  }
  return data;
}

export type PublicWebOrderPaymentStatus = {
  orderStatus: string;
  paid: boolean;
  paymentFailed: boolean;
  checkoutRequestId: string | null;
  failureReason: string | null;
};

export async function fetchPublicWebOrderPaymentStatus(
  slug: string,
  orderId: string,
): Promise<PublicWebOrderPaymentStatus> {
  const s = sanitizeStorefrontSlug(slug);
  if (!s || !orderId.trim()) {
    throw new Error("Missing store or order");
  }
  const res = await fetch(
    apiUrl(
      `/api/v1/public/businesses/${encodeURIComponent(s)}/orders/${encodeURIComponent(orderId)}/payment-status`,
    ),
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  const data = (await res.json().catch(() => ({}))) as PublicWebOrderPaymentStatus & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" && data.message
        ? data.message
        : "Could not check payment status",
    );
  }
  return data;
}

export async function fetchPublicItemByBarcodeBrowser(
  slug: string,
  barcode: string,
): Promise<PublicCatalogItemDetail | null> {
  const s = sanitizeStorefrontSlug(slug);
  const code = barcode.trim();
  if (!s || !code) {
    return null;
  }
  try {
    const res = await fetch(
      apiUrl(
        `/api/v1/public/businesses/${encodeURIComponent(s)}/catalog/items/by-barcode/${encodeURIComponent(code)}`,
      ),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as PublicCatalogItemDetail;
  } catch {
    return null;
  }
}

const MAX_SYNCED_ITEMS = 100;

export async function fetchStorefrontItemPricePatches(
  slug: string,
  itemIds: string[],
  opts?: {
    q?: string | null;
    categoryId?: string | null;
    typeId?: string | null;
    departmentId?: string | null;
  },
): Promise<Map<string, StorefrontItemPricePatch>> {
  const unique = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))];
  const patches = new Map<string, StorefrontItemPricePatch>();
  if (unique.length === 0) {
    return patches;
  }

  // Only sync the first N loaded items. Catalog items are ordered by id, so
  // the most recently rendered pages are covered by a single lightweight page
  // fetch instead of hammering the API with one request per missing item.
  const capped = unique.slice(0, MAX_SYNCED_ITEMS);

  const page = await fetchPublicCatalogPageBrowser(slug, {
    limit: Math.min(Math.max(capped.length, 24), MAX_SYNCED_ITEMS),
    q: opts?.q,
    categoryId: opts?.categoryId,
    typeId: opts?.typeId ?? opts?.departmentId,
  });
  if (page) {
    for (const item of page.items) {
      if (capped.includes(item.id)) {
        patches.set(item.id, {
          price: item.price,
          qtyOnHand: item.qtyOnHand,
        });
      }
    }
  }

  return patches;
}
