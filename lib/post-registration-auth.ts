import {
  fetchBusiness,
  fetchMe,
  fetchShopperAccountOverview,
  loginWithPassword,
  type RegisterResponse,
} from "@/lib/api";
import { isBuyerAccount } from "@/lib/buyer-role";
import {
  applyShopperTabHint,
  resolvePostAuthDestination,
} from "@/lib/post-auth-destination";
import { completeAuthAndNavigate } from "@/lib/post-auth-navigation";

export function extractVerificationToken(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get("token");
  } catch {
    return null;
  }
}

/**
 * Resolve where a just-authenticated user should land, based on their live
 * role and the business's actual onboarding state (never a hardcoded URL).
 * Used to bounce authenticated users off auth pages (signup/login).
 */
export async function resolveDestinationAfterAuth(params?: {
  tenantSlug?: string | null;
}): Promise<{ dest: string; slug: string | null }> {
  try {
    const [meRaw, business] = await Promise.all([
      fetchMe(),
      fetchBusiness().catch(() => null),
    ]);
    let me = meRaw;
    if (isBuyerAccount(me)) {
      try {
        me = applyShopperTabHint(me, await fetchShopperAccountOverview(0, 1));
      } catch {
        /* catalog is still a valid home */
      }
    }
    return {
      dest: resolvePostAuthDestination(me, null, business),
      slug: business?.slug?.trim() || params?.tenantSlug?.trim() || null,
    };
  } catch {
    return {
      dest: resolvePostAuthDestination(null, null, null),
      slug: params?.tenantSlug?.trim() || null,
    };
  }
}

export async function finalizeActiveRegistration(params: {
  email: string;
  password: string;
  tenantSlug?: string | null;
}): Promise<void> {
  await loginWithPassword(params.email.trim(), params.password);

  let dest = resolvePostAuthDestination(null, null, null);
  try {
    const [meRaw, business] = await Promise.all([
      fetchMe(),
      fetchBusiness().catch(() => null),
    ]);
    let me = meRaw;
    if (isBuyerAccount(me)) {
      try {
        me = applyShopperTabHint(me, await fetchShopperAccountOverview(0, 1));
      } catch {
        /* catalog is still a valid home */
      }
    }
    dest = resolvePostAuthDestination(me, null, business);
  } catch {
    /* store-session resolves role server-side when client fetch fails */
  }

  await completeAuthAndNavigate(dest, params.tenantSlug);
}

export function redirectToEmailVerification(params: {
  shopUrl: string;
  verificationUrl?: string | null;
  email?: string | null;
}): void {
  const token = extractVerificationToken(params.verificationUrl);
  const base = params.shopUrl.replace(/\/+$/, "");
  const query = new URLSearchParams();
  if (token) {
    query.set("token", token);
  }
  const email = params.email?.trim();
  if (email) {
    query.set("email", email);
  }
  const suffix = query.toString();
  window.location.assign(
    suffix ? `${base}/verify-email?${suffix}` : `${base}/verify-email`,
  );
}

export type RegistrationFlowResult = "signed_in" | "verify_redirect" | "verify_local";

/**
 * After {@link registerAccount}: sign in immediately when active, otherwise
 * send the user to email verification.
 */
export async function handleRegistrationResult(params: {
  result: RegisterResponse;
  email: string;
  password: string;
  tenantSlug?: string | null;
  shopUrl?: string | null;
}): Promise<RegistrationFlowResult> {
  if (params.result.status.toLowerCase() === "active") {
    await finalizeActiveRegistration({
      email: params.email,
      password: params.password,
      tenantSlug: params.tenantSlug,
    });
    return "signed_in";
  }

  const shopUrl = params.shopUrl?.trim();
  if (shopUrl) {
    redirectToEmailVerification({
      shopUrl,
      verificationUrl: params.result.verificationUrl,
      email: params.email,
    });
    return "verify_redirect";
  }

  return "verify_local";
}
