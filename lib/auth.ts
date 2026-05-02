"use client";

import { STORAGE_KEYS } from "@/lib/config";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export function getSessionTokens(): SessionTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = window.localStorage.getItem(STORAGE_KEYS.accessToken);
  const refreshToken = window.localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function setSessionTokens(tokens: SessionTokens): void {
  window.localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
  window.localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
}

export function clearSessionTokens(): void {
  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
}

export function setSessionTenantId(id: string): void {
  window.sessionStorage.setItem(STORAGE_KEYS.tenantId, id);
}

export function getSessionTenantId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEYS.tenantId);
}

export function clearSessionTenantId(): void {
  window.sessionStorage.removeItem(STORAGE_KEYS.tenantId);
}
