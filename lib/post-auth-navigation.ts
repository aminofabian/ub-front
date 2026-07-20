import {
  getSessionTenantId,
  persistTenantHostAfterAuth,
} from "@/lib/auth";
import { encodeAuthHandoffPayload } from "@/lib/auth-handoff";
import { fetchBusiness } from "@/lib/api";
import {
  APP_ROUTES,
  hostDerivedShopUrl,
  slugDerivedShopUrl,
} from "@/lib/config";
import { IS_DESKTOP } from "@/lib/runtime";
import { submitStoreSessionNavigate } from "@/lib/submit-store-session";
import { stripLeadingWww, tenantHostsMatch } from "@/lib/tenant-host";

function navigateAfterAuth(path: string): void {
  submitStoreSessionNavigate(path);
}

async function syncSlugAndNavigate(
  nextHint: string,
  knownSlug?: string | null,
): Promise<void> {
  if (IS_DESKTOP) {
    navigateAfterAuth(nextHint);
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
    navigateAfterAuth(nextHint);
    return;
  }
  if (slug && currentHost.startsWith(`${slug.toLowerCase()}.`)) {
    persistTenantHostAfterAuth(slug, normalizedPrimary);
    navigateAfterAuth(nextHint);
    return;
  }

  const shopBase =
    hostDerivedShopUrl(primaryHost) || (slug ? slugDerivedShopUrl(slug) : "");
  const targetOrigin = shopBase
    ? new URL(shopBase).origin
    : window.location.origin;

  if (!slug || targetOrigin === window.location.origin) {
    persistTenantHostAfterAuth(slug, normalizedPrimary);
    navigateAfterAuth(nextHint);
    return;
  }

  const tenantId = getSessionTenantId();

  // Gap G: never put access/refresh JWTs in the URL. Shop host restores via
  // shared httpOnly refresh cookie (APP_AUTH_REFRESH_COOKIE_DOMAIN) + restore-session.
  // Optional fragment carries only non-secret tenant/next hints.
  const fragment = encodeAuthHandoffPayload({
    tenantId: tenantId ?? undefined,
    nextPath: nextHint,
  });
  const nextEnc = encodeURIComponent(nextHint);
  const slugEnc = encodeURIComponent(slug);
  window.location.assign(
    `${shopBase}${APP_ROUTES.authHandoff}?next=${nextEnc}&slug=${slugEnc}#${fragment}`,
  );
}

/** Persist session and navigate to the post-auth destination (with subdomain handoff). */
export async function completeAuthAndNavigate(
  dest: string,
  knownSlug?: string | null,
): Promise<void> {
  await syncSlugAndNavigate(dest, knownSlug);
}
