/**
 * Storefront on-page staff edit helpers (pure — no React).
 */

import { isShopNextPath } from "@/lib/post-auth-destination";
import { hasPermission, Permission } from "@/lib/permissions";

/** `?edit=1` / `true` / `yes` — phone demo deep link into on-page edit mode. */
export function storefrontWantsEditFromSearch(
  search: string | null | undefined,
): boolean {
  const raw = (search ?? "").startsWith("?")
    ? (search ?? "").slice(1)
    : (search ?? "");
  const params = new URLSearchParams(raw);
  const v = params.get("edit")?.trim().toLowerCase() ?? "";
  return v === "1" || v === "true" || v === "yes";
}

/**
 * V2 gate: owner/admin always, or any staff with `business.manage_settings`
 * (covers manager / custom roles that can patch designJson).
 */
export function canStorefrontOnPageEdit(opts: {
  roleKey?: string | null;
  permissions?: string[] | null;
}): boolean {
  const key = (opts.roleKey ?? "").trim().toLowerCase();
  if (key === "owner" || key === "admin") return true;
  return hasPermission(
    opts.permissions ?? undefined,
    Permission.BusinessManageSettings,
  );
}

/** Same 8KB URL ceiling as Design studio “Open live” draft preview. */
export const STOREFRONT_DRAFT_PREVIEW_MAX_CHARS = 8000;

export function storefrontStaffEditReturnPath(
  href: string | null | undefined = typeof window !== "undefined"
    ? window.location.href
    : "/?edit=1",
): string {
  try {
    const url = new URL(href || "/?edit=1", "https://storefront.local");
    url.searchParams.set("edit", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/?edit=1";
  }
}

/** Absolute shop URL with `edit=1` — safe to pass as Design studio `returnTo`. */
export function storefrontStaffEditReturnAbsoluteUrl(
  href: string | null | undefined =
    typeof window !== "undefined" ? window.location.href : null,
): string | null {
  if (!href?.trim()) return null;
  try {
    const url = new URL(href);
    url.searchParams.set("edit", "1");
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Validate a Design studio `returnTo` param.
 * Accepts absolute URLs on the merchant shop origin, or relative shop paths
 * (joined to `shopBase` when provided).
 */
export function resolveStorefrontDesignReturnTo(
  raw: string | null | undefined,
  shopBase: string | null | undefined,
): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;

  const base = shopBase?.trim().replace(/\/+$/, "") || null;

  if (value.startsWith("/") && !value.startsWith("//")) {
    if (!isShopNextPath(value) || !base) return null;
    return `${base}${value}`;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const pathWithQuery = `${url.pathname}${url.search}`;
    if (!isShopNextPath(pathWithQuery)) return null;
    if (base) {
      const expected = new URL(base);
      if (url.origin !== expected.origin) return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Lightweight analytics for on-page edit (scope §18) — CustomEvent + dataLayer. */
export function trackStorefrontEditEvent(
  name: string,
  data?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const detail: Record<string, unknown> = {
    event: name,
    path: window.location.pathname,
    ...data,
  };
  window.dispatchEvent(new CustomEvent("kiosk:storefront-event", { detail }));
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(detail);
}

