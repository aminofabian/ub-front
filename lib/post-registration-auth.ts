import {
  fetchMe,
  loginWithPassword,
  type RegisterResponse,
} from "@/lib/api";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
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

export async function finalizeActiveRegistration(params: {
  email: string;
  password: string;
  tenantSlug?: string | null;
}): Promise<void> {
  await loginWithPassword(params.email.trim(), params.password);

  let dest = resolvePostAuthDestination(null);
  try {
    const me = await fetchMe();
    dest = resolvePostAuthDestination(me);
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
