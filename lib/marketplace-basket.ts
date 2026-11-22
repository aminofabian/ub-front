import { sendShopperIdentifyCode, verifyShopperIdentifyCode } from "@/lib/apex-identify";
import { apiUrl } from "@/lib/config";

/**
 * The marketplace basket (ADR 0043): products from several suppliers, kept in this browser on the
 * marketplace host, sent as one order per supplier's shop by a buyer signed in with a phone code.
 */

export type BasketLine = {
  supplierId: string;
  supplierName: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  currency: string | null;
};

export type BuyerShop = { businessId: string; name: string };

export type BasketResult = {
  supplierId: string;
  supplierName?: string | null;
  placed: boolean;
  orderId?: string | null;
  orderCode?: string | null;
  total?: number | null;
  currency?: string | null;
  shopSlug?: string | null;
  message?: string | null;
};

const BASKET_KEY = "ub.marketplace.basket.v1";
const BUYER_KEY = "ub.marketplace.buyer.v1";
const BUYER_HEADER = "X-Marketplace-Buyer";
export const BASKET_CHANGED_EVENT = "ub:marketplace-basket-changed";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full disk: the basket then lasts only as long as the page.
  }
}

export function readBasket(): BasketLine[] {
  if (typeof window === "undefined") return [];
  const lines = readJson<BasketLine[]>(BASKET_KEY, []);
  return Array.isArray(lines) ? lines.filter((l) => l && l.productId && l.quantity > 0) : [];
}

export function writeBasket(lines: BasketLine[]): void {
  writeJson(BASKET_KEY, lines);
  window.dispatchEvent(new Event(BASKET_CHANGED_EVENT));
}

/** Sets the quantity of one product; zero removes it. */
export function setBasketLine(line: BasketLine): BasketLine[] {
  const rest = readBasket().filter((l) => l.productId !== line.productId);
  const next = line.quantity > 0 ? [...rest, line] : rest;
  writeBasket(next);
  return next;
}

export function readBuyerToken(): string | null {
  if (typeof window === "undefined") return null;
  const saved = readJson<{ token?: string; expiresAt?: string } | null>(BUYER_KEY, null);
  if (!saved?.token) return null;
  if (saved.expiresAt && new Date(saved.expiresAt).getTime() < Date.now()) return null;
  return saved.token;
}

async function reason(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; detail?: string; error?: string };
    return body.message || body.detail || body.error || fallback;
  } catch {
    return fallback;
  }
}

/** Texts a code to the phone number. */
export async function sendBuyerCode(phone: string): Promise<boolean> {
  return (await sendShopperIdentifyCode(phone)) != null;
}

/** Checks the code and opens the buyer session. Returns the shops this number may order for. */
export async function signInBuyer(phone: string, code: string): Promise<BuyerShop[]> {
  const verified = await verifyShopperIdentifyCode(phone, code);
  if (!verified) {
    throw new Error("That code did not work. Check it, or ask for a new one.");
  }
  const res = await fetch(apiUrl("/api/v1/public/marketplace/buyer/session"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone.trim(), verificationToken: verified.phoneVerificationToken }),
  });
  if (!res.ok) {
    throw new Error(await reason(res, "Could not sign you in"));
  }
  const body = (await res.json()) as { token: string; expiresAt: string; shops: BuyerShop[] };
  writeJson(BUYER_KEY, { token: body.token, expiresAt: body.expiresAt });
  return body.shops ?? [];
}

/** The shops the signed-in buyer may order for. Null when not signed in. */
export async function fetchBuyerShops(): Promise<BuyerShop[] | null> {
  const token = readBuyerToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/v1/public/marketplace/buyer/session"), {
    headers: { Accept: "application/json", [BUYER_HEADER]: token },
    cache: "no-store",
  });
  if (res.status === 401) {
    signOutBuyerLocally();
    return null;
  }
  if (!res.ok) {
    throw new Error(await reason(res, "Could not check your sign-in"));
  }
  return ((await res.json()) as { shops?: BuyerShop[] }).shops ?? [];
}

function signOutBuyerLocally(): void {
  try {
    window.localStorage.removeItem(BUYER_KEY);
  } catch {
    // nothing to remove
  }
}

export async function signOutBuyer(): Promise<void> {
  const token = readBuyerToken();
  signOutBuyerLocally();
  if (token) {
    await fetch(apiUrl("/api/v1/public/marketplace/buyer/session"), {
      method: "DELETE",
      headers: { [BUYER_HEADER]: token },
    }).catch(() => {});
  }
}

export type BuyerStandingOrder = {
  id: string;
  supplierName?: string | null;
  everyDays: number;
  nextRunOn: string;
  lastResult?: string | null;
  lines: { itemName: string; quantity: number }[];
};

/** Asks one supplier for the same goods every so many days. Each run is an order the supplier still accepts. */
export async function startStandingOrder(
  buyerBusinessId: string,
  buyerName: string,
  supplierId: string,
  everyDays: number,
  lines: { productId: string; quantity: number }[],
): Promise<BuyerStandingOrder> {
  const token = readBuyerToken();
  if (!token) throw new Error("Sign in with your phone number first");
  const res = await fetch(apiUrl("/api/v1/public/marketplace/buyer/standing-orders"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", [BUYER_HEADER]: token },
    body: JSON.stringify({ buyerBusinessId, buyerName: buyerName.trim(), supplierId, everyDays, lines }),
  });
  if (!res.ok) throw new Error(await reason(res, "Could not set up the standing order"));
  return (await res.json()) as BuyerStandingOrder;
}

export async function fetchMyStandingOrders(buyerBusinessId: string): Promise<BuyerStandingOrder[]> {
  const token = readBuyerToken();
  if (!token) return [];
  const res = await fetch(
    apiUrl(`/api/v1/public/marketplace/buyer/standing-orders?buyerBusinessId=${encodeURIComponent(buyerBusinessId)}`),
    { headers: { Accept: "application/json", [BUYER_HEADER]: token }, cache: "no-store" },
  );
  if (!res.ok) return [];
  return (await res.json()) as BuyerStandingOrder[];
}

export async function stopMyStandingOrder(buyerBusinessId: string, standingOrderId: string): Promise<void> {
  const token = readBuyerToken();
  if (!token) throw new Error("Sign in with your phone number first");
  const res = await fetch(
    apiUrl(
      `/api/v1/public/marketplace/buyer/standing-orders/${encodeURIComponent(standingOrderId)}?buyerBusinessId=${encodeURIComponent(buyerBusinessId)}`,
    ),
    { method: "DELETE", headers: { [BUYER_HEADER]: token } },
  );
  if (!res.ok) throw new Error(await reason(res, "Could not stop the standing order"));
}

/** Sends the basket: one order per supplier's shop. One supplier failing does not stop the rest. */
export async function submitBasket(
  buyerBusinessId: string,
  buyerName: string,
  notes: string,
  lines: BasketLine[],
): Promise<BasketResult[]> {
  const token = readBuyerToken();
  if (!token) {
    throw new Error("Sign in with your phone number first");
  }
  const bySupplier = new Map<string, { productId: string; quantity: number }[]>();
  for (const line of lines) {
    const list = bySupplier.get(line.supplierId) ?? [];
    list.push({ productId: line.productId, quantity: line.quantity });
    bySupplier.set(line.supplierId, list);
  }
  const res = await fetch(apiUrl("/api/v1/public/marketplace/buyer/basket"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", [BUYER_HEADER]: token },
    body: JSON.stringify({
      buyerBusinessId,
      buyerName: buyerName.trim(),
      notes: notes.trim() || undefined,
      suppliers: [...bySupplier.entries()].map(([supplierId, supplierLines]) => ({ supplierId, lines: supplierLines })),
    }),
  });
  if (res.status === 401) {
    signOutBuyerLocally();
    throw new Error("Sign in with your phone number again");
  }
  if (!res.ok) {
    throw new Error(await reason(res, "Could not send your basket"));
  }
  return ((await res.json()) as { results?: BasketResult[] }).results ?? [];
}
