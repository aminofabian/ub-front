import { persistTenantHostAfterAuth } from "@/lib/auth";
import { fetchBusiness } from "@/lib/api";
import { hostDerivedShopUrl, slugDerivedShopUrl } from "@/lib/config";
import { isOfficeConsolePath } from "@/lib/login-audience";
import { IS_DESKTOP } from "@/lib/runtime";
import { submitStoreSessionNavigate } from "@/lib/submit-store-session";
import { stripLeadingWww, tenantHostsMatch } from "@/lib/tenant-host";

export type CompleteAuthNavigateOptions = {
  office?: boolean;
};

function navigateAfterAuth(path: string, office?: boolean): void {
  // The desktop SKU has no Next.js server route for `/api/auth/store-session`
  // (that prefetch/cookie-mint endpoint is cloud-only). It also has no
  // cross-subdomain handoff — the till stays on one origin — so navigate
  // straight to the post-auth destination.
  if (IS_DESKTOP) {
    window.location.assign(path || "/");
    return;
  }
  submitStoreSessionNavigate(path, {
    office: office || isOfficeConsolePath(path),
  });
}

async function syncSlugAndNavigate(
  nextHint: string,
  knownSlug?: string | null,
  office?: boolean,
): Promise<void> {
  if (IS_DESKTOP) {
    navigateAfterAuth(nextHint, office);
    return;
  }

  let slug = knownSlug?.trim() || null;
  let primaryHost: string | null = null;
  if (!slug) {
    try {
      const biz = await fetchBusiness();
      slug = biz.slug?.trim() || null;
      primaryHost = biz.primaryDomain?.trim() || null;
    } catch {
      /* tenant id header may still work for same-origin navigation */
    }
  } else {
    primaryHost = stripLeadingWww(window.location.hostname);
  }

  const currentHost = stripLeadingWww(window.location.hostname);
  const normalizedPrimary = primaryHost
    ? stripLeadingWww(primaryHost.toLowerCase())
    : null;

  if (normalizedPrimary && tenantHostsMatch(currentHost, normalizedPrimary)) {
    persistTenantHostAfterAuth(slug, normalizedPrimary);
    navigateAfterAuth(nextHint, office);
    return;
  }
  if (slug && currentHost.startsWith(`${slug.toLowerCase()}.`)) {
    persistTenantHostAfterAuth(slug, normalizedPrimary);
    navigateAfterAuth(nextHint, office);
    return;
  }

  // Prefer platform subdomain for cross-host handoff (Gap G: shared refresh
  // cookie on .kiosk.ke cannot follow a bounce onto a bought custom primary).
  // Login already on the custom primary still stays put via the match above.
  const shopBase =
    (slug ? slugDerivedShopUrl(slug) : "") ||
    hostDerivedShopUrl(primaryHost) ||
    "";
  const targetOrigin = shopBase
    ? new URL(shopBase).origin
    : window.location.origin;

  if (!slug || targetOrigin === window.location.origin) {
    persistTenantHostAfterAuth(slug, normalizedPrimary);
    navigateAfterAuth(nextHint, office);
    return;
  }

  persistTenantHostAfterAuth(slug, normalizedPrimary);

  // Mint parent-domain cookies on this host, then 303 to the shop handoff.
  // A raw location.assign skipped store-session, so owners who verified on
  // the apex arrived at {slug}.kiosk.ke with no ub.access / ub.refresh.
  submitStoreSessionNavigate(nextHint, {
    office: office || isOfficeConsolePath(nextHint),
    handoffOrigin: targetOrigin,
    slug,
  });
}

/** Persist session and navigate to the post-auth destination (with subdomain handoff). */
export async function completeAuthAndNavigate(
  dest: string,
  knownSlug?: string | null,
  opts?: CompleteAuthNavigateOptions,
): Promise<void> {
  await syncSlugAndNavigate(dest, knownSlug, opts?.office);
}
