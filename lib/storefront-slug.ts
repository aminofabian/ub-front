import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import {
  fetchTenantContext,
  sanitizeStorefrontSlug,
  storefrontSlugFromEnv,
  type TenantContext,
} from "@/lib/public-storefront";

const LOCALHOST_SUFFIX = ".localhost";

function parseHostname(raw: string): string {
  return raw.trim().toLowerCase().split(":")[0] ?? "";
}

async function requestHostname(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("x-forwarded-host") ?? h.get("host");
  if (!raw) {
    return null;
  }
  const hostname = parseHostname(raw);
  return hostname || null;
}

function localStorefrontSlug(hostname: string): string | null {
  if (!hostname.endsWith(LOCALHOST_SUFFIX)) {
    return null;
  }
  const candidate = hostname.slice(0, -LOCALHOST_SUFFIX.length).trim();
  return candidate || null;
}

/**
 * Synthesises a minimal {@link TenantContext} for `<slug>.localhost` so dev
 * workflow keeps working without a `domains` row. Production hosts always go
 * through the backend resolver.
 */
function localTenantFallback(hostname: string): TenantContext | null {
  const slug = localStorefrontSlug(hostname);
  if (!slug) {
    return null;
  }
  const display = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    tenantId: `local-${slug}`,
    tenantName: display,
    slug,
    status: "ACTIVE",
    branding: {
      displayName: display,
      logoUrl: null,
      faviconUrl: null,
      primaryColor: null,
      accentColor: null,
    },
    authConfig: {
      methods: ["password"],
      ssoProviders: [],
      passwordPolicy: { minLength: 8, requireNumber: false, requireSymbol: false },
    },
    featureFlags: {},
    storefrontEnabled: true,
    resolvedAt: new Date().toISOString(),
  };
}

async function tenantFromHostname(hostname: string): Promise<TenantContext | null> {
  const resolved = await fetchTenantContext(hostname);
  if (resolved) {
    return resolved;
  }
  return localTenantFallback(hostname);
}

/**
 * Incoming hostname for the request (no port normalization beyond lowercase).
 * Use for canonical URLs and metadata; pairs with {@link resolveTenantContext}.
 */
export async function getRequestHostname(): Promise<string | null> {
  return requestHostname();
}

async function resolveTenantContextUncached(): Promise<TenantContext | null> {
  const hostname = await requestHostname();
  if (!hostname) {
    return null;
  }
  return tenantFromHostname(hostname);
}

/**
 * Single source of tenant context for server components. Resolution order:
 * 1. Backend resolve API for the incoming `Host`/`X-Forwarded-Host`.
 * 2. `*.localhost` fallback for dev (synthesised in-process).
 *
 * Returns `null` only when no host can be determined or the backend returns
 * an unknown host outside the localhost convention.
 *
 * Wrapped in React `cache()` so metadata, layout, and tree share one resolve per request.
 */
export const resolveTenantContext = cache(resolveTenantContextUncached);

/** Resolution order: env slug → host-based. Use for the storefront pages. */
export async function resolveStorefrontSlug(): Promise<string | null> {
  const envSlug = storefrontSlugFromEnv();
  if (envSlug) {
    return envSlug;
  }
  const ctx = await resolveTenantContext();
  return sanitizeStorefrontSlug(ctx?.slug ?? null);
}

/** Host-only resolver, skips env so the admin host does not get redirected. */
export async function resolveStorefrontSlugFromHost(): Promise<string | null> {
  const ctx = await resolveTenantContext();
  return ctx?.slug ?? null;
}
