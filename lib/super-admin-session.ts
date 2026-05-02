import { STORAGE_KEYS } from "@/lib/config";

export function getSuperAdminAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEYS.superAdminAccessToken);
}

export function setSuperAdminAccessToken(token: string): void {
  window.sessionStorage.setItem(STORAGE_KEYS.superAdminAccessToken, token);
}

export function clearSuperAdminSession(): void {
  window.sessionStorage.removeItem(STORAGE_KEYS.superAdminAccessToken);
}
