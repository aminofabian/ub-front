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

/**
 * Desktop builds are single-tenant and rendered as a fully static export, so
 * `headers()` (which is intrinsically dynamic) must not be called during
 * `next build`. Any caller that resolves tenant context returns `null`
 * unconditionally; the backend's `DesktopTenantResolver` injects the single
 * `Business` at request time and the UI's `TenantProvider` handles a null
 * tenant by falling through to the platform/admin look.
 */
const IS_DESKTOP_BUILD = process.env.NEXT_PUBLIC_RUNTIME === "desktop";

/**
 * Hosts that are the platform itself (no tenant), from {@code PLATFORM_HOST}
 * (comma-separated; {@code www.} variants are implied). Tenant resolution is
 * skipped for these — the backend would answer 404 anyway, so avoiding the
 * probe removes an expected-miss request on every platform page render.
 */
const PLATFORM_HOSTS: ReadonlySet<string> = buildPlatformHostSet();

function buildPlatformHostSet(): ReadonlySet<string> {
  const set = new Set<string>();
  for (const raw of (process.env.PLATFORM_HOST ?? "").split(",")) {
    const host = raw.trim().toLowerCase();
    if (!host) {
      continue;
    }
    set.add(host);
    set.add(`www.${host}`);
  }
  return set;
}

function isPlatformHost(hostname: string): boolean {
  return PLATFORM_HOSTS.has(hostname);
}

function parseHostname(raw: string): string {
  // Proxies may send "shop.example.com, apex.example.com" — use the leftmost.
  const first = raw.split(",")[0]?.trim() ?? "";
  return first.toLowerCase().split(":")[0] ?? "";
}

async function requestHostname(): Promise<string | null> {
  if (IS_DESKTOP_BUILD) {
    return null;
  }
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
      metaTitle: null,
      metaDescription: null,
      ogImage: null,
      metaKeywords: null,
      heroBannerUrls: null,
    },
    authConfig: {
      methods: ["password"],
      ssoProviders: [],
      passwordPolicy: {
        minLength: 8,
        requireNumber: false,
        requireSymbol: false,
      },
    },
    featureFlags: {},
    storefrontEnabled: true,
    storeThemeId: "mart",
    landingTemplateId: "coming-soon-editorial",
    landingContent: null,
    design: null,
    resolvedAt: new Date().toISOString(),
    countryCode: null,
    branchLocalities: [],
  };
}

async function tenantFromHostname(
  hostname: string,
): Promise<TenantContext | null> {
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
  if (IS_DESKTOP_BUILD) {
    return null;
  }
  const hostname = await requestHostname();
  if (!hostname) {
    return null;
  }
  if (isPlatformHost(hostname)) {
    // The platform itself has no tenant; skip the backend probe entirely.
    return null;
  }
  return tenantFromHostname(hostname);
}

/**
 * Single source of tenant context for server components. Resolution order:
 * 1. Backend resolve API for the incoming `Host`/`X-Forwarded-Host`.
 * 2. `*.localhost` fallback for dev (synthesised in-process).
 *
 * Returns `null` for the platform host (see {@link PLATFORM_HOSTS}), when no
 * host can be determined, or when the backend returns an unknown host outside
 * the localhost convention.
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
