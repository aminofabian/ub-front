/** Client-side flag for the "viewing as platform admin" banner after SA handoff. */

import { STORAGE_KEYS } from "@/lib/config";

export type ImpersonationSessionHint = {
  userEmail: string;
  userName: string;
  businessId: string;
};

export function setImpersonationSession(hint: ImpersonationSessionHint): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    STORAGE_KEYS.impersonationSession,
    JSON.stringify(hint),
  );
}

export function getImpersonationSession(): ImpersonationSessionHint | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEYS.impersonationSession);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const userEmail =
      typeof parsed.userEmail === "string" ? parsed.userEmail : "";
    const userName =
      typeof parsed.userName === "string" ? parsed.userName : "";
    const businessId =
      typeof parsed.businessId === "string" ? parsed.businessId : "";
    if (!userEmail && !businessId) return null;
    return { userEmail, userName, businessId };
  } catch {
    return null;
  }
}

export function clearImpersonationSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEYS.impersonationSession);
}
