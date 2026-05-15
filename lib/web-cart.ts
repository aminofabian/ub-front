/**
 * Phase 16 — guest web cart (browser). Uses {@link apiUrl} for `/api/v1` calls.
 */

import { apiUrl } from "./config";

export const WEB_CART_STORAGE_KEY = "ub.webCart.v1";
export const WEB_CART_CHANGED_EVENT = "ub-web-cart-changed";

export type PublicWebCartLine = {
  itemId: string;
  sku: string;
  name: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
};

export type PublicWebCart = {
  id: string;
  currency: string;
  catalogBranchId: string;
  catalogBranchName: string;
  expiresAt: string;
  subtotal: number | null;
  lines: PublicWebCartLine[];
};

type StoredHandle = { slug: string; cartId: string };

function clientStorage(): Storage | null {
  if (typeof globalThis === "undefined") {
    return null;
  }
  const ls = globalThis.localStorage;
  return ls ?? null;
}

function browserApiV1Base(): string {
  return apiUrl("/api/v1");
}

export function readWebCartHandle(): StoredHandle | null {
  try {
    const ls = clientStorage();
    if (!ls) {
      return null;
    }
    const raw = ls.getItem(WEB_CART_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const v = JSON.parse(raw) as Partial<StoredHandle>;
    const slug = typeof v.slug === "string" ? v.slug.trim() : "";
    const cartId = typeof v.cartId === "string" ? v.cartId.trim() : "";
    if (!slug || !cartId) {
      return null;
    }
    return { slug, cartId };
  } catch {
    return null;
  }
}

export function writeWebCartHandle(slug: string, cartId: string): void {
  const ls = clientStorage();
  if (!ls) {
    return;
  }
  const s = slug.trim();
  const id = cartId.trim();
  if (!s || !id) {
    return;
  }
  const payload: StoredHandle = { slug: s, cartId: id };
  ls.setItem(WEB_CART_STORAGE_KEY, JSON.stringify(payload));
}

export function clearWebCartHandle(): void {
  const ls = clientStorage();
  if (!ls) {
    return;
  }
  ls.removeItem(WEB_CART_STORAGE_KEY);
}

export function notifyWebCartChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(WEB_CART_CHANGED_EVENT));
}

function cartBase(slug: string): string {
  return `${browserApiV1Base()}/public/businesses/${encodeURIComponent(slug.trim())}/carts`;
}

export type PublicCheckoutResult = {
  orderId: string;
  status: string;
  grandTotal: number;
  currency: string;
  catalogBranchName: string;
  createdAt: string;
};

async function readFetchErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) {
      return res.statusText || "Request failed";
    }
    try {
      const j = JSON.parse(text) as { detail?: string; title?: string; message?: string };
      if (typeof j.detail === "string" && j.detail.trim()) {
        return j.detail.trim();
      }
      if (typeof j.message === "string" && j.message.trim()) {
        return j.message.trim();
      }
      if (typeof j.title === "string" && j.title.trim()) {
        return j.title.trim();
      }
    } catch {
      /* plain text */
    }
    return text.slice(0, 300);
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function submitWebCheckout(
  slug: string,
  cartId: string,
  payload: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    notes?: string;
  },
): Promise<PublicCheckoutResult> {
  const res = await fetch(`${cartBase(slug)}/${encodeURIComponent(cartId.trim())}/checkout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerName: payload.customerName.trim(),
      customerPhone: payload.customerPhone.trim(),
      customerEmail: payload.customerEmail?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
    }),
  });
  if (res.status === 404) {
    throw new Error("Cart not found or expired. Start again from the shop.");
  }
  if (!res.ok) {
    throw new Error(await readFetchErrorMessage(res));
  }
  return (await res.json()) as PublicCheckoutResult;
}

export async function createWebCart(slug: string): Promise<PublicWebCart | null> {
  const res = await fetch(cartBase(slug), {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as PublicWebCart;
}

export async function fetchWebCart(slug: string, cartId: string): Promise<PublicWebCart | null> {
  const id = cartId.trim();
  if (!id) {
    return null;
  }
  const res = await fetch(`${cartBase(slug)}/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as PublicWebCart;
}

export async function upsertWebCartLine(
  slug: string,
  cartId: string,
  itemId: string,
  quantity: number,
): Promise<PublicWebCart | null> {
  const res = await fetch(`${cartBase(slug)}/${encodeURIComponent(cartId.trim())}/lines`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ itemId: itemId.trim(), quantity }),
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(await readFetchErrorMessage(res));
  }
  return (await res.json()) as PublicWebCart;
}

export async function deleteWebCartLine(
  slug: string,
  cartId: string,
  itemId: string,
): Promise<PublicWebCart | null> {
  const res = await fetch(
    `${cartBase(slug)}/${encodeURIComponent(cartId.trim())}/lines/${encodeURIComponent(itemId.trim())}`,
    { method: "DELETE", headers: { Accept: "application/json" } },
  );
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as PublicWebCart;
}

export async function ensureWebCartId(slug: string): Promise<string | null> {
  const s = slug.trim();
  const prev = readWebCartHandle();
  if (prev && prev.slug === s && prev.cartId) {
    return prev.cartId;
  }
  const created = await createWebCart(s);
  if (!created) {
    return null;
  }
  writeWebCartHandle(s, created.id);
  return created.id;
}
