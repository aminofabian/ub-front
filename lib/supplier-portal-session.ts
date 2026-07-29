import { APP_ROUTES, STORAGE_KEYS } from "@/lib/config";

/** Guard so parallel 401s only redirect once. */
let supplierSignOutInProgress = false;

export function getSupplierPortalAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEYS.supplierPortalAccessToken);
}

export function setSupplierPortalAccessToken(token: string): void {
  window.sessionStorage.setItem(STORAGE_KEYS.supplierPortalAccessToken, token);
}

export function getSupplierPortalSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEYS.supplierPortalSessionId);
}

export function setSupplierPortalSessionId(sessionId: string): void {
  window.sessionStorage.setItem(STORAGE_KEYS.supplierPortalSessionId, sessionId);
}

export function clearSupplierPortalSession(): void {
  window.sessionStorage.removeItem(STORAGE_KEYS.supplierPortalAccessToken);
  window.sessionStorage.removeItem(STORAGE_KEYS.supplierPortalSessionId);
}

/**
 * Clears the supplier portal session and hard-redirects to login.
 * Supplier JWTs have no refresh path — any unrecoverable 401 should call this.
 */
export function signOutSupplierPortalAndRedirectToLogin(reason?: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (supplierSignOutInProgress) {
    return;
  }
  supplierSignOutInProgress = true;
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[supplier-portal] signOutSupplierPortalAndRedirectToLogin",
      reason ?? "no reason provided",
    );
  }
  clearSupplierPortalSession();
  window.location.assign(APP_ROUTES.supplierPortalLogin);
}
