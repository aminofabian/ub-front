import {
  getSessionClaims,
  getSessionTenantId,
  persistTenantHostAfterAuth,
  setSessionTenantId,
} from "@/lib/auth";
import { fetchBusiness } from "@/lib/api";
import {
  hostDerivedShopUrl,
  isPlatformApexHost,
  PLATFORM_DOMAIN,
  slugDerivedShopUrl,
} from "@/lib/config";
import { isOfficeConsolePath } from "@/lib/login-audience";
import { IS_DESKTOP } from "@/lib/runtime";
import { submitStoreSessionNavigate } from "@/lib/submit-store-session";
import {
  isSameSiteHandoffOrigin,
  stripLeadingWww,
  tenantHostsMatch,
} from "@/lib/tenant-host";

export type CompleteAuthNavigateOptions = {
  office?: boolean;
  /**
   * After claiming a shop, always land on `{slug}.kiosk.ke` — never the
   * platform apex and never another tenant's custom domain.
   */
  preferAssignedSubdomain?: boolean;
  /**
   * Prefer this hostname for the post-auth hop (e.g. custom domain after
   * Google from the storefront). Wins over slug subdomain when set.
   */
  returnHost?: string | null;
};

const BARE_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

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

function isBareLocalHost(host: string): boolean {
  return BARE_LOCAL_HOSTS.has(stripLeadingWww(host));
}

/** Hostname the new shop is assigned until they add a custom domain. */
export function assignedSubdomainHost(
  slug: string,
  currentHost: string,
): string {
  const s = slug.trim().toLowerCase();
  const host = stripLeadingWww(currentHost);
  if (isBareLocalHost(host) || host.endsWith(".localhost")) {
    return `${s}.localhost`;
  }
  return `${s}.${PLATFORM_DOMAIN}`;
}

/**
 * True when auth should 303 to the assigned `{slug}.kiosk.ke` shop.
 *
 * Stays put when already on that subdomain, or (unless
 * {@code preferAssignedSubdomain}) on a tenant custom domain such as
 * palmart.co.ke. Leaves the platform apex so onboarding never continues on
 * kiosk.ke.
 */
export function shouldHandoffToAssignedSubdomain(params: {
  currentHost: string;
  slug: string | null | undefined;
  preferAssignedSubdomain?: boolean;
}): boolean {
  const slug = params.slug?.trim().toLowerCase() || "";
  if (!slug) {
    return false;
  }
  const host = stripLeadingWww(params.currentHost);
  const assigned = assignedSubdomainHost(slug, host);
  if (tenantHostsMatch(host, assigned)) {
    return false;
  }
  if (host.startsWith(`${slug}.`)) {
    return false;
  }
  if (params.preferAssignedSubdomain) {
    return true;
  }
  return isPlatformApexHost(host) || isBareLocalHost(host);
}

async function syncSlugAndNavigate(
  nextHint: string,
  knownSlug?: string | null,
  opts?: CompleteAuthNavigateOptions,
): Promise<void> {
  const office = opts?.office;
  if (IS_DESKTOP) {
    navigateAfterAuth(nextHint, office);
    return;
  }

  let slug = knownSlug?.trim() || null;
  let primaryHost: string | null = null;
  if (!slug) {
    // On the platform apex there is no tenant context, so `fetchBusiness()`
    // needs the tenant id the session JWT already carries — otherwise it 4xxs,
    // the slug stays null, and the owner is stranded on kiosk.ke/business
    // (no slug ⇒ no hop).
    if (!getSessionTenantId()) {
      const fromClaims = getSessionClaims()?.businessId?.trim();
      if (fromClaims) {
        setSessionTenantId(fromClaims);
      }
    }
    try {
      const biz = await fetchBusiness();
      slug = biz.slug?.trim() || null;
      primaryHost = biz.primaryDomain?.trim() || null;
    } catch {
      /* tenant id header may still work for same-origin navigation */
    }
  }

  const returnHost = opts?.returnHost?.trim().toLowerCase() || null;
  const currentHost = stripLeadingWww(window.location.hostname);

  if (returnHost) {
    const shopBase = hostDerivedShopUrl(returnHost);
    let targetOrigin = "";
    try {
      targetOrigin = shopBase ? new URL(shopBase).origin : "";
    } catch {
      targetOrigin = "";
    }
    if (targetOrigin && targetOrigin !== window.location.origin) {
      // Parent-domain cookies (`.kiosk.ke`) cannot hop to a custom domain.
      // Only same-site origins get a handoffOrigin POST; otherwise fall through
      // to the assigned `{slug}.kiosk.ke` hop so we never finalize on the apex.
      if (isSameSiteHandoffOrigin(targetOrigin, currentHost)) {
        persistTenantHostAfterAuth(slug, returnHost);
        submitStoreSessionNavigate(nextHint, {
          office: office || isOfficeConsolePath(nextHint),
          handoffOrigin: targetOrigin,
          slug: slug || undefined,
        });
        return;
      }
    } else {
      persistTenantHostAfterAuth(slug, returnHost);
      navigateAfterAuth(nextHint, office);
      return;
    }
  }

  const handoff = shouldHandoffToAssignedSubdomain({
    currentHost,
    slug,
    // Custom-domain returnHost that failed same-site still needs the slug hop
    // off the apex — treat like a claim handoff.
    preferAssignedSubdomain:
      opts?.preferAssignedSubdomain === true ||
      (Boolean(returnHost) && isPlatformApexHost(currentHost)),
  });

  if (!handoff) {
    persistTenantHostAfterAuth(slug, primaryHost);
    navigateAfterAuth(nextHint, office);
    return;
  }

  const shopBase =
    (slug ? slugDerivedShopUrl(slug) : "") ||
    hostDerivedShopUrl(primaryHost) ||
    "";
  let targetOrigin = "";
  try {
    targetOrigin = shopBase ? new URL(shopBase).origin : "";
  } catch {
    targetOrigin = "";
  }

  if (!slug || !targetOrigin || targetOrigin === window.location.origin) {
    persistTenantHostAfterAuth(slug, primaryHost);
    navigateAfterAuth(nextHint, office);
    return;
  }

  persistTenantHostAfterAuth(slug, assignedSubdomainHost(slug, currentHost));

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
  await syncSlugAndNavigate(dest, knownSlug, opts);
}
