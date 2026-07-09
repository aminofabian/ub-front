import { STORAGE_KEYS } from "@/lib/config";

export function getSupplierPortalAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEYS.supplierPortalAccessToken);
}

export function setSupplierPortalAccessToken(token: string): void {
  window.sessionStorage.setItem(STORAGE_KEYS.supplierPortalAccessToken, token);
}

export function clearSupplierPortalSession(): void {
  window.sessionStorage.removeItem(STORAGE_KEYS.supplierPortalAccessToken);
}
