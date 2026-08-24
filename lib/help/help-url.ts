import { APP_BASE_URL } from "@/lib/config";

/**
 * Host-absolute URL for a help route, e.g. {@code https://kiosk.ke/help/...}.
 *
 * Client-safe (no `server-only` imports) — dashboard pages use this so guide
 * links always point at the HOST help site and never resolve to a tenant
 * subdomain. Mirrors {@code helpAbsoluteUrl} in {@code lib/help/seo.ts}.
 */
export function helpHostUrl(path: string): string {
  const base = APP_BASE_URL.replace(/\/+$/, "") || "https://kiosk.ke";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
