import { apiUrl } from "@/lib/config";
import { isSessionRelatedProblem } from "@/lib/problem";
import {
  getSupplierPortalAccessToken,
  signOutSupplierPortalAndRedirectToLogin,
} from "@/lib/supplier-portal-session";

const UNLOCK_HEADER = "X-Page-Unlock";

export type PageSealStatus = {
  sealed: boolean;
  scope: string;
  subjectKey: string | null;
  displayName: string | null;
  phoneHint: string | null;
  unlockValid: boolean;
};

export type PageSealSendCodeResult = {
  phoneHint: string | null;
  expiresAt: string | null;
  channel?: string | null;
  devCode: string | null;
};

export type PageSealUnlockResult = {
  unlockToken: string;
  expiresAt: string;
};

export type PageSealScope = "supplier" | "customer-tab" | "shop-supplier";

function storageKey(scope: PageSealScope, key: string): string {
  return `ub.pageSeal.unlock:${scope}:${key.trim().toLowerCase()}`;
}

function tenantHostHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (typeof window !== "undefined") {
    const host = window.location.hostname?.trim();
    if (host) headers["X-Tenant-Host"] = host;
  }
  return headers;
}

export function getPageSealUnlock(scope: PageSealScope, key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(storageKey(scope, key));
  } catch {
    return null;
  }
}

export function setPageSealUnlock(
  scope: PageSealScope,
  key: string,
  token: string,
): void {
  try {
    sessionStorage.setItem(storageKey(scope, key), token);
  } catch {
    /* ignore */
  }
}

export function clearPageSealUnlock(scope: PageSealScope, key: string): void {
  try {
    sessionStorage.removeItem(storageKey(scope, key));
  } catch {
    /* ignore */
  }
}

async function readJson<T>(res: Response, supplierAuth = false): Promise<T> {
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
    if (supplierAuth && isSessionRelatedProblem(res.status, body)) {
      signOutSupplierPortalAndRedirectToLogin(detail || "session expired");
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function fetchSupplierPageSealStatus(
  username: string,
): Promise<PageSealStatus> {
  const unlock = getPageSealUnlock("supplier", username);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (unlock) headers[UNLOCK_HEADER] = unlock;
  const res = await fetch(
    apiUrl(
      `/api/v1/public/page-seals/supplier/${encodeURIComponent(username)}`,
    ),
    { headers, cache: "no-store" },
  );
  return readJson<PageSealStatus>(res);
}

export async function unlockSupplierPageSeal(
  username: string,
  pin: string,
): Promise<PageSealUnlockResult> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/page-seals/supplier/${encodeURIComponent(username)}/unlock`,
    ),
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    },
  );
  const out = await readJson<PageSealUnlockResult>(res);
  setPageSealUnlock("supplier", username, out.unlockToken);
  return out;
}

export async function sendSupplierPageSealCode(): Promise<PageSealSendCodeResult> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    signOutSupplierPortalAndRedirectToLogin("missing access token");
    throw new Error("Sign in required");
  }
  const res = await fetch(apiUrl("/api/v1/supplier-portal/page-seal/send-code"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return readJson<PageSealSendCodeResult>(res, true);
}

export async function sealSupplierPage(body: {
  code: string;
  pin: string;
  confirmPin: string;
}): Promise<{ ok: boolean; sealed: boolean }> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    signOutSupplierPortalAndRedirectToLogin("missing access token");
    throw new Error("Sign in required");
  }
  const res = await fetch(apiUrl("/api/v1/supplier-portal/page-seal/seal"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return readJson(res, true);
}

export async function unsealSupplierPage(pin: string): Promise<{ ok: boolean; sealed: boolean }> {
  const token = getSupplierPortalAccessToken();
  if (!token) {
    signOutSupplierPortalAndRedirectToLogin("missing access token");
    throw new Error("Sign in required");
  }
  const res = await fetch(apiUrl("/api/v1/supplier-portal/page-seal/unseal"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pin }),
  });
  return readJson(res, true);
}

export async function fetchCustomerTabSealStatus(phone: string): Promise<PageSealStatus> {
  const unlock = getPageSealUnlock("customer-tab", phone);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (unlock) headers[UNLOCK_HEADER] = unlock;
  const res = await fetch(
    apiUrl(`/api/v1/public/page-seals/customer-tab/${encodeURIComponent(phone)}`),
    { headers, cache: "no-store" },
  );
  return readJson<PageSealStatus>(res);
}

export async function unlockCustomerTabSeal(
  phone: string,
  pin: string,
): Promise<PageSealUnlockResult> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/page-seals/customer-tab/${encodeURIComponent(phone)}/unlock`,
    ),
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    },
  );
  const out = await readJson<PageSealUnlockResult>(res);
  setPageSealUnlock("customer-tab", phone, out.unlockToken);
  return out;
}

export async function sendCustomerTabSealCode(phone: string): Promise<PageSealSendCodeResult> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/page-seals/customer-tab/${encodeURIComponent(phone)}/send-code`,
    ),
    { method: "POST", headers: { Accept: "application/json" } },
  );
  return readJson<PageSealSendCodeResult>(res);
}

export async function sealCustomerTab(
  phone: string,
  body: { code: string; pin: string; confirmPin: string },
): Promise<{ ok: boolean; sealed: boolean }> {
  const res = await fetch(
    apiUrl(`/api/v1/public/page-seals/customer-tab/${encodeURIComponent(phone)}/seal`),
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return readJson(res);
}

export async function unsealCustomerTab(
  phone: string,
  pin: string,
): Promise<{ ok: boolean; sealed: boolean }> {
  const res = await fetch(
    apiUrl(
      `/api/v1/public/page-seals/customer-tab/${encodeURIComponent(phone)}/unseal`,
    ),
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    },
  );
  return readJson(res);
}

function shopSupplierSealBase(slug: string): string {
  // Prefer the supplier-portal nested paths (same host resolution as the ledger).
  return `/api/v1/public/suppliers/${encodeURIComponent(slug)}/page-seal`;
}

export async function fetchShopSupplierPageSealStatus(
  slug: string,
): Promise<PageSealStatus> {
  const unlock = getPageSealUnlock("shop-supplier", slug);
  const headers = tenantHostHeaders();
  if (unlock) headers[UNLOCK_HEADER] = unlock;
  const res = await fetch(apiUrl(shopSupplierSealBase(slug)), {
    headers,
    cache: "no-store",
  });
  return readJson<PageSealStatus>(res);
}

export async function unlockShopSupplierPageSeal(
  slug: string,
  pin: string,
): Promise<PageSealUnlockResult> {
  const res = await fetch(apiUrl(`${shopSupplierSealBase(slug)}/unlock`), {
    method: "POST",
    headers: tenantHostHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ pin }),
  });
  const out = await readJson<PageSealUnlockResult>(res);
  setPageSealUnlock("shop-supplier", slug, out.unlockToken);
  return out;
}

export async function sendShopSupplierPageSealCode(
  slug: string,
): Promise<PageSealSendCodeResult> {
  const res = await fetch(apiUrl(`${shopSupplierSealBase(slug)}/send-code`), {
    method: "POST",
    headers: tenantHostHeaders(),
  });
  return readJson<PageSealSendCodeResult>(res);
}

export async function sealShopSupplierPage(
  slug: string,
  body: { code: string; pin: string; confirmPin: string },
): Promise<{ ok: boolean; sealed: boolean }> {
  const res = await fetch(apiUrl(`${shopSupplierSealBase(slug)}/seal`), {
    method: "POST",
    headers: tenantHostHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return readJson(res);
}

export async function unsealShopSupplierPage(
  slug: string,
  pin: string,
): Promise<{ ok: boolean; sealed: boolean }> {
  const res = await fetch(apiUrl(`${shopSupplierSealBase(slug)}/unseal`), {
    method: "POST",
    headers: tenantHostHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ pin }),
  });
  return readJson(res);
}
