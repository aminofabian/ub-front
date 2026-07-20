/**
 * Phase 16 — guest web cart (browser). Uses {@link apiUrl} for `/api/v1` calls.
 */

import { apiUrl } from "./config";
import { getSessionTokens } from "./auth";

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

/** Lines that cannot be checked out (no branch sell price or shelf price). */
export function cartLinesMissingPrice(cart: PublicWebCart): PublicWebCartLine[] {
  return cart.lines.filter((line) => line.unitPrice == null);
}

export function cartIsCheckoutReady(cart: PublicWebCart | null | undefined): boolean {
  if (!cart || cart.lines.length === 0) {
    return false;
  }
  return cartLinesMissingPrice(cart).length === 0 && cart.subtotal != null;
}

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

function cartCheckoutStateBase(slug: string, cartId: string): string {
  return `${cartBase(slug)}/${encodeURIComponent(cartId.trim())}/checkout-state`;
}

const GUEST_CHECKOUT_KEY_STORAGE = "ub.checkoutGuestKey.v1";

type GuestKeyStore = Record<string, string>;

function readGuestKeyStore(): GuestKeyStore {
  try {
    const ls = clientStorage();
    if (!ls) return {};
    const raw = ls.getItem(GUEST_CHECKOUT_KEY_STORAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GuestKeyStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readGuestCheckoutKey(slug: string): string | null {
  const s = slug.trim();
  if (!s) return null;
  const key = readGuestKeyStore()[s];
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

export function writeGuestCheckoutKey(slug: string, guestKey: string): void {
  const ls = clientStorage();
  if (!ls) return;
  const s = slug.trim();
  const key = guestKey.trim();
  if (!s || !key) return;
  const store = readGuestKeyStore();
  store[s] = key;
  ls.setItem(GUEST_CHECKOUT_KEY_STORAGE, JSON.stringify(store));
}

function checkoutRequestHeaders(slug: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getSessionTokens()?.accessToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const guestKey = readGuestCheckoutKey(slug);
  if (guestKey) {
    headers["X-Checkout-Guest-Key"] = guestKey;
  }
  return headers;
}

export type PublicCheckoutProfile = {
  firstName: string;
  lastName: string;
  email: string;
  areaCode: string;
  phone: string;
  whatsApp: string;
  county: string;
  subCounty: string;
  ward: string;
  streetAddress: string;
  deliveryNotes: string;
};

export type PublicCheckoutState = {
  authenticated: boolean;
  currentStep: 1 | 2 | 3;
  detailsSubStep: "contact" | "delivery" | null;
  completed: {
    contact: boolean;
    delivery: boolean;
  };
  profile: PublicCheckoutProfile;
  guestKey?: string | null;
};

export async function fetchCheckoutState(
  slug: string,
  cartId: string,
): Promise<PublicCheckoutState | null> {
  const res = await fetch(cartCheckoutStateBase(slug, cartId), {
    headers: checkoutRequestHeaders(slug),
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as PublicCheckoutState;
}

export async function patchCheckoutContact(
  slug: string,
  cartId: string,
  payload: {
    firstName: string;
    lastName: string;
    email: string;
    areaCode: string;
    phone: string;
    whatsApp?: string;
  },
): Promise<PublicCheckoutState> {
  const res = await fetch(`${cartCheckoutStateBase(slug, cartId)}/contact`, {
    method: "PATCH",
    headers: checkoutRequestHeaders(slug),
    body: JSON.stringify({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim(),
      areaCode: payload.areaCode.trim(),
      phone: payload.phone.trim(),
      whatsApp: payload.whatsApp?.trim() || "",
    }),
  });
  if (!res.ok) {
    throw new Error(await readFetchErrorMessage(res));
  }
  return (await res.json()) as PublicCheckoutState;
}

export async function patchCheckoutDelivery(
  slug: string,
  cartId: string,
  payload: {
    county?: string;
    subCounty: string;
    ward: string;
    streetAddress: string;
    deliveryNotes?: string;
    saveForNextTime: boolean;
  },
): Promise<PublicCheckoutState> {
  const res = await fetch(`${cartCheckoutStateBase(slug, cartId)}/delivery`, {
    method: "PATCH",
    headers: checkoutRequestHeaders(slug),
    body: JSON.stringify({
      county: payload.county?.trim() || "Nairobi",
      subCounty: payload.subCounty.trim(),
      ward: payload.ward.trim(),
      streetAddress: payload.streetAddress.trim(),
      deliveryNotes: payload.deliveryNotes?.trim() || "",
      saveForNextTime: payload.saveForNextTime,
    }),
  });
  if (!res.ok) {
    throw new Error(await readFetchErrorMessage(res));
  }
  return (await res.json()) as PublicCheckoutState;
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

export type PublicLeadCaptureResult = {
  saved: boolean;
  guestKey?: string | null;
  deliveryArea?: string | null;
  streetAddress?: string | null;
};

export const SHOP_ITEM_ADDED_EVENT = "ub-shop-item-added";

export type ShopItemAddedDetail = {
  itemId: string;
  /** Opens the cart drawer — call after the delivery-area gate finishes (or immediately if not needed). */
  continueToCart: () => void;
};

export function notifyShopItemAdded(
  itemId: string,
  continueToCart: () => void,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ShopItemAddedDetail>(SHOP_ITEM_ADDED_EVENT, {
      detail: { itemId: itemId.trim(), continueToCart },
    }),
  );
}

/** Soft-capture phone (and optionally delivery) without requiring a cart or signup. */
export async function submitStorefrontLeadCapture(
  slug: string,
  payload: {
    areaCode: string;
    phone: string;
    whatsApp?: string;
    deliveryArea?: string;
    streetAddress?: string;
  },
): Promise<PublicLeadCaptureResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = getSessionTokens()?.accessToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const guestKey = readGuestCheckoutKey(slug);
  if (guestKey) {
    headers["X-Checkout-Guest-Key"] = guestKey;
  }
  const body: Record<string, string> = {
    areaCode: payload.areaCode.trim(),
    phone: payload.phone.trim(),
    whatsApp: payload.whatsApp?.trim() || payload.phone.trim(),
  };
  const area = payload.deliveryArea?.trim();
  const street = payload.streetAddress?.trim();
  if (area) body.deliveryArea = area;
  if (street) body.streetAddress = street;

  const res = await fetch(
    `${browserApiV1Base()}/public/businesses/${encodeURIComponent(slug.trim())}/lead-capture`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(await readFetchErrorMessage(res));
  }
  const result = (await res.json()) as PublicLeadCaptureResult;
  if (result.guestKey) {
    writeGuestCheckoutKey(slug, result.guestKey);
  }
  return result;
}
